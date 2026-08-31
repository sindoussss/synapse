import { approvalControlRepository, ApprovalRequestRecord, ApprovalDecisionRecord, ApprovalRequestType, ApprovalStatus, ApprovalRiskLevel } from "../../repositories/approval-control.repository";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";
import { privilegedActionFirewall, ActorRole } from "../security/privileged-action-firewall.service";
import { exceptionService } from "./exception.service";

export type ApprovalBoardItem = {
  approvalRequestId: string;
  projectId: string;
  requestType: ApprovalRequestType;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  proposedAction: string;
};

export type ApprovalPagePrincipal = {
  principalId?: string;
  actorRole: ActorRole;
  organizationId?: string;
  workspaceId?: string;
};

export interface ApprovalPreviewBundle {
  request: ApprovalRequestRecord;
  why: string;
  consequences: string;
  remainingBlockers: string[];
  riskLevel: string;
  integrity: {
    snapshotId?: string;
    sourceHash?: string;
    manifestHash?: string;
  };
  allowedDecisions: ("APPROVE" | "REJECT" | "REQUEST_CHANGES")[];
}

export class ApprovalControlService {
  private authorizeOperatorRead(principal: ApprovalPagePrincipal) {
    return privilegedActionFirewall.evaluate({
      action: "OPERATOR_APPROVAL",
      actor: principal.principalId || "unknown",
      actorRole: principal.actorRole,
    });
  }

  private toBoardItem(req: ApprovalRequestRecord): ApprovalBoardItem {
    return {
      approvalRequestId: req.approvalRequestId,
      projectId: req.projectId,
      requestType: req.requestType,
      status: req.status,
      riskLevel: req.riskLevel,
      proposedAction: req.proposedAction,
    };
  }

  /**
   * Tenant/project-scoped list for an authenticated operator.
   * Does not dump the store when org is missing. Does not return hashes.
   */
  listVisibleForPrincipal(
    principal: ApprovalPagePrincipal,
    opts?: { projectId?: string }
  ): { requests: ApprovalBoardItem[]; exceptionCount: number; denialReason?: string } {
    const auth = this.authorizeOperatorRead(principal);
    if (!auth.allowed) {
      return { requests: [], exceptionCount: 0, denialReason: auth.denialReason };
    }
    if (!principal.organizationId) {
      return { requests: [], exceptionCount: 0, denialReason: "TENANT_SCOPE_REQUIRED" };
    }

    const requests = approvalControlRepository
      .listRequests({
        organizationId: principal.organizationId,
        workspaceId: principal.workspaceId,
        projectId: opts?.projectId,
      })
      .map((r) => this.toBoardItem(r));

    const exceptionCount = exceptionService.listExceptions({
      organizationId: principal.organizationId,
      projectId: opts?.projectId,
    }).length;

    return { requests, exceptionCount };
  }

  getVisiblePreview(
    principal: ApprovalPagePrincipal,
    approvalRequestId: string,
    opts?: { projectId?: string }
  ): ApprovalPreviewBundle | null {
    const auth = this.authorizeOperatorRead(principal);
    if (!auth.allowed) return null;
    if (!principal.organizationId) return null;

    const req = approvalControlRepository.getRequest(approvalRequestId, principal.organizationId);
    if (!req) return null;
    if (principal.workspaceId && req.workspaceId !== principal.workspaceId) return null;
    if (opts?.projectId && req.projectId !== opts.projectId) return null;

    return this.getApprovalPreview(approvalRequestId, principal.organizationId);
  }

  getApprovalPreview(approvalRequestId: string, callerOrgId?: string): ApprovalPreviewBundle | null {
    const req = approvalControlRepository.getRequest(approvalRequestId, callerOrgId);
    if (!req) return null;

    return {
      request: req,
      why: req.proposedAction,
      consequences: req.consequences,
      remainingBlockers: req.blockers,
      riskLevel: req.riskLevel,
      integrity: {
        snapshotId: req.snapshotId,
        sourceHash: req.sourceHash,
        manifestHash: req.manifestHash,
      },
      allowedDecisions: ["APPROVE", "REJECT", "REQUEST_CHANGES"],
    };
  }

  processDecision(params: {
    approvalRequestId: string;
    actorId: string;
    actorRole: string;
    callerOrgId: string;
    decision: "APPROVED" | "REJECTED" | "REQUESTED_CHANGES";
    decisionReason: string;
    snapshotId?: string;
    sourceHash?: string;
    manifestHash?: string;
  }): { success: boolean; decision?: ApprovalDecisionRecord; reason?: string } {
    const req = approvalControlRepository.getRequest(params.approvalRequestId, params.callerOrgId);
    if (!req) {
      return { success: false, reason: "APPROVAL_REQUEST_NOT_FOUND" };
    }

    // 1. Role verification: Only OPERATOR or ADMIN can approve operator tasks
    if (req.responsibleRole === "OPERATOR" || req.responsibleRole === "ADMIN") {
      if (params.actorRole !== "OPERATOR" && params.actorRole !== "ADMIN") {
        return {
          success: false,
          reason: "UNAUTHORIZED_ACTOR: Non-operator role is barred from approving operator-gated operations.",
        };
      }
    }

    // 2. Emergency Kill-Switch Check
    if (params.decision === "APPROVED") {
      const killCheck = emergencyKillSwitch.isOperationAllowed("DEPLOYMENT");
      if (!killCheck.allowed) {
        return {
          success: false,
          reason: "EMERGENCY_STOP_ACTIVE: Cannot approve mutations while system is under Emergency Stop.",
        };
      }

      // 3. Stale Snapshot / Hash Invalidation Check
      if (req.snapshotId && params.snapshotId && req.snapshotId !== params.snapshotId) {
        return {
          success: false,
          reason: "APPROVAL_INVALIDATED: Target snapshot has mutated since request was created.",
        };
      }
      if (req.sourceHash && params.sourceHash && req.sourceHash !== params.sourceHash) {
        return {
          success: false,
          reason: "APPROVAL_INVALIDATED: Source code hash has changed. Re-evaluation required.",
        };
      }
    }

    // 4. Record Immutable Decision
    const decRes = approvalControlRepository.recordDecision({
      approvalRequestId: params.approvalRequestId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      decision: params.decision,
      decisionReason: params.decisionReason,
      evidenceIds: req.evidenceIds,
      snapshotId: req.snapshotId,
      sourceHash: req.sourceHash,
      manifestHash: req.manifestHash,
    });

    return decRes;
  }
}

export const approvalControlService = new ApprovalControlService();