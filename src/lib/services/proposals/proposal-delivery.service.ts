import fs from "fs";
import path from "path";
import crypto from "crypto";
import { proposalDeliveryRepository, ProposalDeliveryRecord } from "../../repositories/proposal-delivery.repository";
import { proposalDocumentRepository } from "../../repositories/proposal-document.repository";
import { proposalRepository } from "../../repositories/proposal.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { emailMessageRepository } from "../../repositories/message.repository";
import { approvalRepository } from "../../repositories/approval.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export class ProposalDeliveryService {
  async requestProposalDelivery(
    documentId: string,
    recipientOverride?: string
  ): Promise<{ delivery: ProposalDeliveryRecord; approvalId: string }> {
    const doc = await proposalDocumentRepository.getById(documentId);
    if (!doc) throw new Error(`Proposal document ${documentId} not found.`);

    if (doc.status !== "approved") {
      throw new Error(`Proposal document is in "${doc.status}" status. Document must be approved by human operator before requesting delivery.`);
    }

    const proposal = await proposalRepository.getById(doc.proposalId);
    if (!proposal) throw new Error(`Proposal ${doc.proposalId} not found.`);

    const opp = await opportunityRepository.getById(doc.opportunityId);
    if (!opp) throw new Error(`Opportunity ${doc.opportunityId} not found.`);

    const lead = await leadRepository.getById(doc.leadId);
    if (!lead) throw new Error(`Lead ${doc.leadId} not found.`);

    if ((lead.status as string) === "do_not_contact") {
      throw new Error(`Lead "${lead.company}" is marked DO NOT CONTACT (unsubscribed). Delivery permanently suppressed.`);
    }

    // PDF Integrity & Tamper Check
    if (!fs.existsSync(doc.pdfPathOrUrl)) {
      throw new Error(`Approved proposal PDF file not found at ${doc.pdfPathOrUrl}.`);
    }

    const currentPdfBuffer = fs.readFileSync(doc.pdfPathOrUrl);
    const currentHash = crypto.createHash("sha256").update(currentPdfBuffer).digest("hex");
    if (currentHash !== doc.contentHash) {
      throw new Error(`Document tamper violation: PDF file hash (${currentHash.substring(0, 8)}) does not match stored approved document snapshot (${doc.contentHash.substring(0, 8)}). Delivery blocked.`);
    }

    // Recipient Resolution
    const recipient = (recipientOverride || opp.primaryContactEmail || lead.contactEmail || "").trim();
    const recipientValidation = gmailEmailProvider.validateRecipient(recipient);
    if (!recipientValidation.valid) {
      throw new Error(recipientValidation.error || "Valid recipient email address is required for delivery.");
    }

    // Idempotency / Duplicate Check
    const existingDeliveries = await proposalDeliveryRepository.getByDocumentId(doc.id);
    const sentRecord = existingDeliveries.find((d) => d.status === "sent");
    if (sentRecord) {
      throw new Error(
        `This proposal document was already delivered to ${sentRecord.recipient} on ${new Date(sentRecord.sentAt!).toLocaleString()} (Message ID: ${sentRecord.providerMessageId}). Duplicate sending blocked.`
      );
    }

    const activePending = existingDeliveries.find((d) => d.status === "pending_approval" || d.status === "sending");
    if (activePending) {
      const approval = await approvalRepository.create({
        action: "Proposal PDF Document Delivery Authorization",
        description: `Deliver approved proposal document (${doc.title} v${doc.proposalVersion}) to ${recipient}.`,
        riskLevel: "high",
        payload: {
          deliveryId: activePending.id,
          documentId: doc.id,
          proposalId: proposal.id,
          recipient,
          investment: proposal.pricing.hasPrice ? `${proposal.pricing.currency} ${proposal.pricing.basePrice.toLocaleString()}` : "Non-priced",
          timeline: proposal.timeline.estimatedDuration,
        },
      });
      return { delivery: activePending, approvalId: approval.id };
    }

    // Locate Inbound Thread for Same-Thread Delivery if available
    const inboundMsgs = await emailMessageRepository.getByLeadId(lead.id);
    const latestInbound = inboundMsgs.find((m) => m.direction === "inbound" && m.providerMessageId);

    const businessName = MOCK_BUSINESS_SETTINGS.businessName || "Synapse Web Modernization Engine";
    const sender = process.env.GMAIL_USER || "alex@synapseops.internal";

    const subject = latestInbound
      ? latestInbound.subject.startsWith("Re:")
        ? latestInbound.subject
        : `Re: ${latestInbound.subject}`
      : `Website Modernization Proposal for ${lead.company}`;

    const body = `Hi ${lead.company} team,

Thank you for your time and the productive discussion regarding your web modernization requirements.

Please find attached the official project proposal for ${lead.company}. It details the full committed scope of work, technical architecture, project deliverables, estimated delivery timeline (${proposal.timeline.estimatedDuration}), and commercial investment (${proposal.pricing.hasPrice ? `${proposal.pricing.currency} ${Number(proposal.pricing.basePrice).toLocaleString()}` : "as discussed"}).

Please feel free to review the attached PDF document with your team. If you have any questions or would like to walk through any specific components, please let me know.

Best regards,

Alex Mercer
Principal Digital Architect
${businessName}`;

    const now = new Date().toISOString();

    const delivery = await proposalDeliveryRepository.create({
      proposalDocumentId: doc.id,
      proposalId: proposal.id,
      opportunityId: opp.id,
      leadId: lead.id,
      provider: "gmail",
      recipient,
      subject,
      body,
      attachmentReference: doc.pdfPathOrUrl,
      status: "pending_approval",
      providerThreadId: latestInbound?.providerThreadId,
      requestedAt: now,
    });

    const approval = await approvalRepository.create({
      action: "Proposal PDF Document Delivery Authorization",
      description: `Deliver approved proposal document (${doc.title} v${doc.proposalVersion}) to ${recipient}.`,
      riskLevel: "high",
      payload: {
        deliveryId: delivery.id,
        documentId: doc.id,
        proposalId: proposal.id,
        recipient,
        investment: proposal.pricing.hasPrice ? `${proposal.pricing.currency} ${proposal.pricing.basePrice.toLocaleString()}` : "Non-priced",
        timeline: proposal.timeline.estimatedDuration,
        pdfFile: path.basename(doc.pdfPathOrUrl),
      },
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Proposal Delivery Requested: ${lead.company}`,
      description: `Operator requested external delivery authorization for approved proposal PDF to ${recipient}.`,
      level: "warning",
      agentName: "Human Operator",
      metadata: {
        deliveryId: delivery.id,
        documentId: doc.id,
        recipient,
      },
    });

    return { delivery, approvalId: approval.id };
  }

  async approveAndSendProposal(deliveryId: string): Promise<ProposalDeliveryRecord> {
    const delivery = await proposalDeliveryRepository.getById(deliveryId);
    if (!delivery) throw new Error(`Proposal delivery ${deliveryId} not found.`);

    if (delivery.status === "sent" || delivery.status === "sending") {
      return delivery;
    }

    const doc = await proposalDocumentRepository.getById(delivery.proposalDocumentId);
    if (!doc || doc.status !== "approved") {
      throw new Error("Proposal document must be in approved status.");
    }

    const lead = await leadRepository.getById(delivery.leadId);
    if (lead && (lead.status as string) === "do_not_contact") {
      throw new Error("Lead is marked DO NOT CONTACT. Proposal delivery permanently blocked.");
    }

    // Tamper Protection Check
    if (!fs.existsSync(doc.pdfPathOrUrl)) {
      throw new Error(`PDF attachment file missing at ${doc.pdfPathOrUrl}`);
    }
    const currentPdfBuffer = fs.readFileSync(doc.pdfPathOrUrl);
    const currentHash = crypto.createHash("sha256").update(currentPdfBuffer).digest("hex");
    if (currentHash !== doc.contentHash) {
      throw new Error(`Document tamper violation: PDF hash (${currentHash.substring(0, 8)}) does not match stored approved document snapshot (${doc.contentHash.substring(0, 8)}). Delivery blocked.`);
    }

    const now = new Date().toISOString();

    await proposalDeliveryRepository.update(deliveryId, {
      status: "sending",
      approvedAt: now,
    });

    // Check if we can thread with previous inbound message
    const inboundMsgs = await emailMessageRepository.getByLeadId(delivery.leadId);
    const latestInbound = inboundMsgs.find((m) => m.direction === "inbound" && m.providerMessageId);

    const pdfFilename = path.basename(doc.pdfPathOrUrl);

    let sendResult;
    if (latestInbound && latestInbound.providerMessageId) {
      sendResult = await gmailEmailProvider.sendReply({
        sender: process.env.GMAIL_USER || "alex@synapseops.internal",
        senderName: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Modernization",
        recipient: delivery.recipient,
        subject: delivery.subject,
        body: delivery.body,
        inReplyToMessageId: latestInbound.providerMessageId,
        references: [latestInbound.providerMessageId],
        attachments: [
          {
            filename: pdfFilename,
            path: doc.pdfPathOrUrl,
            contentType: "application/pdf",
          },
        ],
      });
    } else {
      sendResult = await gmailEmailProvider.sendEmail({
        sender: process.env.GMAIL_USER || "alex@synapseops.internal",
        senderName: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Modernization",
        recipient: delivery.recipient,
        subject: delivery.subject,
        body: delivery.body,
        attachments: [
          {
            filename: pdfFilename,
            path: doc.pdfPathOrUrl,
            contentType: "application/pdf",
          },
        ],
      });
    }

    const completedAt = new Date().toISOString();

    if (sendResult.success) {
      const updated = await proposalDeliveryRepository.update(deliveryId, {
        status: "sent",
        sentAt: completedAt,
        providerMessageId: sendResult.providerMessageId,
        error: undefined,
      });

      // Update Opportunity Stage to proposal_sent ONLY after confirmed send
      await opportunityRepository.updateStage(
        delivery.opportunityId,
        "proposal_sent",
        "Sales Agent (Proposal Delivery)",
        `Proposal document v${doc.proposalVersion} delivered via Gmail (${sendResult.providerMessageId}).`
      );

      // Record outbound message in email_messages
      await emailMessageRepository.create({
        leadId: delivery.leadId,
        provider: "gmail",
        providerMessageId: sendResult.providerMessageId,
        inReplyTo: latestInbound?.providerMessageId,
        direction: "outbound",
        sender: process.env.GMAIL_USER || "alex@synapseops.internal",
        recipient: delivery.recipient,
        subject: delivery.subject,
        bodyText: `${delivery.body}\n\n[Attachment: ${pdfFilename}]`,
        hasAttachments: true,
        receivedAt: completedAt,
      });

      await activityRepository.add({
        type: "task_completed",
        title: `Proposal PDF Delivered via Gmail: ${delivery.recipient}`,
        description: `Dispatched proposal document (${pdfFilename}) to ${delivery.recipient} (Message ID: ${sendResult.providerMessageId}).`,
        level: "success",
        agentName: "Sales Agent",
        metadata: {
          deliveryId,
          recipient: delivery.recipient,
          messageId: sendResult.providerMessageId,
          pdf: pdfFilename,
        },
      });

      return updated;
    } else {
      const updated = await proposalDeliveryRepository.update(deliveryId, {
        status: "failed",
        failedAt: completedAt,
        error: sendResult.error,
      });

      await activityRepository.add({
        type: "task_failed",
        title: `Proposal Delivery Failed: ${delivery.recipient}`,
        description: `Failed to deliver proposal to ${delivery.recipient}: ${sendResult.error}`,
        level: "error",
        agentName: "Sales Agent",
        metadata: {
          deliveryId,
          recipient: delivery.recipient,
          error: sendResult.error,
        },
      });

      return updated;
    }
  }
}

export const proposalDeliveryService = new ProposalDeliveryService();