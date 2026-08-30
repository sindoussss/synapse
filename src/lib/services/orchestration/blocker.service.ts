export type BlockerCategory =
  | "PAYMENT_REQUIRED"
  | "CLIENT_APPROVAL_REQUIRED"
  | "OPERATOR_APPROVAL_REQUIRED"
  | "REQUIREMENT_MISSING"
  | "BUILD_FAILED"
  | "QA_FAILED"
  | "SECURITY_FAILED"
  | "SNAPSHOT_STALE"
  | "MANIFEST_MISMATCH"
  | "DEPLOYMENT_FAILED"
  | "INCIDENT_OPEN"
  | "PRODUCTION_HALT"
  | "ENVIRONMENT_BLOCKED"
  | "TENANT_BOUNDARY"
  | "MISSING_CONFIGURATION"
  | "PROVIDER_UNAVAILABLE";

export interface BlockerItem {
  category: BlockerCategory;
  reason: string;
  evidence: string;
  responsibleRole: "OPERATOR" | "CLIENT" | "AI_DEVELOPER_AGENT" | "FINANCE";
  nextAction: string;
}

export class BlockerService {
  diagnoseBlockers(params: {
    workType: string;
    isPaid: boolean;
    hasClientApproval: boolean;
    hasOperatorApproval: boolean;
    buildPassed: boolean;
    qaPassed: boolean;
    securityPassed: boolean;
    hasActiveIncident: boolean;
    hasMissingConfig: boolean;
  }): BlockerItem[] {
    const blockers: BlockerItem[] = [];

    if (!params.securityPassed) {
      blockers.push({
        category: "SECURITY_FAILED",
        reason: "Security gate failed deterministic audit scan.",
        evidence: "Security audit findings contain high/critical vulnerabilities.",
        responsibleRole: "OPERATOR",
        nextAction: "Resolve security vulnerabilities and re-run audit.",
      });
    }

    if (params.hasActiveIncident) {
      blockers.push({
        category: "INCIDENT_OPEN",
        reason: "Active production incident blocks downstream deployment.",
        evidence: "Operations registry contains unresolved production incident.",
        responsibleRole: "OPERATOR",
        nextAction: "Triage and resolve production incident.",
      });
    }

    if (!params.buildPassed && (params.workType === "QA" || params.workType === "DEPLOYMENT")) {
      blockers.push({
        category: "BUILD_FAILED",
        reason: "Universal build output missing or compilation failed.",
        evidence: "Build artifact status is not READY.",
        responsibleRole: "OPERATOR",
        nextAction: "Inspect build logs and trigger auto-repair.",
      });
    }

    if (!params.qaPassed && (params.workType === "CLIENT_REVIEW" || params.workType === "DEPLOYMENT")) {
      blockers.push({
        category: "QA_FAILED",
        reason: "QA validation gates have pending defects.",
        evidence: "One or more deterministic QA criteria failed.",
        responsibleRole: "OPERATOR",
        nextAction: "Fix QA defects and re-execute verification suite.",
      });
    }

    if (!params.hasClientApproval && params.workType === "DEPLOYMENT") {
      blockers.push({
        category: "CLIENT_APPROVAL_REQUIRED",
        reason: "Client sign-off required prior to production release.",
        evidence: "Client review session has not registered approved snapshot binding.",
        responsibleRole: "CLIENT",
        nextAction: "Client must review preview and submit approval.",
      });
    }

    if (!params.isPaid && params.workType === "SOURCE_DELIVERY") {
      blockers.push({
        category: "PAYMENT_REQUIRED",
        reason: "Invoice balance must be fully paid before source delivery unlock.",
        evidence: "Invoice ledger indicates outstanding balance.",
        responsibleRole: "FINANCE",
        nextAction: "Verify PayPal checkout or reconcile payment ledger.",
      });
    }

    if (params.hasMissingConfig) {
      blockers.push({
        category: "MISSING_CONFIGURATION",
        reason: "Required environment variables or tokens missing.",
        evidence: "Environment preflight check failed with missing required keys.",
        responsibleRole: "OPERATOR",
        nextAction: "Configure required environment variables.",
      });
    }

    return blockers;
  }
}

export const blockerService = new BlockerService();