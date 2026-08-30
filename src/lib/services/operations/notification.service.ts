import fs from "fs";
import path from "path";

export interface OutboundNotificationDraft {
  draftId: string;
  intent:
    | "CLIENT_REVIEW_READY"
    | "CHANGE_REQUEST_RECEIVED"
    | "APPROVAL_REQUIRED"
    | "DEPLOYMENT_COMPLETE"
    | "INCIDENT_DETECTED"
    | "INCIDENT_RESOLVED"
    | "HANDOFF_READY";
  recipient: string;
  subject: string;
  body: string;
  status: "DRAFT" | "VALIDATED" | "WAITING_HUMAN_APPROVAL" | "SEND_AUTHORIZED" | "SENT" | "BLOCKED_SUPPRESSED";
}

export class NotificationService {
  private sentHistory: string[] = [];

  draftNotification(params: {
    intent: OutboundNotificationDraft["intent"];
    recipient: string;
    subject: string;
    body: string;
  }): OutboundNotificationDraft {
    return {
      draftId: `NOTIF-${Date.now().toString().slice(-4)}`,
      intent: params.intent,
      recipient: params.recipient,
      subject: params.subject,
      body: params.body,
      status: "WAITING_HUMAN_APPROVAL",
    };
  }

  authorizeAndSend(draft: OutboundNotificationDraft, approvedBy: string): { sent: boolean; reason?: string } {
    const key = `${draft.recipient}_${draft.subject}`;
    if (this.sentHistory.includes(key)) {
      draft.status = "BLOCKED_SUPPRESSED";
      return { sent: false, reason: "DUPLICATE_COMMUNICATION_BLOCKED: Duplicate outbound message detected." };
    }
    draft.status = "SENT";
    this.sentHistory.push(key);
    return { sent: true };
  }
}

export const notificationService = new NotificationService();
