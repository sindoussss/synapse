/**
 * Privileged Action Firewall
 *
 * Central authorization decision point for all privileged SYNAPSE actions.
 * Every call must pass through this gate. Denial is always deterministic.
 */

export type PrivilegedAction =
  | "PRODUCTION_DEPLOYMENT"
  | "ROLLBACK"
  | "PAYMENT_MUTATION"
  | "REFUND_MUTATION"
  | "CLIENT_APPROVAL"
  | "OPERATOR_APPROVAL"
  | "SOURCE_DELIVERY_AUTHORIZATION"
  | "SECRET_ACCESS"
  | "TENANT_MIGRATION"
  | "PRODUCTION_CONFIG_MUTATION";

export type ActorRole =
  | "AI_DEVELOPER_AGENT"
  | "CLIENT_SESSION"
  | "WEBHOOK"
  | "BACKGROUND_WORKER"
  | "FRONTEND_REQUEST"
  | "OPERATOR"
  | "SYSTEM_INTERNAL";

export type DenialReason =
  | "UNAUTHORIZED_ACTOR"
  | "INVALID_ROLE"
  | "INVALID_SCOPE"
  | "APPROVAL_REQUIRED"
  | "PAYMENT_REQUIRED"
  | "SNAPSHOT_MISMATCH"
  | "TENANT_BOUNDARY_VIOLATION"
  | "PROJECT_BOUNDARY_VIOLATION"
  | "ENVIRONMENT_BOUNDARY_VIOLATION"
  | "INTEGRITY_VIOLATION";

export interface FirewallDecision {
  allowed: boolean;
  action: PrivilegedAction;
  actor: string;
  actorRole: ActorRole;
  denialReason?: DenialReason;
  requiresHumanApproval?: boolean;
  auditRequired: true;
}

// Authoritative role-action matrix
const ROLE_ACTION_MATRIX: Record<ActorRole, PrivilegedAction[]> = {
  OPERATOR: [
    "PRODUCTION_DEPLOYMENT",
    "ROLLBACK",
    "PAYMENT_MUTATION",
    "REFUND_MUTATION",
    "CLIENT_APPROVAL",
    "OPERATOR_APPROVAL",
    "SOURCE_DELIVERY_AUTHORIZATION",
    "TENANT_MIGRATION",
    "PRODUCTION_CONFIG_MUTATION",
  ],
  SYSTEM_INTERNAL: ["ROLLBACK"], // Only when a verified safety rule triggers rollback
  AI_DEVELOPER_AGENT: [], // AI agents may NOT directly perform any privileged action
  CLIENT_SESSION: [],     // Clients may NOT perform privileged actions (they submit approvals via workflow)
  WEBHOOK: [],            // Webhooks may NOT perform privileged actions autonomously
  BACKGROUND_WORKER: [],  // Workers trigger proposals, not direct mutations
  FRONTEND_REQUEST: [],   // Frontend cannot directly mutate privileged state
};

export class PrivilegedActionFirewall {
  evaluate(params: {
    action: PrivilegedAction;
    actor: string;
    actorRole: ActorRole;
    projectId?: string;
    callerProjectId?: string;
    callerOrgId?: string;
    targetOrgId?: string;
    snapshotMatch?: boolean;
    paymentVerified?: boolean;
    approvalPresent?: boolean;
  }): FirewallDecision {
    const allowed = ROLE_ACTION_MATRIX[params.actorRole] ?? [];

    if (!allowed.includes(params.action)) {
      const denialReason: DenialReason =
        params.actorRole === "AI_DEVELOPER_AGENT" ? "UNAUTHORIZED_ACTOR" :
        params.actorRole === "CLIENT_SESSION" ? "INVALID_ROLE" :
        params.actorRole === "WEBHOOK" ? "UNAUTHORIZED_ACTOR" :
        "UNAUTHORIZED_ACTOR";

      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason,
        requiresHumanApproval: true,
        auditRequired: true,
      };
    }

    // Additional contextual checks for OPERATOR-level actions
    if (params.callerOrgId && params.targetOrgId && params.callerOrgId !== params.targetOrgId) {
      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason: "TENANT_BOUNDARY_VIOLATION",
        auditRequired: true,
      };
    }

    if (params.callerProjectId && params.projectId && params.callerProjectId !== params.projectId) {
      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason: "PROJECT_BOUNDARY_VIOLATION",
        auditRequired: true,
      };
    }

    if (params.action === "SOURCE_DELIVERY_AUTHORIZATION" && params.snapshotMatch === false) {
      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason: "SNAPSHOT_MISMATCH",
        auditRequired: true,
      };
    }

    if (params.action === "SOURCE_DELIVERY_AUTHORIZATION" && params.paymentVerified === false) {
      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason: "PAYMENT_REQUIRED",
        auditRequired: true,
      };
    }

    if (
      (params.action === "PRODUCTION_DEPLOYMENT" || params.action === "SOURCE_DELIVERY_AUTHORIZATION") &&
      params.approvalPresent === false
    ) {
      return {
        allowed: false,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        denialReason: "APPROVAL_REQUIRED",
        auditRequired: true,
      };
    }

    return {
      allowed: true,
      action: params.action,
      actor: params.actor,
      actorRole: params.actorRole,
      auditRequired: true,
    };
  }
}

export const privilegedActionFirewall = new PrivilegedActionFirewall();
