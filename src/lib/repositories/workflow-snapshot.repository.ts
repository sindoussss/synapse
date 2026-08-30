import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface WorkflowSnapshotRecord {
  workflowId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  snapshotSequence: number;
  currentState: string;
  currentSubstates: Record<string, string>;
  activeWorkItems: string[];
  blockedWorkItems: string[];
  pendingApprovals: string[];
  pendingPayments: string[];
  activeIncidents: string[];
  activeDeployments: string[];
  currentRelease?: string;
  currentSnapshot?: string;
  lastEventId: string;
  lastEventSequence: number;
  snapshotHash: string;
  createdAt: string;
}

export class WorkflowSnapshotRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "workflow-snapshots.json");
  private snapshots: WorkflowSnapshotRecord[] = [];

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.snapshots = raw.snapshots || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        snapshots: this.snapshots,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  saveSnapshot(snapshotData: Omit<WorkflowSnapshotRecord, "snapshotHash" | "createdAt">): WorkflowSnapshotRecord {
    const now = new Date().toISOString();
    const canonical = JSON.stringify({
      workflowId: snapshotData.workflowId,
      projectId: snapshotData.projectId,
      snapshotSequence: snapshotData.snapshotSequence,
      currentState: snapshotData.currentState,
      lastEventId: snapshotData.lastEventId,
      lastEventSequence: snapshotData.lastEventSequence,
    });
    const snapshotHash = crypto.createHash("sha256").update(canonical).digest("hex");

    const record: WorkflowSnapshotRecord = {
      ...snapshotData,
      snapshotHash,
      createdAt: now,
    };

    const idx = this.snapshots.findIndex((s) => s.workflowId === record.workflowId && s.snapshotSequence === record.snapshotSequence);
    if (idx !== -1) {
      this.snapshots[idx] = { ...record };
    } else {
      this.snapshots.push({ ...record });
    }

    this.saveState();
    return { ...record };
  }

  getLatestSnapshot(workflowId: string): WorkflowSnapshotRecord | null {
    const matched = this.snapshots
      .filter((s) => s.workflowId === workflowId)
      .sort((a, b) => b.snapshotSequence - a.snapshotSequence);
    return matched.length > 0 ? { ...matched[0] } : null;
  }

  listSnapshots(workflowId: string): WorkflowSnapshotRecord[] {
    return this.snapshots
      .filter((s) => s.workflowId === workflowId)
      .sort((a, b) => a.snapshotSequence - b.snapshotSequence)
      .map((s) => ({ ...s }));
  }
}

export const workflowSnapshotRepository = new WorkflowSnapshotRepository();