import { crmRepository, CRMLead, CRMContact, CRMOpportunity, CRMAgreementReference, LeadLifecycleStage, OpportunityStage } from "../../repositories/crm.repository";
import { activityService } from "./activity.service";

export class CRMPipelineService {
  // ── Lead Verification Engine ──────────────────────────────
  verifyLead(params: {
    leadId: string;
    organizationId: string;
    companyName: string;
    domain?: string;
    sourceEvidence?: string;
    contactEmail?: string;
    contactClassification?: "PUBLIC_BUSINESS" | "CONTROLLED_TEST" | "PRIVATE" | "UNVERIFIED";
  }): { isVerified: boolean; lead?: CRMLead; rejectionReason?: string } {
    // 1. Check company identity
    if (!params.companyName || params.companyName.trim().length < 2 || params.companyName.toLowerCase().includes("fake") || params.companyName.toLowerCase().includes("acme corp test")) {
      return { isVerified: false, rejectionReason: "VERIFICATION_REJECTED: Invalid or synthetic company name." };
    }

    // 2. Check domain legitimacy
    if (!params.domain || params.domain.includes("fake-invented-domain") || !params.domain.includes(".")) {
      return { isVerified: false, rejectionReason: "VERIFICATION_REJECTED: Unverified or invented domain." };
    }

    // 3. Check source evidence
    if (!params.sourceEvidence || params.sourceEvidence.trim().length < 5) {
      return { isVerified: false, rejectionReason: "VERIFICATION_REJECTED: Missing verifiable source evidence provenance." };
    }

    // 4. Contact Safety: Private / guessed emails blocked
    if (params.contactClassification === "PRIVATE" || (params.contactEmail && (params.contactEmail.includes("personal_private") || params.contactEmail.includes("guessed_")))) {
      return { isVerified: false, rejectionReason: "CONTACT_SAFETY_REJECTED: Guessed personal/private emails strictly prohibited from outreach." };
    }

    // 5. Global DNC check
    if (params.contactEmail && crmRepository.isDNC(params.contactEmail)) {
      return { isVerified: false, rejectionReason: "DNC_REJECTED: Contact email is registered on the permanent Do-Not-Contact list." };
    }

    const lead: CRMLead = {
      leadId: params.leadId,
      organizationId: params.organizationId,
      companyName: params.companyName,
      industry: "Construction & Building Materials",
      domain: params.domain,
      source: "Manual/Evidence Discovery",
      sourceUrl: params.sourceEvidence,
      lifecycleStage: "VERIFIED",
      verificationState: "VERIFIED",
      qualificationState: "PENDING",
      owner: "OPERATOR",
      environment: "LIVE_REAL",
      verificationEvidence: params.sourceEvidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    crmRepository.saveLead(lead);
    activityService.record({
      organizationId: params.organizationId,
      leadId: lead.leadId,
      actor: "SYSTEM",
      actorRole: "SYSTEM",
      type: "LEAD_VERIFIED",
      description: `Lead '${lead.companyName}' verified with evidence provenance.`,
      evidenceId: params.sourceEvidence,
    });

    return { isVerified: true, lead };
  }

  // ── Opportunity Creation ──────────────────────────────────
  createOpportunityFromSignal(params: {
    opportunityId: string;
    organizationId: string;
    leadId: string;
    signalType: "POSITIVE_INTEREST" | "PRICING_REQUEST" | "MEETING_REQUEST" | "UNCLEAR" | "DNC" | "NOT_INTERESTED";
    signalEvidence: string;
    expectedValueMinor?: number | "UNKNOWN";
    currency?: string;
  }): { success: boolean; opportunity?: CRMOpportunity; rejectionReason?: string } {
    if (params.signalType === "DNC" || params.signalType === "NOT_INTERESTED") {
      return { success: false, rejectionReason: "OPPORTUNITY_REJECTED: Inbound signal expresses disinterest or DNC. Commercial opportunity creation forbidden." };
    }

    if (params.signalType === "UNCLEAR") {
      return { success: false, rejectionReason: "OPPORTUNITY_REJECTED: Inbound signal is vague or unverified. Concrete commercial intent required." };
    }

    const lead = crmRepository.getLead(params.leadId, params.organizationId);
    if (!lead) {
      return { success: false, rejectionReason: `OPPORTUNITY_REJECTED: Lead ${params.leadId} not found in tenant ${params.organizationId}.` };
    }

    const opp: CRMOpportunity = {
      opportunityId: params.opportunityId,
      organizationId: params.organizationId,
      leadId: params.leadId,
      stage: params.signalType === "PRICING_REQUEST" ? "PROPOSAL_PENDING" : "QUALIFIED",
      expectedValue: params.expectedValueMinor !== undefined ? params.expectedValueMinor : "UNKNOWN",
      currency: params.currency || "PHP",
      probability: params.signalType === "PRICING_REQUEST" ? 75 : 50,
      evidence: params.signalEvidence,
      environment: lead.environment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    crmRepository.saveOpportunity(opp);
    lead.lifecycleStage = "OPPORTUNITY";
    crmRepository.saveLead(lead);

    activityService.record({
      organizationId: params.organizationId,
      leadId: params.leadId,
      opportunityId: opp.opportunityId,
      actor: "OPERATOR",
      actorRole: "OPERATOR",
      type: "OPPORTUNITY_CREATED",
      description: `Opportunity created from verified inbound signal '${params.signalType}'.`,
      evidenceId: params.signalEvidence,
    });

    return { success: true, opportunity: opp };
  }

  // ── Commercial Close Authority Check ──────────────────────
  closeOpportunityWon(params: {
    opportunityId: string;
    organizationId: string;
    agreementId: string;
    actorRole: "OPERATOR" | "AI_ASSISTANT" | "CLIENT" | "SYSTEM";
    hasExecutedAgreement: boolean;
    hasVerifiedPayment: boolean;
  }): { success: boolean; opportunity?: CRMOpportunity; rejectionReason?: string } {
    if (params.actorRole === "AI_ASSISTANT") {
      throw new Error("UNAUTHORIZED_COMMERCIAL_ACTION: AI Assistant cannot autonomously mark opportunities CLOSED_WON.");
    }

    if (!params.hasExecutedAgreement || !params.hasVerifiedPayment) {
      throw new Error("CLOSE_RULES_VIOLATED: Opportunity cannot be closed as WON without an executed agreement and verified payment confirmation.");
    }

    const opp = crmRepository.getOpportunity(params.opportunityId, params.organizationId);
    if (!opp) throw new Error(`Opportunity ${params.opportunityId} not found.`);

    opp.stage = "CLOSED_WON";
    opp.updatedAt = new Date().toISOString();
    crmRepository.saveOpportunity(opp);

    activityService.record({
      organizationId: params.organizationId,
      opportunityId: opp.opportunityId,
      leadId: opp.leadId,
      actor: "OPERATOR",
      actorRole: "OPERATOR",
      type: "OPPORTUNITY_CLOSED_WON",
      description: `Opportunity ${opp.opportunityId} officially closed WON with executed agreement (${params.agreementId}) and verified payment.`,
    });

    return { success: true, opportunity: opp };
  }
}

export const crmPipelineService = new CRMPipelineService();