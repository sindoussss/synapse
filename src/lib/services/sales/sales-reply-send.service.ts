import { responseDraftRepository, ResponseDraftRecord } from "../../repositories/response-draft.repository";
import { replyAnalysisRepository } from "../../repositories/reply-analysis.repository";
import { emailMessageRepository } from "../../repositories/message.repository";
import { replySendRepository, ReplySendRecord } from "../../repositories/reply-send.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { approvalRepository } from "../../repositories/approval.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export class SalesReplySendService {
  async requestReplySend(responseDraftId: string): Promise<{
    replySend: ReplySendRecord;
    approvalId: string;
  }> {
    // 1. Load response draft
    const draft = await responseDraftRepository.getById(responseDraftId);
    if (!draft) {
      throw new Error(`Response draft ${responseDraftId} not found.`);
    }

    if (draft.status !== "approved") {
      throw new Error(
        `Response draft is in "${draft.status}" status. Draft must be approved by human operator before requesting dispatch.`
      );
    }

    // 2. Load reply analysis & inbound message
    const analysis = await replyAnalysisRepository.getById(draft.replyAnalysisId);
    if (!analysis) {
      throw new Error(`Reply analysis ${draft.replyAnalysisId} not found.`);
    }

    const inboundMessage = await emailMessageRepository.getById(analysis.emailMessageId);
    if (!inboundMessage) {
      throw new Error(`Inbound email message ${analysis.emailMessageId} not found.`);
    }

    if (!inboundMessage.providerMessageId) {
      throw new Error("Missing inbound provider Message-ID required for thread correlation.");
    }

    // 3. Do-Not-Contact Safety Check
    if (draft.leadId) {
      const lead = await leadRepository.getById(draft.leadId);
      if (lead && (lead.status as string) === "do_not_contact") {
        throw new Error(
          `Lead "${lead.company}" is marked DO NOT CONTACT (unsubscribed). Reply dispatch is permanently blocked by safety enforcement.`
        );
      }
    }

    // 4. Recipient Safety Verification (Must match actual inbound sender)
    const recipient = inboundMessage.sender.trim();
    const recipientValidation = gmailEmailProvider.validateRecipient(recipient);
    if (!recipientValidation.valid) {
      throw new Error(recipientValidation.error || "Invalid recipient address.");
    }

    // 5. Commercial Safety Scanner
    this.validateContentSafety(draft.body, draft.subject);

    // 6. Duplicate / Idempotency Check
    const existingSends = await replySendRepository.getByDraftId(draft.id);
    const sentRecord = existingSends.find((s) => s.status === "sent");
    if (sentRecord) {
      throw new Error(
        `This response was already sent on ${new Date(sentRecord.sentAt!).toLocaleString()} (Message ID: ${sentRecord.providerMessageId}). Repeat sending blocked by duplicate protection.`
      );
    }

    const activePending = existingSends.find((s) => s.status === "pending_approval" || s.status === "sending");
    if (activePending) {
      const approval = await approvalRepository.create({
        action: "Inbound Thread Reply Authorization",
        description: `Send approved thread reply to ${recipient} in response to: "${inboundMessage.subject}".`,
        riskLevel: "high",
        payload: {
          replySendId: activePending.id,
          responseDraftId: draft.id,
          recipient,
          subject: draft.subject,
          inReplyTo: inboundMessage.providerMessageId,
          provider: "Gmail",
        },
      });
      return { replySend: activePending, approvalId: approval.id };
    }

    const now = new Date().toISOString();
    const sender = process.env.GMAIL_USER || "alex@synapseops.internal";

    // 7. Create reply_sends record
    const replySend = await replySendRepository.create({
      responseDraftId: draft.id,
      replyAnalysisId: analysis.id,
      emailMessageId: inboundMessage.id,
      leadId: draft.leadId,
      provider: "gmail",
      providerThreadId: inboundMessage.providerThreadId,
      inReplyToMessageId: inboundMessage.providerMessageId,
      sender,
      recipient,
      subject: draft.subject,
      body: draft.body,
      status: "pending_approval",
      requestedAt: now,
    });

    // 8. Create High-Risk Approval Record
    const approval = await approvalRepository.create({
      action: "Inbound Thread Reply Authorization",
      description: `Send approved thread reply to ${recipient} in response to: "${inboundMessage.subject}".`,
      riskLevel: "high",
      payload: {
        replySendId: replySend.id,
        responseDraftId: draft.id,
        recipient,
        subject: draft.subject,
        inReplyTo: inboundMessage.providerMessageId,
        provider: "Gmail",
      },
    });

    // 9. Log Activity
    await activityRepository.add({
      type: "approval_event",
      title: `Reply Send Requested: ${recipient}`,
      description: `Operator requested reply send authorization for inbound thread "${inboundMessage.subject}".`,
      level: "warning",
      agentName: "Human Operator",
      metadata: {
        replySendId: replySend.id,
        recipient,
        subject: draft.subject,
      },
    });

    return { replySend, approvalId: approval.id };
  }

  async approveAndSendReply(replySendId: string): Promise<ReplySendRecord> {
    const replySend = await replySendRepository.getById(replySendId);
    if (!replySend) {
      throw new Error(`Reply send record ${replySendId} not found.`);
    }

    // Idempotency lock
    if (replySend.status === "sending" || replySend.status === "sent") {
      return replySend;
    }

    const draft = await responseDraftRepository.getById(replySend.responseDraftId);
    if (!draft || draft.status !== "approved") {
      throw new Error("Response draft must be in approved status.");
    }

    // Inbound Message Check
    const inboundMessage = replySend.emailMessageId
      ? await emailMessageRepository.getById(replySend.emailMessageId)
      : null;

    if (!inboundMessage) {
      throw new Error("Original inbound email message not found.");
    }

    // Recipient Match Check
    if (replySend.recipient.toLowerCase() !== inboundMessage.sender.toLowerCase()) {
      throw new Error(
        `Recipient mismatch security violation: Recipient (${replySend.recipient}) does not match inbound sender (${inboundMessage.sender}).`
      );
    }

    // Do-Not-Contact Check
    if (replySend.leadId) {
      const lead = await leadRepository.getById(replySend.leadId);
      if (lead && (lead.status as string) === "do_not_contact") {
        throw new Error("Lead is marked DO NOT CONTACT (unsubscribed). Reply dispatch is permanently blocked.");
      }
    }

    // Content Safety Scan
    this.validateContentSafety(replySend.body, replySend.subject);

    const now = new Date().toISOString();

    // Set sending status
    await replySendRepository.update(replySendId, {
      status: "sending",
      approvedAt: now,
    });

    // Call Gmail Provider sendReply with In-Reply-To and References
    const sendResult = await gmailEmailProvider.sendReply({
      sender: replySend.sender,
      senderName: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Modernization",
      recipient: replySend.recipient,
      subject: replySend.subject,
      body: replySend.body,
      inReplyToMessageId: replySend.inReplyToMessageId,
      references: [replySend.inReplyToMessageId],
    });

    const completedAt = new Date().toISOString();

    if (sendResult.success) {
      const updated = await replySendRepository.update(replySendId, {
        status: "sent",
        sentAt: completedAt,
        providerMessageId: sendResult.providerMessageId,
        error: undefined,
      });

      // Save outbound email message in chronological thread
      await emailMessageRepository.create({
        leadId: replySend.leadId,
        outreachDraftId: undefined,
        provider: "gmail",
        providerMessageId: sendResult.providerMessageId,
        inReplyTo: replySend.inReplyToMessageId,
        direction: "outbound",
        sender: replySend.sender,
        recipient: replySend.recipient,
        subject: replySend.subject,
        bodyText: replySend.body,
        receivedAt: completedAt,
      });

      await activityRepository.add({
        type: "task_completed",
        title: `Thread Reply Sent via Gmail: ${replySend.recipient}`,
        description: `Dispatched reply in conversation thread to ${replySend.recipient} (Message ID: ${sendResult.providerMessageId}).`,
        level: "success",
        agentName: "Sales Agent",
        metadata: {
          replySendId,
          recipient: replySend.recipient,
          messageId: sendResult.providerMessageId,
          inReplyTo: replySend.inReplyToMessageId,
        },
      });

      return updated;
    } else {
      const updated = await replySendRepository.update(replySendId, {
        status: "failed",
        failedAt: completedAt,
        error: sendResult.error,
      });

      await activityRepository.add({
        type: "task_failed",
        title: `Thread Reply Failed: ${replySend.recipient}`,
        description: `Failed to dispatch reply to ${replySend.recipient}: ${sendResult.error}`,
        level: "error",
        agentName: "Sales Agent",
        metadata: {
          replySendId,
          recipient: replySend.recipient,
          error: sendResult.error,
        },
      });

      return updated;
    }
  }

  private validateContentSafety(body: string, subject: string): void {
    const text = `${subject} ${body}`.toLowerCase();

    const unsafeTriggers = [
      "triple your sales",
      "guarantee this redesign",
      "guaranteed results",
      "100% money back",
      "we guarantee",
      "free forever",
      "90% discount",
      "{{company}}",
      "{{prospect}}",
      "{{",
    ];

    for (const trigger of unsafeTriggers) {
      if (text.includes(trigger)) {
        throw new Error(
          `Commercial safety violation detected: "${trigger}". Unsafe claims, guarantees, or unresolved template variables are strictly blocked.`
        );
      }
    }
  }
}

export const salesReplySendService = new SalesReplySendService();