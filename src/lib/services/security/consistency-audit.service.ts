/**
 * Database Consistency Audit Service
 *
 * Detects impossible states across SYNAPSE's persistence layer.
 * Does NOT silently repair findings.
 */

export interface ConsistencyViolation {
  violationId: string;
  violationType: string;
  severity: "HIGH" | "CRITICAL";
  affectedRecord: string;
  evidence: string;
  detectedAt: string;
}

export class ConsistencyAuditService {
  detectImpossibleStates(records: {
    invoices?: Array<{ id: string; isPaid: boolean; balance: number; isRefunded: boolean; projectId?: string }>;
    deliveries?: Array<{ id: string; projectId: string; clientApproved: boolean; operatorApproved: boolean; paymentVerified: boolean; status: string; isRevoked?: boolean; isDownloadable?: boolean }>;
    deployments?: Array<{ id: string; hasValidReleaseCandidate: boolean; status: string; tenantId?: string; expectedTenantId?: string; environment?: string; hasRollbackTarget?: boolean }>;
    downloads?: Array<{ id: string; deliveryId: string; deliveryAuthorized: boolean }>;
    incidents?: Array<{ id: string; status: string; hasRecoveryEvidence: boolean }>;
    snapshots?: Array<{ id: string; approvedHash: string; currentHash: string; projectId?: string }>;
    approvals?: Array<{ id: string; boundProjectId: string; targetProjectId: string }>;
    payments?: Array<{ id: string; boundProjectId: string; targetProjectId: string; duplicateKey?: boolean }>;
    telemetry?: Array<{ id: string; projectId: string; projectExists: boolean }>;
    evidence?: Array<{ id: string; boundProjectId: string; targetProjectId: string }>;
  }): ConsistencyViolation[] {
    const violations: ConsistencyViolation[] = [];
    const ts = () => new Date().toISOString();
    let counter = 0;
    const vid = () => `CV-${Date.now().toString().slice(-6)}-${++counter}`;

    // Paid invoice with non-zero balance
    for (const inv of records.invoices ?? []) {
      if (inv.isPaid && inv.balance > 0) {
        violations.push({ violationId: vid(), violationType: "PAID_INVOICE_NONZERO_BALANCE", severity: "CRITICAL", affectedRecord: `invoice:${inv.id}`, evidence: `Invoice '${inv.id}' marked paid but balance=${inv.balance}`, detectedAt: ts() });
      }
      if (inv.isRefunded && inv.isPaid) {
        violations.push({ violationId: vid(), violationType: "REFUNDED_INVOICE_STILL_PAID", severity: "HIGH", affectedRecord: `invoice:${inv.id}`, evidence: `Invoice '${inv.id}' is both refunded and paid.`, detectedAt: ts() });
      }
    }

    // Delivery authorized without required prerequisites
    for (const del of records.deliveries ?? []) {
      if (del.status === "DELIVERY_AUTHORIZED" && !del.paymentVerified) {
        violations.push({ violationId: vid(), violationType: "DELIVERY_WITHOUT_PAYMENT", severity: "CRITICAL", affectedRecord: `delivery:${del.id}`, evidence: `Delivery '${del.id}' authorized but payment not verified.`, detectedAt: ts() });
      }
      if (del.status === "DELIVERY_AUTHORIZED" && !del.clientApproved) {
        violations.push({ violationId: vid(), violationType: "DELIVERY_WITHOUT_CLIENT_APPROVAL", severity: "CRITICAL", affectedRecord: `delivery:${del.id}`, evidence: `Delivery '${del.id}' authorized but client approval missing.`, detectedAt: ts() });
      }
      if (del.status === "DELIVERY_AUTHORIZED" && !del.operatorApproved) {
        violations.push({ violationId: vid(), violationType: "DELIVERY_WITHOUT_OPERATOR_APPROVAL", severity: "CRITICAL", affectedRecord: `delivery:${del.id}`, evidence: `Delivery '${del.id}' authorized but operator approval missing.`, detectedAt: ts() });
      }
      if (del.isRevoked && del.isDownloadable) {
        violations.push({ violationId: vid(), violationType: "REVOKED_DELIVERY_STILL_DOWNLOADABLE", severity: "CRITICAL", affectedRecord: `delivery:${del.id}`, evidence: `Delivery '${del.id}' is revoked but still marked downloadable.`, detectedAt: ts() });
      }
    }

    // Deployments
    for (const dep of records.deployments ?? []) {
      if (dep.status === "LIVE" && !dep.hasValidReleaseCandidate) {
        violations.push({ violationId: vid(), violationType: "LIVE_DEPLOYMENT_NO_RC", severity: "CRITICAL", affectedRecord: `deployment:${dep.id}`, evidence: `Deployment '${dep.id}' is LIVE but has no valid release candidate.`, detectedAt: ts() });
      }
      if (dep.tenantId && dep.expectedTenantId && dep.tenantId !== dep.expectedTenantId) {
        violations.push({ violationId: vid(), violationType: "DEPLOYMENT_TENANT_MISMATCH", severity: "CRITICAL", affectedRecord: `deployment:${dep.id}`, evidence: `Deployment '${dep.id}' bound to tenant '${dep.tenantId}' but project belongs to '${dep.expectedTenantId}'.`, detectedAt: ts() });
      }
      if (dep.status === "LIVE" && dep.hasRollbackTarget === false) {
        violations.push({ violationId: vid(), violationType: "MISSING_ROLLBACK_TARGET", severity: "HIGH", affectedRecord: `deployment:${dep.id}`, evidence: `Live deployment '${dep.id}' has no verified rollback target.`, detectedAt: ts() });
      }
      if (dep.environment && !["PRODUCTION", "STAGING", "PREVIEW", "PRODUCTION_REHEARSAL"].includes(dep.environment)) {
        violations.push({ violationId: vid(), violationType: "INVALID_DEPLOYMENT_ENVIRONMENT", severity: "HIGH", affectedRecord: `deployment:${dep.id}`, evidence: `Deployment '${dep.id}' specifies unrecognized environment '${dep.environment}'.`, detectedAt: ts() });
      }
    }

    // Download without delivery authorization
    for (const dl of records.downloads ?? []) {
      if (!dl.deliveryAuthorized) {
        violations.push({ violationId: vid(), violationType: "DOWNLOAD_WITHOUT_AUTHORIZATION", severity: "CRITICAL", affectedRecord: `download:${dl.id}`, evidence: `Download '${dl.id}' for delivery '${dl.deliveryId}' has no authorization.`, detectedAt: ts() });
      }
    }

    // Incident resolved without recovery evidence
    for (const inc of records.incidents ?? []) {
      if (inc.status === "RESOLVED" && !inc.hasRecoveryEvidence) {
        violations.push({ violationId: vid(), violationType: "INCIDENT_RESOLVED_NO_EVIDENCE", severity: "HIGH", affectedRecord: `incident:${inc.id}`, evidence: `Incident '${inc.id}' marked RESOLVED but no recovery evidence.`, detectedAt: ts() });
      }
    }

    // Release candidate referencing mutated snapshot
    for (const snap of records.snapshots ?? []) {
      if (snap.approvedHash && snap.currentHash && snap.approvedHash !== snap.currentHash) {
        violations.push({ violationId: vid(), violationType: "RC_MUTATED_SNAPSHOT", severity: "CRITICAL", affectedRecord: `snapshot:${snap.id}`, evidence: `Snapshot '${snap.id}' has mutated since approval.`, detectedAt: ts() });
      }
    }

    // Approvals bound to wrong project
    for (const app of records.approvals ?? []) {
      if (app.boundProjectId !== app.targetProjectId) {
        violations.push({ violationId: vid(), violationType: "APPROVAL_PROJECT_MISMATCH", severity: "CRITICAL", affectedRecord: `approval:${app.id}`, evidence: `Approval '${app.id}' bound to '${app.boundProjectId}' applied to '${app.targetProjectId}'.`, detectedAt: ts() });
      }
    }

    // Payments bound to wrong project / duplicate
    for (const pay of records.payments ?? []) {
      if (pay.boundProjectId !== pay.targetProjectId) {
        violations.push({ violationId: vid(), violationType: "PAYMENT_PROJECT_MISMATCH", severity: "CRITICAL", affectedRecord: `payment:${pay.id}`, evidence: `Payment '${pay.id}' bound to '${pay.boundProjectId}' applied to '${pay.targetProjectId}'.`, detectedAt: ts() });
      }
      if (pay.duplicateKey) {
        violations.push({ violationId: vid(), violationType: "DUPLICATE_PAYMENT_MUTATION", severity: "CRITICAL", affectedRecord: `payment:${pay.id}`, evidence: `Payment '${pay.id}' has duplicate idempotency key.`, detectedAt: ts() });
      }
    }

    // Telemetry referencing nonexistent project
    for (const tel of records.telemetry ?? []) {
      if (!tel.projectExists) {
        violations.push({ violationId: vid(), violationType: "TELEMETRY_NONEXISTENT_PROJECT", severity: "HIGH", affectedRecord: `telemetry:${tel.id}`, evidence: `Telemetry record '${tel.id}' references nonexistent project '${tel.projectId}'.`, detectedAt: ts() });
      }
    }

    // Evidence referencing another project
    for (const evi of records.evidence ?? []) {
      if (evi.boundProjectId !== evi.targetProjectId) {
        violations.push({ violationId: vid(), violationType: "EVIDENCE_PROJECT_MISMATCH", severity: "HIGH", affectedRecord: `evidence:${evi.id}`, evidence: `Evidence '${evi.id}' bound to '${evi.boundProjectId}' referenced by project '${evi.targetProjectId}'.`, detectedAt: ts() });
      }
    }

    return violations;
  }
}

export const consistencyAuditService = new ConsistencyAuditService();
