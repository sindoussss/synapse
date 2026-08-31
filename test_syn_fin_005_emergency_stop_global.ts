/**
 * SYN-FIN-005 regression: Comprehensive emergency kill switch enforcement
 * across all mutation entry points and authoritative service boundaries.
 * 
 * Verifies that when EMERGENCY_STOP is active:
 * - All mutation paths fail closed with EMERGENCY_STOP_BLOCKED
 * - Zero authoritative state changes occur
 * - Zero external side effects occur
 * - Read-only operations (health, evidence, incidents, audit) remain available
 * - Returning to NORMAL state restores regular execution
 */
import fs from "fs";
import path from "path";

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

import { emergencyKillSwitch } from "./src/lib/services/security/emergency-kill-switch.service";
import { invoiceService } from "./src/lib/services/invoices/invoice.service";
import { invoiceRepository, InvoiceRecord, PaymentRecord } from "./src/lib/repositories/invoice.repository";
import { billingRepository } from "./src/lib/repositories/billing.repository";
import { paymentReconciliationService } from "./src/lib/services/billing/payment-reconciliation.service";
import { deploymentService } from "./src/lib/services/deployment.service";
import { deploymentRepository } from "./src/lib/repositories/deployment.repository";
import { redesignRepository } from "./src/lib/repositories/redesign.repository";
import { clientReviewService } from "./src/lib/services/client-review/client-review.service";
import { clientReviewRepository } from "./src/lib/repositories/client-review.repository";
import { developerAgentService } from "./src/lib/services/developer/developer-agent.service";
import { projectRepository, ProjectRecord } from "./src/lib/repositories/project.repository";
import { taskRepository } from "./src/lib/repositories/task.repository";
import { approvalRepository } from "./src/lib/repositories/approval.repository";
import { approvalControlService } from "./src/lib/services/approval/approval-control.service";
import { payPalService } from "./src/lib/services/payments/paypal.service";
import { paymentRequestRepository } from "./src/lib/repositories/payment-request.repository";
import { sourceDeliveryService } from "./src/lib/services/delivery/source-delivery.service";
import { productionReleaseService } from "./src/lib/services/production-release/production-release.service";
import { productionReleaseRepository, ProductionReleaseRecord } from "./src/lib/repositories/production-release.repository";
import { disasterRecoveryService } from "./src/lib/services/operations/disaster-recovery.service";
import { NextRequest } from "next/server";

// Import HTTP route handlers
import { POST as verifyPaymentRoute } from "./src/app/api/invoices/payments/verify/route";
import { POST as recordPaymentRoute } from "./src/app/api/invoices/payments/record/route";
import { POST as reversePaymentRoute } from "./src/app/api/invoices/payments/reverse/route";
import { POST as approveDeploymentRoute } from "./src/app/api/deployment/approve/route";
import { POST as approveApprovalsRoute } from "./src/app/api/approvals/approve/route";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

async function seedTestInvoice(suffix: string): Promise<{ invoice: InvoiceRecord; payment: PaymentRecord }> {
  const invoiceId = `INV-FIN005-${suffix}`;
  const paymentId = `PAY-FIN005-${suffix}`;
  const now = new Date().toISOString();

  const invoice: InvoiceRecord = {
    id: invoiceId,
    invoiceNumber: `INV-2026-${suffix}`,
    opportunityId: `OPP-${suffix}`,
    leadId: `LEAD-${suffix}`,
    agreementId: `AGR-${suffix}`,
    agreementVersion: 1,
    agreementDocumentId: `DOC-${suffix}`,
    status: "sent",
    currency: "PHP",
    taxStatus: "unconfigured",
    subtotal: 5000000,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 5000000,
    amountPaid: 0,
    balanceDue: 5000000,
    issueDate: now,
    dueDate: now,
    paymentTerms: "Net 15",
    billingEntity: { businessName: "SYNAPSE", representativeName: "Op", email: "billing@synapse.internal", address: "HQ" },
    clientEntity: { companyName: "Apex Logistics", contactName: "Client", email: "client@apex.com", address: "Client HQ" },
    lineItems: [{ description: "Base", quantity: 1, unitPrice: 5000000, amount: 5000000 }],
    contentHash: "hash-005",
    createdAt: now,
    updatedAt: now,
  };
  await invoiceRepository.createInvoice(invoice);

  const payment: PaymentRecord = {
    id: paymentId,
    invoiceId,
    opportunityId: `OPP-${suffix}`,
    agreementId: `AGR-${suffix}`,
    amount: 5000000,
    currency: "PHP",
    paymentMethod: "bank_transfer",
    paymentReference: `REF-${suffix}`,
    paymentDate: now,
    status: "pending_verification",
    recordedBy: "operator",
    recordedAt: now,
  };
  await invoiceRepository.createPaymentRecord(payment);

  return { invoice, payment };
}

async function runGlobalEmergencyStopTests() {
  console.log("SYN-FIN-005 — Comprehensive Global Emergency Stop Kill Switch Regression\n");

  // Activate Emergency Stop
  emergencyKillSwitch.transition("EMERGENCY_STOP", "OPERATOR_SECURITY", "SYN-FIN-005 Global Verification");
  if (emergencyKillSwitch.getState() !== "EMERGENCY_STOP") {
    throw new Error("Failed to set EMERGENCY_STOP operational state.");
  }

  // ── 1. Invoice verify blocked
  try {
    const { invoice, payment } = await seedTestInvoice("VERIFY");
    let blocked = false;
    try {
      await invoiceService.verifyPayment(payment.id);
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshInvoice = await invoiceRepository.getInvoiceById(invoice.id);
    const freshPayment = await invoiceRepository.getPaymentById(payment.id);
    if (blocked && freshInvoice?.amountPaid === 0 && freshPayment?.status === "pending_verification") {
      record("1. Invoice verify", "PASS", "EMERGENCY_STOP_BLOCKED; invoice balance and payment status unmutated.");
    } else {
      record("1. Invoice verify", "FAIL", `Verify mutated state: balanceDue=${freshInvoice?.balanceDue}, status=${freshPayment?.status}`);
    }
  } catch (e: any) {
    record("1. Invoice verify", "FAIL", e.message);
  }

  // ── 2. Invoice record blocked
  try {
    const { invoice } = await seedTestInvoice("RECORD");
    let blocked = false;
    try {
      await invoiceService.recordPayment({
        invoiceId: invoice.id,
        amount: 25000,
        paymentMethod: "bank_transfer",
        paymentReference: "REF-REC-1",
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const allPmts = await invoiceRepository.getPaymentsByInvoice(invoice.id);
    const recorded = allPmts.find((p) => p.paymentReference === "REF-REC-1");
    if (blocked && !recorded) {
      record("2. Invoice record", "PASS", "EMERGENCY_STOP_BLOCKED; no new payment record created.");
    } else {
      record("2. Invoice record", "FAIL", `Record allowed or payment created: ${recorded?.id}`);
    }
  } catch (e: any) {
    record("2. Invoice record", "FAIL", e.message);
  }

  // ── 3. Invoice reverse blocked
  try {
    const { invoice, payment } = await seedTestInvoice("REVERSE");
    // Manually mark verified in repo to test reverse
    await invoiceRepository.updatePayment(payment.id, { status: "verified" });
    await invoiceRepository.updateInvoice(invoice.id, { amountPaid: 5000000, balanceDue: 0, status: "paid" });

    let blocked = false;
    try {
      await invoiceService.reversePayment(payment.id, "Test reversal under emergency stop");
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshInvoice = await invoiceRepository.getInvoiceById(invoice.id);
    const freshPayment = await invoiceRepository.getPaymentById(payment.id);
    if (blocked && freshInvoice?.status === "paid" && freshPayment?.status === "verified") {
      record("3. Invoice reverse", "PASS", "EMERGENCY_STOP_BLOCKED; invoice remains paid and payment remains verified.");
    } else {
      record("3. Invoice reverse", "FAIL", `Reverse mutated state: invoice=${freshInvoice?.status}, payment=${freshPayment?.status}`);
    }
  } catch (e: any) {
    record("3. Invoice reverse", "FAIL", e.message);
  }

  // ── 4. Payment mutation (PayPal) blocked
  try {
    const { invoice } = await seedTestInvoice("PAYPAL");
    const payReq = await paymentRequestRepository.createPaymentRequest({
      id: "REQ-FIN005-PP",
      invoiceId: invoice.id,
      opportunityId: invoice.opportunityId,
      agreementId: invoice.agreementId,
      provider: "paypal",
      currency: "PHP",
      amountMinorUnits: 5000000,
      status: "pending_approval",
      createdBy: "operator",
      createdAt: new Date().toISOString(),
      metadata: { environment: "sandbox" },
    });

    let blocked = false;
    try {
      await payPalService.approveAndCreatePayPalOrder(payReq.id);
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshReq = await paymentRequestRepository.getPaymentRequestById(payReq.id);
    if (blocked && freshReq?.status === "pending_approval") {
      record("4. Payment mutation", "PASS", "EMERGENCY_STOP_BLOCKED; PayPal order creation blocked, request status unchanged.");
    } else {
      record("4. Payment mutation", "FAIL", `PayPal order created or status changed: ${freshReq?.status}`);
    }
  } catch (e: any) {
    record("4. Payment mutation", "FAIL", e.message);
  }

  // ── 5. Refund mutation blocked
  try {
    billingRepository.createInvoice({
      organizationId: "ORG-FIN005",
      projectId: "PRJ-FIN005",
      clientId: "CL-FIN005",
      invoiceId: "INV-FIN005-REFUND",
      currency: "PHP",
      subtotalMinor: 5000000,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor: 5000000,
      paidMinor: 5000000,
      refundedMinor: 0,
      balanceDueMinor: 0,
      status: "FULLY_PAID",
      lineItems: [],
      issuedAt: new Date().toISOString(),
    });

    let blocked = false;
    try {
      paymentReconciliationService.processRefund({
        invoiceId: "INV-FIN005-REFUND",
        organizationId: "ORG-FIN005",
        projectId: "PRJ-FIN005",
        clientId: "CL-FIN005",
        provider: "BANK_TRANSFER",
        providerTransactionId: "TX-REF-005",
        amountMinor: 5000000,
        currency: "PHP",
        environment: "CONTROLLED_TEST",
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshBillInv = billingRepository.getInvoice("INV-FIN005-REFUND", "ORG-FIN005");
    if (blocked && freshBillInv?.refundedMinor === 0 && freshBillInv?.status === "FULLY_PAID") {
      record("5. Refund mutation", "PASS", "EMERGENCY_STOP_BLOCKED; billing refund blocked, refundedMinor unchanged.");
    } else {
      record("5. Refund mutation", "FAIL", `Refund allowed: refundedMinor=${freshBillInv?.refundedMinor}`);
    }
  } catch (e: any) {
    record("5. Refund mutation", "FAIL", e.message);
  }

  // ── 6. Reversal mutation blocked
  try {
    let blocked = false;
    try {
      paymentReconciliationService.processReversal({
        invoiceId: "INV-FIN005-REFUND",
        organizationId: "ORG-FIN005",
        projectId: "PRJ-FIN005",
        clientId: "CL-FIN005",
        providerTransactionId: "TX-REV-005",
        amountMinor: 5000000,
        currency: "PHP",
        environment: "CONTROLLED_TEST",
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshBillInv = billingRepository.getInvoice("INV-FIN005-REFUND", "ORG-FIN005");
    if (blocked && freshBillInv?.refundedMinor === 0) {
      record("6. Reversal mutation", "PASS", "EMERGENCY_STOP_BLOCKED; billing reversal blocked, ledger unchanged.");
    } else {
      record("6. Reversal mutation", "FAIL", `Reversal allowed: status=${freshBillInv?.status}`);
    }
  } catch (e: any) {
    record("6. Reversal mutation", "FAIL", e.message);
  }

  // ── 7. Source delivery blocked
  try {
    let blocked = false;
    try {
      await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
        projectId: "PRJ-FIN005-DELIV",
        organizationId: "ORG-FIN005",
        workspaceId: "WS-FIN005",
        clientId: "CL-FIN005",
        invoiceId: "INV-FIN005-DELIV",
        paymentId: "PAY-FIN005-DELIV",
        releaseCandidateId: "RC-005",
        snapshotId: "SNAP-005",
        sourceHash: "hash-005",
        manifestHash: "man-005",
        expectedAmountMinor: 5000000,
        paidAmountMinor: 5000000,
        currency: "PHP",
        files: { "app/page.tsx": "export default function() {}" },
        clientApprovalExists: true,
        operatorApprovalExists: true,
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    if (blocked) {
      record("7. Source delivery", "PASS", "EMERGENCY_STOP_BLOCKED; source delivery authorization blocked.");
    } else {
      record("7. Source delivery", "FAIL", "Source delivery was authorized during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("7. Source delivery", "FAIL", e.message);
  }

  // ── 8. Production deployment blocked
  try {
    const rel: ProductionReleaseRecord = {
      id: "REL-FIN005-PROD",
      releaseNumber: "REL-2026-FIN005",
      projectId: "PRJ-FIN005-PROD",
      reviewSessionId: "REV-005",
      reviewNumber: "1",
      snapshotId: "SNAP-005",
      manifestHash: "man-005",
      qaRunId: "QA-005",
      deploymentProvider: "vercel",
      status: "waiting_release_approval",
      buildEvidence: {},
      securityEvidence: {},
      configurationEvidence: {},
      dnsPlan: {},
      healthEvidence: {},
      rollbackEvidence: {},
      requestedBy: "operator",
      requestedAt: new Date().toISOString(),
    };
    await productionReleaseRepository.createRelease(rel);

    let blocked = false;
    try {
      await productionReleaseService.approveProductionDeployment("REL-FIN005-PROD", "OPERATOR");
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshRel = await productionReleaseRepository.getReleaseById("REL-FIN005-PROD");
    if (blocked && freshRel?.status === "waiting_release_approval") {
      record("8. Production deployment", "PASS", "EMERGENCY_STOP_BLOCKED; production deployment approval blocked.");
    } else {
      record("8. Production deployment", "FAIL", `Production deploy status mutated: ${freshRel?.status}`);
    }
  } catch (e: any) {
    record("8. Production deployment", "FAIL", e.message);
  }

  // ── 9. Rollback blocked
  try {
    let blocked = false;
    try {
      await productionReleaseService.rollbackRelease("REL-FIN005-PROD", "OPERATOR");
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshRel = await productionReleaseRepository.getReleaseById("REL-FIN005-PROD");
    if (blocked && freshRel?.status === "waiting_release_approval") {
      record("9. Rollback", "PASS", "EMERGENCY_STOP_BLOCKED; rollback execution blocked.");
    } else {
      record("9. Rollback", "FAIL", `Rollback status mutated: ${freshRel?.status}`);
    }
  } catch (e: any) {
    record("9. Rollback", "FAIL", e.message);
  }

  // ── 10. Preview deployment blocked
  try {
    const redesignProj = await redesignRepository.create({
      companyName: "Apex Logistics",
      leadId: "lead-fin005",
      taskId: "task-fin005",
      status: "approved",
      designBrief: { companyName: "Apex", designDirection: "Modern", targetAudience: "All", primaryGoal: "Sales", preserve: [], improve: [], pageSections: [], visualDirection: { style: "", typography: "", layout: "", imagery: "", motion: "" } },
      generatedFiles: [],
      previewPath: "",
      validationResults: { valid: true, checks: [], repairAttempts: 0 },
    });
    const dep = await deploymentRepository.create({
      redesignProjectId: redesignProj.id,
      leadId: "lead-fin005",
      taskId: "task-fin005",
      provider: "vercel",
      deploymentType: "preview",
      status: "pending_approval",
      buildLogs: [],
      validationResults: { valid: true, checks: [] },
      requestedAt: new Date().toISOString(),
    });

    let blocked = false;
    try {
      await deploymentService.approveDeployment(dep.id);
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    const freshDep = await deploymentRepository.getById(dep.id);
    if (blocked && freshDep?.status === "pending_approval") {
      record("10. Preview deployment", "PASS", "EMERGENCY_STOP_BLOCKED; preview deployment approval blocked.");
    } else {
      record("10. Preview deployment", "FAIL", `Preview deployment status mutated: ${freshDep?.status}`);
    }
  } catch (e: any) {
    record("10. Preview deployment", "FAIL", e.message);
  }

  // ── 11. Approval mutation blocked
  try {
    const appRecord = await approvalRepository.create({
      taskId: "task-fin005-appr",
      action: "Outreach Message Approval",
      description: "Send commercial email",
      riskLevel: "medium",
      payload: {
        recipient: "client@apex.com",
        body: "Hello from Apex",
      },
    });

    const token = process.env.SYNAPSE_OPERATOR_TOKEN || "test-op-token";
    process.env.SYNAPSE_OPERATOR_TOKEN = token;

    const mockReq = new NextRequest("http://localhost:3000/api/approvals/approve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ approvalId: appRecord.id }),
    });

    const httpRes = await approveApprovalsRoute(mockReq);
    const json = await httpRes.json();

    const freshApp = await approvalRepository.getById(appRecord.id);
    if (httpRes.status === 400 && json.ok === false && json.error?.includes("EMERGENCY_STOP_BLOCKED") && freshApp?.status !== "approved") {
      record("11. Approval mutation", "PASS", "EMERGENCY_STOP_BLOCKED; /api/approvals/approve returned 400 and approval status unmutated.");
    } else {
      record("11. Approval mutation", "FAIL", `Approval route returned ${httpRes.status}, status=${freshApp?.status}`);
    }
  } catch (e: any) {
    record("11. Approval mutation", "FAIL", e.message);
  }

  // ── 12. DNS/domain mutation blocked
  try {
    let blocked = false;
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: "REL-FIN005-PROD",
        domainName: "apex.casili.dev",
        actorRole: "OPERATOR",
        callerOrgId: "ORG-CASILI-01",
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    if (blocked) {
      record("12. DNS/domain mutation", "PASS", "EMERGENCY_STOP_BLOCKED; DNS cutover blocked.");
    } else {
      record("12. DNS/domain mutation", "FAIL", "DNS cutover allowed during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("12. DNS/domain mutation", "FAIL", e.message);
  }

  // ── 13. Configuration / Source mutation blocked
  try {
    const prj: ProjectRecord = {
      id: "PRJ-FIN005-DEV",
      projectNumber: "PRJ-2026-FIN005-DEV",
      leadId: "LEAD-FIN005",
      opportunityId: "OPP-FIN005",
      agreementId: "AGR-FIN005",
      agreementVersion: 1,
      name: "Dev Project",
      status: "in_progress",
      currency: "PHP",
      contractValueMinor: 5000000,
      verifiedPaidMinor: 0,
      outstandingMinor: 5000000,
      scopeSnapshot: [{ id: "1", title: "Homepage", description: "Homepage scope", classification: "internal_implementation" }],
      exclusionsSnapshot: [],
      clientResponsibilities: [],
      commercialSnapshot: {},
      createdBy: "operator",
      createdAt: new Date().toISOString(),
      metadata: {},
    };
    await projectRepository.createProject(prj);

    const tsk = await taskRepository.create({
      title: "Homepage Redesign",
      description: "Implement homepage",
      type: "Feature Implementation",
      status: "queued",
      priority: "medium",
      assignedAgentId: "agent-dev-1",
    });

    let blocked = false;
    try {
      await developerAgentService.executeTask({
        projectId: prj.id,
        taskId: tsk.id,
        taskTitle: "Homepage Redesign",
      });
    } catch (e: any) {
      blocked = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }
    if (blocked) {
      record("13. Configuration mutation", "PASS", "EMERGENCY_STOP_BLOCKED; developer task execution and source file mutation blocked.");
    } else {
      record("13. Configuration mutation", "FAIL", "Developer executeTask succeeded during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("13. Configuration mutation", "FAIL", e.message);
  }

  // ── 14. Maintenance mutation blocked
  try {
    const maintOp = emergencyKillSwitch.isOperationAllowed("MAINTENANCE_MUTATION");
    if (!maintOp.allowed && maintOp.blockedReason?.includes("EMERGENCY_STOP")) {
      record("14. Maintenance mutation", "PASS", "MAINTENANCE_MUTATION blocked under EMERGENCY_STOP policy.");
    } else {
      record("14. Maintenance mutation", "FAIL", `Maintenance allowed: ${JSON.stringify(maintOp)}`);
    }
  } catch (e: any) {
    record("14. Maintenance mutation", "FAIL", e.message);
  }

  // ── 15. Direct service invocation blocked
  try {
    let blockedReconcile = false;
    try {
      paymentReconciliationService.reconcilePayment({
        invoiceId: "INV-BILLING-REPRO",
        organizationId: "ORG-REPRO",
        projectId: "PRJ-REPRO",
        clientId: "CL-REPRO",
        provider: "BANK_TRANSFER",
        providerTransactionId: "TX-DIRECT-005",
        amountMinor: 10000,
        currency: "PHP",
        environment: "CONTROLLED_TEST",
      });
    } catch (e: any) {
      blockedReconcile = e.message.includes("EMERGENCY_STOP_BLOCKED");
    }

    if (blockedReconcile) {
      record("15. Direct service invocation", "PASS", "Direct in-process service calls fail-closed before repository mutation.");
    } else {
      record("15. Direct service invocation", "FAIL", "Direct service call bypassed kill switch.");
    }
  } catch (e: any) {
    record("15. Direct service invocation", "FAIL", e.message);
  }

  // ── 16. HTTP route invocation blocked
  try {
    // Test verifyPayment HTTP route with operator auth token
    const token = process.env.SYNAPSE_OPERATOR_TOKEN || "test-op-token";
    process.env.SYNAPSE_OPERATOR_TOKEN = token;

    const mockReq = new NextRequest("http://localhost:3000/api/invoices/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId: "PAY-FIN005-VERIFY" }),
    });

    const httpRes = await verifyPaymentRoute(mockReq);
    const json = await httpRes.json();

    if (httpRes.status === 400 && json.ok === false && json.error?.includes("EMERGENCY_STOP_BLOCKED")) {
      record("16. HTTP route invocation", "PASS", "HTTP route caught service exception and returned 400 with EMERGENCY_STOP_BLOCKED.");
    } else {
      record("16. HTTP route invocation", "FAIL", `HTTP response status=${httpRes.status}, body=${JSON.stringify(json)}`);
    }
  } catch (e: any) {
    record("16. HTTP route invocation", "FAIL", e.message);
  }

  // ── 17. Read-only health allowed
  try {
    const healthCheck = emergencyKillSwitch.isOperationAllowed("HEALTH_CHECK");
    if (healthCheck.allowed) {
      record("17. Read-only health allowed", "PASS", "HEALTH_CHECK operation explicitly permitted during EMERGENCY_STOP.");
    } else {
      record("17. Read-only health allowed", "FAIL", "HEALTH_CHECK was blocked during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("17. Read-only health allowed", "FAIL", e.message);
  }

  // ── 18. Read-only evidence allowed
  try {
    const evidenceOp = emergencyKillSwitch.isOperationAllowed("EVIDENCE_COLLECTION");
    const auditOp = emergencyKillSwitch.isOperationAllowed("AUDIT_INSPECTION");
    if (evidenceOp.allowed && auditOp.allowed) {
      record("18. Read-only evidence allowed", "PASS", "EVIDENCE_COLLECTION and AUDIT_INSPECTION permitted during EMERGENCY_STOP.");
    } else {
      record("18. Read-only evidence allowed", "FAIL", "Evidence / audit inspection blocked during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("18. Read-only evidence allowed", "FAIL", e.message);
  }

  // ── 19. Incident creation allowed
  try {
    const incidentOp = emergencyKillSwitch.isOperationAllowed("INCIDENT_CREATION");
    const postmortem = disasterRecoveryService.recordPostmortem({
      incidentId: "INC-FIN005-01",
      projectId: "PRJ-FIN005",
      rootCause: "Kill switch triggered for audit",
      affectedDeployments: [],
      evidenceIds: ["EVID-005"],
      mitigation: "Safety stop verified",
      resolution: "Clean fail closed",
      recoveryTimeMs: 120,
      rollbackOccurred: false,
    });
    if (incidentOp.allowed && postmortem.postmortemId) {
      record("19. Incident creation allowed", "PASS", "INCIDENT_CREATION permitted; postmortem recorded during EMERGENCY_STOP.");
    } else {
      record("19. Incident creation allowed", "FAIL", "Incident logging blocked during EMERGENCY_STOP.");
    }
  } catch (e: any) {
    record("19. Incident creation allowed", "FAIL", e.message);
  }

  // ── 20. Emergency stop release restores normal behavior
  try {
    emergencyKillSwitch.transition("NORMAL", "OPERATOR_SECURITY", "Release EMERGENCY_STOP");
    const state = emergencyKillSwitch.getState();
    const depCheck = emergencyKillSwitch.isOperationAllowed("DEPLOYMENT");
    const payCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    const srcCheck = emergencyKillSwitch.isOperationAllowed("SOURCE_MUTATION");

    if (state === "NORMAL" && depCheck.allowed && payCheck.allowed && srcCheck.allowed) {
      record("20. Emergency stop release restores normal behavior", "PASS", "Transition to NORMAL restored all mutation allowances.");
    } else {
      record("20. Emergency stop release restores normal behavior", "FAIL", `State not restored: state=${state}, dep=${depCheck.allowed}, pay=${payCheck.allowed}`);
    }
  } catch (e: any) {
    record("20. Emergency stop release restores normal behavior", "FAIL", e.message);
  }

  // Summary
  const passed = Object.values(results).filter((r) => r.status === "PASS").length;
  const failed = Object.values(results).filter((r) => r.status === "FAIL").length;
  console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runGlobalEmergencyStopTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
