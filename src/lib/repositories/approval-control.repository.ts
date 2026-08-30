import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ApprovalRequestType =
  | "PRODUCTION_DEPLOYMENT"
  | "ROLLBACK"
  | "SOURCE_DELIVERY"
  | "PAYMENT_EXCEPTION"
  | "PAYMENT_RECONCILIATION"
  | "SCOPE_EXPANSION"
  | "CLIENT_APPROVAL"
  | "PROPOSAL_APPROVAL"
  | "AGREEMENT_APPROVAL"
  | "MAINTENANCE"
  | "CHANGE_REQUEST"
  | "SECURITY_EXCEPTION"
  | "UNKNOWN_STATE"
  | "INCIDENT_RESPONSE"
  | "RELEASE_APPROVAL"
  | "CONFIGURATION_CHANGE"
  | "DOMAIN_CHANGE"
  | "MANUAL_RECOVERY";

export type ApprovalStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REQUESTED_CHANGES"
  | "EXPIRED"
  | "CANCELLED"
  | "SUPERSEDED";

export type ApprovalRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ApprovalRequestRecord {
  approvalRequestId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  workflowId: string;
  workItemId?: string;
  requestType: ApprovalRequestType;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  requestedBy: string;
  requestedAt: string;
  expiresAt?: string;
  evidenceIds: string[];
  snapshotId?: string;
  releaseCandidateId?: string;
  sourceHash?: string;
  manifestHash?: string;
  paymentReference?: string;
  proposedAction: string;
  consequences: string;
  blockers: string[];
  responsibleRole: "OPERATOR" | "ADMIN" | "CLIENT";
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecisionRecord {
  approvalDecisionId: string;
  approvalRequestId: string;
  actorId: string;
  actorRole: string;
  decision: "APPROVED" | "REJECTED" | "REQUESTED_CHANGES";
  decisionReason: string;
  evidenceIds: string[];
  snapshotId?: string;
  sourceHash?: string;
  manifestHash?: string;
  timestamp: string;
}

export class ApprovalControlRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "approval-control.json");
  private requests: ApprovalRequestRecord[] = [];
  private decisions: ApprovalDecisionRecord[] = [];

  constructor() {
    this.loadState();
    if (this.requests.length === 0) {
      this.seedInitialRequests();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.requests = raw.requests || [];
        this.decisions = raw.decisions || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        requests: this.requests,
        decisions: this.decisions,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialRequests(): void {
    const orgId = "ORG-CASILI-01";
    const projId = "PRJ-SINDOUS-01";
    const now = "2026-08-30T08:00:00.000Z";

    this.requests = [
      {
        approvalRequestId: "APPR-DEPLOY-001",
        organizationId: orgId,
        projectId: projId,
        workspaceId: "WS-SINDOUS-01",
        environment: "production",
        workflowId: "WF-PRJ-SINDOUS-01",
        workItemId: "WORK-DEP-01",
        requestType: "PRODUCTION_DEPLOYMENT",
        status: "PENDING",
        riskLevel: "HIGH",
        requestedBy: "DEVELOPER_AGENT",
        requestedAt: now,
        evidenceIds: ["EVID-QA-PASS", "EVID-BUILD-PASS"],
        snapshotId: "SNAP-SINDOUS-FINAL",
        releaseCandidateId: "RC-FINAL-P49-SINDOUS",
        sourceHash: "a9406accb7cc98e2...",
        manifestHash: "manifest_99a8b...",
        proposedAction: "Promote verified build artifact to live production domain https://sindous.ph",
        consequences: "Website goes live to public traffic.",
        blockers: [],
        responsibleRole: "OPERATOR",
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.saveState();
  }

  createRequest(request: Omit<ApprovalRequestRecord, "approvalRequestId" | "createdAt" | "updatedAt">): ApprovalRequestRecord {
    const now = new Date().toISOString();
    const id = `APPR-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ApprovalRequestRecord = {
      ...request,
      approvalRequestId: id,
      createdAt: now,
      updatedAt: now,
    };
    this.requests.push(record);
    this.saveState();
    return { ...record };
  }

  getRequest(approvalRequestId: string, callerOrgId?: string): ApprovalRequestRecord | null {
    const req = this.requests.find((r) => r.approvalRequestId === approvalRequestId);
    if (!req) return null;
    if (callerOrgId && req.organizationId !== callerOrgId) return null;
    return { ...req };
  }

  listRequests(filter?: {
    organizationId?: string;
    projectId?: string;
    status?: ApprovalStatus;
    riskLevel?: ApprovalRiskLevel;
    requestType?: ApprovalRequestType;
  }): ApprovalRequestRecord[] {
    return this.requests
      .filter((r) => {
        if (filter?.organizationId && r.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && r.projectId !== filter.projectId) return false;
        if (filter?.status && r.status !== filter.status) return false;
        if (filter?.riskLevel && r.riskLevel !== filter.riskLevel) return false;
        if (filter?.requestType && r.requestType !== filter.requestType) return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }

  recordDecision(decision: Omit<ApprovalDecisionRecord, "approvalDecisionId" | "timestamp">): { success: boolean; decision?: ApprovalDecisionRecord; reason?: string } {
    const reqIdx = this.requests.findIndex((r) => r.approvalRequestId === decision.approvalRequestId);
    if (reqIdx === -1) {
      return { success: false, reason: "APPROVAL_REQUEST_NOT_FOUND" };
    }

    const req = this.requests[reqIdx];
    if (req.status === "APPROVED" || req.status === "REJECTED" || req.status === "REQUESTED_CHANGES") {
      return { success: false, reason: "ALREADY_DECIDED: Approval request has already been finalized." };
    }

    const now = new Date().toISOString();
    const decisionRecord: ApprovalDecisionRecord = {
      ...decision,
      approvalDecisionId: `DEC-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`,
      timestamp: now,
    };

    this.decisions.push(decisionRecord);
    this.requests[reqIdx].status = decision.decision;
    this.requests[reqIdx].updatedAt = now;
    this.saveState();

    return { success: true, decision: decisionRecord };
  }

  getDecisionForRequest(approvalRequestId: string): ApprovalDecisionRecord | null {
    const d = this.decisions.find((x) => x.approvalRequestId === approvalRequestId);
    return d ? { ...d } : null;
  }
}

export const approvalControlRepository = new ApprovalControlRepository();