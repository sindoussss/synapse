import fs from "fs";
import path from "path";

export type ProjectPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export interface PriorityCalculationResult {
  projectId: string;
  priority: ProjectPriority;
  score: number;
  reasons: string[];
}

export class ProjectPriorityService {
  calculatePriority(params: {
    projectId: string;
    hasCriticalIncident?: boolean;
    hasUnresolvedSecurityBlocker?: boolean;
    pendingClientReview?: boolean;
    overdueMilestone?: boolean;
  }): PriorityCalculationResult {
    const reasons: string[] = [];
    let score = 0;

    if (params.hasCriticalIncident) {
      score += 100;
      reasons.push("Critical incident active on live endpoint.");
    }
    if (params.hasUnresolvedSecurityBlocker) {
      score += 80;
      reasons.push("Security blocker detected in pre-release QA.");
    }
    if (params.overdueMilestone) {
      score += 50;
      reasons.push("Delivery milestone past SLA deadline.");
    }
    if (params.pendingClientReview) {
      score += 30;
      reasons.push("Awaiting client review sign-off.");
    }

    let priority: ProjectPriority = "NORMAL";
    if (score >= 100) priority = "CRITICAL";
    else if (score >= 50) priority = "HIGH";
    else if (score > 0) priority = "NORMAL";
    else priority = "LOW";

    return {
      projectId: params.projectId,
      priority,
      score,
      reasons,
    };
  }
}

export const projectPriorityService = new ProjectPriorityService();
