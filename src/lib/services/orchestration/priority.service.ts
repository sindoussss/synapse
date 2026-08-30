import { WorkPriority, WorkType } from "../../repositories/work-orchestration.repository";

export interface PriorityEvaluationResult {
  priority: WorkPriority;
  urgencyScore: number;
  deadlineStatus: "KNOWN" | "UNKNOWN";
  reason: string;
}

export class PriorityService {
  calculatePriority(params: {
    workType: WorkType;
    isSecurityRelated?: boolean;
    isIncidentRelated?: boolean;
    isProductionOutage?: boolean;
    deadline?: string;
  }): PriorityEvaluationResult {
    let priority: WorkPriority = "MEDIUM";
    let urgencyScore = 50;
    let reason = "Standard lifecycle workflow prioritization.";

    if (params.isProductionOutage || params.isSecurityRelated || params.workType === "INCIDENT_RESPONSE") {
      priority = "CRITICAL";
      urgencyScore = 100;
      reason = "CRITICAL priority assigned due to active production incident or security vulnerability.";
    } else if (params.workType === "DEPLOYMENT" || params.workType === "ROLLBACK" || params.workType === "PAYMENT_VERIFICATION" || params.workType === "QA") {
      priority = "HIGH";
      urgencyScore = 80;
      reason = "HIGH priority assigned for deployment, release verification, and QA gates.";
    } else if (params.workType === "DEVELOPMENT" || params.workType === "PROPOSAL_REVIEW" || params.workType === "REQUIREMENT_CLARIFICATION") {
      priority = "MEDIUM";
      urgencyScore = 50;
      reason = "MEDIUM priority assigned for standard feature development and requirements.";
    } else if (params.workType === "SUPPORT" || params.workType === "HANDOFF") {
      priority = "LOW";
      urgencyScore = 20;
      reason = "LOW priority assigned for post-launch documentation and support tasks.";
    }

    const deadlineStatus: "KNOWN" | "UNKNOWN" = params.deadline && params.deadline !== "UNKNOWN" ? "KNOWN" : "UNKNOWN";
    if (deadlineStatus === "KNOWN" && params.deadline) {
      const remainingMs = new Date(params.deadline).getTime() - Date.now();
      if (remainingMs < 3600000 && remainingMs > 0 && priority !== "CRITICAL") {
        urgencyScore += 15;
        reason += " Urgency boosted due to approaching deadline within 1 hour.";
      }
    }

    return {
      priority,
      urgencyScore,
      deadlineStatus,
      reason,
    };
  }
}

export const priorityService = new PriorityService();