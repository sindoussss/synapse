/**
 * SYN-BUG-002 regression: reconcilePayPalCapture must not trust caller-supplied
 * capture ID, amount, currency, or deliveryContext. Authoritative PayPal state
 * is required before any invoice mutation or delivery unlock.
 */
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const e = fs.readFileSync(".env.local", "utf8");
  e.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const idx = t.indexOf("=");
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

import { invoiceRepository, InvoiceRecord } from "./src/lib/repositories/invoice.repository";
import { paymentRequestRepository } from "./src/lib/repositories/payment-request.repository";
import { sourceDeliveryRepository } from "./src/lib/repositories/source-delivery.repository";
import { payPalService } from "./src/lib/services/payments/paypal.service";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

function makeInvoice(id: string, amountMinor: number): InvoiceRecord {
  const now = new Date().toISOString();
  return {
    id,
    invoiceNumber: `INV-BUG002-${id.slice(-6)}`,
    opportunityId: "OPP-BUG002",
    leadId: "LEAD-BUG002",
    agreementId: "AGR-BUG002",
    agreementVersion: 1,
    agreementDocumentId: "DOC-BUG002",
    status: "sent",
    currency: "PHP",
    subtotal: amountMinor,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: amountMinor,
    amountPaid: 0,
    balanceDue: amountMinor,
    issueDate: now,
    dueDate: now,
    paymentTerms: "due_on_receipt",
    billingEntity: { businessName: "Synapse Operations", email: "ops@example.com" },
    clientEntity: { companyName: "Bug002 Test Client", email: "client@example.com" },
    lineItems: [{ description: "Test", quantity: 1, unitPrice: amountMinor, amount: amountMinor }],
    taxStatus: "not_applicable",
    contentHash: "hash-bug002",
    createdAt: now,
    updatedAt: now,
  };
}

async function seedUnpaidRequest(suffix: string, amountMinor: number) {
  const invoiceId = `INV-BUG002-${suffix}`;
  const requestId = `PAY-REQ-BUG002-${suffix}`;
  const orderId = `ORD-BUG002-LOCAL-${suffix}`;
  const now = new Date().toISOString();

  await invoiceRepository.createInvoice(makeInvoice(invoiceId, amountMinor));
  await paymentRequestRepository.createPaymentRequest({
    id: requestId,
    invoiceId,
    opportunityId: "OPP-BUG002",
    agreementId: "AGR-BUG002",
    provider: "paypal",
    providerRequestId: orderId,
    currency: "PHP",
    amountMinorUnits: amountMinor,
    status: "active",
    createdBy: "operator",
    createdAt: now,
    metadata: { environment: "sandbox" },
  });

  return { invoiceId, requestId, orderId };
}

async function run() {
  console.log("SYN-BUG-002 — PayPal authoritative reconcile regression\n");

  const amountMinor = 250000;

  // 1. Forged capture ID + matching caller amount + forged deliveryContext
  try {
    const seed = await seedUnpaidRequest(`FORGE-${Date.now().toString().slice(-6)}`, amountMinor);
    const projectId = `PRJ-BUG002-${seed.invoiceId.slice(-6)}`;
    let threw = false;
    let throwMessage = "";
    let recon: any = null;
    try {
      recon = await payPalService.reconcilePayPalCapture({
        orderId: seed.orderId,
        captureId: "FAKE-CAP-BUG002",
        amountMinorUnits: amountMinor,
        currency: "PHP",
        deliveryContext: {
          projectId,
          organizationId: "ORG-CASILI-01",
          workspaceId: "WS-BUG002",
          clientId: "CLI-BUG002",
          releaseCandidateId: "RC-BUG002",
          snapshotId: "SNAP-BUG002",
          sourceHash: "HASH-BUG002",
          manifestHash: "MAN-BUG002",
          files: { "app/page.tsx": "export default function Page(){return null}" },
          clientApprovalExists: true,
          operatorApprovalExists: true,
        },
      });
    } catch (e: any) {
      threw = true;
      throwMessage = e.message || String(e);
    }

    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const txs = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const succeededTx = txs.find((t) => t.status === "succeeded");
    const delivery = await sourceDeliveryRepository.getDeliveryByProject(projectId);
    const deliveryUnlocked =
      delivery?.status === "DELIVERY_AUTHORIZED" || delivery?.status === "DOWNLOADED" || recon?.deliveryResponse?.isDownloadAvailable === true;

    const noPaid = invoiceAfter?.status !== "paid" && (invoiceAfter?.amountPaid || 0) === 0;
    const noTx = !succeededTx;
    const rejected = threw && /PAYMENT_UNVERIFIED|PAYPAL_CONFIGURATION_INVALID|PayPal Get Order failed/i.test(throwMessage);

    if (rejected && noPaid && noTx && !deliveryUnlocked) {
      record("1. Forged capture + forged deliveryContext", "PASS", `Rejected without mutation (${throwMessage.slice(0, 120)})`);
    } else {
      record(
        "1. Forged capture + forged deliveryContext",
        "FAIL",
        `threw=${threw} msg=${throwMessage.slice(0, 80)} invoiceStatus=${invoiceAfter?.status} amountPaid=${invoiceAfter?.amountPaid} succeededTx=${!!succeededTx} deliveryUnlocked=${deliveryUnlocked}`
      );
    }
  } catch (e: any) {
    record("1. Forged capture + forged deliveryContext", "FAIL", e.message);
  }

  // 2. Forged amount smaller than balance (would mark partially_paid if trusted)
  try {
    const seed = await seedUnpaidRequest(`AMT-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    let throwMessage = "";
    try {
      await payPalService.reconcilePayPalCapture({
        orderId: seed.orderId,
        captureId: "FAKE-CAP-AMT",
        amountMinorUnits: 1,
        currency: "PHP",
      });
    } catch (e: any) {
      threw = true;
      throwMessage = e.message || String(e);
    }
    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const mutated = invoiceAfter?.status !== "sent" || (invoiceAfter?.amountPaid || 0) !== 0;
    if (threw && !mutated) {
      record("2. Forged amount without PayPal evidence", "PASS", `Rejected (${throwMessage.slice(0, 120)}). Invoice unchanged.`);
    } else {
      record("2. Forged amount without PayPal evidence", "FAIL", `threw=${threw} status=${invoiceAfter?.status} paid=${invoiceAfter?.amountPaid}`);
    }
  } catch (e: any) {
    record("2. Forged amount without PayPal evidence", "FAIL", e.message);
  }

  // 3. Authentic-looking provider reference that is not a PayPal capture
  try {
    const seed = await seedUnpaidRequest(`REF-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    try {
      await payPalService.reconcilePayPalCapture({
        orderId: seed.orderId,
        captureId: seed.orderId,
        amountMinorUnits: amountMinor,
        currency: "PHP",
      });
    } catch {
      threw = true;
    }
    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    if (threw && invoiceAfter?.status === "sent" && invoiceAfter.amountPaid === 0) {
      record("3. Unauthorized payment reference", "PASS", "Local-only order ID did not become FULLY_PAID.");
    } else {
      record("3. Unauthorized payment reference", "FAIL", `threw=${threw} status=${invoiceAfter?.status} paid=${invoiceAfter?.amountPaid}`);
    }
  } catch (e: any) {
    record("3. Unauthorized payment reference", "FAIL", e.message);
  }

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
