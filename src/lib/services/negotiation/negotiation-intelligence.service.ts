import { negotiationRepository, NegotiationSessionRecord, NegotiationEventRecord, RequestedChangeItem } from "../../repositories/negotiation.repository";
import { proposalDeliveryRepository } from "../../repositories/proposal-delivery.repository";
import { proposalDocumentRepository } from "../../repositories/proposal-document.repository";
import { proposalRepository, ProposalRecord } from "../../repositories/proposal.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { emailMessageRepository, EmailMessageRecord } from "../../repositories/message.repository";
import { activityRepository } from "../../repositories/activity.repository";

export interface ProposalResponseAnalysis {
  classification:
    | "proposal_interested"
    | "proposal_accepted_directionally"
    | "revision_request"
    | "scope_change_request"
    | "pricing_objection"
    | "discount_request"
    | "timeline_question"
    | "payment_terms_question"
    | "meeting_request"
    | "internal_review"
    | "decision_pending"
    | "rejection"
    | "unsubscribe"
    | "unclear";
  summary: string;
  objections: string[];
  commercialSignals: string[];
  requestedChanges: RequestedChangeItem[];
  clientProposedPrice?: { currency: string; amount: number; sourceQuote: string };
  recommendedAction: string;
  suggestedResponseDraft: string;
}

export class NegotiationIntelligenceService {
  async processInboundProposalReply(
    message: EmailMessageRecord,
    opportunityId?: string
  ): Promise<{ session: NegotiationSessionRecord; event: NegotiationEventRecord; analysis: ProposalResponseAnalysis }> {
    const oppId = opportunityId || (await this.resolveOpportunityForMessage(message));
    if (!oppId) throw new Error(`Could not correlate inbound message ${message.id} to any opportunity.`);

    const opp = await opportunityRepository.getById(oppId);
    if (!opp) throw new Error(`Opportunity ${oppId} not found.`);

    // Locate active proposal
    const proposals = await proposalRepository.getByOpportunityId(oppId);
    const activeProposal = proposals.find((p) => p.status === "approved") || proposals[0];
    if (!activeProposal) throw new Error(`No proposal found for opportunity ${oppId}.`);

    const docs = await proposalDocumentRepository.getByProposalId(activeProposal.id);
    const activeDoc = docs.find((d) => d.status === "approved") || docs[0];

    // Find or create negotiation session
    let session = await negotiationRepository.getSessionByOpportunityId(oppId);
    if (!session) {
      session = await negotiationRepository.createSession({
        opportunityId: oppId,
        proposalId: activeProposal.id,
        proposalDocumentId: activeDoc?.id,
        status: "awaiting_operator",
        currentProposalVersion: activeProposal.version,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      });

      await activityRepository.add({
        type: "task_completed",
        title: `Negotiation Session Opened: ${opp.title}`,
        description: `Initiated negotiation tracking workspace for Proposal v${activeProposal.version}.`,
        level: "info",
        agentName: "Sales Agent",
        metadata: { sessionId: session.id, opportunityId: oppId },
      });
    }

    // Analyze Response
    const analysis = this.analyzeProposalResponse(message.bodyText, message.id, activeProposal);

    // Record Negotiation Event
    const event = await negotiationRepository.addEvent({
      negotiationSessionId: session.id,
      emailMessageId: message.id,
      eventType: this.mapClassificationToEventType(analysis.classification),
      summary: analysis.summary,
      requestedChanges: analysis.requestedChanges,
      objections: analysis.objections,
      commercialSignals: analysis.commercialSignals,
      sourceGrounding: {
        messageId: message.id,
        clientProposedPrice: analysis.clientProposedPrice,
        classification: analysis.classification,
        recommendedAction: analysis.recommendedAction,
      },
    });

    // Update Session Status
    let nextStatus = session.status;
    if (analysis.classification === "proposal_accepted_directionally") {
      nextStatus = "agreement_in_principle";
    } else if (analysis.classification === "rejection") {
      nextStatus = "awaiting_operator";
    } else if (analysis.classification === "internal_review" || analysis.classification === "decision_pending") {
      nextStatus = "awaiting_client";
    } else {
      nextStatus = "awaiting_operator";
    }

    session = await negotiationRepository.updateSession(session.id, {
      status: nextStatus,
      lastActivityAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Proposal Response Analyzed: [${analysis.classification.toUpperCase()}]`,
      description: `Prospect reply analyzed (${analysis.summary}). Operator action recommended: ${analysis.recommendedAction}.`,
      level: "warning",
      agentName: "Sales Agent",
      metadata: {
        sessionId: session.id,
        classification: analysis.classification,
        requestedChangesCount: analysis.requestedChanges.length,
      },
    });

    return { session, event, analysis };
  }

  analyzeProposalResponse(text: string, messageId: string, proposal: ProposalRecord): ProposalResponseAnalysis {
    const raw = (text || "").toLowerCase();
    const requestedChanges: RequestedChangeItem[] = [];
    const objections: string[] = [];
    const commercialSignals: string[] = [];
    let clientProposedPrice: { currency: string; amount: number; sourceQuote: string } | undefined = undefined;

    // 1. Prompt Injection Defense: treat untrusted commands purely as text
    let cleanText = text;

    // 2. Pricing Objection & Client Proposed Price Extraction
    const allPriceMatches = Array.from(
      text.matchAll(/(?:php|php\s*|p\s*|\$)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,6})/gi)
    );

    if (raw.includes("above our budget") || raw.includes("budget") || raw.includes("too high") || raw.includes("expensive")) {
      objections.push("Pricing exceeds client current budget constraint");
      commercialSignals.push("pricing_objection");
    }

    if (allPriceMatches.length > 0) {
      // Pick the counter offer (last mentioned price in message)
      const targetMatch = allPriceMatches[allPriceMatches.length - 1];

      const numStr = targetMatch[1].replace(/,/g, "");
      const amount = parseInt(numStr, 10);
      if (!isNaN(amount) && amount > 0) {
        clientProposedPrice = {
          currency: "PHP",
          amount,
          sourceQuote: targetMatch[0],
        };
        requestedChanges.push({
          id: `CHG-${Date.now()}-P`,
          type: "price_adjustment",
          target: "Investment Amount",
          action: `Client requested adjustment to PHP ${amount.toLocaleString()}`,
          clientProposedValue: amount,
          sourceMessageId: messageId,
          sourceQuote: targetMatch[0],
          status: "pending_operator_decision",
        });
      }
    }

    // 3. Discount Requests
    if (raw.includes("discount") || raw.includes("% discount") || raw.includes("lower the price") || raw.includes("bring the price down")) {
      commercialSignals.push("discount_request");
    }

    // 4. Scope Modification Requests (e.g. CMS, Booking)
    if (raw.includes("remove the cms") || raw.includes("without cms") || raw.includes("take out cms") || raw.includes("remove cms")) {
      requestedChanges.push({
        id: `CHG-${Date.now()}-CMS`,
        type: "remove_scope",
        target: "Content Management System (CMS)",
        action: "remove",
        sourceMessageId: messageId,
        sourceQuote: "remove the CMS",
        status: "pending_operator_decision",
      });
      commercialSignals.push("scope_reduction_request");
    }

    if (raw.includes("add") || raw.includes("include")) {
      // Check for specific additions if present
    }

    // 5. Classification Logic
    let classification: ProposalResponseAnalysis["classification"] = "proposal_interested";
    let recommendedAction = "review_proposal_feedback";

    if (raw.includes("not to proceed") || raw.includes("not moving forward") || raw.includes("cancel") || raw.includes("pass on this")) {
      classification = "rejection";
      recommendedAction = "confirm_close_lost";
    } else if (raw.includes("management") || raw.includes("internally") || raw.includes("discuss with") || raw.includes("next week")) {
      classification = "internal_review";
      recommendedAction = "wait_for_reply";
    } else if (
      raw.includes("everything looks good") ||
      raw.includes("happy with the proposal") ||
      raw.includes("move forward") ||
      raw.includes("let's proceed") ||
      raw.includes("ready to start")
    ) {
      classification = "proposal_accepted_directionally";
      recommendedAction = "prepare_agreement";
    } else if (commercialSignals.includes("discount_request") && !commercialSignals.includes("scope_reduction_request")) {
      classification = "discount_request";
      recommendedAction = "manual_pricing_review";
    } else if (commercialSignals.includes("pricing_objection") && commercialSignals.includes("scope_reduction_request")) {
      classification = "scope_change_request";
      recommendedAction = "review_scope_and_pricing_counter";
    } else if (commercialSignals.includes("pricing_objection")) {
      classification = "pricing_objection";
      recommendedAction = "manual_pricing_review";
    } else if (commercialSignals.includes("scope_reduction_request")) {
      classification = "scope_change_request";
      recommendedAction = "review_scope_modification";
    }

    // 6. Grounded Response Draft (Remains Unsent)
    let suggestedResponseDraft = "";
    if (classification === "scope_change_request" || classification === "pricing_objection") {
      suggestedResponseDraft = `Hi team,\n\nThank you for the feedback on the proposal. We can review the scope adjustments you noted${requestedChanges.some((c) => c.target.includes("CMS")) ? " (such as excluding the CMS component)" : ""}. Once our team aligns on the revised scope, I will prepare an updated proposal draft for your review.\n\nBest regards,\nAlex Mercer`;
    } else if (classification === "discount_request") {
      suggestedResponseDraft = `Hi team,\n\nThank you for reviewing the proposal. I will review your commercial request with our team and get back to you with our options shortly.\n\nBest regards,\nAlex Mercer`;
    } else if (classification === "proposal_accepted_directionally") {
      suggestedResponseDraft = `Hi team,\n\nWe are delighted to hear that the proposal meets your expectations! I will prepare the formal agreement and kickoff onboarding steps for your review.\n\nBest regards,\nAlex Mercer`;
    } else if (classification === "internal_review") {
      suggestedResponseDraft = `Hi team,\n\nSounds great. Thank you for keeping us updated, and please let me know if any questions arise during your internal discussion.\n\nBest regards,\nAlex Mercer`;
    } else {
      suggestedResponseDraft = `Hi team,\n\nThank you for your note. We have received your feedback and will review it with our team.\n\nBest regards,\nAlex Mercer`;
    }

    const summary = `${classification.replace(/_/g, " ").toUpperCase()}: ${
      requestedChanges.length > 0 ? `${requestedChanges.length} requested changes identified` : "Prospect provided feedback"
    }${clientProposedPrice ? ` (Client requested PHP ${clientProposedPrice.amount.toLocaleString()})` : ""}.`;

    return {
      classification,
      summary,
      objections,
      commercialSignals,
      requestedChanges,
      clientProposedPrice,
      recommendedAction,
      suggestedResponseDraft,
    };
  }

  async recordOperatorDecision(
    sessionId: string,
    changeId: string,
    decision: "accepted" | "rejected" | "modified",
    notes?: string
  ): Promise<NegotiationSessionRecord> {
    const session = await negotiationRepository.getSessionById(sessionId);
    if (!session) throw new Error(`Negotiation session ${sessionId} not found.`);

    const events = await negotiationRepository.getEventsBySessionId(sessionId);
    let targetChange: RequestedChangeItem | undefined;

    for (const evt of events) {
      if (evt.requestedChanges) {
        const match = evt.requestedChanges.find((c) => c.id === changeId || c.target === changeId);
        if (match) {
          match.status = decision;
          match.operatorNotes = notes;
          targetChange = match;
          break;
        }
      }
    }

    await negotiationRepository.addEvent({
      negotiationSessionId: sessionId,
      eventType: "operator_decision",
      summary: `Operator ${decision.toUpperCase()} requested change: ${targetChange?.target || changeId}${notes ? ` ("${notes}")` : ""}.`,
      requestedChanges: targetChange ? [targetChange] : undefined,
      sourceGrounding: { changeId, decision, notes },
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Operator Decision: ${decision.toUpperCase()} (${targetChange?.target || changeId})`,
      description: `Operator explicitly recorded ${decision} on requested change.`,
      level: "info",
      agentName: "Human Operator",
      metadata: { sessionId, changeId, decision },
    });

    return session;
  }

  private mapClassificationToEventType(classification: ProposalResponseAnalysis["classification"]): any {
    switch (classification) {
      case "scope_change_request":
        return "scope_change";
      case "pricing_objection":
        return "price_objection";
      case "discount_request":
        return "discount_request";
      case "proposal_accepted_directionally":
        return "client_acceptance_signal";
      case "rejection":
        return "client_rejection";
      case "timeline_question":
        return "timeline_question";
      case "payment_terms_question":
        return "terms_question";
      default:
        return "proposal_reply";
    }
  }

  private async resolveOpportunityForMessage(message: EmailMessageRecord): Promise<string | null> {
    if (message.leadId) {
      const opp = await opportunityRepository.getByLeadId(message.leadId);
      if (opp) return opp.id;
    }
    const deliveries = await proposalDeliveryRepository.getAll();
    const match = deliveries.find((d) => d.recipient.toLowerCase() === message.sender.toLowerCase());
    return match?.opportunityId || null;
  }
}

export const negotiationIntelligenceService = new NegotiationIntelligenceService();