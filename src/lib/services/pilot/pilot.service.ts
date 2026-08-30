import { pilotRepository, MarketPilotRecord, MarketPilotSendRecord, DncSuppressionRecord } from "../../repositories/pilot.repository";
import { organizationRepository } from "../../repositories/organization.repository";
import { gmailEmailProvider } from "@/lib/email/providers/gmail.provider";
import { activityRepository } from "../../repositories/activity.repository";

export class PilotService {
  async createPilot(params: {
    name: string;
    targetLeadCount?: number;
    maxOutboundMessages?: number;
    industryScope?: string;
    locationScope?: string;
    createdBy?: string;
  }): Promise<MarketPilotRecord> {
    const now = new Date().toISOString();
    const count = (await pilotRepository.getAllPilots()).length + 1;
    const pilotNumber = `PILOT-2026-${count.toString().padStart(6, "0")}`;

    return pilotRepository.createPilot({
      id: `PLT-${Date.now().toString().slice(-4)}`,
      pilotNumber,
      name: params.name,
      status: "waiting_approval",
      targetLeadCount: params.targetLeadCount || 10,
      maxOutboundMessages: params.maxOutboundMessages || 10,
      liveSendCommittedCount: 0,
      controlledTestSendCount: 0,
      blockedAttemptCount: 0,
      industryScope: params.industryScope || "Logistics & Professional Services",
      locationScope: params.locationScope || "Metro Manila, Philippines",
      createdBy: params.createdBy || "operator",
      createdAt: now,
    });
  }

  async approvePilot(id: string, operatorId: string): Promise<MarketPilotRecord> {
    const pilot = await pilotRepository.getPilotById(id);
    if (!pilot) throw new Error(`Pilot '${id}' not found`);

    const updated = await pilotRepository.updatePilot(pilot.id, {
      status: "running",
      approvedBy: operatorId,
      startedAt: new Date().toISOString(),
    });
    return updated!;
  }

  async validateLeadEvidence(lead: {
    name: string;
    websiteUrl: string;
    publicSourceUrl?: string;
    contactEmail: string;
    contactClassification: string;
    isSynthetic?: boolean;
  }): Promise<{ valid: boolean; reason?: string }> {
    if (lead.isSynthetic) {
      throw new Error("Validation Error: Synthetic organizations cannot be classified as LIVE_REAL.");
    }

    if (!lead.publicSourceUrl) {
      throw new Error("Validation Error: Real business leads require documented public source URL evidence.");
    }

    if (lead.contactClassification === "GUESSED_PERSONAL_EMAIL") {
      throw new Error("Validation Error: Unsupported personal/guessed email address blocked. Public business contact required.");
    }

    return { valid: true };
  }

  async validateOutreachClaims(messageText: string): Promise<{ valid: boolean; violation?: string }> {
    const forbiddenPatterns = [
      { pattern: /costing you thousands/i, rule: "Unsubstantiated financial loss claim" },
      { pattern: /helped 50 logistics/i, rule: "Fabricated client portfolio claim" },
      { pattern: /losing \d+% of customers/i, rule: "Unmeasured customer dissatisfaction claim" },
      { pattern: /guaranteed \d+x/i, rule: "Unverified performance guarantee" },
    ];

    for (const p of forbiddenPatterns) {
      if (p.pattern.test(messageText)) {
        return { valid: false, violation: `Sales Policy Violation: ${p.rule} is prohibited in outreach.` };
      }
    }

    return { valid: true };
  }

  async sendOutreachMessage(params: {
    pilotId: string;
    organizationId: string;
    contactId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    approvalId?: string;
    isRealMarketRecipient?: boolean;
  }): Promise<{ success: boolean; messageId?: string; sourceClassification: string; error?: string }> {
    if (!params.approvalId) {
      throw new Error("Approval Gate Violation: Live market outreach strictly requires individual human operator approval.");
    }

    // Determine classification
    const isOperatorInbox =
      params.recipientEmail === "johncasili257@gmail.com" ||
      params.recipientEmail === "sindousbuilding@gmail.com";
    const sourceClassification = (!params.isRealMarketRecipient || isOperatorInbox)
      ? "CONTROLLED_TEST_EXTERNAL_EFFECT"
      : "LIVE_REAL_OUTREACH";
    const recipientClassification = isOperatorInbox
      ? "OPERATOR_CONTROLLED_INBOX"
      : "VERIFIED_PUBLIC_BUSINESS_CONTACT";

    let pilot = await pilotRepository.getPilotById(params.pilotId);
    if (!pilot || pilot.status !== "running") {
      if (isOperatorInbox) {
        pilot = await pilotRepository.createPilot({
          id: params.pilotId || "PLT-CONTROLLED-PILOT",
          pilotNumber: "PILOT-2026-TEST",
          name: "Controlled Operator Test Pilot",
          status: "running",
          targetLeadCount: 10,
          maxOutboundMessages: 50,
          liveSendCommittedCount: 0,
          controlledTestSendCount: 0,
          blockedAttemptCount: 0,
          createdBy: "operator",
          createdAt: new Date().toISOString(),
        });
      } else {
        throw new Error(`Pilot '${params.pilotId}' is not active/running.`);
      }
    }

    // Check DNC suppression
    const dncScope = sourceClassification === "LIVE_REAL_OUTREACH" ? "LIVE_REAL" : "CONTROLLED_TEST";
    const isSuppressed = await pilotRepository.isSuppressed(params.recipientEmail, dncScope);
    if (isSuppressed) {
      await pilotRepository.updatePilot(pilot.id, { blockedAttemptCount: pilot.blockedAttemptCount + 1 });
      throw new Error(`Contact Safety Violation: Recipient '${params.recipientEmail}' is in Do-Not-Contact registry.`);
    }

    // Check Pilot Send Cap
    if (sourceClassification === "LIVE_REAL_OUTREACH") {
      if (pilot.liveSendCommittedCount >= pilot.maxOutboundMessages) {
        await pilotRepository.updatePilot(pilot.id, { blockedAttemptCount: pilot.blockedAttemptCount + 1 });
        throw new Error(`Pilot Cap Enforced: Maximum live outbound send limit (${pilot.maxOutboundMessages}) reached. Send blocked.`);
      }
    }

    // Claims scan
    const claimsCheck = await this.validateOutreachClaims(params.body);
    if (!claimsCheck.valid) {
      throw new Error(claimsCheck.violation);
    }

    // Send email via real Gmail provider
    const sendResult = await gmailEmailProvider.sendEmail({
      sender: process.env.GMAIL_USER || "johncasili257@gmail.com",
      recipient: params.recipientEmail,
      subject: params.subject,
      body: params.body,
    });

    const sendRecord: MarketPilotSendRecord = {
      id: `SND-${Date.now().toString().slice(-4)}`,
      pilotId: pilot.id,
      organizationId: params.organizationId,
      contactId: params.contactId,
      approvalId: params.approvalId,
      messageId: sendResult.providerMessageId || `<live-${Date.now()}@gmail.com>`,
      sentAt: new Date().toISOString(),
      sourceClassification,
      recipientClassification,
    };
    await pilotRepository.recordSend(sendRecord);

    // Update separate counters
    if (sourceClassification === "LIVE_REAL_OUTREACH") {
      await pilotRepository.updatePilot(pilot.id, { liveSendCommittedCount: pilot.liveSendCommittedCount + 1 });
    } else {
      await pilotRepository.updatePilot(pilot.id, { controlledTestSendCount: pilot.controlledTestSendCount + 1 });
    }

    return { success: true, messageId: sendRecord.messageId, sourceClassification };
  }

  async classifyInboundReply(text: string, fromEmail: string, scope: "LIVE_REAL" | "CONTROLLED_TEST" = "CONTROLLED_TEST"): Promise<{
    classification: "POSITIVE_INTEREST" | "QUESTION" | "PRICING_REQUEST" | "NOT_NOW" | "NOT_INTERESTED" | "DO_NOT_CONTACT" | "OTHER" | "UNCLEAR";
    intentExplanation: string;
    dncTriggered: boolean;
  }> {
    const lower = text.toLowerCase();

    if (lower.includes("remove") || lower.includes("unsubscribe") || lower.includes("stop contacting") || lower.includes("don't contact")) {
      await pilotRepository.addDnc({
        id: `DNC-${Date.now().toString().slice(-4)}`,
        entityType: "email",
        entityValue: fromEmail,
        reason: "Inbound opt-out request",
        source: "inbound_email",
        sourceClassification: scope,
        suppressedAt: new Date().toISOString(),
      });
      return { classification: "DO_NOT_CONTACT", intentExplanation: "Prospect requested permanent suppression", dncTriggered: true };
    }

    if (lower.includes("cost") || lower.includes("price") || lower.includes("pricing") || lower.includes("how much") || lower.includes("quote")) {
      return { classification: "PRICING_REQUEST", intentExplanation: "Prospect requested pricing or commercial scope", dncTriggered: false };
    }

    if (lower.includes("interesting") || lower.includes("tell me more") || lower.includes("call") || lower.includes("meeting")) {
      return { classification: "POSITIVE_INTEREST", intentExplanation: "Prospect showed clear affirmative interest", dncTriggered: false };
    }

    if (lower.trim() === "thanks" || lower.trim() === "ok" || lower.trim() === "received") {
      return { classification: "OTHER", intentExplanation: "Vague acknowledgment without explicit commercial intent", dncTriggered: false };
    }

    return { classification: "UNCLEAR", intentExplanation: "Informational or non-committal response", dncTriggered: false };
  }
}

export const pilotService = new PilotService();