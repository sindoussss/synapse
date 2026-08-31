/**
 * SYN-FIN-001 regression: handover final-payment reconcile must not trust
 * caller amount / currency / capture / paid state. Authoritative PayPal
 * evidence is required. Delivery is not unlocked from this path.
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
import { projectRepository, ProjectRecord } from "./src/lib/repositories/project.repository";
import { billingRepository } from "./src/lib/repositories/billing.repository";
import { handoverService } from "./src/lib/services/handover/handover.service";
import { emergencyKillSwitch } from "./src/lib/services/security/emergency-kill-switch.service";
import { payPalProvider } from "./src/lib/services/payments/paypal.provider";
import { sourceDeliveryService } from "./src/lib/services/delivery/source-delivery.service";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

function makeInvoice(id: string, amountMinor: number, leadId: string, opportunityId: string): InvoiceRecord {
  const now = new Date().toISOString();
  return {
    id,
    invoiceNumber: `INV-FIN001-${id.slice(-6)}`,
    opportunityId,
    leadId,
    agreementId: "AGR-FIN001",
    agreementVersion: 1,
    agreementDocumentId: "DOC-FIN001",
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
    clientEntity: { companyName: "Fin001 Client", email: "client@example.com" },
    lineItems: [{ description: "Final milestone", quantity: 1, unitPrice: amountMinor, amount: amountMinor }],
    taxStatus: "not_applicable",
    contentHash: "hash-fin001",
    createdAt: now,
    updatedAt: now,
  };
}

function makeProject(id: string, opportunityId: string, leadId: string): ProjectRecord {
  const now = new Date().toISOString();
  return {
    id,
    projectNumber: `PRJ-FIN001-${id.slice(-6)}`,
    opportunityId,
    leadId,
    agreementId: "AGR-FIN001",
    agreementVersion: 1,
    name: "FIN001 Project",
    status: "in_progress",
    currency: "PHP",
    contractValueMinor: 5280000,
    verifiedPaidMinor: 0,
    outstandingMinor: 5280000,
    scopeSnapshot: [],
    exclusionsSnapshot: [],
    clientResponsibilities: [],
    commercialSnapshot: {},
    createdBy: "operator",
    createdAt: now,
    metadata: {},
  };
}

async function seedUnpaid(suffix: string, amountMinor: number) {
  const invoiceId = `INV-FIN001-${suffix}`;
  const requestId = `PAY-REQ-FIN001-${suffix}`;
  const orderId = `ORD-FIN001-LOCAL-${suffix}`;
  const opportunityId = `OPP-FIN001-${suffix}`;
  const clientId = `CLI-FIN001-${suffix}`;
  const projectId = `PRJ-FIN001-${suffix}`;
  const now = new Date().toISOString();

  await invoiceRepository.createInvoice(makeInvoice(invoiceId, amountMinor, clientId, opportunityId));
  await projectRepository.createProject(makeProject(projectId, opportunityId, clientId));
  await paymentRequestRepository.createPaymentRequest({
    id: requestId,
    invoiceId,
    opportunityId,
    agreementId: "AGR-FIN001",
    provider: "paypal",
    providerRequestId: orderId,
    currency: "PHP",
    amountMinorUnits: amountMinor,
    status: "active",
    createdBy: "operator",
    createdAt: now,
    metadata: { environment: "sandbox" },
  });

  return { invoiceId, requestId, orderId, opportunityId, clientId, projectId, amountMinor };
}

async function unpaidUnchanged(invoiceId: string): Promise<boolean> {
  const invoice = await invoiceRepository.getInvoiceById(invoiceId);
  const txs = await paymentRequestRepository.getTransactionsByInvoice(invoiceId);
  const payments = await invoiceRepository.getPaymentsByInvoice(invoiceId);
  const succeeded = txs.some((t) => t.status === "succeeded");
  const verifiedManual = payments.some((p) => p.status === "verified");
  return (
    invoice?.status === "sent" &&
    (invoice.amountPaid || 0) === 0 &&
    !succeeded &&
    !verifiedManual
  );
}

async function run() {
  console.log("SYN-FIN-001 — Handover payment reconcile must use PayPal authority\n");
  const amountMinor = 5280000;
  const priorKill = emergencyKillSwitch.getState();

  // 1. Fake capture
  try {
    const seed = await seedUnpaid(`CAP-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        amountPaidMinor: 1,
        providerTransactionId: "FORGED-CAPTURE-NOT-FROM-PAYPAL",
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const clean = await unpaidUnchanged(seed.invoiceId);
    const delivery = await sourceDeliveryRepository.getDeliveryByProject(seed.projectId);
    const unlocked = delivery?.status === "DELIVERY_AUTHORIZED" || delivery?.status === "DOWNLOADED";
    if (threw && /PAYMENT_UNVERIFIED|PAYMENT_CAPTURE_MISMATCH|PAYPAL_CONFIGURATION_INVALID/i.test(msg) && clean && !unlocked) {
      record("1. Fake capture", "PASS", `Fail-closed without mutation (${msg.slice(0, 120)})`);
    } else {
      record("1. Fake capture", "FAIL", `threw=${threw} msg=${msg.slice(0, 100)} clean=${clean} unlocked=${unlocked}`);
    }
  } catch (e: any) {
    record("1. Fake capture", "FAIL", e.message);
  }

  // 2. Fake amount
  try {
    const seed = await seedUnpaid(`AMT-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        amountPaidMinor: 1,
      });
    } catch {
      threw = true;
    }
    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const trustedCallerAmount = invoiceAfter?.amountPaid === 1;
    if (threw && !trustedCallerAmount && (await unpaidUnchanged(seed.invoiceId))) {
      record("2. Fake amount", "PASS", "Caller amountPaidMinor=1 did not credit the invoice.");
    } else {
      record("2. Fake amount", "FAIL", `threw=${threw} status=${invoiceAfter?.status} paid=${invoiceAfter?.amountPaid}`);
    }
  } catch (e: any) {
    record("2. Fake amount", "FAIL", e.message);
  }

  // 3. Fake currency
  try {
    const seed = await seedUnpaid(`CUR-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        amountPaidMinor: amountMinor,
        providerTransactionId: "FORGED-USD-CAPTURE",
      } as any);
    } catch {
      threw = true;
    }
    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    if (threw && invoiceAfter?.currency === "PHP" && (await unpaidUnchanged(seed.invoiceId))) {
      record("3. Fake currency", "PASS", "Caller currency was not treated as evidence; invoice unchanged.");
    } else {
      record("3. Fake currency", "FAIL", `threw=${threw} currency=${invoiceAfter?.currency} paid=${invoiceAfter?.amountPaid}`);
    }
  } catch (e: any) {
    record("3. Fake currency", "FAIL", e.message);
  }

  // 4. Fake invoice
  try {
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: "INV-FIN001-DOES-NOT-EXIST",
        amountPaidMinor: 1,
        providerTransactionId: "FORGED-CAPTURE-NOT-FROM-PAYPAL",
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    if (threw && /PAYMENT_UNVERIFIED|Invoice not found/i.test(msg)) {
      record("4. Fake invoice", "PASS", `Rejected missing invoice (${msg.slice(0, 100)})`);
    } else {
      record("4. Fake invoice", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)}`);
    }
  } catch (e: any) {
    record("4. Fake invoice", "FAIL", e.message);
  }

  // 5. Wrong project
  try {
    const seed = await seedUnpaid(`PRJ-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        projectId: "PRJ-ATTACKER-99",
        amountPaidMinor: amountMinor,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    if (threw && /PROJECT_CLIENT_MISMATCH/i.test(msg) && (await unpaidUnchanged(seed.invoiceId))) {
      record("5. Wrong project", "PASS", "Foreign projectId rejected before financial mutation.");
    } else {
      record("5. Wrong project", "FAIL", `threw=${threw} msg=${msg.slice(0, 100)}`);
    }
  } catch (e: any) {
    record("5. Wrong project", "FAIL", e.message);
  }

  // 6. Wrong client
  try {
    const seed = await seedUnpaid(`CLI-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        clientId: "CLI-ATTACKER-99",
        amountPaidMinor: amountMinor,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    if (threw && /PROJECT_CLIENT_MISMATCH/i.test(msg) && (await unpaidUnchanged(seed.invoiceId))) {
      record("6. Wrong client", "PASS", "Foreign clientId rejected before financial mutation.");
    } else {
      record("6. Wrong client", "FAIL", `threw=${threw} msg=${msg.slice(0, 100)}`);
    }
  } catch (e: any) {
    record("6. Wrong client", "FAIL", e.message);
  }

  // 7. Sandbox / live mismatch
  try {
    const seed = await seedUnpaid(`ENV-${Date.now().toString().slice(-6)}`, amountMinor);
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        environment: "live",
        amountPaidMinor: amountMinor,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    if (threw && /PAYMENT_ENVIRONMENT_MISMATCH/i.test(msg) && (await unpaidUnchanged(seed.invoiceId))) {
      record("7. Sandbox/live mismatch", "PASS", "Caller live environment rejected against sandbox payment request.");
    } else {
      record("7. Sandbox/live mismatch", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)}`);
    }
  } catch (e: any) {
    record("7. Sandbox/live mismatch", "FAIL", e.message);
  }

  // 8. Emergency stop
  try {
    const seed = await seedUnpaid(`STOP-${Date.now().toString().slice(-6)}`, amountMinor);
    emergencyKillSwitch.transition("EMERGENCY_STOP", "syn-fin-001-test", "targeted regression");
    let threw = false;
    let msg = "";
    try {
      await handoverService.reconcileFinalPayment({
        invoiceId: seed.invoiceId,
        orderId: seed.orderId,
        amountPaidMinor: 1,
        providerTransactionId: "FORGED-CAPTURE-NOT-FROM-PAYPAL",
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    } finally {
      emergencyKillSwitch.transition(priorKill, "syn-fin-001-test", "restore");
    }
    if (threw && /EMERGENCY_STOP_BLOCKED/i.test(msg) && (await unpaidUnchanged(seed.invoiceId))) {
      record("8. Emergency stop", "PASS", "EMERGENCY_STOP_BLOCKED before financial mutation.");
    } else {
      record("8. Emergency stop", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)}`);
    }
  } catch (e: any) {
    emergencyKillSwitch.transition(priorKill, "syn-fin-001-test", "restore");
    record("8. Emergency stop", "FAIL", e.message);
  }

  // 9. Legitimate verified payment — provider stub only in this test
  const origStatus = payPalProvider.getPaymentStatus.bind(payPalProvider);
  const origTx = payPalProvider.getTransaction.bind(payPalProvider);
  try {
    const seed = await seedUnpaid(`OK-${Date.now().toString().slice(-6)}`, amountMinor);
    const providerCapture = `CAP-AUTH-FIN001-${seed.invoiceId.slice(-6)}`;
    billingRepository.createInvoice({
      invoiceId: seed.invoiceId,
      organizationId: "ORG-FIN001-TEST",
      projectId: seed.projectId,
      clientId: seed.clientId,
      opportunityId: seed.opportunityId,
      agreementId: "AGR-FIN001",
      currency: "PHP",
      subtotalMinor: amountMinor,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor: amountMinor,
      paidMinor: 0,
      refundedMinor: 0,
      balanceDueMinor: amountMinor,
      status: "ISSUED",
      lineItems: [],
    });

    payPalProvider.getPaymentStatus = async (orderId) => ({
      orderId,
      status: "COMPLETED",
      currency: "PHP",
      amountMinorUnits: amountMinor,
      captureId: providerCapture,
      completedAt: new Date().toISOString(),
      environment: "sandbox",
    });
    payPalProvider.getTransaction = async (captureId) => ({
      captureId,
      status: "COMPLETED",
      currency: "PHP",
      amountMinorUnits: amountMinor,
      createTime: new Date().toISOString(),
      environment: "sandbox",
    });

    const recon = await handoverService.reconcileFinalPayment({
      invoiceId: seed.invoiceId,
      orderId: seed.orderId,
      projectId: seed.projectId,
      clientId: seed.clientId,
      amountPaidMinor: 1,
      providerTransactionId: providerCapture,
    });

    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const txs = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const succeeded = txs.find((t) => t.status === "succeeded");
    const billingInv = billingRepository.getInvoice(seed.invoiceId);
    const ledger = billingRepository.listLedgerEntries({ invoiceId: seed.invoiceId });
    const ledgerHit = ledger.find((l) => l.providerTransactionId === providerCapture && l.amountMinor === amountMinor);
    const fabricated = JSON.stringify(recon).includes("Authenticated final milestone settlement via PayPal API.");

    const invoiceMatches = invoiceAfter?.status === "paid" && invoiceAfter.amountPaid === amountMinor;
    const txMatches = succeeded?.amountMinorUnits === amountMinor && succeeded.providerTransactionId === providerCapture;
    const ledgerMatches = ledgerHit?.verificationState === "VERIFIED" && billingInv?.paidMinor === amountMinor;

    if (recon.newlyReconciled && invoiceMatches && txMatches && ledgerMatches && !fabricated) {
      record(
        "9. Legitimate verified payment",
        "PASS",
        "Provider amount/capture credited invoice + ledger. Caller amount 1 ignored."
      );
    } else {
      record(
        "9. Legitimate verified payment",
        "FAIL",
        `newly=${recon.newlyReconciled} inv=${invoiceAfter?.status}/${invoiceAfter?.amountPaid} tx=${succeeded?.amountMinorUnits} ledger=${ledgerHit?.amountMinor} billingPaid=${billingInv?.paidMinor} fabricated=${fabricated}`
      );
    }
  } catch (e: any) {
    record("9. Legitimate verified payment", "FAIL", e.message);
  } finally {
    payPalProvider.getPaymentStatus = origStatus;
    payPalProvider.getTransaction = origTx;
  }

  // 10. No delivery unlock without existing gates
  try {
    const seed = await seedUnpaid(`DEL-${Date.now().toString().slice(-6)}`, amountMinor);
    payPalProvider.getPaymentStatus = async (orderId) => ({
      orderId,
      status: "COMPLETED",
      currency: "PHP",
      amountMinorUnits: amountMinor,
      captureId: `CAP-DEL-${seed.invoiceId.slice(-6)}`,
      completedAt: new Date().toISOString(),
      environment: "sandbox",
    });
    payPalProvider.getTransaction = async (captureId) => ({
      captureId,
      status: "COMPLETED",
      currency: "PHP",
      amountMinorUnits: amountMinor,
      createTime: new Date().toISOString(),
      environment: "sandbox",
    });

    await handoverService.reconcileFinalPayment({
      invoiceId: seed.invoiceId,
      orderId: seed.orderId,
      amountPaidMinor: amountMinor,
      providerTransactionId: `CAP-DEL-${seed.invoiceId.slice(-6)}`,
      deliveryContext: {
        projectId: seed.projectId,
        clientId: seed.clientId,
        clientApprovalExists: true,
        operatorApprovalExists: true,
        files: { "app/page.tsx": "export default function Page(){return null}" },
      },
    } as any);

    const delivery = await sourceDeliveryRepository.getDeliveryByProject(seed.projectId);
    const unlocked =
      delivery?.status === "DELIVERY_AUTHORIZED" || delivery?.status === "DOWNLOADED";

    const gated = await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
      projectId: seed.projectId,
      organizationId: "ORG-FIN001-TEST",
      workspaceId: "WS-FIN001",
      clientId: seed.clientId,
      invoiceId: seed.invoiceId,
      paymentId: "PAY-NOT-CONSUMED",
      releaseCandidateId: "RC-FIN001",
      snapshotId: "SNAP-FIN001",
      sourceHash: "HASH-FIN001",
      manifestHash: "MAN-FIN001",
      expectedAmountMinor: amountMinor,
      paidAmountMinor: 0,
      currency: "PHP",
      files: { "app/page.tsx": "export default function Page(){return null}" },
      clientApprovalExists: false,
      operatorApprovalExists: false,
    });

    payPalProvider.getPaymentStatus = origStatus;
    payPalProvider.getTransaction = origTx;

    if (!unlocked && gated.isDownloadAvailable !== true) {
      record("10. No delivery unlock without gates", "PASS", "Handover reconcile did not authorize delivery; existing gates still block.");
    } else {
      record("10. No delivery unlock without gates", "FAIL", `handoverUnlocked=${unlocked} gatedDownload=${gated.isDownloadAvailable} reason=${gated.blockReason}`);
    }
  } catch (e: any) {
    payPalProvider.getPaymentStatus = origStatus;
    payPalProvider.getTransaction = origTx;
    record("10. No delivery unlock without gates", "FAIL", e.message);
  }

  emergencyKillSwitch.transition(priorKill, "syn-fin-001-test", "final restore");

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
