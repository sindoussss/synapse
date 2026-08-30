import { workflowReconstructionService, ReconstructedWorkflowState } from "./workflow-reconstruction.service";

export interface WorkflowDiagnosisReport {
  workflowId: string;
  projectId: string;
  currentState: string;
  blockingState?: string;
  blockingReason?: string;
  responsibleActor?: "CLIENT" | "OPERATOR" | "DEVELOPER_AGENT" | "QA_AGENT" | "NONE";
  dependencies: string[];
  nextAuthorizedAction: string;
  evidence: string[];
}

export class WorkflowDiagnosisService {
  diagnoseWorkflow(workflowId: string): WorkflowDiagnosisReport {
    const state = workflowReconstructionService.replayWorkflow(workflowId);
    if (!state) {
      return {
        workflowId,
        projectId: "UNKNOWN",
        currentState: "UNKNOWN_STATE",
        blockingReason: "No event stream found for workflow.",
        responsibleActor: "OPERATOR",
        dependencies: [],
        nextAuthorizedAction: "Initialize workflow event log.",
        evidence: ["NO_EVENTS_FOUND"],
      };
    }

    if (state.activeIncidents.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        currentState: state.currentState,
        blockingState: "INCIDENT_OPEN",
        blockingReason: `Active incident ${state.activeIncidents[0]} prevents workflow advancement.`,
        responsibleActor: "OPERATOR",
        dependencies: state.activeIncidents,
        nextAuthorizedAction: "Resolve active incident and release incident hold.",
        evidence: state.activeIncidents,
      };
    }

    if (state.pendingApprovals.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        currentState: state.currentState,
        blockingState: "WAITING_CLIENT_APPROVAL",
        blockingReason: "Client approval required before release and payment unlock.",
        responsibleActor: "CLIENT",
        dependencies: ["CLIENT_APPROVAL"],
        nextAuthorizedAction: "Client must review preview and submit signed approval.",
        evidence: ["APPROVAL_PENDING_CLIENT"],
      };
    }

    if (state.pendingPayments.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        currentState: state.currentState,
        blockingState: "PAYMENT_REQUIRED",
        blockingReason: "Pending deposit/invoice verification required.",
        responsibleActor: "CLIENT",
        dependencies: ["PAYPAL_CAPTURE"],
        nextAuthorizedAction: "Complete PayPal transaction or submit payment confirmation.",
        evidence: ["INVOICE_UNPAID"],
      };
    }

    if (state.blockedWorkItems.length > 0) {
      return {
        workflowId,
        projectId: state.projectId,
        currentState: state.currentState,
        blockingState: "WORK_ITEM_FAILED",
        blockingReason: `Failed work item ${state.blockedWorkItems[0]} requires repair or review.`,
        responsibleActor: "DEVELOPER_AGENT",
        dependencies: state.blockedWorkItems,
        nextAuthorizedAction: "Trigger auto-repair or escalate to operator review.",
        evidence: state.blockedWorkItems,
      };
    }

    return {
      workflowId,
      projectId: state.projectId,
      currentState: state.currentState,
      responsibleActor: "NONE",
      dependencies: [],
      nextAuthorizedAction: "Workflow executing normally. Next scheduled work item ready.",
      evidence: [`SEQUENCE_${state.reconstructedAtSequence}`],
    };
  }
}

export const workflowDiagnosisService = new WorkflowDiagnosisService();