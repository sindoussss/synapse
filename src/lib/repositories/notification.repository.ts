import fs from "fs";
import path from "path";
import crypto from "crypto";

export type RecipientType = "CLIENT" | "OPERATOR" | "INTERNAL_SYSTEM";
export type NotificationChannel = "IN_APP" | "EMAIL";
export type NotificationStatus =
  | "DRAFT"
  | "VALIDATING"
  | "PENDING_APPROVAL"
  | "AUTHORIZED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "SUPPRESSED"
  | "EXPIRED"
  | "SUPERSEDED";

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface NotificationRecord {
  notificationId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  recipientId: string;
  recipientType: RecipientType;
  channel: NotificationChannel;
  notificationType: string;
  title: string;
  bodyReference: string;
  sourceEventId?: string;
  sourceEvidenceIds: string[];
  approvalRequestId?: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  idempotencyKey: string;
  provider?: string;
  providerMessageId?: string;
  isRead: boolean;
  snapshotId?: string;
  invoiceId?: string;
  deliveryId?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureCode?: string;
}

export class NotificationRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "notifications.json");
  private notifications: NotificationRecord[] = [];

  constructor() {
    this.loadState();
    if (this.notifications.length === 0) {
      this.seedInitialNotifications();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.notifications = raw.notifications || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        notifications: this.notifications,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialNotifications(): void {
    const orgId = "ORG-CASILI-01";
    const projId = "PRJ-SINDOUS-01";
    const now = "2026-08-30T08:00:00.000Z";

    this.notifications = [
      {
        notificationId: "NOTIF-001",
        organizationId: orgId,
        projectId: projId,
        workspaceId: "WS-SINDOUS-01",
        recipientId: "client_sindous",
        recipientType: "CLIENT",
        channel: "IN_APP",
        notificationType: "CLIENT_REVIEW_READY",
        title: "Website Preview Ready for Review",
        bodyReference: "Your verified website preview is now available for review.",
        sourceEventId: "EVT-REV-READY",
        sourceEvidenceIds: ["EVID-QA-PASS"],
        status: "DELIVERED",
        priority: "HIGH",
        idempotencyKey: "IDEM-NOTIF-001",
        provider: "IN_APP_DISPATCH",
        providerMessageId: "INAPP-MSG-001",
        isRead: false,
        snapshotId: "SNAP-SINDOUS-FINAL",
        createdAt: now,
        deliveredAt: now,
      },
      {
        notificationId: "NOTIF-002",
        organizationId: orgId,
        projectId: projId,
        workspaceId: "WS-SINDOUS-01",
        recipientId: "operator_casili",
        recipientType: "OPERATOR",
        channel: "IN_APP",
        notificationType: "OPERATOR_APPROVAL_REQUIRED",
        title: "Production Deployment Approval Required",
        bodyReference: "Deployment package RC-FINAL-P49 requires operator sign-off.",
        sourceEventId: "EVT-DEP-REQ",
        sourceEvidenceIds: ["EVID-RC-VERIFIED"],
        approvalRequestId: "APPR-DEPLOY-001",
        status: "DELIVERED",
        priority: "HIGH",
        idempotencyKey: "IDEM-NOTIF-002",
        provider: "IN_APP_DISPATCH",
        providerMessageId: "INAPP-MSG-002",
        isRead: false,
        snapshotId: "SNAP-SINDOUS-FINAL",
        createdAt: now,
        deliveredAt: now,
      },
    ];
    this.saveState();
  }

  createNotification(
    n: Omit<NotificationRecord, "notificationId" | "createdAt" | "isRead">
  ): { success: boolean; notification?: NotificationRecord; reason?: string } {
    // Idempotency check: if notification with same idempotencyKey exists, return existing
    const existing = this.notifications.find((x) => x.idempotencyKey === n.idempotencyKey);
    if (existing) {
      return { success: true, notification: { ...existing }, reason: "IDEMPOTENT_EXISTING" };
    }

    const now = new Date().toISOString();
    const id = `NOTIF-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: NotificationRecord = {
      ...n,
      notificationId: id,
      isRead: false,
      createdAt: now,
    };
    this.notifications.push(record);
    this.saveState();
    return { success: true, notification: { ...record } };
  }

  getNotification(notificationId: string, callerOrgId?: string): NotificationRecord | null {
    const notif = this.notifications.find((n) => n.notificationId === notificationId);
    if (!notif) return null;
    if (callerOrgId && notif.organizationId !== callerOrgId) return null;
    return { ...notif };
  }

  listNotifications(filter?: {
    organizationId?: string;
    projectId?: string;
    recipientId?: string;
    recipientType?: RecipientType;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    isRead?: boolean;
  }): NotificationRecord[] {
    return this.notifications
      .filter((n) => {
        if (filter?.organizationId && n.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && n.projectId !== filter.projectId) return false;
        if (filter?.recipientId && n.recipientId !== filter.recipientId) return false;
        if (filter?.recipientType && n.recipientType !== filter.recipientType) return false;
        if (filter?.channel && n.channel !== filter.channel) return false;
        if (filter?.status && n.status !== filter.status) return false;
        if (filter?.isRead !== undefined && n.isRead !== filter.isRead) return false;
        return true;
      })
      .map((n) => ({ ...n }));
  }

  updateStatus(
    notificationId: string,
    status: NotificationStatus,
    extra?: { providerMessageId?: string; failureCode?: string; provider?: string }
  ): NotificationRecord | null {
    const idx = this.notifications.findIndex((n) => n.notificationId === notificationId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    this.notifications[idx].status = status;
    if (status === "SENT") this.notifications[idx].sentAt = now;
    if (status === "DELIVERED") this.notifications[idx].deliveredAt = now;
    if (status === "FAILED") {
      this.notifications[idx].failedAt = now;
      if (extra?.failureCode) this.notifications[idx].failureCode = extra.failureCode;
    }
    if (extra?.providerMessageId) this.notifications[idx].providerMessageId = extra.providerMessageId;
    if (extra?.provider) this.notifications[idx].provider = extra.provider;

    this.saveState();
    return { ...this.notifications[idx] };
  }

  markAsRead(notificationId: string, callerRecipientId?: string): boolean {
    const idx = this.notifications.findIndex((n) => n.notificationId === notificationId);
    if (idx === -1) return false;
    if (callerRecipientId && this.notifications[idx].recipientId !== callerRecipientId) return false;

    this.notifications[idx].isRead = true;
    this.saveState();
    return true;
  }
}

export const notificationRepository = new NotificationRepository();