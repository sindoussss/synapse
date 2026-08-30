import fs from "fs";
import path from "path";
import crypto from "crypto";

// Load .env.local
if (fs.existsSync(".env.local")) {
  const e = fs.readFileSync(".env.local", "utf8");
  e.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const idx = t.indexOf("="); const k = t.slice(0,idx).trim(); const v = t.slice(idx+1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

import { securityAuditService } from "./src/lib/services/security/security-audit.service";
import { integrityVerificationService } from "./src/lib/services/security/integrity-verification.service";
import { privilegedActionFirewall } from "./src/lib/services/security/privileged-action-firewall.service";
import { emergencyKillSwitch } from "./src/lib/services/security/emergency-kill-switch.service";
import { consistencyAuditService } from "./src/lib/services/security/consistency-audit.service";
import { projectIsolationService } from "./src/lib/services/security/project-isolation.service";
import { productionReleaseService } from "./src/lib/services/production-release/production-release.service";
import { sourceDeliveryService } from "./src/lib/services/delivery/source-delivery.service";
import { payPalService } from "./src/lib/services/payments/paypal.service";
import { payPalProvider } from "./src/lib/services/payments/paypal.provider";
import { developerAgentService } from "./src/lib/services/developer/developer-agent.service";
import { retryService } from "./src/lib/services/operations/retry.service";
import { disasterRecoveryService } from "./src/lib/services/operations/disaster-recovery.service";
import { productionReleaseRepository } from "./src/lib/repositories/production-release.repository";
import { sourceDeliveryRepository } from "./src/lib/repositories/source-delivery.repository";
import { paymentRequestRepository } from "./src/lib/repositories/payment-request.repository";
import { invoiceRepository } from "./src/lib/repositories/invoice.repository";

const results: Record<string, { status: "PASS" | "FAIL" | "UNKNOWN" | "BLOCKED" | "NOT_APPLICABLE"; details: string }> = {};

const ORG_A = "ORG-CASILI-01";
const ORG_B = "ORG-ATTACKER-99";
const PRJ_A = "PRJ-SINDOUS-01";
const PRJ_B = "PRJ-OTHER-01";
const WS_A = "WS-SINDOUS-01";
const WS_B = "WS-OTHER-01";

function record(name: string, status: "PASS" | "FAIL" | "UNKNOWN" | "BLOCKED" | "NOT_APPLICABLE", details: string) {
  results[name] = { status, details };
}

async function runIndependentVerification() {
  console.log("================================================================================");
  console.log("🔍 SYNAPSE PHASE 48 — INDEPENDENT FORENSIC PRODUCTION VERIFICATION");
  console.log("================================================================================\n");

  // ── TEST 1: Real Tenant Isolation ──────────────────────────────────────────
  try {
    const check1 = projectIsolationService.validateIsolation(
      { organizationId: ORG_B, workspaceId: WS_A, projectId: PRJ_A, clientId: "CLI-1" },
      { organizationId: ORG_A, workspaceId: WS_A, projectId: PRJ_A, clientId: "CLI-1" }
    );
    const audit1 = securityAuditService.auditTenantIsolation(ORG_B, ORG_A, PRJ_A);
    if (!check1.allowed && check1.violationType === "TENANT_BOUNDARY_VIOLATION" && audit1?.severity === "CRITICAL") {
      record("1. Real Tenant Isolation", "PASS", "Cross-tenant access rejected and logged with CRITICAL severity.");
    } else {
      record("1. Real Tenant Isolation", "FAIL", "Tenant boundary check did not fail closed.");
    }
  } catch (err: any) {
    record("1. Real Tenant Isolation", "FAIL", err.message);
  }

  // ── TEST 2: Real Project Isolation ─────────────────────────────────────────
  try {
    const check2 = projectIsolationService.validateIsolation(
      { organizationId: ORG_A, workspaceId: WS_A, projectId: PRJ_B, clientId: "CLI-1" },
      { organizationId: ORG_A, workspaceId: WS_A, projectId: PRJ_A, clientId: "CLI-1" }
    );
    if (!check2.allowed && check2.violationType === "PROJECT_BOUNDARY_VIOLATION") {
      record("2. Real Project Isolation", "PASS", "Cross-project boundary rejected deterministically.");
    } else {
      record("2. Real Project Isolation", "FAIL", "Project boundary violation was not detected.");
    }
  } catch (err: any) {
    record("2. Real Project Isolation", "FAIL", err.message);
  }

  // ── TEST 3: Real Authorization Boundary (Privileged Firewall) ──────────────
  try {
    const check3ai = privilegedActionFirewall.evaluate({ action: "PRODUCTION_DEPLOYMENT", actor: "ai-agent", actorRole: "AI_DEVELOPER_AGENT" });
    const check3client = privilegedActionFirewall.evaluate({ action: "PAYMENT_MUTATION", actor: "client", actorRole: "CLIENT_SESSION" });
    const check3webhook = privilegedActionFirewall.evaluate({ action: "SOURCE_DELIVERY_AUTHORIZATION", actor: "webhook", actorRole: "WEBHOOK" });
    const check3worker = privilegedActionFirewall.evaluate({ action: "ROLLBACK", actor: "worker", actorRole: "BACKGROUND_WORKER" });
    const check3operator = privilegedActionFirewall.evaluate({ action: "PRODUCTION_DEPLOYMENT", actor: "operator", actorRole: "OPERATOR" });

    if (!check3ai.allowed && !check3client.allowed && !check3webhook.allowed && !check3worker.allowed && check3operator.allowed) {
      record("3. Real Authorization Boundary", "PASS", "All non-operator roles strictly denied privileged operations; operator allowed.");
    } else {
      record("3. Real Authorization Boundary", "FAIL", "Privileged firewall role matrix violation.");
    }
  } catch (err: any) {
    record("3. Real Authorization Boundary", "FAIL", err.message);
  }

  // ── TEST 4: Real Deployment Protection at Service Boundary ──────────────────
  try {
    let aiDeployBlocked = false;
    try {
      await productionReleaseService.approveProductionDeployment("REL-CAND-NONEXISTENT", "AI_DEVELOPER_AGENT");
    } catch (e: any) {
      aiDeployBlocked = e.message.includes("UNAUTHORIZED_OPERATION");
    }
    if (aiDeployBlocked) {
      record("4. Real Deployment Protection", "PASS", "Service-level deployment call by AI agent blocked before execution.");
    } else {
      record("4. Real Deployment Protection", "FAIL", "Deployment service permitted non-operator caller.");
    }
  } catch (err: any) {
    record("4. Real Deployment Protection", "FAIL", err.message);
  }

  // ── TEST 5: Real Rollback Protection at Service Boundary ────────────────────
  try {
    let clientRollbackBlocked = false;
    try {
      await productionReleaseService.rollbackRelease("REL-CAND-NONEXISTENT", "CLIENT_SESSION");
    } catch (e: any) {
      clientRollbackBlocked = e.message.includes("UNAUTHORIZED_OPERATION");
    }
    if (clientRollbackBlocked) {
      record("5. Real Rollback Protection", "PASS", "Service-level rollback call by client session blocked before execution.");
    } else {
      record("5. Real Rollback Protection", "FAIL", "Rollback service permitted client session caller.");
    }
  } catch (err: any) {
    record("5. Real Rollback Protection", "FAIL", err.message);
  }

  // ── TEST 6: Real Payment Gating (Unpaid Invoice) ───────────────────────────
  try {
    const unpayRes = await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
      projectId: PRJ_A,
      organizationId: ORG_A,
      workspaceId: WS_A,
      clientId: "CLI-SINDOUS",
      invoiceId: "INV-UNPAID-TEST",
      paymentId: "PAY-UNPAID-TEST",
      releaseCandidateId: "REL-TEST",
      snapshotId: "SNAP-TEST",
      sourceHash: "HASH-TEST",
      manifestHash: "MAN-TEST",
      expectedAmountMinor: 500000,
      paidAmountMinor: 0,
      currency: "PHP",
      files: { "index.tsx": "console.log('hi')" },
      clientApprovalExists: true,
      operatorApprovalExists: true,
    });
    if (unpayRes.status === "PAYMENT_VERIFICATION_FAILED" && !unpayRes.isDownloadAvailable) {
      record("6. Real Payment Gating", "PASS", "Unpaid balance correctly blocked source code delivery authorization.");
    } else {
      record("6. Real Payment Gating", "FAIL", "Unpaid delivery returned unexpected status: " + unpayRes.status);
    }
  } catch (err: any) {
    record("6. Real Payment Gating", "FAIL", err.message);
  }

  // ── TEST 7: Real Source Delivery Gating (Missing Approvals) ─────────────────
  try {
    const noApproveRes = await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
      projectId: PRJ_A,
      organizationId: ORG_A,
      workspaceId: WS_A,
      clientId: "CLI-SINDOUS",
      invoiceId: "INV-PAID-TEST",
      paymentId: "PAY-PAID-TEST",
      releaseCandidateId: "REL-TEST",
      snapshotId: "SNAP-TEST",
      sourceHash: "HASH-TEST",
      manifestHash: "MAN-TEST",
      expectedAmountMinor: 500000,
      paidAmountMinor: 500000,
      currency: "PHP",
      files: { "index.tsx": "console.log('hi')" },
      clientApprovalExists: false,
      operatorApprovalExists: true,
    });
    if (noApproveRes.status === "DELIVERY_BLOCKED" && !noApproveRes.isDownloadAvailable && noApproveRes.blockReason?.includes("CLIENT_APPROVAL_REQUIRED")) {
      record("7. Real Source Delivery Gating", "PASS", "Missing client approval blocked source code delivery.");
    } else {
      record("7. Real Source Delivery Gating", "FAIL", "Delivery without client approval returned: " + noApproveRes.status);
    }
  } catch (err: any) {
    record("7. Real Source Delivery Gating", "FAIL", err.message);
  }

  // ── TEST 8: Real Snapshot Integrity Binding ─────────────────────────────────
  try {
    const mutatedSnapRes = await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
      projectId: PRJ_A,
      organizationId: ORG_A,
      workspaceId: WS_A,
      clientId: "CLI-SINDOUS",
      invoiceId: "INV-PAID-TEST",
      paymentId: "PAY-PAID-TEST",
      releaseCandidateId: "REL-TEST",
      snapshotId: "SNAP-ORIGINAL",
      sourceHash: "HASH-ORIGINAL",
      manifestHash: "MAN-ORIGINAL",
      incomingSnapshotId: "SNAP-MUTATED",
      incomingSourceHash: "HASH-MUTATED",
      expectedAmountMinor: 500000,
      paidAmountMinor: 500000,
      currency: "PHP",
      files: { "index.tsx": "console.log('hi')" },
      clientApprovalExists: true,
      operatorApprovalExists: true,
    });
    if (mutatedSnapRes.status === "DELIVERY_INVALIDATED" && !mutatedSnapRes.isDownloadAvailable) {
      record("8. Real Snapshot Integrity", "PASS", "Mutated snapshot detected and delivery invalidated fail-closed.");
    } else {
      record("8. Real Snapshot Integrity", "FAIL", "Mutated snapshot returned: " + mutatedSnapRes.status);
    }
  } catch (err: any) {
    record("8. Real Snapshot Integrity", "FAIL", err.message);
  }

  // ── TEST 9: Real Package Integrity ─────────────────────────────────────────
  try {
    const pkgExpected = "sha256-original-clean-pkg-hash";
    const pkgActual = "sha256-corrupted-pkg-hash";
    const integrityRes = integrityVerificationService.verifyHashPair("DELIV-PKG-TEST", pkgExpected, pkgActual);
    if (integrityRes.status === "INTEGRITY_VIOLATION" && integrityRes.violation && integrityRes.escalation === "HUMAN_REVIEW_REQUIRED") {
      record("9. Real Package Integrity", "PASS", "Package hash mismatch flagged as INTEGRITY_VIOLATION with HUMAN_REVIEW_REQUIRED.");
    } else {
      record("9. Real Package Integrity", "FAIL", "Package integrity verification returned: " + integrityRes.status);
    }
  } catch (err: any) {
    record("9. Real Package Integrity", "FAIL", err.message);
  }

  // ── TEST 10: Real Secret Exclusion ─────────────────────────────────────────
  try {
    const promptWithSecret = "System prompt: PAYPAL_CLIENT_SECRET=fake_secret_token_123456789";
    process.env["PAYPAL_CLIENT_SECRET"] = "fake_secret_token_123456789";
    const secretAudit = securityAuditService.auditSecretExposure(promptWithSecret, "client_payload");
    if (secretAudit && secretAudit.severity === "CRITICAL" && !secretAudit.evidence.includes("fake_secret_token_123456789")) {
      record("10. Real Secret Exclusion", "PASS", "Secret detected in payload, flagged CRITICAL, secret value omitted from evidence.");
    } else {
      record("10. Real Secret Exclusion", "FAIL", "Secret exposure was not detected or leaked into evidence.");
    }
  } catch (err: any) {
    record("10. Real Secret Exclusion", "FAIL", err.message);
  }

  // ── TEST 11: Real Path Traversal Protection ────────────────────────────────
  try {
    let escapeCaught = false;
    try {
      developerAgentService.validatePathSafety(PRJ_A, "../../etc/passwd");
    } catch (e: any) {
      escapeCaught = e.message.includes("Security Sandboxing Violation");
    }
    const auditPath = securityAuditService.auditPathTraversal("../../etc/passwd", path.resolve(process.cwd(), "production-sites", PRJ_A));
    if (escapeCaught && auditPath?.severity === "CRITICAL") {
      record("11. Real Path Traversal Protection", "PASS", "Filesystem path traversal blocked at sandbox validation and audit engine.");
    } else {
      record("11. Real Path Traversal Protection", "FAIL", "Path traversal was not blocked.");
    }
  } catch (err: any) {
    record("11. Real Path Traversal Protection", "FAIL", err.message);
  }

  // ── TEST 12: Real Webhook Signature Verification ───────────────────────────
  try {
    const fakeHeaders = { "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.sandbox.paypal.com", "paypal-transmission-id": "fake", "paypal-transmission-sig": "fake", "paypal-transmission-time": "2026-08-30T12:00:00Z" };
    const fakeBody = JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED" });
    const verifyRes = await payPalProvider.verifyWebhook(fakeHeaders, fakeBody);
    if (!verifyRes.isValid) {
      record("12. Real Webhook Verification", "PASS", "Fake/unverifiable PayPal webhook rejected fail-closed.");
    } else {
      record("12. Real Webhook Verification", "FAIL", "Fake webhook passed signature verification.");
    }
  } catch (err: any) {
    record("12. Real Webhook Verification", "FAIL", err.message);
  }

  // ── TEST 13: Real Replay Protection ────────────────────────────────────────
  try {
    const auditReplay = securityAuditService.auditWebhookAuthenticity({ webhookId: "WH-REPLAY-123", hasValidSignature: true, isReplay: true, source: "paypal" });
    if (auditReplay && auditReplay.severity === "HIGH") {
      record("13. Real Replay Protection", "PASS", "Replay webhook identified and flagged as HIGH severity audit finding.");
    } else {
      record("13. Real Replay Protection", "FAIL", "Webhook replay was not detected.");
    }
  } catch (err: any) {
    record("13. Real Replay Protection", "FAIL", err.message);
  }

  // ── TEST 14: Real Refund Revocation ────────────────────────────────────────
  try {
    await sourceDeliveryRepository.saveDelivery({
      deliveryId: "DELIV-REFUND-TEST",
      projectId: PRJ_A,
      organizationId: ORG_A,
      workspaceId: WS_A,
      clientId: "CLI-SINDOUS",
      invoiceId: "INV-REFUND-TEST",
      paymentId: "PAY-REFUND-TEST",
      releaseCandidateId: "REL-TEST",
      snapshotId: "SNAP-TEST",
      sourceHash: "HASH-TEST",
      manifestHash: "MAN-TEST",
      packageHash: "PKG-TEST",
      status: "DELIVERY_AUTHORIZED",
      createdAt: new Date().toISOString(),
      authorizedAt: new Date().toISOString(),
      fileCount: 1,
      totalSizeBytes: 100,
    });

    const refundRes = await payPalService.handleRefundWebhook({
      captureId: "CAP-REFUND-TEST",
      refundId: "REF-12345",
      projectId: PRJ_A,
    });

    const updatedDeliv = await sourceDeliveryRepository.getDeliveryByProject(PRJ_A);
    if (refundRes.status === "REFUNDED" && refundRes.deliveryRevoked && updatedDeliv?.status === "REVOKED") {
      record("14. Real Refund Revocation", "PASS", "PayPal refund webhook immediately revoked active delivery authorization.");
    } else {
      record("14. Real Refund Revocation", "FAIL", "Refund revocation failed: status=" + updatedDeliv?.status);
    }
  } catch (err: any) {
    record("14. Real Refund Revocation", "FAIL", err.message);
  }

  // ── TEST 15: Real Emergency Stop (Full Mutation Interception) ───────────────
  try {
    emergencyKillSwitch.transition("EMERGENCY_STOP", "OPERATOR-ADMIN", "Phase 48 Forensic Test");

    let depBlocked = false;
    let payBlocked = false;
    let delBlocked = false;
    let srcBlocked = false;

    try { await productionReleaseService.approveProductionDeployment("REL-ANY", "OPERATOR"); } catch (e: any) { depBlocked = e.message.includes("EMERGENCY_STOP_BLOCKED"); }
    try { await payPalService.approveAndCreatePayPalOrder("REQ-ANY"); } catch (e: any) { payBlocked = e.message.includes("EMERGENCY_STOP_BLOCKED"); }
    try { await sourceDeliveryService.processPaymentAndAuthorizeDelivery({} as any); } catch (e: any) { delBlocked = e.message.includes("EMERGENCY_STOP_BLOCKED"); }
    try { await developerAgentService.rollbackWorkspace("SNAP-ANY"); } catch (e: any) { srcBlocked = e.message.includes("EMERGENCY_STOP_BLOCKED"); }

    const healthAllowed = emergencyKillSwitch.isOperationAllowed("HEALTH_CHECK").allowed;
    const auditAllowed = emergencyKillSwitch.isOperationAllowed("AUDIT_INSPECTION").allowed;

    emergencyKillSwitch.transition("NORMAL", "OPERATOR-ADMIN", "Forensic Test Cleanup");

    if (depBlocked && payBlocked && delBlocked && srcBlocked && healthAllowed && auditAllowed) {
      record("15. Real Emergency Stop", "PASS", "EMERGENCY_STOP halted deployments, payments, deliveries, and source mutations while keeping health/audit active.");
    } else {
      record("15. Real Emergency Stop", "FAIL", "Emergency stop leak: dep=" + depBlocked + ", pay=" + payBlocked + ", del=" + delBlocked + ", src=" + srcBlocked);
    }
  } catch (err: any) {
    emergencyKillSwitch.transition("NORMAL", "OPERATOR-ADMIN", "Error Recovery");
    record("15. Real Emergency Stop", "FAIL", err.message);
  }

  // ── TEST 16: Real Autonomous Operation Boundaries ──────────────────────────
  try {
    const checkForbidden = securityAuditService.auditAutonomousAction("MUTATE_PRODUCTION_DATABASE_SCHEMA", "FORBIDDEN");
    const checkHumanOnly = securityAuditService.auditAutonomousAction("PAYMENT_DISPUTE_SETTLEMENT", "HUMAN_ONLY");
    if (checkForbidden?.severity === "CRITICAL" && checkHumanOnly?.severity === "HIGH") {
      record("16. Real Autonomous Boundaries", "PASS", "Forbidden and Human-Only autonomous actions trapped and escalated.");
    } else {
      record("16. Real Autonomous Boundaries", "FAIL", "Autonomous boundary action was not classified correctly.");
    }
  } catch (err: any) {
    record("16. Real Autonomous Boundaries", "FAIL", err.message);
  }

  // ── TEST 17: Real Consistency Detection ────────────────────────────────────
  try {
    const impossibleViolations = consistencyAuditService.detectImpossibleStates({
      invoices: [{ id: "INV-IMP-1", isPaid: true, balance: 100, isRefunded: false }],
      deliveries: [{ id: "DEL-IMP-1", projectId: PRJ_A, clientApproved: false, operatorApproved: true, paymentVerified: true, status: "DELIVERY_AUTHORIZED" }],
      deployments: [{ id: "DEP-IMP-1", hasValidReleaseCandidate: false, status: "LIVE" }],
      downloads: [{ id: "DL-IMP-1", deliveryId: "DEL-UNAUTH", deliveryAuthorized: false }],
    });
    if (impossibleViolations.length === 4) {
      record("17. Real Consistency Detection", "PASS", "All 4 impossible relational states detected across invoices, deliveries, deployments, and downloads.");
    } else {
      record("17. Real Consistency Detection", "FAIL", "Expected 4 violations, got: " + impossibleViolations.length);
    }
  } catch (err: any) {
    record("17. Real Consistency Detection", "FAIL", err.message);
  }

  // ── TEST 18: Real Audit Integrity & Tamper Detection ───────────────────────
  try {
    const auditRecordOriginal = "AUDIT_RECORD_SHA256_SEED_DATA";
    const auditHash = crypto.createHash("sha256").update(auditRecordOriginal).digest("hex");
    integrityVerificationService.register({ artifactId: "AUDIT-LOG-P48", artifactType: "AUDIT_LOG", expectedHash: auditHash, projectId: PRJ_A, registeredAt: new Date().toISOString() });

    const auditTampered = integrityVerificationService.verify("AUDIT-LOG-P48", "AUDIT_RECORD_MUTATED_DATA");
    if (auditTampered.status === "INTEGRITY_VIOLATION" && auditTampered.violation && auditTampered.escalation === "HUMAN_REVIEW_REQUIRED") {
      record("18. Real Audit Integrity", "PASS", "Mutated audit log entry flagged as INTEGRITY_VIOLATION with HUMAN_REVIEW_REQUIRED.");
    } else {
      record("18. Real Audit Integrity", "FAIL", "Audit integrity check returned: " + auditTampered.status);
    }
  } catch (err: any) {
    record("18. Real Audit Integrity", "FAIL", err.message);
  }

  // ── TEST 19: Real Worker Isolation & Collision Prevention ──────────────────
  try {
    const lease1 = disasterRecoveryService.acquireLease("WORKER-ORIGINAL", "TASK-P48-ISOLATION", PRJ_A, 5000);
    const reclaim = disasterRecoveryService.recoverStaleLease("TASK-P48-ISOLATION", "WORKER-NEW", PRJ_A);
    const checkLate = disasterRecoveryService.validateLateWorkerExecution(lease1.leaseId, "WORKER-ORIGINAL");

    if (lease1.status === "EXPIRED" && reclaim.recovered && !checkLate.allowed && (checkLate.violationType === "LATE_WORKER_COLLISION_PREVENTED" || checkLate.reason?.includes("LATE_WORKER_COLLISION_PREVENTED"))) {
      record("19. Real Worker Isolation", "PASS", "Stale lease recovered and late worker collision prevented.");
    } else {
      record("19. Real Worker Isolation", "FAIL", "Worker lease collision was not prevented: " + JSON.stringify(checkLate));
    }
  } catch (err: any) {
    record("19. Real Worker Isolation", "FAIL", err.message);
  }

  // ── TEST 20: Full Multi-Stage End-to-End Lifecycle ─────────────────────────
  try {
    securityAuditService.clearFindings();
    const tenantCheck = securityAuditService.auditTenantIsolation(ORG_A, ORG_A);
    const snapCheck = securityAuditService.auditSnapshotIntegrity("APPROVED_HASH", "APPROVED_HASH", "SNAP-LIFECYCLE");
    const payCheck = securityAuditService.auditPaymentConsistency({ invoiceId: "INV-CLEAN", isPaid: true, paidAmount: 500000, expectedAmount: 500000, isRefunded: false, deliveryAuthorized: true });
    const firewallCheck = privilegedActionFirewall.evaluate({ action: "PRODUCTION_DEPLOYMENT", actor: "operator", actorRole: "OPERATOR" });
    const killCheck = emergencyKillSwitch.isOperationAllowed("HEALTH_CHECK");
    const report = securityAuditService.compileReport();

    if (tenantCheck === null && snapCheck === null && payCheck === null && firewallCheck.allowed && killCheck.allowed && report.posture === "SECURE") {
      record("20. Full Lifecycle Verification", "PASS", "Full multi-stage operations lifecycle verified: zero open findings, posture SECURE, all safety gates intact.");
    } else {
      record("20. Full Lifecycle Verification", "FAIL", "Lifecycle evaluation incomplete: posture=" + report.posture);
    }
  } catch (err: any) {
    record("20. Full Lifecycle Verification", "FAIL", err.message);
  }

  // ─────────── FORENSIC RESULTS OUTPUT ──────────────────────────────────────
  console.log("\n================================================================================");
  console.log("🏆 PHASE 48 FORENSIC INDEPENDENT VERIFICATION RESULTS (20 Core Tests)");
  console.log("================================================================================");
  let passCount = 0; let failCount = 0; let unknownCount = 0; let blockedCount = 0;
  for (const [name, res] of Object.entries(results)) {
    const icon = res.status === "PASS" ? "✅" : res.status === "UNKNOWN" ? "⚠️" : res.status === "BLOCKED" ? "🔒" : "❌";
    if (res.status === "PASS") passCount++;
    else if (res.status === "UNKNOWN") unknownCount++;
    else if (res.status === "BLOCKED") blockedCount++;
    else failCount++;
    console.log("  " + icon + " [" + res.status + "] " + name + "\n      └─ " + res.details);
  }

  console.log("\n  Final Score: " + passCount + " PASS  |  " + failCount + " FAIL  |  " + unknownCount + " UNKNOWN  |  " + blockedCount + " BLOCKED  |  Total: " + Object.keys(results).length);
  console.log("================================================================================\n");
}

runIndependentVerification().catch(console.error);