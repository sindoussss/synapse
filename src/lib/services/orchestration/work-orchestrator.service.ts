import { workOrchestrationRepository, WorkItemRecord, WorkStatus, WorkType, WorkPriority } from "../../repositories/work-orchestration.repository";
import { dependencyService } from "./dependency.service";
import { blockerService } from "./blocker.service";
import { priorityService } from "./priority.service";
import { readinessService } from "./readiness.service";

export interface OrchestratorQueueSummary {
  totalCount: number;
  readyCount: number;
  blockedCount: number;
  waitingHumanCount: number;
  runningCount: number;
  failedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export class WorkOrchestratorService {
  private MAX_CONCURRENT_PER_PROJECT = 3;
  private MAX_REPAIR_CYCLES = 3;

  getQueueSummary(orgId: string): OrchestratorQueueSummary {
    const items = workOrchestrationRepository.listWorkItems({ organizationId: orgId });
    return {
      totalCount: items.length,
      readyCount: items.filter((i) => i.status === "READY").length,
      blockedCount: items.filter((i) => i.status === "BLOCKED").length,
      waitingHumanCount: items.filter((i) => i.status === "WAITING_HUMAN").length,
      runningCount: items.filter((i) => i.status === "RUNNING" || i.status === "CLAIMED").length,
      failedCount: items.filter((i) => i.status === "FAILED").length,
      criticalCount: items.filter((i) => i.priority === "CRITICAL").length,
      highCount: items.filter((i) => i.priority === "HIGH").length,
      mediumCount: items.filter((i) => i.priority === "MEDIUM").length,
      lowCount: items.filter((i) => i.priority === "LOW").length,
    };
  }

  getNextExecutableWorkItem(params: {
    organizationId: string;
    actorType: "DEVELOPER_AGENT" | "QA_AGENT" | "RESEARCH_AGENT" | "SALES_AGENT" | "OPERATOR";
  }): WorkItemRecord | null {
    const allItems = workOrchestrationRepository.listWorkItems({ organizationId: params.organizationId });
    const readyItems = allItems.filter(
      (i) => i.status === "READY" && i.eligibleActors.includes(params.actorType)
    );

    if (readyItems.length === 0) return null;

    // Prioritize by CRITICAL > HIGH > MEDIUM > LOW
    const priorityWeight: Record<WorkPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    readyItems.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    // Check project concurrency limits for fairness
    for (const item of readyItems) {
      const activeProjectItems = allItems.filter(
        (i) => i.projectId === item.projectId && (i.status === "RUNNING" || i.status === "CLAIMED")
      );
      if (activeProjectItems.length < this.MAX_CONCURRENT_PER_PROJECT || item.priority === "CRITICAL") {
        return item;
      }
    }

    return readyItems[0] || null;
  }

  handleAutoRepair(params: {
    projectId: string;
    organizationId: string;
    workspaceId: string;
    sourceWorkItemId: string;
    failureReason: string;
  }): { repairCreated: boolean; workItemId?: string; requiresHumanReview: boolean; reason: string } {
    const sourceItem = workOrchestrationRepository.getWorkItem(params.sourceWorkItemId, params.projectId, params.organizationId);
    const attempts = (sourceItem?.repairAttemptCount || 0) + 1;

    if (attempts > this.MAX_REPAIR_CYCLES) {
      return {
        repairCreated: false,
        requiresHumanReview: true,
        reason: `HUMAN_REVIEW_REQUIRED: Maximum auto-repair cycle limit (${this.MAX_REPAIR_CYCLES}) reached for '${params.sourceWorkItemId}'.`,
      };
    }

    const repairItem: WorkItemRecord = {
      workItemId: `WORK-REP-${Date.now().toString().slice(-4)}`,
      projectId: params.projectId,
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      environment: "production",
      sourceTaskId: params.sourceWorkItemId,
      workType: "REPAIR",
      priority: "HIGH",
      status: "READY",
      dependencies: [],
      blockingReasons: [],
      eligibleActors: ["DEVELOPER_AGENT"],
      requiredApproval: false,
      repairAttemptCount: attempts,
      createdAt: new Date().toISOString(),
    };

    workOrchestrationRepository.saveWorkItem(repairItem, "OPERATOR");

    return {
      repairCreated: true,
      workItemId: repairItem.workItemId,
      requiresHumanReview: false,
      reason: `Auto-repair task '${repairItem.workItemId}' created (attempt ${attempts}/${this.MAX_REPAIR_CYCLES}).`,
    };
  }
}

export const workOrchestratorService = new WorkOrchestratorService();