import crypto from "crypto";
import { agreementRepository, AgreementRecord, CommercialBaseline, AgreementParties, DEFAULT_LEGAL_TEMPLATE } from "../../repositories/agreement.repository";
import { proposalRepository } from "../../repositories/proposal.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { negotiationRepository } from "../../repositories/negotiation.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export interface LockBaselineInput {
  proposalId: string;
  proposalVersion: number;
  currency: string;
  price: number;
  paymentTerms: string;
  timelineDuration: string;
  includedScope: string[];
  excludedScope: string[];
  operatorNotes?: string;
}

export class AgreementBuilderService {
  async draftAgreement(
    opportunityId: string,
    baselineInput: LockBaselineInput,
    templateId?: string
  ): Promise<AgreementRecord> {
    const opp = await opportunityRepository.getById(opportunityId);
    if (!opp) throw new Error(`Opportunity ${opportunityId} not found.`);

    const lead = await leadRepository.getById(opp.leadId);
    if (!lead) throw new Error(`Lead ${opp.leadId} not found.`);

    if ((lead.status as string) === "do_not_contact") {
      throw new Error(`Lead "${lead.company}" is marked DO NOT CONTACT. Agreement drafting permanently blocked.`);
    }

    // 1. Template Verification (Must be Approved)
    const targetTemplateId = templateId || "TMPL-WEB-DEV-001";
    const template = await agreementRepository.getTemplateById(targetTemplateId);
    if (!template || !template.approved) {
      throw new Error("Approved legal template/operator legal terms required. Agreement drafting halted.");
    }

    // 2. Proposal Lineage & Baseline Verification
    const proposal = await proposalRepository.getById(baselineInput.proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${baselineInput.proposalId} not found for commercial baseline.`);
    }

    const negotiation = await negotiationRepository.getSessionByOpportunityId(opportunityId);

    // 3. Client Identity Verification
    const isIdentityComplete = Boolean(lead.company && lead.contactEmail);
    const parties: AgreementParties = {
      client: {
        companyName: lead.company,
        contactName: lead.company,
        contactEmail: lead.contactEmail,
        legalAddress: isIdentityComplete ? `${lead.company} Registered Office, ${lead.location || "Philippines"}` : undefined,
        isIdentityComplete,
      },
      serviceProvider: {
        businessName: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Web Modernization Engine",
        representativeName: "Alex Mercer",
        representativeTitle: "Principal Digital Architect",
        address: "742 Innovation Way, Metro Manila, Philippines",
        jurisdiction: "Philippines",
      },
    };

    const commercialBaseline: CommercialBaseline = {
      proposalId: proposal.id,
      proposalVersion: baselineInput.proposalVersion,
      currency: baselineInput.currency || "PHP",
      price: baselineInput.price,
      paymentTerms: baselineInput.paymentTerms,
      timelineDuration: baselineInput.timelineDuration,
      includedScopeCount: baselineInput.includedScope.length,
      excludedScopeCount: baselineInput.excludedScope.length,
      lockedAt: new Date().toISOString(),
      confirmedBy: "Human Operator",
    };

    // 4. Grounded Scope & Exclusions
    const scope = [...baselineInput.includedScope];
    const exclusions = [...baselineInput.excludedScope];
    const deliverables = [
      "Production-ready Next.js web application built with responsive mobile/desktop architecture",
      ...scope.map((s) => `${s} module implementation and verification`),
      "Cross-browser testing, accessibility compliance, and performance optimization",
      "Comprehensive handover orientation, administrator documentation, and deployment support",
    ];

    const timeline = {
      duration: baselineInput.timelineDuration,
      milestones: [
        { name: "Phase 1: Architecture & UI/UX Layout Approval", week: "Week 1-2", deliverables: "Approved Interactive Wireframes" },
        { name: "Phase 2: Core Engineering & Dynamic Integration", week: "Week 3-4", deliverables: "Functional Next.js Prototype" },
        { name: "Phase 3: QA Testing & Production Launch Handover", week: "Week 4-5", deliverables: "Final Release Verification" },
      ],
    };

    const pricing = {
      currency: baselineInput.currency || "PHP",
      amount: baselineInput.price,
      paymentStructure: baselineInput.paymentTerms,
    };

    // 5. Protected Legal Terms from Approved Template
    const ipSec = template.templateSections.find((s) => s.id === "sec_ip");
    const confSec = template.templateSections.find((s) => s.id === "sec_confidentiality");
    const warSec = template.templateSections.find((s) => s.id === "sec_warranties");
    const liabSec = template.templateSections.find((s) => s.id === "sec_liability");
    const termSec = template.templateSections.find((s) => s.id === "sec_termination");
    const lawSec = template.templateSections.find((s) => s.id === "sec_governing_law");

    const ownershipTerms = { text: ipSec?.content || "", isProtected: true };
    const confidentialityTerms = { text: confSec?.content || "", isProtected: true };
    const warranties = { text: warSec?.content || "", isProtected: true };
    const limitations = { text: liabSec?.content || "", isProtected: true };
    const terminationTerms = { text: termSec?.content || "", isProtected: true };
    const governingLaw = { text: lawSec?.content || "", jurisdiction: template.jurisdiction, isProtected: true };
    const disputeTerms = { text: "Disputes shall be resolved through good-faith mediation prior to litigation.", isProtected: true };
    const revisionPolicy = { text: "Minor revisions within agreed scope are included. Out-of-scope additions require written change order.", isProtected: false };

    const clientResponsibilities = [
      "Provide brand logos, high-resolution photography, and authoritative company copy during Phase 1.",
      "Complete design feedback and milestone review cycles within three (3) business days of receipt.",
    ];

    const operatorResponsibilities = [
      "Deliver all engineering deliverables in strict alignment with the agreed Scope of Work.",
      "Maintain industry-standard code quality, security practices, and responsive design guidelines.",
    ];

    const signatureBlocks = {
      client: {
        title: `Authorized Representative, ${lead.company}`,
        placeholder: "[Signature to be executed upon operator delivery]",
      },
      provider: {
        title: `Principal Digital Architect, ${parties.serviceProvider.businessName}`,
        representative: parties.serviceProvider.representativeName,
      },
    };

    // 6. Compute Canonical SHA-256 Content Hash
    const canonicalPayload = JSON.stringify({
      opportunityId,
      parties,
      commercialBaseline,
      scope,
      exclusions,
      pricing,
      timeline,
      ownershipTerms,
      confidentialityTerms,
      limitations,
      terminationTerms,
      governingLaw,
    });
    const contentHash = crypto.createHash("sha256").update(canonicalPayload).digest("hex");

    // 7. Versioning Check: Check existing agreements for this opportunity
    const existingAgreements = await agreementRepository.getByOpportunityId(opportunityId);
    let nextVersion = 1;
    if (existingAgreements.length > 0) {
      nextVersion = Math.max(...existingAgreements.map((a) => a.version)) + 1;
      const prev = existingAgreements[0];
      if (prev && prev.status === "waiting_operator_review") {
        await agreementRepository.updateStatus(prev.id, "superseded");
      }
    }

    const title = `Web Modernization & Professional Services Agreement — ${lead.company}`;

    const agreement = await agreementRepository.create({
      opportunityId,
      leadId: opp.leadId,
      proposalId: proposal.id,
      proposalVersion: baselineInput.proposalVersion,
      negotiationSessionId: negotiation?.id,
      version: nextVersion,
      status: "waiting_operator_review",
      agreementType: template.agreementType,
      title,
      parties,
      commercialBaseline,
      scope,
      exclusions,
      deliverables,
      timeline,
      pricing,
      paymentTerms: baselineInput.paymentTerms,
      clientResponsibilities,
      operatorResponsibilities,
      revisionPolicy,
      terminationTerms,
      ownershipTerms,
      confidentialityTerms,
      warranties,
      limitations,
      disputeTerms,
      governingLaw,
      signatureBlocks,
      legalReviewRequired: true,
      contentHash,
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Agreement Draft v${nextVersion} Generated: ${lead.company}`,
      description: `Structured agreement draft v${nextVersion} created (${commercialBaseline.currency} ${commercialBaseline.price.toLocaleString()}). Protected clauses locked.`,
      level: "success",
      agentName: "Sales Agent",
      metadata: {
        agreementId: agreement.id,
        version: nextVersion,
        price: `${commercialBaseline.currency} ${commercialBaseline.price}`,
        hash: contentHash,
      },
    });

    return agreement;
  }

  async approveAgreementForDelivery(agreementId: string): Promise<AgreementRecord> {
    const agreement = await agreementRepository.getById(agreementId);
    if (!agreement) throw new Error(`Agreement ${agreementId} not found.`);

    if (agreement.status === "approved_for_delivery") return agreement;

    // Protected Clause & Content Safety Scan
    this.validateProtectedClauses(agreement);

    const updated = await agreementRepository.updateStatus(agreementId, "approved_for_delivery");

    await activityRepository.add({
      type: "approval_event",
      title: `Agreement Approved for Delivery: ${agreement.title} (v${agreement.version})`,
      description: `Operator reviewed and approved agreement v${agreement.version} for potential client delivery. (Confirmed unsent).`,
      level: "success",
      agentName: "Human Operator",
      metadata: {
        agreementId,
        version: agreement.version,
        hash: agreement.contentHash,
      },
    });

    return updated;
  }

  async createRevision(
    agreementId: string,
    updates: {
      price?: number;
      paymentTerms?: string;
      timelineDuration?: string;
      scope?: string[];
      exclusions?: string[];
      notes?: string;
    }
  ): Promise<AgreementRecord> {
    const prev = await agreementRepository.getById(agreementId);
    if (!prev) throw new Error(`Agreement ${agreementId} not found.`);

    const newPrice = updates.price !== undefined ? updates.price : prev.pricing.amount;
    const newPaymentTerms = updates.paymentTerms || prev.paymentTerms;
    const newTimelineDuration = updates.timelineDuration || prev.timeline.duration;
    const newScope = updates.scope || prev.scope;
    const newExclusions = updates.exclusions || prev.exclusions;

    const baselineInput: LockBaselineInput = {
      proposalId: prev.proposalId,
      proposalVersion: prev.proposalVersion,
      currency: prev.pricing.currency,
      price: newPrice,
      paymentTerms: newPaymentTerms,
      timelineDuration: newTimelineDuration,
      includedScope: newScope,
      excludedScope: newExclusions,
      operatorNotes: updates.notes,
    };

    return this.draftAgreement(prev.opportunityId, baselineInput);
  }

  validateProtectedClauses(agreement: AgreementRecord): void {
    if (!agreement.limitations || !agreement.limitations.isProtected) {
      throw new Error("Security Violation: Limitation of Liability clause is missing or unprotected.");
    }
    if (!agreement.limitations.text || agreement.limitations.text.length < 20) {
      throw new Error("Security Violation: Limitation of Liability clause cannot be empty or waived.");
    }

    if (!agreement.ownershipTerms || !agreement.ownershipTerms.isProtected) {
      throw new Error("Security Violation: Intellectual Property & Ownership clause is unprotected.");
    }

    if (!agreement.governingLaw || !agreement.governingLaw.isProtected) {
      throw new Error("Security Violation: Governing Law clause is unprotected.");
    }
  }
}

export const agreementBuilderService = new AgreementBuilderService();