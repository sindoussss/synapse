import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ReviewSessionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "CLIENT_APPROVED"
  | "CLIENT_REQUESTED_CHANGES"
  | "EXPIRED"
  | "CLOSED"
  | "SUPERSEDED"
  | "draft"
  | "waiting_deployment_approval"
  | "deploying"
  | "ready"
  | "invitation_pending"
  | "in_review"
  | "changes_requested"
  | "accepted"
  | "superseded"
  | "cancelled";

export type CommentStatus =
  | "OPEN"
  | "REPLIED"
  | "RESOLVED"
  | "REOPENED"
  | "CONVERTED_TO_CHANGE_REQUEST"
  | "SUPERSEDED";

export type CommentCategory =
  | "DESIGN"
  | "CONTENT"
  | "FUNCTIONAL"
  | "RESPONSIVE"
  | "TYPOGRAPHY"
  | "ACCESSIBILITY"
  | "BUG"
  | "QUESTION"
  | "OTHER";

export type CommentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "critical" | "high" | "medium" | "low";

export interface ClientReviewSessionRecord {
  id: string;
  reviewSessionId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  clientId: string;
  reviewNumber: string;
  snapshotId: string;
  releaseCandidateId?: string;
  sourceHash?: string;
  manifestHash: string;
  qaRunId?: string;
  deploymentId?: string;
  previewUrl?: string;
  accessStatus?: "accessible" | "client_access_blocked";
  status: ReviewSessionStatus;
  openedAt?: string;
  sentAt?: string;
  invitationMessageId?: string;
  clientOpenedAt?: string;
  feedbackDeadline?: string;
  acceptedAt?: string;
  acceptedSnapshotHash?: string;
  acceptedByClientEvidence?: string;
  confirmedByOperator?: string;
  closedAt?: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
}

export interface ClientFeedbackRecord {
  id: string;
  reviewSessionId: string;
  projectId: string;
  source: "email" | "operator" | "portal";
  messageId?: string;
  rawText: string;
  submittedBy: string;
  submittedAt: string;
  classification: "BUG" | "CONTRACTUAL_REVISION" | "CONTENT_UPDATE" | "CLIENT_CONFIGURATION" | "OUT_OF_SCOPE_REQUEST" | "QUESTION" | "POSITIVE_FEEDBACK" | "ACCEPTANCE_SIGNAL" | "UNCLEAR";
  scopeStatus: "in_scope" | "out_of_scope" | "pending_operator";
  severity?: "critical" | "high" | "medium" | "low";
  route?: string;
  viewport?: string;
  elementReference?: string;
  operatorStatus: "pending" | "approved" | "rejected" | "resolved";
  resolution?: string;
  createdAt: string;
}

export interface ClientReviewCommentRecord {
  commentId: string;
  reviewSessionId: string;
  organizationId: string;
  projectId: string;
  clientId: string;
  authorId: string;
  authorRole: "CLIENT" | "OPERATOR" | "ADMIN";
  body: string;
  status: CommentStatus;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: CommentCategory;
  pagePath?: string;
  elementReference?: string;
  viewport?: string;
  x?: number;
  y?: number;
  snapshotId: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface OperatorReviewNoteRecord {
  noteId: string;
  reviewSessionId: string;
  organizationId: string;
  projectId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export class ClientReviewRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "client-review-workspace.json");
  private sessionsCacheFile = path.resolve(process.cwd(), ".client_review_sessions_cache.json");
  private feedbackCacheFile = path.resolve(process.cwd(), ".client_feedback_cache.json");

  private sessions: ClientReviewSessionRecord[] = [];
  private comments: ClientReviewCommentRecord[] = [];
  private operatorNotes: OperatorReviewNoteRecord[] = [];
  private legacyFeedback: ClientFeedbackRecord[] = [];

  constructor() {
    this.loadState();
    if (this.sessions.length === 0) {
      this.seedInitialReview();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.sessions = raw.sessions || [];
        this.comments = raw.comments || [];
        this.operatorNotes = raw.operatorNotes || [];
        this.legacyFeedback = raw.legacyFeedback || [];
      } else if (fs.existsSync(this.sessionsCacheFile)) {
        const rawSessions = JSON.parse(fs.readFileSync(this.sessionsCacheFile, "utf8"));
        this.sessions = (rawSessions || []).map((s: any) => ({
          ...s,
          reviewSessionId: s.id || s.reviewSessionId || `REV-${Date.now()}`,
          organizationId: s.organizationId || "ORG-CASILI-01",
          workspaceId: s.workspaceId || "WS-DEFAULT",
          clientId: s.clientId || "client_default",
          createdAt: s.createdAt || s.openedAt || new Date().toISOString(),
        }));
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        sessions: this.sessions,
        comments: this.comments,
        operatorNotes: this.operatorNotes,
        legacyFeedback: this.legacyFeedback,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialReview(): void {
    const orgId = "ORG-CASILI-01";
    const projId = "PRJ-SINDOUS-01";
    const now = "2026-08-30T08:00:00.000Z";

    this.sessions = [
      {
        id: "REV-SES-001",
        reviewSessionId: "REV-SES-001",
        organizationId: orgId,
        projectId: projId,
        workspaceId: "WS-SINDOUS-01",
        clientId: "client_sindous",
        reviewNumber: "REV-2026-000001",
        snapshotId: "SNAP-SINDOUS-FINAL",
        releaseCandidateId: "RC-FINAL-P49-SINDOUS",
        sourceHash: "a9406accb7cc98e2...",
        manifestHash: "manifest_99a8b...",
        status: "OPEN",
        createdBy: "OPERATOR",
        createdAt: now,
      },
    ];

    this.comments = [
      {
        commentId: "CMT-001",
        reviewSessionId: "REV-SES-001",
        organizationId: orgId,
        projectId: projId,
        clientId: "client_sindous",
        authorId: "client_sindous",
        authorRole: "CLIENT",
        body: "Hero section text should highlight 24/7 service.",
        status: "OPEN",
        severity: "MEDIUM",
        category: "CONTENT",
        pagePath: "/",
        elementReference: "section.hero-banner",
        viewport: "desktop",
        snapshotId: "SNAP-SINDOUS-FINAL",
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.operatorNotes = [
      {
        noteId: "NOTE-001",
        reviewSessionId: "REV-SES-001",
        organizationId: orgId,
        projectId: projId,
        authorId: "operator_casili",
        body: "Client prefers urgent turnaround for home hero text update.",
        createdAt: now,
      },
    ];

    this.saveState();
  }

  async getNextReviewNumber(): Promise<string> {
    const year = new Date().getFullYear();
    return `REV-${year}-${(this.sessions.length + 1).toString().padStart(6, "0")}`;
  }

  // --- Session Methods ---
  createSession(s: Partial<ClientReviewSessionRecord> & { projectId: string }): ClientReviewSessionRecord {
    const now = new Date().toISOString();
    const id = s.id || s.reviewSessionId || `REV-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ClientReviewSessionRecord = {
      reviewSessionId: id,
      id,
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-DEFAULT",
      clientId: "client_default",
      reviewNumber: s.reviewNumber || `REV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      snapshotId: "SNAP-DEFAULT",
      manifestHash: s.manifestHash || "manifest_default",
      status: "OPEN",
      createdBy: "OPERATOR",
      createdAt: now,
      ...s,
    };
    this.sessions.unshift(record);
    this.saveState();
    return { ...record };
  }

  getSession(reviewSessionId: string, callerOrgId?: string): ClientReviewSessionRecord | null {
    const s = this.sessions.find((x) => x.reviewSessionId === reviewSessionId || x.id === reviewSessionId);
    if (!s) return null;
    if (callerOrgId && s.organizationId !== callerOrgId) return null;
    return { ...s };
  }

  async getSessionById(id: string): Promise<ClientReviewSessionRecord | null> {
    return this.getSession(id);
  }

  async getSessionsByProject(projectId: string): Promise<ClientReviewSessionRecord[]> {
    return this.sessions.filter((s) => s.projectId === projectId).map((s) => ({ ...s }));
  }

  listSessions(filter?: { organizationId?: string; projectId?: string; status?: ReviewSessionStatus }): ClientReviewSessionRecord[] {
    return this.sessions
      .filter((s) => {
        if (filter?.organizationId && s.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && s.projectId !== filter.projectId) return false;
        if (filter?.status && s.status !== filter.status) return false;
        return true;
      })
      .map((s) => ({ ...s }));
  }

  updateSession(id: string, updates: Partial<ClientReviewSessionRecord>): ClientReviewSessionRecord | null {
    const idx = this.sessions.findIndex((s) => s.id === id || s.reviewSessionId === id);
    if (idx === -1) return null;
    this.sessions[idx] = { ...this.sessions[idx], ...updates };
    this.saveState();
    return { ...this.sessions[idx] };
  }

  updateSessionStatus(reviewSessionId: string, status: ReviewSessionStatus): ClientReviewSessionRecord | null {
    return this.updateSession(reviewSessionId, { status });
  }

  // --- Feedback Methods ---
  async createFeedback(fb: ClientFeedbackRecord): Promise<ClientFeedbackRecord> {
    this.legacyFeedback.unshift(fb);
    this.saveState();
    return { ...fb };
  }

  async updateFeedback(id: string, updates: Partial<ClientFeedbackRecord>): Promise<ClientFeedbackRecord | null> {
    const idx = this.legacyFeedback.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.legacyFeedback[idx] = { ...this.legacyFeedback[idx], ...updates };
    this.saveState();
    return { ...this.legacyFeedback[idx] };
  }

  async getFeedbackBySession(sessionId: string): Promise<ClientFeedbackRecord[]> {
    return this.legacyFeedback.filter((f) => f.reviewSessionId === sessionId);
  }

  async getFeedbackByProject(projectId: string): Promise<ClientFeedbackRecord[]> {
    return this.legacyFeedback.filter((f) => f.projectId === projectId);
  }

  // --- Comment Methods ---
  addComment(c: Omit<ClientReviewCommentRecord, "commentId" | "createdAt" | "updatedAt">): ClientReviewCommentRecord {
    const now = new Date().toISOString();
    const id = `CMT-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ClientReviewCommentRecord = {
      ...c,
      commentId: id,
      createdAt: now,
      updatedAt: now,
    };
    this.comments.push(record);
    this.saveState();
    return { ...record };
  }

  getComment(commentId: string, callerOrgId?: string): ClientReviewCommentRecord | null {
    const c = this.comments.find((x) => x.commentId === commentId);
    if (!c) return null;
    if (callerOrgId && c.organizationId !== callerOrgId) return null;
    return { ...c };
  }

  listComments(filter?: {
    organizationId?: string;
    projectId?: string;
    reviewSessionId?: string;
    snapshotId?: string;
    status?: CommentStatus;
  }): ClientReviewCommentRecord[] {
    return this.comments
      .filter((c) => {
        if (filter?.organizationId && c.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && c.projectId !== filter.projectId) return false;
        if (filter?.reviewSessionId && c.reviewSessionId !== filter.reviewSessionId) return false;
        if (filter?.snapshotId && c.snapshotId !== filter.snapshotId) return false;
        if (filter?.status && c.status !== filter.status) return false;
        return true;
      })
      .map((c) => ({ ...c }));
  }

  updateComment(commentId: string, updates: Partial<ClientReviewCommentRecord>): ClientReviewCommentRecord | null {
    const idx = this.comments.findIndex((c) => c.commentId === commentId);
    if (idx === -1) return null;
    this.comments[idx] = {
      ...this.comments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return { ...this.comments[idx] };
  }

  // --- Operator Notes ---
  addOperatorNote(note: Omit<OperatorReviewNoteRecord, "noteId" | "createdAt">): OperatorReviewNoteRecord {
    const record: OperatorReviewNoteRecord = {
      ...note,
      noteId: `NOTE-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    this.operatorNotes.push(record);
    this.saveState();
    return { ...record };
  }

  listOperatorNotes(reviewSessionId: string, callerOrgId?: string): OperatorReviewNoteRecord[] {
    return this.operatorNotes
      .filter((n) => n.reviewSessionId === reviewSessionId && (!callerOrgId || n.organizationId === callerOrgId))
      .map((n) => ({ ...n }));
  }
}

export const clientReviewRepository = new ClientReviewRepository();