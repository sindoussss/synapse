import { crmRepository, CRMProposal } from "../../repositories/crm.repository";
import { activityService } from "./activity.service";
import { privilegedActionFirewall } from "../security/privileged-action-firewall.service";

export interface ProposalInput {
  organizationId: string;
  opportunityId: string;
  leadId: string;
  title: string;
  scopeItems: string[];
  exclusions: string[];
  basePriceMinor: number;
  currency: string;
  paymentTerms: string;
  actor: string;
  actorRole: "OPERATOR" | "AI_ASSISTANT" | "SYSTEM";
}

export interface ProposalQualityCheckResult {
  status: "PROPOSAL_READY" | "PROPOSAL_REVIEW_REQUIRED";
  reasons: string[];
  isApprovedForSend: boolean;
}

export class ProposalService {
  // Deterministic Anti-Hallucination Guard for Proposals
  private validateProposalContent(title: string, scopeItems: string[], exclusions: string[]): { isValid: boolean; violationReason?: string } {
    const combined = `${title} ${scopeItems.join(" ")} ${exclusions.join(" ")}`.toLowerCase();

    // 1. Check for hallucinated performance / ROI claims
    if (combined.includes("guaranteed 10x roi") || combined.includes("100% conversion increase") || combined.includes("guaranteed revenue")) {
      return { isValid: false, violationReason: "PROPOSAL_HALLUCINATION_BLOCKED: Unsupported ROI or revenue guarantee detected." };
    }

    // 2. Check for synthesized fake testimonials or client badges
    if (combined.includes("loved by 10,000+ happy clients") || combined.includes("trusted by fortune 500") || combined.includes("award winning 2026")) {
      return { isValid: false, violationReason: "PROPOSAL_HALLUCINATION_BLOCKED: Fabricated testimonials or unverified badges detected." };
    }

    return { isValid: true };
  }

  checkProposalQuality(proposal: CRMProposal): ProposalQualityCheckResult {
    const reasons: string[] = [];

    if (proposal.basePriceMinor <= 0) {
      reasons.push("UNSUPPORTED_PRICING: Proposal has missing or non-positive price.");
    }

    if (!proposal.exclusions || proposal.exclusions.length === 0) {
      reasons.push("MISSING_EXCLUSIONS: Standard delivery exclusions are required to prevent scope creep.");
    }

    if (!proposal.scopeItems || proposal.scopeItems.length === 0) {
      reasons.push("EMPTY_SCOPE: At least one scope deliverable must be defined.");
    }

    const contentCheck = this.validateProposalContent(proposal.title, proposal.scopeItems || [], proposal.exclusions || []);
    if (!contentCheck.isValid && contentCheck.violationReason) {
      reasons.push(contentCheck.violationReason);
    }

    const status = reasons.length === 0 ? "PROPOSAL_READY" : "PROPOSAL_REVIEW_REQUIRED";
    return {
      status,
      reasons,
      isApprovedForSend: status === "PROPOSAL_READY" && proposal.status === "APPROVED",
    };
  }

  async createDraft(input: ProposalInput): Promise<CRMProposal> {
    const opp = crmRepository.getOpportunity(input.opportunityId, input.organizationId);
    if (!opp) throw new Error(`Opportunity ${input.opportunityId} not found in tenant ${input.organizationId}.`);

    if (input.basePriceMinor <= 0) {
      throw new Error("INVALID_PRICE: Proposal price must be explicitly defined and positive.");
    }

    // Run deterministic validation
    const contentCheck = this.validateProposalContent(input.title, input.scopeItems, input.exclusions);
    if (!contentCheck.isValid) {
      throw new Error(contentCheck.violationReason);
    }

    const proposal: CRMProposal = {
      proposalId: `PROP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      leadId: input.leadId,
      version: 1,
      status: "DRAFT",
      title: input.title,
      scopeItems: input.scopeItems,
      exclusions: input.exclusions,
      basePriceMinor: input.basePriceMinor,
      currency: input.currency || "PHP",
      paymentTerms: input.paymentTerms || "50% Downpayment, 50% on Completion",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    crmRepository.saveProposal(proposal);
    activityService.record({
      organizationId: input.organizationId,
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      actor: input.actor,
      actorRole: input.actorRole,
      type: "PROPOSAL_DRAFTED",
      description: `Draft proposal '${proposal.title}' created (Version ${proposal.version}, ₱${proposal.basePriceMinor / 100}).`,
    });

    return proposal;
  }

  async approveProposal(proposalId: string, organizationId: string, operator: string, operatorRole: "OPERATOR" | "AI_ASSISTANT" | "CLIENT"): Promise<CRMProposal> {
    if (operatorRole !== "OPERATOR") {
      throw new Error(`UNAUTHORIZED_PROPOSAL_APPROVAL: Only OPERATOR role can approve proposals. Attempted by role '${operatorRole}'.`);
    }

    const proposal = crmRepository.getProposal(proposalId, organizationId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found in tenant ${organizationId}.`);

    proposal.status = "APPROVED";
    proposal.approvedBy = operator;
    proposal.approvedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    crmRepository.saveProposal(proposal);
    activityService.record({
      organizationId,
      leadId: proposal.leadId,
      opportunityId: proposal.opportunityId,
      actor: operator,
      actorRole: "OPERATOR",
      type: "PROPOSAL_APPROVED",
      description: `Proposal '${proposal.title}' approved by operator ${operator}.`,
    });

    return proposal;
  }

  async sendProposal(proposalId: string, organizationId: string, sender: string, senderRole: "OPERATOR" | "AI_ASSISTANT" | "SYSTEM"): Promise<CRMProposal> {
    if (senderRole === "AI_ASSISTANT") {
      throw new Error("UNAUTHORIZED_OUTBOUND_COMMUNICATION: AI Assistant cannot autonomously send proposals without operator authorization.");
    }

    const proposal = crmRepository.getProposal(proposalId, organizationId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found in tenant ${organizationId}.`);

    if (proposal.status !== "APPROVED") {
      throw new Error(`PROPOSAL_SEND_BLOCKED: Proposal must be in APPROVED status before sending. Current status: '${proposal.status}'.`);
    }

    proposal.status = "SENT";
    proposal.sentAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    crmRepository.saveProposal(proposal);
    activityService.record({
      organizationId,
      leadId: proposal.leadId,
      opportunityId: proposal.opportunityId,
      actor: sender,
      actorRole: senderRole,
      type: "PROPOSAL_SENT",
      description: `Proposal '${proposal.title}' transmitted to client.`,
    });

    return proposal;
  }

  async acceptProposal(proposalId: string, organizationId: string, clientIdentifier: string): Promise<CRMProposal> {
    const proposal = crmRepository.getProposal(proposalId, organizationId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found in tenant ${organizationId}.`);

    if (proposal.status !== "SENT" && proposal.status !== "VIEWED") {
      throw new Error(`PROPOSAL_ACCEPTANCE_BLOCKED: Cannot accept proposal with status '${proposal.status}'. Must be SENT or VIEWED.`);
    }

    proposal.status = "ACCEPTED";
    proposal.acceptedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    crmRepository.saveProposal(proposal);
    activityService.record({
      organizationId,
      leadId: proposal.leadId,
      opportunityId: proposal.opportunityId,
      actor: clientIdentifier,
      actorRole: "CLIENT",
      type: "PROPOSAL_ACCEPTED",
      description: `Proposal '${proposal.title}' officially accepted by client (${clientIdentifier}).`,
    });

    return proposal;
  }
}

export const proposalService = new ProposalService();