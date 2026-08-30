import crypto from "crypto";
import { workerRepository, WorkerRecord, WorkerStatus } from "../../repositories/worker.repository";
import { workOrchestrationRepository, WorkItemRecord } from "../../repositories/work-orchestration.repository";
import { deadLetterRepository } from "../../repositories/dead-letter.repository";
import { taskExecutionAdapter, WorkerExecutionResult } from "./task-execution-adapter";
import { workOrchestratorService } from "../orchestration/work-orchestrator.service";
import { dependencyService } from "../orchestration/dependency.service";

export interface WorkerExecutionContext {
  workerId: string;
  workItemId: string;
  executionId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  leaseId: string;
  fencingToken: number;
}

export class WorkerRuntimeService {
  private GLOBAL_MAX_WORKERS = 10;
  private MAX_WORKERS_PER_ORG = 5;
  private MAX_WORKERS_PER_PROJECT = 3;

  private activeTokens: Map<string, number> = new Map(); // workItemId -> current active fencingToken

  getFencingToken(workItemId: string): number {
    return this.activeTokens.get(workItemId) || 1;
  }

  issueNewFencingToken(workItemId: string): number {
    const next = (this.activeTokens.get(workItemId) || 0) + 1;
    this.activeTokens.set(workItemId, next);
    return next;
  }

  canSpawnWorker(orgId: string, projectId?: string): { allowed: boolean; reason?: string } {
    const allWorkers = workerRepository.listWorkers();
    if (allWorkers.length >= this.GLOBAL_MAX_WORKERS) {
      return { allowed: false, reason: "GLOBAL_MAX_WORKERS_REACHED: System at maximum global worker capacity." };
    }

    const orgWorkers = allWorkers.filter((w) => w.organizationId === orgId);
    if (orgWorkers.length >= this.MAX_WORKERS_PER_ORG) {
      return { allowed: false, reason: "ORG_MAX_WORKERS_REACHED: Organization at maximum worker capacity." };
    }

    if (projectId) {
      const projWorkers = orgWorkers.filter((w) => w.projectId === projectId);
      if (projWorkers.length >= this.MAX_WORKERS_PER_PROJECT) {
        return { allowed: false, reason: "PROJECT_MAX_WORKERS_REACHED: Project at maximum worker capacity." };
      }
    }

    return { allowed: true };
  }

  async executeWorkCycle(params: {
    workerId: string;
    organizationId: string;
    actorRole: string;
  }): Promise<{ executed: boolean; result?: WorkerExecutionResult; reason?: string }> {
    const worker = workerRepository.getWorker(params.workerId, params.organizationId);
    if (!worker) {
      return { executed: false, reason: "WORKER_NOT_FOUND" };
    }

    if (worker.status === "DRAINING" || worker.status === "STOPPED") {
      return { executed: false, reason: "WORKER_DRAINING_OR_STOPPED: Worker cannot accept new work." };
    }

    // 1. Get next executable work item
    const item = workOrchestratorService.getNextExecutableWorkItem({
      organizationId: params.organizationId,
      actorType: worker.workerType.replace("_WORKER", "_AGENT") as any,
    });

    if (!item) {
      workerRepository.updateWorkerStatus(params.workerId, "IDLE");
      return { executed: false, reason: "NO_READY_WORK_AVAILABLE" };
    }

    // 2. Claim lease with fencing token
    const claimRes = workOrchestrationRepository.claimWorkItem({
      workItemId: item.workItemId,
      workerId: params.workerId,
      callingProjectId: item.projectId,
      callingOrgId: params.organizationId,
    });

    if (!claimRes.claimed) {
      return { executed: false, reason: claimRes.reason || "CLAIM_FAILED" };
    }

    const fencingToken = this.issueNewFencingToken(item.workItemId);
    workerRepository.updateWorkerStatus(params.workerId, "RUNNING", {
      currentWorkItemId: item.workItemId,
      currentLeaseId: claimRes.leaseId,
      fencingToken,
    });

    // 3. Heartbeat
    workerRepository.heartbeat(params.workerId);

    // 4. Execute through adapter
    const result = await taskExecutionAdapter.executeTask({
      item,
      workerId: params.workerId,
      fencingToken,
      actorRole: params.actorRole,
    });

    // 5. Check fencing token before persisting result
    const currentToken = this.getFencingToken(item.workItemId);
    if (currentToken !== fencingToken) {
      return {
        executed: false,
        reason: "REJECTED_STALE_EXECUTION: Worker fencing token mismatch. Late worker collision prevented.",
      };
    }

    // 6. Complete task and update state
    if (result.status === "SUCCESS") {
      item.status = "SUCCEEDED";
      item.completedAt = new Date().toISOString();
      workOrchestrationRepository.saveWorkItem(item, "OPERATOR");

      // Downstream dependency cascade unblocking
      this.unblockDownstreamDependencies(item.projectId, params.organizationId);

      workerRepository.updateWorkerStatus(params.workerId, "IDLE", {
        currentWorkItemId: undefined,
        currentLeaseId: undefined,
        completedTasks: worker.completedTasks + 1,
      });
    } else {
      item.status = "FAILED";
      workOrchestrationRepository.saveWorkItem(item, "OPERATOR");

      deadLetterRepository.addDeadLetter({
        workItemId: item.workItemId,
        projectId: item.projectId,
        organizationId: params.organizationId,
        failureChain: [result.errorCode || "EXECUTION_FAILURE"],
        retryAttempts: 3,
        provider: "local-ollama",
        error: result.errorCode || "EXECUTION_FAILURE",
        evidence: result.resultEvidenceId,
        lastWorkerId: params.workerId,
      });

      workerRepository.updateWorkerStatus(params.workerId, "IDLE", {
        currentWorkItemId: undefined,
        currentLeaseId: undefined,
        failedTasks: worker.failedTasks + 1,
      });
    }

    return { executed: true, result };
  }

  private unblockDownstreamDependencies(projectId: string, orgId: string): void {
    const allProjectItems = workOrchestrationRepository.listWorkItems({ projectId, organizationId: orgId });
    for (const otherItem of allProjectItems) {
      if (otherItem.status === "BLOCKED" && otherItem.dependencies.length > 0) {
        const depCheck = dependencyService.checkDependencies(otherItem);
        if (depCheck.satisfied) {
          otherItem.status = "READY";
          workOrchestrationRepository.saveWorkItem(otherItem, "OPERATOR");
        }
      }
    }
  }

  requestGracefulShutdown(workerId: string): { status: WorkerStatus } {
    const worker = workerRepository.updateWorkerStatus(workerId, "DRAINING", {
      shutdownRequestedAt: new Date().toISOString(),
    });
    return { status: worker ? worker.status : "STOPPED" };
  }
}

export const workerRuntimeService = new WorkerRuntimeService();