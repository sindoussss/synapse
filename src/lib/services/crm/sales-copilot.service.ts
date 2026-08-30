import { crmRepository, CRMLead, CRMContact, CRMOpportunity, CRMProposal, CRMActivityRecord } from "../../repositories/crm.repository";
import { requirementGapService, RequirementGapAnalysis } from "./requirement-gap.service";
import { quoteAssistantService, QuoteDraft } from "./quote-assistant.service";
import { opportunityHealthService, OpportunityHealthAssessment } from "./opportunity-health.service";

export type ProvenanceCategory = "VERIFIED" | "EXPLICIT" | "INFERRED" | "UNKNOWN" | "CONFLICTING";

export interface EvidenceItem<T> {
  value: T;
  provenance: ProvenanceCategory;
  sourceEvidence?: string;
}

export interface CopilotOpportunitySummary {
  opportunityId: string;
  organizationId: string;
  companyName: EvidenceItem<string>;
  industry: EvidenceItem<string>;
  domain: EvidenceItem<string>;
  contactEmail: EvidenceItem<string>;
  statedNeed: EvidenceItem<string>;
  budget: EvidenceItem<number | string>;
  unknownRequirements: string[];
  conflicts: string[];
  requirementGapAnalysis: RequirementGapAnalysis;
  healthAssessment: OpportunityHealthAssessment;
  recommendedNextAction: string;
  discoveryQuestions: string[];
  telemetry: {
    provider: string;
    model: string;
    latencyMs: number;
    costUsd: number | "UNKNOWN";
  };
}

export class SalesCopilotService {
  summarizeOpportunity(opportunityId: string, organizationId: string): CopilotOpportunitySummary {
    const startTime = Date.now();
    const opp = crmRepository.getOpportunity(opportunityId, organizationId);
    if (!opp) throw new Error(`Opportunity ${opportunityId} not found in organization ${organizationId}.`);

    const lead = crmRepository.getLead(opp.leadId, organizationId);
    if (!lead) throw new Error(`Lead ${opp.leadId} not found in organization ${organizationId}.`);

    const contact = lead.contactId ? crmRepository.getContact(lead.contactId, organizationId) : null;
    const activities = crmRepository.listActivities(organizationId, { opportunityId });

    // 1. Evidence extraction
    const companyName: EvidenceItem<string> = {
      value: lead.companyName,
      provenance: lead.verificationState === "VERIFIED" ? "VERIFIED" : "EXPLICIT",
      sourceEvidence: lead.verificationEvidence || "Lead intake form",
    };

    const industry: EvidenceItem<string> = {
      value: lead.industry || "Unknown",
      provenance: lead.industry ? "VERIFIED" : "UNKNOWN",
      sourceEvidence: "Business registration registry",
    };

    const domain: EvidenceItem<string> = {
      value: lead.domain || "Unknown",
      provenance: lead.domain ? "VERIFIED" : "UNKNOWN",
      sourceEvidence: lead.sourceUrl,
    };

    const contactEmail: EvidenceItem<string> = {
      value: contact ? contact.email : "Unknown",
      provenance: contact && contact.verificationState === "VERIFIED" ? "VERIFIED" : "UNKNOWN",
      sourceEvidence: contact?.sourceUrl,
    };

    const statedNeed: EvidenceItem<string> = {
      value: opp.evidence || "Website redesign and digital quote calculator",
      provenance: "EXPLICIT",
      sourceEvidence: "Inbound communication signal",
    };

    const budget: EvidenceItem<number | string> = {
      value: opp.expectedValue !== "UNKNOWN" ? opp.expectedValue : "UNKNOWN",
      provenance: typeof opp.expectedValue === "number" ? "EXPLICIT" : "UNKNOWN",
      sourceEvidence: typeof opp.expectedValue === "number" ? "Quoted package calculation" : undefined,
    };

    // 2. Requirement Gap Analysis
    const reqGaps = requirementGapService.analyzeGaps({
      opportunityId,
      organizationId,
      lead,
      statedRequirements: [statedNeed.value],
      statedExclusions: ["No custom ERP backend"],
    });

    // 3. Health Assessment
    const health = opportunityHealthService.assessHealth(opportunityId, organizationId);

    // 4. Discovery Questions Generation
    const discoveryQuestions: string[] = [];
    for (const item of reqGaps.items) {
      if (item.clarificationQuestion) {
        discoveryQuestions.push(item.clarificationQuestion);
      }
    }

    // 5. Recommended Next Action
    let recommendedNextAction = "Review requirements and draft proposal.";
    if (opp.stage === "PROPOSAL_PENDING") {
      recommendedNextAction = "Draft and validate proposal using authoritative catalog prices.";
    } else if (opp.stage === "PROPOSAL_SENT") {
      recommendedNextAction = "Follow up with client regarding proposal approval status.";
    } else if (reqGaps.status === "CLARIFICATION_REQUIRED") {
      recommendedNextAction = "Send discovery clarification questions to resolve critical gaps.";
    }

    const latencyMs = Date.now() - startTime;

    return {
      opportunityId,
      organizationId,
      companyName,
      industry,
      domain,
      contactEmail,
      statedNeed,
      budget,
      unknownRequirements: reqGaps.items.filter((i) => i.status === "UNKNOWN").map((i) => i.field),
      conflicts: reqGaps.items.filter((i) => i.status === "CONFLICTING").map((i) => i.field),
      requirementGapAnalysis: reqGaps,
      healthAssessment: health,
      recommendedNextAction,
      discoveryQuestions,
      telemetry: {
        provider: "Local/Ollama (Gemma-4-12B)",
        model: "gemma-4-12B-coder",
        latencyMs,
        costUsd: 0.0, // Local compute cost
      },
    };
  }
}

export const salesCopilotService = new SalesCopilotService();