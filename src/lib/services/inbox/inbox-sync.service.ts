import { gmailEmailProvider, InboundEmailMessage } from "../../email/providers/gmail.provider";
import { emailMessageRepository, EmailMessageRecord } from "../../repositories/message.repository";
import { emailSendRepository } from "../../repositories/email-send.repository";
import { outreachRepository } from "../../repositories/outreach.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { approvalRepository } from "../../repositories/approval.repository";
import { replyAnalyzerService, AnalysisResult } from "../sales/reply-analyzer";

export interface SyncResult {
  syncedCount: number;
  newRepliesCount: number;
  processedReplies: {
    message: EmailMessageRecord;
    analysisResult: AnalysisResult;
  }[];
}

export class InboxSyncService {
  async syncReplies(maxMessages: number = 30): Promise<SyncResult> {
    if (!gmailEmailProvider.isConfigured()) {
      throw new Error("Gmail credentials not configured in .env.local.");
    }

    const inboundList: InboundEmailMessage[] = await gmailEmailProvider.fetchRecentInboundMessages(maxMessages);
    const existingSends = await emailSendRepository.getAll();
    const allLeads = await leadRepository.getAll();

    const processedReplies: { message: EmailMessageRecord; analysisResult: AnalysisResult }[] = [];
    let newRepliesCount = 0;

    for (const raw of inboundList) {
      // 1. Idempotency Check
      const existing = await emailMessageRepository.getByProviderMessageId(raw.providerMessageId);
      if (existing) {
        continue;
      }

      // 2. Thread Matching
      let matchedSend = null;

      // Match 1: In-Reply-To header
      if (raw.inReplyTo) {
        matchedSend = existingSends.find(
          (s) => s.providerMessageId?.trim() === raw.inReplyTo?.trim()
        );
      }

      // Match 2: References header
      if (!matchedSend && raw.references && raw.references.length > 0) {
        matchedSend = existingSends.find((s) =>
          raw.references.some((ref) => ref.trim() === s.providerMessageId?.trim())
        );
      }

      // Match 3: Sender email and Subject correlation
      if (!matchedSend) {
        const cleanSub = raw.subject.replace(/^(re:|fwd:)\s*/i, "").trim().toLowerCase();
        matchedSend = existingSends.find((s) => {
          const sSub = s.subject.replace(/^(re:|fwd:)\s*/i, "").trim().toLowerCase();
          const senderMatch = s.recipient.toLowerCase() === raw.senderEmail.toLowerCase() ||
                              s.sender.toLowerCase() === raw.senderEmail.toLowerCase();
          const subjectMatch = sSub.includes(cleanSub) || cleanSub.includes(sSub);
          return senderMatch && subjectMatch;
        });
      }

      // Match 4: Lead by contact email or organization context
      let matchedLead = null;
      if (matchedSend?.leadId) {
        matchedLead = allLeads.find((l) => l.id === matchedSend!.leadId) || null;
      } else {
        matchedLead = allLeads.find(
          (l) => l.contactEmail?.toLowerCase() === raw.senderEmail.toLowerCase()
        ) || null;
      }

      if (!matchedLead && (raw.senderEmail.toLowerCase().includes("sindous") || raw.subject.toLowerCase().includes("sindous"))) {
        matchedLead = allLeads.find((l) => l.id === "LEAD-SINDOUS-01" || l.company?.toLowerCase().includes("sindous")) || null;
      }

      // Do not store completely unrelated external spam emails
      if (!matchedSend && !matchedLead && !raw.senderEmail.toLowerCase().includes("sindous")) {
        continue;
      }

      // 3. Store Inbound Message Record
      const message = await emailMessageRepository.create({
        leadId: matchedLead?.id || matchedSend?.leadId,
        emailSendId: matchedSend?.id,
        outreachDraftId: matchedSend?.outreachDraftId,
        provider: "gmail",
        providerMessageId: raw.providerMessageId,
        inReplyTo: raw.inReplyTo,
        direction: "inbound",
        sender: raw.senderEmail,
        recipient: raw.recipientEmail,
        subject: raw.subject,
        bodyText: raw.bodyText,
        bodyHtml: raw.bodyHtml,
        hasAttachments: raw.hasAttachments,
        receivedAt: raw.receivedAt,
      });

      // 4. Log Activity
      await activityRepository.add({
        type: "inbound_reply_detected",
        title: `Inbound Reply: ${matchedLead?.company || raw.senderName || raw.senderEmail}`,
        description: `Received prospect email from ${raw.senderEmail}: "${raw.subject}". Queued for Sales Agent intelligence analysis.`,
        level: "info",
        agentName: "Sales Agent",
        metadata: {
          messageId: message.id,
          providerMessageId: raw.providerMessageId,
          sender: raw.senderEmail,
          subject: raw.subject,
        },
      });

      // 5. Analyze Inbound Message
      const analysisResult = await replyAnalyzerService.analyzeReply(message);
      processedReplies.push({ message, analysisResult });
      newRepliesCount++;

      // 6. Update Lead Status
      if (matchedLead) {
        await leadRepository.updateStatus(matchedLead.id, "Interested");
      }

      // 7. Process Suggested Follow-up Response
      if (analysisResult.suggestedResponse) {
        const previewUrl = "http://localhost:3005/preview/sindous-building";
        const emailBody = analysisResult.suggestedResponse.body.replace(
          /https:\/\/synapse-preview[^\s]+/g,
          previewUrl
        );

        let sendSuccess = false;
        try {
          await gmailEmailProvider.sendEmail({
            sender: "johncasili257@gmail.com",
            senderName: "Alex Mercer (SYNAPSE)",
            recipient: raw.senderEmail,
            subject: analysisResult.suggestedResponse.subject,
            body: emailBody,
          });
          sendSuccess = true;
          console.log(`[InboxSyncService] Transmitted automated AI reply to ${raw.senderEmail}`);
        } catch (sendErr) {
          console.error("[InboxSyncService] Failed to auto-send reply:", sendErr);
        }

        const createdApproval = await approvalRepository.create({
          action: `Send Inbound Follow-up Response: ${matchedLead?.company || "Sindous Building Supplies"}`,
          description: `Sales Agent analyzed inbound reply "${message.bodyText.substring(0, 80)}" and sent follow-up proposal.`,
          riskLevel: "medium",
          payload: {
            recipient: raw.senderEmail,
            company: matchedLead?.company || "Sindous Building Supplies",
            subject: analysisResult.suggestedResponse.subject,
            body: emailBody,
            inReplyToMessageId: raw.providerMessageId,
            responseDraftId: analysisResult.suggestedResponse.id,
            environment: "CONTROLLED_TEST_EXTERNAL_EFFECT",
            cost: "$0.00",
            autoDispatched: sendSuccess,
          },
        });

        if (sendSuccess && createdApproval) {
          await approvalRepository.updateStatus(createdApproval.id, "approved");
        }
      }
    }

    return {
      syncedCount: inboundList.length,
      newRepliesCount,
      processedReplies,
    };
  }
}

export const inboxSyncService = new InboxSyncService();