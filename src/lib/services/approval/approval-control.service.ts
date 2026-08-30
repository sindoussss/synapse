import { approvalControlRepository, ApprovalRequestRecord, ApprovalDecisionRecord } from "../../repositories/approval-control.repository";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";
import { privilegedActionFirewall } from "../security/privileged-action-firewall.service";

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