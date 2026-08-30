import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type AgreementStatus =
  | "draft"
  | "waiting_operator_review"
  | "approved_for_delivery"
  | "signing_requested"
  | "signed"
  | "executed"
  | "rejected"
  | "superseded";

export interface LegalTemplateSection {
  id: string;
  name: string;
  category: "commercial" | "scope" | "protected_legal" | "operational";
  isProtected: boolean;
  content: string;
}

export interface AgreementTemplateRecord {
  id: string;
  name: string;
  agreementType: string;
  version: number;
  jurisdiction: string;
  templateSections: LegalTemplateSection[];
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementParties {
  client: {
    companyName: string;
    contactName?: string;
    contactEmail?: string;
    legalAddress?: string;
    isIdentityComplete: boolean;
  };
  serviceProvider: {
    businessName: string;
    representativeName: string;
    representativeTitle: string;
    address: string;
    jurisdiction: string;
  };
}

export interface CommercialBaseline {
  proposalId: string;
  proposalVersion: number;
  currency: string;
  price: number;
  paymentTerms: string;
  timelineDuration: string;
  includedScopeCount: number;
  excludedScopeCount: number;
  lockedAt: string;
  confirmedBy: string;
}

export interface AgreementRecord {
  id: string;
  opportunityId: string;
  leadId: string;
  proposalId: string;
  proposalVersion: number;
  negotiationSessionId?: string;
  version: number;
  status: AgreementStatus;
  agreementType: string;
  title: string;
  parties: AgreementParties;
  commercialBaseline: CommercialBaseline;
  scope: string[];
  exclusions: string[];
  deliverables: string[];
  timeline: {
    duration: string;
    milestones: { name: string; week: string; deliverables: string }[];
  };
  pricing: {
    currency: string;
    amount: number;
    paymentStructure: string;
  };
  paymentTerms: string;
  clientResponsibilities: string[];
  operatorResponsibilities: string[];
  revisionPolicy: {
    text: string;
    isProtected: boolean;
  };
  terminationTerms: {
    text: string;
    isProtected: boolean;
  };
  ownershipTerms: {
    text: string;
    isProtected: boolean;
  };
  confidentialityTerms: {
    text: string;
    isProtected: boolean;
  };
  warranties: {
    text: string;
    isProtected: boolean;
  };
  limitations: {
    text: string;
    isProtected: boolean;
  };
  disputeTerms: {
    text: string;
    isProtected: boolean;
  };
  governingLaw: {
    text: string;
    jurisdiction: string;
    isProtected: boolean;
  };
  signatureBlocks: {
    client: { title: string; placeholder: string };
    provider: { title: string; representative: string };
  };
  legalReviewRequired: boolean;
  contentHash: string;
  approvedAt?: string | null;
  supersededAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAgreementRepository {
  create(input: Omit<AgreementRecord, "id" | "createdAt" | "updatedAt">): Promise<AgreementRecord>;
  getById(id: string): Promise<AgreementRecord | null>;
  getByOpportunityId(opportunityId: string): Promise<AgreementRecord[]>;
  getAll(): Promise<AgreementRecord[]>;
  update(id: string, updates: Partial<AgreementRecord>): Promise<AgreementRecord>;
  updateStatus(id: string, status: AgreementStatus): Promise<AgreementRecord>;
  getTemplates(): Promise<AgreementTemplateRecord[]>;
  getTemplateById(templateId: string): Promise<AgreementTemplateRecord | null>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".agreements_cache.json");
const TEMPLATES_FILE = path.resolve(process.cwd(), ".agreement_templates_cache.json");

export const DEFAULT_LEGAL_TEMPLATE: AgreementTemplateRecord = {
  id: "TMPL-WEB-DEV-001",
  name: "Standard Web Modernization & Development Agreement",
  agreementType: "web_development_service_agreement",
  version: 1,
  jurisdiction: "Philippines",
  approved: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateSections: [
    {
      id: "sec_ip",
      name: "Intellectual Property & Ownership",
      category: "protected_legal",
      isProtected: true,
      content:
        "Upon full and final settlement of all agreed project fees, Service Provider transfers all custom intellectual property and source code developed exclusively for Client. Pre-existing proprietary modules, libraries, and open-source assets remain subject to their respective licenses.",
    },
    {
      id: "sec_confidentiality",
      name: "Confidentiality",
      category: "protected_legal",
      isProtected: true,
      content:
        "Each party agrees to preserve the confidentiality of all proprietary commercial, technical, and operational data received during the project engagement, disclosing information solely to authorized personnel with a direct need to know.",
    },
    {
      id: "sec_warranties",
      name: "Warranties & Disclaimers",
      category: "protected_legal",
      isProtected: true,
      content:
        "Service Provider warrants that deliverables will perform substantially in accordance with agreed scope specifications for a period of thirty (30) days following final handover. EXCEPT AS EXPRESSLY STATED, ALL DELIVERABLES ARE PROVIDED ON AN 'AS IS' BASIS WITHOUT UNSTATED OR IMPLIED WARRANTIES.",
    },
    {
      id: "sec_liability",
      name: "Limitation of Liability",
      category: "protected_legal",
      isProtected: true,
      content:
        "IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. TOTAL AGGREGATE LIABILITY ARISING FROM OR RELATING TO THIS AGREEMENT SHALL BE STRICTLY CAPPED AT THE TOTAL PROFESSIONAL FEES ACTUALLY PAID UNDER THIS AGREEMENT.",
    },
    {
      id: "sec_termination",
      name: "Termination",
      category: "protected_legal",
      isProtected: true,
      content:
        "Either party may terminate this Agreement upon fourteen (14) days written notice in the event of material breach remaining uncured. Upon termination, Client shall pay for all verified milestones completed up to the effective termination date.",
    },
    {
      id: "sec_governing_law",
      name: "Governing Law & Jurisdiction",
      category: "protected_legal",
      isProtected: true,
      content:
        "This Agreement shall be construed and governed in accordance with the substantive laws of the Republic of the Philippines. Any unresolved disputes arising hereunder shall be submitted to the exclusive jurisdiction of the competent courts in the agreed commercial venue.",
    },
  ],
};

export class SupabaseAgreementRepository implements IAgreementRepository {
  private getLocalAgreements(): AgreementRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalAgreements(items: AgreementRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async getTemplates(): Promise<AgreementTemplateRecord[]> {
    if (fs.existsSync(TEMPLATES_FILE)) {
      try {
        const raw = fs.readFileSync(TEMPLATES_FILE, "utf8");
        return JSON.parse(raw);
      } catch {}
    }
    const defaultList = [DEFAULT_LEGAL_TEMPLATE];
    try {
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(defaultList, null, 2), "utf8");
    } catch {}
    return defaultList;
  }

  async getTemplateById(templateId: string): Promise<AgreementTemplateRecord | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === templateId) || null;
  }

  async create(input: Omit<AgreementRecord, "id" | "createdAt" | "updatedAt">): Promise<AgreementRecord> {
    const nextId = `AGR-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: AgreementRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalAgreements();
    cached.unshift(record);
    this.saveLocalAgreements(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        proposal_id: input.proposalId,
        proposal_version: input.proposalVersion || 1,
        negotiation_session_id: input.negotiationSessionId,
        version: input.version || 1,
        status: input.status || "waiting_operator_review",
        agreement_type: input.agreementType || "web_development_service_agreement",
        title: input.title,
        parties: input.parties,
        commercial_baseline: input.commercialBaseline,
        scope: input.scope,
        exclusions: input.exclusions,
        deliverables: input.deliverables,
        timeline: input.timeline,
        pricing: input.pricing,
        payment_terms: input.paymentTerms,
        client_responsibilities: input.clientResponsibilities,
        operator_responsibilities: input.operatorResponsibilities,
        revision_policy: input.revisionPolicy,
        termination_terms: input.terminationTerms,
        ownership_terms: input.ownershipTerms,
        confidentiality_terms: input.confidentialityTerms,
        warranties: input.warranties,
        limitations: input.limitations,
        dispute_terms: input.disputeTerms,
        governing_law: input.governingLaw,
        signature_blocks: input.signatureBlocks,
        legal_review_required: input.legalReviewRequired !== undefined ? input.legalReviewRequired : true,
        content_hash: input.contentHash,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("agreements").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseAgreementRepository.create] Supabase insert warning, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<AgreementRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("agreements").select("*").eq("id", id).single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalAgreements().find((a) => a.id === id) || null;
  }

  async getByOpportunityId(opportunityId: string): Promise<AgreementRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("agreements")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("version", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalAgreements().filter((a) => a.opportunityId === opportunityId);
  }

  async getAll(): Promise<AgreementRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("agreements").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalAgreements();
  }

  async update(id: string, updates: Partial<AgreementRecord>): Promise<AgreementRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalAgreements();
    const match = cached.find((a) => a.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalAgreements(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.supersededAt !== undefined) payload.superseded_at = updates.supersededAt;
      if (updates.contentHash !== undefined) payload.content_hash = updates.contentHash;
      if (updates.paymentTerms !== undefined) payload.payment_terms = updates.paymentTerms;

      await supabase.from("agreements").update(payload).eq("id", id);
    }

    const res = await this.getById(id);
    if (!res) throw new Error(`Agreement ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: AgreementStatus): Promise<AgreementRecord> {
    const now = new Date().toISOString();
    const updates: Partial<AgreementRecord> = { status };
    if (status === "approved_for_delivery") updates.approvedAt = now;
    if (status === "superseded") updates.supersededAt = now;
    return this.update(id, updates);
  }

  private mapFromDb(d: any): AgreementRecord {
    return {
      id: d.id,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      proposalId: d.proposal_id,
      proposalVersion: d.proposal_version || 1,
      negotiationSessionId: d.negotiation_session_id,
      version: d.version || 1,
      status: d.status as AgreementStatus,
      agreementType: d.agreement_type || "web_development_service_agreement",
      title: d.title,
      parties: d.parties,
      commercialBaseline: d.commercial_baseline,
      scope: d.scope || [],
      exclusions: d.exclusions || [],
      deliverables: d.deliverables || [],
      timeline: d.timeline || {},
      pricing: d.pricing || {},
      paymentTerms: d.payment_terms || "",
      clientResponsibilities: d.client_responsibilities || [],
      operatorResponsibilities: d.operator_responsibilities || [],
      revisionPolicy: d.revision_policy || {},
      terminationTerms: d.termination_terms || {},
      ownershipTerms: d.ownership_terms || {},
      confidentialityTerms: d.confidentiality_terms || {},
      warranties: d.warranties || {},
      limitations: d.limitations || {},
      disputeTerms: d.dispute_terms || {},
      governingLaw: d.governing_law || {},
      signatureBlocks: d.signature_blocks || {},
      legalReviewRequired: d.legal_review_required !== undefined ? d.legalReviewRequired : true,
      contentHash: d.content_hash || "",
      approvedAt: d.approved_at,
      supersededAt: d.superseded_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }
}

export const agreementRepository: IAgreementRepository = new SupabaseAgreementRepository();