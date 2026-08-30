import fs from "fs";
import path from "path";
import crypto from "crypto";

export type WorkerType =
  | "DEVELOPER_WORKER"
  | "QA_WORKER"
  | "RESEARCH_WORKER"
  | "SALES_WORKER"
  | "DEPLOYMENT_WORKER"
  | "OPERATIONS_WORKER"
  | "PAYMENT_VERIFICATION_WORKER"
  | "DELIVERY_WORKER";

export type WorkerStatus =
  | "STARTING"
  | "IDLE"
  | "CLAIMING"
  | "RUNNING"
  | "DRAINING"
  | "STOPPED"
  | "FAILED"
  | "STALE";

export interface WorkerRecord {
  workerId: string;
  workerType: WorkerType;
  organizationId: string;
  workspaceId: string;
  projectId?: string;
  environment: "production" | "staging" | "sandbox";
  status: WorkerStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  currentWorkItemId?: string;
  currentLeaseId?: string;
  fencingToken?: number;
  shutdownRequestedAt?: string;
  completedTasks: number;
  failedTasks: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkerRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "workers.json");
  private workers: WorkerRecord[] = [];

  constructor() {
    this.loadState();
    if (this.workers.length === 0) {
      this.seedInitialWorkers();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.workers = raw.workers || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        workers: this.workers,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialWorkers(): void {
    this.workers = [
      {
        workerId: "WRK-DEV-01",
        workerType: "DEVELOPER_WORKER",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        environment: "production",
        status: "IDLE",
        startedAt: "2026-08-30T08:00:00.000Z",
        lastHeartbeatAt: new Date().toISOString(),
        completedTasks: 12,
        failedTasks: 0,
        version: "v1.0.0",
        createdAt: "2026-08-30T08:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
      {
        workerId: "WRK-QA-01",
        workerType: "QA_WORKER",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        environment: "production",
        status: "IDLE",
        startedAt: "2026-08-30T08:00:00.000Z",
        lastHeartbeatAt: new Date().toISOString(),
        completedTasks: 8,
        failedTasks: 0,
        version: "v1.0.0",
        createdAt: "2026-08-30T08:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
    ];
    this.saveState();
  }

  getWorker(workerId: string, callingOrgId?: string): WorkerRecord | null {
    const w = this.workers.find((x) => x.workerId === workerId);
    if (!w) return null;
    if (callingOrgId && w.organizationId !== callingOrgId) return null;
    return { ...w };
  }

  listWorkers(filter?: {
    organizationId?: string;
    projectId?: string;
    status?: WorkerStatus;
    workerType?: WorkerType;
  }): WorkerRecord[] {
    return this.workers
      .filter((w) => {
        if (filter?.organizationId && w.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && w.projectId !== filter.projectId) return false;
        if (filter?.status && w.status !== filter.status) return false;
        if (filter?.workerType && w.workerType !== filter.workerType) return false;
        return true;
      })
      .map((w) => ({ ...w }));
  }

  registerWorker(record: Omit<WorkerRecord, "createdAt" | "updatedAt">): WorkerRecord {
    const now = new Date().toISOString();
    const newWorker: WorkerRecord = {
      ...record,
      createdAt: now,
      updatedAt: now,
    };
    const idx = this.workers.findIndex((w) => w.workerId === record.workerId);
    if (idx !== -1) {
      this.workers[idx] = { ...newWorker };
    } else {
      this.workers.push({ ...newWorker });
    }
    this.saveState();
    return { ...newWorker };
  }

  heartbeat(workerId: string): { updated: boolean; lastHeartbeatAt?: string } {
    const idx = this.workers.findIndex((w) => w.workerId === workerId);
    if (idx === -1) return { updated: false };
    const now = new Date().toISOString();
    this.workers[idx].lastHeartbeatAt = now;
    this.workers[idx].updatedAt = now;
    this.saveState();
    return { updated: true, lastHeartbeatAt: now };
  }

  updateWorkerStatus(workerId: string, status: WorkerStatus, meta?: Partial<WorkerRecord>): WorkerRecord | null {
    const idx = this.workers.findIndex((w) => w.workerId === workerId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    this.workers[idx] = {
      ...this.workers[idx],
      ...meta,
      status,
      updatedAt: now,
    };
    this.saveState();
    return { ...this.workers[idx] };
  }
}

export const workerRepository = new WorkerRepository();