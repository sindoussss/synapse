import fs from "fs";
import path from "path";
import crypto from "crypto";

export type WorkType =
  | "DEVELOPMENT"
  | "REPAIR"
  | "QA"
  | "CODE_REVIEW"
  | "VISUAL_REVIEW"
  | "FUNCTIONAL_REVIEW"
  | "SECURITY_REVIEW"
  | "BUILD"
  | "DEPLOYMENT"
  | "ROLLBACK"
  | "PAYMENT_VERIFICATION"
  | "SOURCE_DELIVERY"
  | "CLIENT_REVIEW"
  | "CHANGE_REQUEST"
  | "SUPPORT"
  | "SALES_FOLLOWUP"
  | "PROPOSAL_REVIEW"
  | "REQUIREMENT_CLARIFICATION"
  | "INCIDENT_RESPONSE"
  | "HANDOFF";

export type WorkPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type WorkStatus =
  | "PENDING"
  | "READY"
  | "BLOCKED"
  | "WAITING_HUMAN"
  | "CLAIMED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "SUPERSEDED";

export interface WorkItemRecord {
  workItemId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  sourceTaskId?: string;
  workType: WorkType;
  priority: WorkPriority;
  status: WorkStatus;
  dependencies: string[];
  blockingReasons: string[];
  eligibleActors: ("DEVELOPER_AGENT" | "QA_AGENT" | "RESEARCH_AGENT" | "SALES_AGENT" | "OPERATOR")[];
  requiredApproval: boolean;
  deadline?: string;
  workerId?: string;
  leaseId?: string;
  leaseExpiry?: string;
  repairAttemptCount?: number;
  createdAt: string;
  scheduledAt?: string;
  claimedAt?: string;
  completedAt?: string;
}

const VALID_STATUS_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  PENDING: ["READY", "BLOCKED", "WAITING_HUMAN", "CANCELLED"],
  READY: ["CLAIMED", "BLOCKED", "WAITING_HUMAN", "CANCELLED"],
  BLOCKED: ["READY", "WAITING_HUMAN", "CANCELLED"],
  WAITING_HUMAN: ["READY", "BLOCKED", "CANCELLED"],
  CLAIMED: ["RUNNING", "SUCCEEDED", "READY", "FAILED", "CANCELLED"],
  RUNNING: ["SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED"],
  SUCCEEDED: ["SUPERSEDED", "READY"],
  FAILED: ["READY", "BLOCKED", "WAITING_HUMAN", "SUPERSEDED"],
  CANCELLED: [],
  SUPERSEDED: [],
};

export class WorkOrchestrationRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "work-orchestration.json");
  private items: WorkItemRecord[] = [];

  constructor() {
    this.loadState();
    if (this.items.length === 0) {
      this.seedInitialItems();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.items = raw.items || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        items: this.items,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialItems(): void {
    this.items = [
      {
        workItemId: "WORK-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        environment: "production",
        workType: "DEPLOYMENT",
        priority: "HIGH",
        status: "SUCCEEDED",
        dependencies: [],
        blockingReasons: [],
        eligibleActors: ["OPERATOR"],
        requiredApproval: true,
        createdAt: "2026-08-29T10:00:00.000Z",
        completedAt: "2026-08-29T10:05:00.000Z",
      },
      {
        workItemId: "WORK-LUXE-01",
        projectId: "PRJ-LUXE-01",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-LUXE-01",
        environment: "production",
        workType: "CLIENT_REVIEW",
        priority: "MEDIUM",
        status: "WAITING_HUMAN",
        dependencies: ["WORK-LUXE-QA"],
        blockingReasons: ["CLIENT_APPROVAL_REQUIRED"],
        eligibleActors: ["OPERATOR"],
        requiredApproval: true,
        createdAt: "2026-08-30T09:00:00.000Z",
      },
    ];
    this.saveState();
  }

  getWorkItem(workItemId: string, callingProjectId?: string, callingOrgId?: string): WorkItemRecord | null {
    const item = this.items.find((w) => w.workItemId === workItemId);
    if (!item) return null;

    if (callingProjectId && item.projectId !== callingProjectId) return null;
    if (callingOrgId && item.organizationId !== callingOrgId) return null;

    return { ...item };
  }

  listWorkItems(filter?: {
    projectId?: string;
    organizationId?: string;
    status?: WorkStatus;
    workType?: WorkType;
    priority?: WorkPriority;
  }): WorkItemRecord[] {
    return this.items
      .filter((w) => {
        if (filter?.projectId && w.projectId !== filter.projectId) return false;
        if (filter?.organizationId && w.organizationId !== filter.organizationId) return false;
        if (filter?.status && w.status !== filter.status) return false;
        if (filter?.workType && w.workType !== filter.workType) return false;
        if (filter?.priority && w.priority !== filter.priority) return false;
        return true;
      })
      .map((w) => ({ ...w }));
  }

  saveWorkItem(item: WorkItemRecord, actorRole: string): WorkItemRecord {
    if (actorRole === "CLIENT_SESSION") {
      throw new Error("UNAUTHORIZED_WORK_MUTATION: Client sessions cannot directly modify work orchestration items.");
    }

    const existing = this.items.find((w) => w.workItemId === item.workItemId);
    if (existing) {
      const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status] || [];
      if (existing.status !== item.status && !allowedTransitions.includes(item.status)) {
        throw new Error(`INVALID_STATUS_TRANSITION: Cannot transition work item '${item.workItemId}' from '${existing.status}' to '${item.status}'.`);
      }
      const idx = this.items.findIndex((w) => w.workItemId === item.workItemId);
      this.items[idx] = { ...item };
    } else {
      this.items.push({ ...item });
    }
    this.saveState();
    return { ...item };
  }

  claimWorkItem(params: {
    workItemId: string;
    workerId: string;
    callingProjectId: string;
    callingOrgId: string;
    leaseDurationMs?: number;
  }): { claimed: boolean; leaseId?: string; leaseExpiry?: string; reason?: string } {
    const idx = this.items.findIndex(
      (w) =>
        w.workItemId === params.workItemId &&
        (!params.callingProjectId || w.projectId === params.callingProjectId) &&
        (!params.callingOrgId || w.organizationId === params.callingOrgId)
    );
    if (idx === -1) {
      return { claimed: false, reason: "WORK_ITEM_NOT_FOUND_OR_TENANT_MISMATCH" };
    }

    const item = this.items[idx];
    const now = Date.now();
    const duration = params.leaseDurationMs || 30000;

    // Check if currently leased
    if (item.status === "CLAIMED" || item.status === "RUNNING") {
      const expiry = item.leaseExpiry ? new Date(item.leaseExpiry).getTime() : 0;
      if (expiry > now && item.workerId !== params.workerId) {
        return { claimed: false, reason: "DUPLICATE_CLAIM_BLOCKED: Item currently leased to another active worker." };
      }
    }

    if (item.status !== "READY" && item.status !== "CLAIMED") {
      return { claimed: false, reason: `CANNOT_CLAIM_STATUS: Item is in '${item.status}' state.` };
    }

    const leaseId = `LEASE-${now}-${crypto.randomBytes(3).toString("hex")}`;
    const leaseExpiry = new Date(now + duration).toISOString();

    item.status = "CLAIMED";
    item.workerId = params.workerId;
    item.leaseId = leaseId;
    item.leaseExpiry = leaseExpiry;
    item.claimedAt = new Date(now).toISOString();

    this.saveState();
    return { claimed: true, leaseId, leaseExpiry };
  }
}

export const workOrchestrationRepository = new WorkOrchestrationRepository();