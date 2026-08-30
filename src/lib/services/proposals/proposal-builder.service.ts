import { proposalRepository, ProposalRecord, ProposalScopeItem, ProposalPricing, ProposalTimeline } from "../../repositories/proposal.repository";
import { opportunityRepository, OpportunityRecord } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { auditRepository } from "../../repositories/audit.repository";
import { redesignRepository } from "../../repositories/redesign.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export interface OperatorPricingInput {
  currency?: string;
  basePrice?: number;
  includedItems?: string[];
  optionalAddons?: { name: string; price: number; description: string }[];
  paymentTerms?: string;
  pricingNotes?: string;
}

export interface OperatorTimelineInput {
  estimatedDuration?: string;
  startAssumption?: string;
  milestones?: { name: string; week: string; deliverables: string }[];
  notes?: string;
}

export class ProposalBuilderService {
  async generateProposal(
    opportunityId: string,
    operatorPricing?: OperatorPricingInput,
    operatorTimeline?: OperatorTimelineInput,
    operatorNotes?: string
  ): Promise<ProposalRecord> {
    const opp = await opportunityRepository.getById(opportunityId);
    if (!opp) throw new Error(`Opportunity ${opportunityId} not found.`);

    const lead = await leadRepository.getById(opp.leadId);
    if (!lead) throw new Error(`Lead ${opp.leadId} not found.`);

    if ((lead.status as string) === "do_not_contact") {
      throw new Error(`Lead "${lead.company}" is marked DO NOT CONTACT (unsubscribed). Proposal creation blocked.`);
    }

    const audit = await auditRepository.getByLeadId(opp.leadId);
    const redesign = await redesignRepository.getByLeadId(opp.leadId);

    // 1. Scope Protection: ONLY Active requirements become committed scope
    const activeScopeReqs = (opp.requestedScope || []).filter((r) => r.status === "active");
    const activeFeatureReqs = (opp.requiredFeatures || []).filter((r) => r.status === "active");
    const supersededReqs = [
      ...(opp.requestedScope || []).filter((r) => r.status === "superseded"),
      ...(opp.requiredFeatures || []).filter((r) => r.status === "superseded"),
    ];

    const scopeItems: ProposalScopeItem[] = [
      ...activeScopeReqs.map((r) => ({
        id: r.id,
        name: r.requirement,
        category: r.category || "Architecture & Layout",
        description: `Modernized, high-performance responsive implementation grounded in prospect requirement.`,
        isClientRequested: true,
        sourceRequirementId: r.id,
        sourceMessageId: r.sourceMessageId,
        sourceQuote: r.sourceQuote,
      })),
      ...activeFeatureReqs.map((r) => ({
        id: r.id,
        name: r.requirement,
        category: r.category || "Core Features",
        description: `Interactive business module customized for client operational workflows.`,
        isClientRequested: true,
        sourceRequirementId: r.id,
        sourceMessageId: r.sourceMessageId,
        sourceQuote: r.sourceQuote,
      })),
    ];

    // Deliverables derived from active scope
    const deliverables = [
      "Production-ready Next.js responsive website with full mobile & tablet optimization",
      ...scopeItems.map((s) => `${s.name} implementation`),
      "Cross-browser testing (Chrome, Safari, Edge, Mobile Viewports)",
      "Technical handover documentation and operator orientation session",
    ];

    // Exclusions / Out of Scope (Include superseded requirements)
    const exclusions = [
      ...supersededReqs.map((r) => `${r.requirement} (Retracted/Excluded per client request)`),
      "Custom native mobile app development (iOS/Android)",
      "Third-party advertising spend or external media buying",
      "Legal copywriting or regulatory compliance certification",
    ];

    // Optional Enhancements (Inferred items ONLY - clearly labeled)
    const optionalEnhancements = [
      {
        name: "Google Analytics 4 & Custom Conversion Event Tracking",
        description: "Inferred enhancement: Track visitor conversions, inquiry submissions, and engagement funnels.",
        isInferred: true,
      },
      {
        name: "Multi-Language Localization Support",
        description: "Inferred enhancement: Expand reach with multi-lingual page variants.",
        isInferred: true,
      },
    ];

    // 2. Pricing Policy (Operator-Controlled Only - NEVER Invent Prices)
    const hasOperatorPrice = operatorPricing && operatorPricing.basePrice !== undefined && operatorPricing.basePrice > 0;
    const currency = operatorPricing?.currency || "PHP";
    const basePrice = hasOperatorPrice ? operatorPricing!.basePrice! : 0;
    const paymentTerms = hasOperatorPrice
      ? operatorPricing?.paymentTerms || "50% upfront deposit upon kickoff / 50% upon final acceptance"
      : "Operator pricing required.";
    const pricingNotes = hasOperatorPrice
      ? operatorPricing?.pricingNotes || "Pricing is inclusive of all deliverables outlined in committed scope."
      : "Operator pricing required. Proposal draft is non-priced until operator specifies commercial terms.";

    const pricing: ProposalPricing = {
      currency,
      basePrice,
      hasPrice: Boolean(hasOperatorPrice),
      includedItems: scopeItems.map((s) => s.name),
      optionalAddons: operatorPricing?.optionalAddons || [],
      paymentTerms,
      pricingNotes,
    };

    // 3. Timeline Policy (Operator-Controlled Only - NEVER Invent Dates)
    const hasOperatorTimeline = operatorTimeline && !!operatorTimeline.estimatedDuration;
    const timeline: ProposalTimeline = {
      estimatedDuration: hasOperatorTimeline
        ? operatorTimeline!.estimatedDuration!
        : "Timeline to be confirmed after final scope review.",
      startAssumption: operatorTimeline?.startAssumption || "Within 5 business days following kickoff alignment.",
      milestones: operatorTimeline?.milestones || [
        { name: "Phase 1: Architecture & Interactive Wireframe", week: "Week 1-2", deliverables: "Approved UI/UX Layouts" },
        { name: "Phase 2: Full Frontend Development & CMS Integration", week: "Week 3-4", deliverables: "Functional Next.js Prototype" },
        { name: "Phase 3: Testing, Quality Assurance & Handover", week: "Week 5-6", deliverables: "Production Launch Handover" },
      ],
      notes: operatorTimeline?.notes,
    };

    const businessName = MOCK_BUSINESS_SETTINGS.businessName || "Synapse Web Modernization Engine";
    const title = `Modern Web Modernization & Development Proposal for ${lead.company}`;
    const executiveSummary = `Prepared by ${businessName} for ${lead.company}. This proposal outlines the strategy, deliverables, and technical execution for modernizing your digital presence, establishing a fast, responsive Next.js frontend with structured service catalogs and intuitive content management tailored to your operational goals.`;

    // 4. Versioning Check: Check existing proposals for this opportunity
    const existingProposals = await proposalRepository.getByOpportunityId(opportunityId);
    let nextVersion = 1;

    if (existingProposals.length > 0) {
      nextVersion = Math.max(...existingProposals.map((p) => p.version)) + 1;
      // Mark previous latest as superseded
      const latest = existingProposals[0];
      if (latest && latest.status === "waiting_approval") {
        await proposalRepository.updateStatus(latest.id, "superseded");
      }
    }

    const proposal = await proposalRepository.create({
      opportunityId,
      leadId: opp.leadId,
      version: nextVersion,
      status: "waiting_approval",
      title,
      executiveSummary,
      clientNeeds: [
        `Modernize existing online presence at ${lead.website}`,
        ...scopeItems.map((s) => s.name),
      ],
      scopeItems,
      exclusions,
      deliverables,
      optionalEnhancements,
      assumptions: [
        "Client will provide brand assets, logos, and high-resolution photography during Phase 1.",
        "Feedback cycles will be completed within 3 business days to maintain agreed schedule.",
      ],
      timeline,
      pricing,
      paymentTerms,
      nextSteps: [
        "Review and approve scope and commercial structure with your team.",
        "Sign off on formal agreement and schedule project kickoff alignment.",
      ],
      sourceGrounding: {
        opportunityId,
        leadId: opp.leadId,
        activeScopeCount: scopeItems.length,
        supersededScopeCount: supersededReqs.length,
        hasOperatorPricing: hasOperatorPrice,
        hasOperatorTimeline: hasOperatorTimeline,
        notes: operatorNotes,
      },
      generatedBy: "Sales Agent",
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Proposal v${nextVersion} Drafted: ${lead.company}`,
      description: `Generated structured proposal v${nextVersion} for ${lead.company} (${hasOperatorPrice ? `${currency} ${basePrice.toLocaleString()}` : "Pending Pricing"}).`,
      level: "success",
      agentName: "Sales Agent",
      metadata: {
        proposalId: proposal.id,
        opportunityId,
        version: nextVersion,
        price: hasOperatorPrice ? `${currency} ${basePrice}` : "None",
      },
    });

    return proposal;
  }

  async approveProposal(proposalId: string): Promise<ProposalRecord> {
    const proposal = await proposalRepository.getById(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.status === "approved") return proposal;

    // Commercial Safety Scanner on Approval
    this.validateProposalSafety(proposal);

    const updated = await proposalRepository.updateStatus(proposalId, "approved");

    await activityRepository.add({
      type: "approval_event",
      title: `Proposal Approved: ${proposal.title} (v${proposal.version})`,
      description: `Operator approved proposal draft v${proposal.version} for potential delivery. (Remains unsent).`,
      level: "success",
      agentName: "Human Operator",
      metadata: {
        proposalId,
        version: proposal.version,
      },
    });

    return updated;
  }

  private validateProposalSafety(proposal: ProposalRecord): void {
    const fullText = JSON.stringify(proposal).toLowerCase();

    const unsafeTriggers = [
      "triple your sales",
      "guarantee this redesign",
      "guaranteed 300%",
      "guaranteed results",
      "100% money back",
      "we guarantee",
      "{{",
    ];

    for (const trigger of unsafeTriggers) {
      if (fullText.includes(trigger)) {
        throw new Error(
          `Commercial safety violation in proposal: "${trigger}". Proposals with unsupported guarantees or unresolved placeholders cannot be approved.`
        );
      }
    }
  }
}

export const proposalBuilderService = new ProposalBuilderService();