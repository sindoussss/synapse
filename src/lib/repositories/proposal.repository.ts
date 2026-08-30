import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ProposalStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "superseded";

export interface ProposalScopeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  isClientRequested: boolean;
  sourceRequirementId?: string;
  sourceMessageId?: string;
  sourceQuote?: string;
}

export interface ProposalTimeline {
  estimatedDuration: string;
  startAssumption: string;
  milestones: { name: string; week: string; deliverables: string }[];
  notes?: string;
}

export interface ProposalPricing {
  currency: string;
  basePrice: number;
  hasPrice: boolean;
  includedItems: string[];
  optionalAddons: { name: string; price: number; description: string }[];
  paymentTerms: string;
  pricingNotes: string;
}

export interface ProposalRecord {
  id: string;
  opportunityId: string;
  leadId: string;
  version: number;
  status: ProposalStatus;
  title: string;
  executiveSummary: string;
  clientNeeds: string[];
  scopeItems: ProposalScopeItem[];
  exclusions: string[];
  deliverables: string[];
  optionalEnhancements: { name: string; description: string; isInferred: boolean }[];
  assumptions: string[];
  timeline: ProposalTimeline;
  pricing: ProposalPricing;
  paymentTerms: string;
  nextSteps: string[];
  sourceGrounding: Record<string, any>;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface IProposalRepository {
  create(input: Omit<ProposalRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalRecord>;
  getById(id: string): Promise<ProposalRecord | null>;
  getByOpportunityId(opportunityId: string): Promise<ProposalRecord[]>;
  getByLeadId(leadId: string): Promise<ProposalRecord[]>;
  getAll(): Promise<ProposalRecord[]>;
  update(id: string, updates: Partial<ProposalRecord>): Promise<ProposalRecord>;
  updateStatus(id: string, status: ProposalStatus): Promise<ProposalRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".proposals_cache.json");

export class SupabaseProposalRepository implements IProposalRepository {
  private getLocalProposals(): ProposalRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalProposals(items: ProposalRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ProposalRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalRecord> {
    const nextId = `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ProposalRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalProposals();
    cached.unshift(record);
    this.saveLocalProposals(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        version: input.version || 1,
        status: input.status || "waiting_approval",
        title: input.title,
        executive_summary: input.executiveSummary,
        client_needs: input.clientNeeds || [],
        scope_items: input.scopeItems || [],
        exclusions: input.exclusions || [],
        deliverables: input.deliverables || [],
        optional_enhancements: input.optionalEnhancements || [],
        assumptions: input.assumptions || [],
        timeline: input.timeline || {},
        pricing: input.pricing || {},
        payment_terms: input.paymentTerms || "",
        next_steps: input.nextSteps || [],
        source_grounding: input.sourceGrounding || {},
        generated_by: input.generatedBy || "Sales Agent",
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("proposals").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseProposalRepository.create] Supabase insert warning, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ProposalRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposals").select("*").eq("id", id).single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalProposals().find((p) => p.id === id) || null;
  }

  async getByOpportunityId(opportunityId: string): Promise<ProposalRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("version", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalProposals().filter((p) => p.opportunityId === opportunityId);
  }

  async getByLeadId(leadId: string): Promise<ProposalRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("lead_id", leadId)
        .order("version", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalProposals().filter((p) => p.leadId === leadId);
  }

  async getAll(): Promise<ProposalRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposals").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalProposals();
  }

  async update(id: string, updates: Partial<ProposalRecord>): Promise<ProposalRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalProposals();
    const match = cached.find((p) => p.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalProposals(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.executiveSummary !== undefined) payload.executive_summary = updates.executiveSummary;
      if (updates.scopeItems !== undefined) payload.scope_items = updates.scopeItems;
      if (updates.exclusions !== undefined) payload.exclusions = updates.exclusions;
      if (updates.deliverables !== undefined) payload.deliverables = updates.deliverables;
      if (updates.optionalEnhancements !== undefined) payload.optional_enhancements = updates.optionalEnhancements;
      if (updates.assumptions !== undefined) payload.assumptions = updates.assumptions;
      if (updates.timeline !== undefined) payload.timeline = updates.timeline;
      if (updates.pricing !== undefined) payload.pricing = updates.pricing;
      if (updates.paymentTerms !== undefined) payload.payment_terms = updates.paymentTerms;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.rejectedAt !== undefined) payload.rejected_at = updates.rejectedAt;

      await supabase.from("proposals").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as ProposalRecord);
    if (!res) throw new Error(`Proposal record ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: ProposalStatus): Promise<ProposalRecord> {
    const now = new Date().toISOString();
    const updates: Partial<ProposalRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "rejected") updates.rejectedAt = now;
    return this.update(id, updates);
  }

  private mapFromDb(d: any): ProposalRecord {
    return {
      id: d.id,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      version: d.version || 1,
      status: d.status as ProposalStatus,
      title: d.title,
      executiveSummary: d.executive_summary || "",
      clientNeeds: d.client_needs || [],
      scopeItems: d.scope_items || [],
      exclusions: d.exclusions || [],
      deliverables: d.deliverables || [],
      optionalEnhancements: d.optional_enhancements || [],
      assumptions: d.assumptions || [],
      timeline: d.timeline || {
        estimatedDuration: "Timeline to be confirmed after final scope review.",
        startAssumption: "Within 5 business days of kickoff.",
        milestones: [],
      },
      pricing: d.pricing || {
        currency: "PHP",
        basePrice: 0,
        hasPrice: false,
        includedItems: [],
        optionalAddons: [],
        paymentTerms: "Operator pricing required.",
        pricingNotes: "Operator pricing required.",
      },
      paymentTerms: d.payment_terms || "",
      nextSteps: d.next_steps || [],
      sourceGrounding: d.source_grounding || {},
      generatedBy: d.generated_by || "Sales Agent",
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      approvedAt: d.approved_at,
      rejectedAt: d.rejected_at,
    };
  }
}

export const proposalRepository: IProposalRepository = new SupabaseProposalRepository();