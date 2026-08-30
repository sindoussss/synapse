export type ActionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ActionType =
  | "CLIENT_REVIEW_REQUIRED"
  | "OPERATOR_APPROVAL_REQUIRED"
  | "PAYMENT_REQUIRED"
  | "REQUIREMENT_CLARIFICATION_REQUIRED"
  | "CONFIGURATION_REQUIRED"
  | "BUILD_FAILURE"
  | "QA_FAILURE"
  | "DEPLOYMENT_FAILURE"
  | "SOURCE_DELIVERY_BLOCKED"
  | "INCIDENT_OPEN"
  | "CHANGE_REQUEST_PENDING";

export interface PendingActionItem {
  actionId: string;
  projectId: string;
  actionType: ActionType;
  priority: ActionPriority;
  reason: string;
  evidence: string;
  responsibleRole: "OPERATOR" | "CLIENT" | "AI_DEVELOPER_AGENT" | "FINANCE";
  createdAt: string;
}

export class ActionRequiredService {
  evaluateActions(params: {
    projectId: string;
    stage: string;
    isPaid: boolean;
    hasApprovedRelease: boolean;
    qaPassed: boolean;
    buildPassed: boolean;
    deploymentHealthy: boolean;
    hasOpenIncidents: boolean;
    hasPendingClarifications: boolean;
    hasPendingChangeRequest: boolean;
    sourceDelivered: boolean;
  }): PendingActionItem[] {
    const actions: PendingActionItem[] = [];
    const now = new Date().toISOString();

    // 1. Critical Failures
    if (!params.buildPassed) {
      actions.push({
        actionId: `ACT-${params.projectId}-BUILD-FAIL`,
        projectId: params.projectId,
        actionType: "BUILD_FAILURE",
        priority: "CRITICAL",
        reason: "Build process failed during compilation.",
        evidence: "Build artifact generation exited with non-zero status.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    if (!params.qaPassed) {
      actions.push({
        actionId: `ACT-${params.projectId}-QA-FAIL`,
        projectId: params.projectId,
        actionType: "QA_FAILURE",
        priority: "CRITICAL",
        reason: "One or more deterministic QA gates failed.",
        evidence: "QA audit records indicate pending defects.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    if (params.hasOpenIncidents) {
      actions.push({
        actionId: `ACT-${params.projectId}-INCIDENT`,
        projectId: params.projectId,
        actionType: "INCIDENT_OPEN",
        priority: "CRITICAL",
        reason: "Active production incident reported.",
        evidence: "Operations registry contains unresolved incident tickets.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    // 2. High Priority Blockers
    if (!params.deploymentHealthy) {
      actions.push({
        actionId: `ACT-${params.projectId}-DEP-FAIL`,
        projectId: params.projectId,
        actionType: "DEPLOYMENT_FAILURE",
        priority: "HIGH",
        reason: "Production health check or runtime verification failed.",
        evidence: "Target deployment endpoint returned degraded status.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    if (!params.isPaid && params.hasApprovedRelease) {
      actions.push({
        actionId: `ACT-${params.projectId}-PAY-REQ`,
        projectId: params.projectId,
        actionType: "PAYMENT_REQUIRED",
        priority: "HIGH",
        reason: "Client invoice pending payment confirmation.",
        evidence: "Invoice balance remains unpaid.",
        responsibleRole: "CLIENT",
        createdAt: now,
      });
    }

    if (params.isPaid && !params.sourceDelivered) {
      actions.push({
        actionId: `ACT-${params.projectId}-DELIV-BLK`,
        projectId: params.projectId,
        actionType: "SOURCE_DELIVERY_BLOCKED",
        priority: "HIGH",
        reason: "Source delivery authorization pending final packaging.",
        evidence: "Delivery package locked awaiting client download unlock.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    // 3. Medium & Low Priority Actions
    if (!params.hasApprovedRelease && params.qaPassed) {
      actions.push({
        actionId: `ACT-${params.projectId}-REV-REQ`,
        projectId: params.projectId,
        actionType: "CLIENT_REVIEW_REQUIRED",
        priority: "MEDIUM",
        reason: "Project preview ready for client review and approval.",
        evidence: "Live preview verified awaiting client sign-off.",
        responsibleRole: "CLIENT",
        createdAt: now,
      });
    }

    if (params.hasPendingClarifications) {
      actions.push({
        actionId: `ACT-${params.projectId}-REQ-CLAR`,
        projectId: params.projectId,
        actionType: "REQUIREMENT_CLARIFICATION_REQUIRED",
        priority: "MEDIUM",
        reason: "Missing or conflicting requirements need operator resolution.",
        evidence: "Requirement gap analysis detected UNKNOWN scope items.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    if (params.hasPendingChangeRequest) {
      actions.push({
        actionId: `ACT-${params.projectId}-CR-PEND`,
        projectId: params.projectId,
        actionType: "CHANGE_REQUEST_PENDING",
        priority: "LOW",
        reason: "Client submitted change request awaiting triage.",
        evidence: "Change request logged in maintenance queue.",
        responsibleRole: "OPERATOR",
        createdAt: now,
      });
    }

    return actions;
  }
}

export const actionRequiredService = new ActionRequiredService();