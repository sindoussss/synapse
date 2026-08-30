import { outreachRepository } from "../../repositories/outreach.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { emailSendRepository, EmailSendRecord } from "../../repositories/email-send.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { approvalRepository } from "../../repositories/approval.repository";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export class SalesSendService {
  async requestSendEmail(
    outreachDraftId: string,
    recipientOverride?: string
  ): Promise<{
    emailSend: EmailSendRecord;
    approvalId: string;
  }> {
    const draft = await outreachRepository.getById(outreachDraftId);
    if (!draft) {
      throw new Error(`Outreach draft ${outreachDraftId} not found.`);
    }

    if (draft.status !== "approved") {
      throw new Error(
        `Outreach draft for ${draft.companyName} is in "${draft.status}" status. Draft must be approved by human operator before requesting dispatch.`
      );
    }

    // 1. Determine & validate recipient & suppression state
    let recipient = recipientOverride?.trim();
    if (draft.leadId) {
      const lead = await leadRepository.getById(draft.leadId);
      if (lead) {
        if ((lead.status as string) === "do_not_contact") {
          throw new Error(
            `Lead "${lead.company}" is marked DO NOT CONTACT (unsubscribed). All outbound sending is permanently suppressed by safety enforcement.`
          );
        }
        if (!recipient && lead.contactEmail && lead.contactEmail.includes("@")) {
          recipient = lead.contactEmail.trim();
        }
      }
    }

    if (!recipient) {
      throw new Error("Verified recipient email required. Please provide a recipient email address.");
    }

    const recipientValidation = gmailEmailProvider.validateRecipient(recipient);
    if (!recipientValidation.valid) {
      throw new Error(recipientValidation.error || "Verified recipient email required.");
    }

    // 2. Duplicate / Idempotency protection
    const existingSends = await emailSendRepository.getByDraftId(draft.id);
    const sentRecord = existingSends.find((s) => s.status === "sent");
    if (sentRecord) {
      throw new Error(
        `This outreach draft was already successfully sent on ${new Date(sentRecord.sentAt!).toLocaleString()} (Message ID: ${sentRecord.providerMessageId}). Repeat sending blocked by duplicate protection.`
      );
    }

    const activePending = existingSends.find((s) => s.status === "pending_approval" || s.status === "sending");
    if (activePending) {
      const approval = await approvalRepository.create({
        action: "Outbound Email Authorization",
        description: `Send approved outreach email to ${recipient} for ${draft.companyName}.`,
        riskLevel: "high",
        payload: {
          sendId: activePending.id,
          draftId: draft.id,
          companyName: draft.companyName,
          recipient,
          subject: draft.subject,
          previewUrl: draft.previewUrl,
          provider: "Gmail",
        },
      });
      return { emailSend: activePending, approvalId: approval.id };
    }

    const now = new Date().toISOString();
    const sender = process.env.GMAIL_USER || "alex@synapseops.internal";

    // 3. Create email_sends record in pending_approval
    const emailSend = await emailSendRepository.create({
      outreachDraftId: draft.id,
      leadId: draft.leadId,
      provider: "gmail",
      sender,
      recipient,
      subject: draft.subject,
      body: draft.body,
      status: "pending_approval",
      requestedAt: now,
    });

    // 4. Create high-risk approval item
    const approval = await approvalRepository.create({
      action: "Outbound Email Authorization",
      description: `Send approved outreach email to ${recipient} for ${draft.companyName}.`,
      riskLevel: "high",
      payload: {
        sendId: emailSend.id,
        draftId: draft.id,
        companyName: draft.companyName,
        recipient,
        subject: draft.subject,
        previewUrl: draft.previewUrl,
        provider: "Gmail",
      },
    });

    // 5. Log Activity
    await activityRepository.add({
      type: "approval_event",
      title: `Email Send Requested: ${draft.companyName}`,
      description: `Outbound email dispatch requested for ${draft.companyName} (${recipient}). Awaiting human operator send confirmation.`,
      level: "warning",
      agentName: "Human Operator",
      metadata: {
        sendId: emailSend.id,
        draftId: draft.id,
        recipient,
        company: draft.companyName,
      },
    });

    return {
      emailSend,
      approvalId: approval.id,
    };
  }

  async approveAndSend(sendId: string): Promise<EmailSendRecord> {
    const emailSend = await emailSendRepository.getById(sendId);
    if (!emailSend) {
      throw new Error(`Email send record ${sendId} not found.`);
    }

    // Idempotency lock
    if (emailSend.status === "sending" || emailSend.status === "sent") {
      return emailSend;
    }

    const draft = await outreachRepository.getById(emailSend.outreachDraftId);
    if (!draft) {
      throw new Error(`Outreach draft ${emailSend.outreachDraftId} not found.`);
    }

    // Revalidate draft status
    if (draft.status !== "approved") {
      throw new Error(`Draft is in "${draft.status}" status (expected "approved").`);
    }

    // Content Safety Check
    if (draft.body.includes("{{") || draft.subject.includes("{{")) {
      throw new Error("Content safety violation: Unresolved template variable detected.");
    }

    const now = new Date().toISOString();

    // Set status sending
    await emailSendRepository.update(sendId, {
      status: "sending",
      approvedAt: now,
    });

    // Dispatch via Gmail provider
    const sendResult = await gmailEmailProvider.sendEmail({
      sender: emailSend.sender,
      senderName: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Modernization",
      recipient: emailSend.recipient,
      subject: emailSend.subject,
      body: emailSend.body,
      previewUrl: draft.previewUrl,
    });

    const completedAt = new Date().toISOString();

    if (sendResult.success) {
      const updated = await emailSendRepository.update(sendId, {
        status: "sent",
        sentAt: completedAt,
        providerMessageId: sendResult.providerMessageId,
        error: undefined,
      });

      // Update lead status to Contacted ONLY after confirmed dispatch
      if (emailSend.leadId) {
        await leadRepository.updateStatus(emailSend.leadId, "Contacted");
      }

      await activityRepository.add({
        type: "task_completed",
        title: `Outreach Email Sent via Gmail: ${draft.companyName}`,
        description: `Successfully dispatched outreach email to ${emailSend.recipient} (Message ID: ${sendResult.providerMessageId}). Lead marked Contacted.`,
        level: "success",
        agentName: "Sales Agent",
        metadata: {
          sendId,
          recipient: emailSend.recipient,
          provider: "Gmail",
          messageId: sendResult.providerMessageId,
        },
      });

      return updated;
    } else {
      const updated = await emailSendRepository.update(sendId, {
        status: "failed",
        failedAt: completedAt,
        error: sendResult.error,
      });

      await activityRepository.add({
        type: "task_failed",
        title: `Email Send Failed: ${draft.companyName}`,
        description: `Failed to dispatch email to ${emailSend.recipient}: ${sendResult.error}`,
        level: "error",
        agentName: "Sales Agent",
        metadata: {
          sendId,
          recipient: emailSend.recipient,
          error: sendResult.error,
        },
      });

      return updated;
    }
  }

  async rejectSend(sendId: string, reason?: string): Promise<EmailSendRecord> {
    const emailSend = await emailSendRepository.getById(sendId);
    if (!emailSend) {
      throw new Error(`Email send record ${sendId} not found.`);
    }

    const updated = await emailSendRepository.update(sendId, {
      status: "rejected",
      error: reason || "Operator rejected email send.",
      failedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Email Dispatch Rejected: ${emailSend.id}`,
      description: `Operator rejected email dispatch to ${emailSend.recipient}: ${reason || "Cancelled by operator."}`,
      level: "warning",
      agentName: "Human Operator",
      metadata: { sendId },
    });

    return updated;
  }
}

export const salesSendService = new SalesSendService();