/**
 * SYN-BUG-003 regression: refund / dispute / reversal must resolve the
 * capture → invoice → delivery chain. Webhook custom_id is a payment-request
 * ID, not a project ID. Historical succeeded payments must be preserved.
 */
import fs from "fs";
import crypto from "crypto";

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
import { paymentRequestRepository, PaymentTransactionRecord } from "./src/lib/repositories/payment-request.repository";
import { sourceDeliveryRepository } from "./src/lib/repositories/source-delivery.repository";
import { payPalService } from "./src/lib/services/payments/paypal.service";
import { sourceDeliveryService } from "./src/lib/services/delivery/source-delivery.service";
import { securityAuditService } from "./src/lib/services/security/security-audit.service";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

function makeInvoice(id: string, amountMinor: number): InvoiceRecord {
  const now = new Date().toISOString();
  return {
    id,
    invoiceNumber: `INV-BUG003-${id.slice(-6)}`,
    opportunityId: "OPP-BUG003",
    leadId: "LEAD-BUG003",
    agreementId: "AGR-BUG003",
    agreementVersion: 1,
    agreementDocumentId: "DOC-BUG003",
    status: "paid",
    currency: "PHP",
    subtotal: amountMinor,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: amountMinor,
    amountPaid: amountMinor,
    balanceDue: 0,
    issueDate: now,
    dueDate: now,
    paymentTerms: "due_on_receipt",
    billingEntity: { businessName: "Synapse Operations", email: "ops@example.com" },
    clientEntity: { companyName: "Bug003 Test Client", email: "client@example.com" },
    lineItems: [{ description: "Test", quantity: 1, unitPrice: amountMinor, amount: amountMinor }],
    taxStatus: "not_applicable",
    contentHash: "hash-bug003",
    createdAt: now,
    updatedAt: now,
    paidAt: now,
  };
}

const FILES = { "app/page.tsx": "export default function Page(){return null}" };
const PACKAGE_HASH = crypto.createHash("sha256").update(Object.values(FILES).join("\n")).digest("hex");

async function seedPaidAuthorized(suffix: string, amountMinor: number) {
  const invoiceId = `INV-BUG003-${suffix}`;
  const requestId = `PAY-REQ-BUG003-${suffix}`;
  const orderId = `ORD-BUG003-${suffix}`;
  const captureId = `CAP-BUG003-${suffix}`;
  const txId = `PAY-TX-BUG003-${suffix}`;
  const deliveryId = `DELIV-BUG003-${suffix}`;
  const projectId = `PRJ-BUG003-${suffix}`;
  const now = new Date().toISOString();

  await invoiceRepository.createInvoice(makeInvoice(invoiceId, amountMinor));
  await paymentRequestRepository.createPaymentRequest({
    id: requestId,
    invoiceId,
    opportunityId: "OPP-BUG003",
    agreementId: "AGR-BUG003",
    provider: "paypal",
    providerRequestId: orderId,
    currency: "PHP",
    amountMinorUnits: amountMinor,
    status: "completed",
    createdBy: "operator",
    createdAt: now,
    completedAt: now,
    metadata: { environment: "sandbox" },
  });

  const originalTx: PaymentTransactionRecord = {
    id: txId,
    paymentRequestId: requestId,
    invoiceId,
    provider: "paypal",
    providerOrderId: orderId,
    providerTransactionId: captureId,
    providerEventId: `EVT-CAP-${suffix}`,
    currency: "PHP",
    amountMinorUnits: amountMinor,
    status: "succeeded",
    createdAt: now,
    updatedAt: now,
    metadata: { captureId, environment: "sandbox" },
  };
  await paymentRequestRepository.createPaymentTransaction(originalTx);

  await sourceDeliveryRepository.saveDelivery({
    deliveryId,
    projectId,
    organizationId: "ORG-CASILI-01",
    workspaceId: "WS-BUG003",
    clientId: "CLI-BUG003",
    invoiceId,
    paymentId: txId,
    releaseCandidateId: "RC-BUG003",
    snapshotId: "SNAP-BUG003",
    sourceHash: "HASH-BUG003",
    manifestHash: "MAN-BUG003",
    packageHash: PACKAGE_HASH,
    status: "DELIVERY_AUTHORIZED",
    createdAt: now,
    authorizedAt: now,
    fileCount: 1,
    totalSizeBytes: 40,
  });

  return { invoiceId, requestId, orderId, captureId, txId, deliveryId, projectId, originalTx };
}

async function run() {
  console.log("SYN-BUG-003 — Refund / dispute / reversal → delivery revocation\n");
  const amountMinor = 250000;

  // 1. PAYMENT.CAPTURE.REFUNDED as the webhook actually maps custom_id
  try {
    const seed = await seedPaidAuthorized(`RF-${Date.now().toString().slice(-6)}`, amountMinor);
    const refundId = `REF-BUG003-${seed.captureId.slice(-6)}`;
    const res = await payPalService.handleRefundWebhook({
      captureId: seed.captureId,
      refundId,
      projectId: seed.requestId,
    });

    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const txs = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const original = txs.find((t) => t.id === seed.txId);
    const compensating = txs.filter((t) => t.id !== seed.txId && (t.status === "refunded" || t.metadata?.refundId === refundId));
    const delivery = await sourceDeliveryRepository.getDelivery(seed.deliveryId);
    const download = await sourceDeliveryService.downloadSourcePackage({
      deliveryId: seed.deliveryId,
      requestingClientId: "CLI-BUG003",
      requestingOrganizationId: "ORG-CASILI-01",
      files: FILES,
    });

    const originalPreserved = original?.status === "succeeded";
    const invoiceUnwound = invoiceAfter?.status !== "paid" && (invoiceAfter?.amountPaid || 0) === 0;
    const deliveryRevoked = delivery?.status === "REVOKED" || delivery?.status === "DELIVERY_INVALIDATED";
    const downloadBlocked = download.success === false;
    const replay = await payPalService.handleRefundWebhook({
      captureId: seed.captureId,
      refundId,
      projectId: seed.requestId,
    });
    const txsAfterReplay = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const refundRows = txsAfterReplay.filter((t) => t.metadata?.refundId === refundId || (t.status === "refunded" && t.id !== seed.txId));
    const idempotent = refundRows.length <= 1 && replay.deliveryRevoked === true;

    if (res.deliveryRevoked && originalPreserved && invoiceUnwound && deliveryRevoked && downloadBlocked && compensating.length >= 1 && idempotent) {
      record("1. PAYMENT.CAPTURE.REFUNDED via custom_id mapping", "PASS", "Invoice unwound, original capture preserved, delivery revoked, download blocked, refund idempotent.");
    } else {
      record(
        "1. PAYMENT.CAPTURE.REFUNDED via custom_id mapping",
        "FAIL",
        `deliveryRevoked=${res.deliveryRevoked} orig=${original?.status} invoice=${invoiceAfter?.status}/${invoiceAfter?.amountPaid} deliv=${delivery?.status} download=${download.success} compensating=${compensating.length} idempotent=${idempotent}`
      );
    }
  } catch (e: any) {
    record("1. PAYMENT.CAPTURE.REFUNDED via custom_id mapping", "FAIL", e.message);
  }

  // 2. CUSTOMER.DISPUTE.CREATED — suspend delivery, do not delete payment, money not returned yet
  try {
    const seed = await seedPaidAuthorized(`DP-${Date.now().toString().slice(-6)}`, amountMinor);
    const disputeId = `DISP-BUG003-${seed.captureId.slice(-6)}`;
    const res = await payPalService.handleReversalWebhook({
      captureId: seed.captureId,
      disputeId,
      projectId: seed.requestId,
      eventKind: "DISPUTE",
    });

    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const txs = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const original = txs.find((t) => t.id === seed.txId);
    const delivery = await sourceDeliveryRepository.getDelivery(seed.deliveryId);
    const download = await sourceDeliveryService.downloadSourcePackage({
      deliveryId: seed.deliveryId,
      requestingClientId: "CLI-BUG003",
      requestingOrganizationId: "ORG-CASILI-01",
      files: FILES,
    });

    const originalPreserved = original?.status === "succeeded";
    const invoiceStillHistorical = (invoiceAfter?.amountPaid || 0) === amountMinor;
    const deliverySuspended = delivery?.status === "DELIVERY_INVALIDATED" || delivery?.status === "REVOKED";
    const downloadBlocked = download.success === false;

    if (res.deliveryRevoked && originalPreserved && invoiceStillHistorical && deliverySuspended && downloadBlocked) {
      record("2. CUSTOMER.DISPUTE.CREATED", "PASS", "Delivery suspended, download blocked, original payment and invoice paid amount preserved.");
    } else {
      record(
        "2. CUSTOMER.DISPUTE.CREATED",
        "FAIL",
        `deliveryRevoked=${res.deliveryRevoked} orig=${original?.status} paid=${invoiceAfter?.amountPaid} deliv=${delivery?.status} download=${download.success}`
      );
    }
  } catch (e: any) {
    record("2. CUSTOMER.DISPUTE.CREATED", "FAIL", e.message);
  }

  // 3. PAYMENT.CAPTURE.REVERSED — money gone: unwind invoice + invalidate delivery
  try {
    const seed = await seedPaidAuthorized(`RV-${Date.now().toString().slice(-6)}`, amountMinor);
    const disputeId = `REV-BUG003-${seed.captureId.slice(-6)}`;
    const res = await payPalService.handleReversalWebhook({
      captureId: seed.captureId,
      disputeId,
      projectId: seed.requestId,
      eventKind: "REVERSAL",
    });

    const invoiceAfter = await invoiceRepository.getInvoiceById(seed.invoiceId);
    const txs = await paymentRequestRepository.getTransactionsByInvoice(seed.invoiceId);
    const original = txs.find((t) => t.id === seed.txId);
    const compensating = txs.filter((t) => t.id !== seed.txId);
    const delivery = await sourceDeliveryRepository.getDelivery(seed.deliveryId);
    const download = await sourceDeliveryService.downloadSourcePackage({
      deliveryId: seed.deliveryId,
      requestingClientId: "CLI-BUG003",
      requestingOrganizationId: "ORG-CASILI-01",
      files: FILES,
    });

    const originalPreserved = original?.status === "succeeded";
    const invoiceUnwound = invoiceAfter?.status !== "paid" && (invoiceAfter?.amountPaid || 0) === 0;
    const deliverySuspended = delivery?.status === "DELIVERY_INVALIDATED" || delivery?.status === "REVOKED";
    const downloadBlocked = download.success === false;

    if (res.deliveryRevoked && originalPreserved && invoiceUnwound && deliverySuspended && downloadBlocked && compensating.length >= 1) {
      record("3. PAYMENT.CAPTURE.REVERSED", "PASS", "Reversal unwound invoice, preserved original capture, invalidated delivery, blocked download.");
    } else {
      record(
        "3. PAYMENT.CAPTURE.REVERSED",
        "FAIL",
        `deliveryRevoked=${res.deliveryRevoked} orig=${original?.status} invoice=${invoiceAfter?.status}/${invoiceAfter?.amountPaid} deliv=${delivery?.status} download=${download.success} compensating=${compensating.length}`
      );
    }
  } catch (e: any) {
    record("3. PAYMENT.CAPTURE.REVERSED", "FAIL", e.message);
  }

  // 4. Capture-only (no projectId) must still revoke — production webhook after mapping fix
  try {
    const seed = await seedPaidAuthorized(`CO-${Date.now().toString().slice(-6)}`, amountMinor);
    const res = await payPalService.handleRefundWebhook({
      captureId: seed.captureId,
      refundId: `REF-CO-${seed.captureId.slice(-6)}`,
    });
    const delivery = await sourceDeliveryRepository.getDelivery(seed.deliveryId);
    if (res.deliveryRevoked && (delivery?.status === "REVOKED" || delivery?.status === "DELIVERY_INVALIDATED")) {
      record("4. Refund by captureId without projectId", "PASS", "Capture→invoice→delivery chain revoked without webhook projectId.");
    } else {
      record("4. Refund by captureId without projectId", "FAIL", `deliveryRevoked=${res.deliveryRevoked} status=${delivery?.status}`);
    }
  } catch (e: any) {
    record("4. Refund by captureId without projectId", "FAIL", e.message);
  }

  // 5. Phase 49 test 27 — sentinel assignment is intercepted (no live secret printed)
  try {
    const fixture = "Included GMAIL_APP_PASSWORD=SYN-TEST-SENTINEL-NOT-A-REAL-SECRET in package bundle";
    const finding = securityAuditService.auditSecretExposure(fixture, "delivery_package");
    if (finding && finding.severity === "CRITICAL") {
      record("5. Phase 49 test 27 classification", "PASS", "Scanner flags secret-assignment sentinel in package fixture without requiring the live env value.");
    } else {
      record("5. Phase 49 test 27 classification", "FAIL", "Sentinel assignment was not intercepted.");
    }
  } catch (e: any) {
    record("5. Phase 49 test 27 classification", "FAIL", e.message);
  }

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
