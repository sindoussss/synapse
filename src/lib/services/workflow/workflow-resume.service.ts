import { workflowReconstructionService } from "./workflow-reconstruction.service";
import { workflowEventRepository } from "../../repositories/workflow-event.repository";

export type ResumeDecision =
  | "SAFE_TO_RESUME"
  | "SAFE_TO_RETRY"
  | "WAITING_EXTERNAL"
  | "WAITING_HUMAN"
  | "ROLLBACK_REQUIRED"
  | "UNKNOWN_STATE";

export interface WorkflowResumeEvaluation {
  workflowId: string;
  projectId: string;
  decision: ResumeDecision;
  lastCompletedSequence: number;
  reason: string;
  requiresExternalReconciliation: boolean;
  targetProvider?: string;
  nextSafeAction: string;
}

export class WorkflowResumeService {
  evaluateResumeSafety(workflowId: string): WorkflowResumeEvaluation {
    const state = workflowReconstructionService.replayWorkflow(workflowId);
    if (!state) {
      return {
        workflowId,
        projectId: "UNKNOWN",
        decision: "UNKNOWN_STATE",
        lastCompletedSequence: 0,
        reason: "Cannot reconstruct workflow state from event log.",
        requiresExternalReconciliation: false,
        nextSafeAction: "Manual operator investigation required.",
      };
    }

    if (!state.isConsistentWithSnapshot) {
      return {
        workflowId,
        projectId: state.projectId,
        decision: "WAITING_HUMAN",
        lastCompletedSequence: state.reconstructedAtSequence,
        reason: state.discrepancies.join("; "),
        requiresExternalReconciliation: true,
        nextSafeAction: "Reconcile state discrepancies before resuming autonomous execution.",
      };
    }

    if (state.activeIncidents.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        decision: "WAITING_HUMAN",
        lastCompletedSequence: state.reconstructedAtSequence,
        reason: `Active incident hold: ${state.activeIncidents[0]}`,
        requiresExternalReconciliation: false,
        nextSafeAction: "Resolve incident hold before resuming.",
      };
    }

    if (state.activeDeployments.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        decision: "WAITING_EXTERNAL",
        lastCompletedSequence: state.reconstructedAtSequence,
        reason: "Interrupted in-flight deployment requires external provider status verification.",
        requiresExternalReconciliation: true,
        targetProvider: "vercel",
        nextSafeAction: "Verify live deployment HTTP status before retrying.",
      };
    }

    if (state.pendingPayments.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        decision: "WAITING_EXTERNAL",
        lastCompletedSequence: state.reconstructedAtSequence,
        reason: "Interrupted payment verification requires PayPal authoritative reconciliation.",
        requiresExternalReconciliation: true,
        targetProvider: "paypal",
        nextSafeAction: "Query PayPal capture status using idempotency key.",
      };
    }

    if (state.blockedWorkItems.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        decision: "SAFE_TO_RETRY",
        lastCompletedSequence: state.reconstructedAtSequence,
        reason: "Failed work items eligible for bounded auto-repair cycle.",
        requiresExternalReconciliation: false,
        nextSafeAction: "Schedule auto-repair work item.",
      };
    }

    return {
      workflowId,
      projectId: state.projectId,
      decision: "SAFE_TO_RESUME",
      lastCompletedSequence: state.reconstructedAtSequence,
      reason: "Workflow in consistent state. Ready to resume next scheduled work item.",
      requiresExternalReconciliation: false,
      nextSafeAction: "Dispatch next available work item to worker fleet.",
    };
  }
}

export const workflowResumeService = new WorkflowResumeService();