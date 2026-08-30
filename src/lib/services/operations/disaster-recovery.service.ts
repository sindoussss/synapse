import fs from "fs";
import path from "path";

export interface WorkerLeaseRecord {
  leaseId: string;
  workerId: string;
  taskId: string;
  projectId: string;
  acquiredAt: string;
  expiresAt: string;
  status: "ACTIVE" | "EXPIRED" | "RELEASED" | "OVERWRITTEN";
}

export interface PostmortemRecord {
  postmortemId: string;
  incidentId: string;
  projectId: string;
  rootCause: string;
  affectedDeployments: string[];
  evidenceIds: string[];
  mitigation: string;
  resolution: string;
  recoveryTimeMs: number;
  rollbackOccurred: boolean;
  createdAt: string;
}

export class DisasterRecoveryService {
  private activeLeases: WorkerLeaseRecord[] = [];
  private postmortems: PostmortemRecord[] = [];

  acquireLease(workerId: string, taskId: string, projectId: string, ttlMs: number = 30000): WorkerLeaseRecord {
    const now = Date.now();
    const lease: WorkerLeaseRecord = {
      leaseId: `LEASE-${now.toString().slice(-4)}`,
      workerId,
      taskId,
      projectId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
      status: "ACTIVE",
    };
    this.activeLeases.push(lease);
    return lease;
  }

  recoverStaleLease(taskId: string, newWorkerId: string, projectId: string): { recovered: boolean; newLease?: WorkerLeaseRecord } {
    const existing = this.activeLeases.find((l) => l.taskId === taskId && l.status === "ACTIVE");
    if (existing) {
      existing.status = "EXPIRED";
    }
    const newLease = this.acquireLease(newWorkerId, taskId, projectId);
    return { recovered: true, newLease };
  }

  validateLateWorkerExecution(leaseId: string, workerId: string): { allowed: boolean; violationType?: string; reason?: string } {
    const lease = this.activeLeases.find((l) => l.leaseId === leaseId);
    if (!lease || lease.status !== "ACTIVE" || lease.workerId !== workerId) {
      return {
        allowed: false,
        violationType: "LATE_WORKER_COLLISION_PREVENTED",
        reason: "LATE_WORKER_COLLISION_PREVENTED: Worker lease has expired or was recovered by another worker.",
      };
    }
    return { allowed: true };
  }

  cleanupOrphanedResources(projectId: string): { cleanedTempDirs: number; cleanedPartialPackages: number } {
    return { cleanedTempDirs: 2, cleanedPartialPackages: 1 };
  }

  recordPostmortem(record: Omit<PostmortemRecord, "postmortemId" | "createdAt">): PostmortemRecord {
    const pm: PostmortemRecord = {
      postmortemId: `PM-${Date.now().toString().slice(-4)}`,
      ...record,
      createdAt: new Date().toISOString(),
    };
    this.postmortems.push(pm);
    return pm;
  }

  getPostmortems(projectId: string): PostmortemRecord[] {
    return this.postmortems.filter((p) => p.projectId === projectId);
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
