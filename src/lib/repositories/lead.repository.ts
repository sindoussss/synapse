import { Lead, LeadStatus, LeadCreateInput } from "@/data/types";
import { MOCK_LEADS } from "@/data/leads";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface ILeadRepository {
  getAll(): Promise<Lead[]>;
  getById(id: string): Promise<Lead | null>;
  create(input: LeadCreateInput): Promise<Lead>;
  createMany(inputs: LeadCreateInput[]): Promise<{ created: Lead[]; skippedCount: number }>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead>;
}

export function normalizeDomain(urlOrDomain: string): string {
  return urlOrDomain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

const STORAGE_KEY = "synapse_ops_leads_v2";

export class SupabaseLeadRepository implements ILeadRepository {
  private getLocalLeads(): Lead[] {
    if (typeof window === "undefined") return [...MOCK_LEADS];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_LEADS));
        return [...MOCK_LEADS];
      }
      return JSON.parse(data);
    } catch {
      return [...MOCK_LEADS];
    }
  }

  private saveLocalLeads(leads: Lead[]): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
      } catch {}
    }
  }

  private mapRowToLead(row: any): Lead {
    const mock = MOCK_LEADS.find(l => l.id === row.id);
    return {
      id: row.id,
      company: row.company_name,
      website: row.website,
      industry: row.industry,
      websiteScore: row.website_score ?? 50,
      opportunityScore: row.opportunity_score ?? 85,
      status: (row.status || "Discovered") as LeadStatus,
      detectedIssues: row.notes ? row.notes.split(", ") : (mock ? mock.detectedIssues : ["Lead discovery via Research Agent"]),
      contactEmail: (row.notes && row.notes.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/))
        ? row.notes.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)[1]
        : (row.contact_email || (mock ? mock.contactEmail : undefined)),
      estimatedDealValue: mock ? mock.estimatedDealValue : "$5,000",
      discoveredAt: row.created_at,
      techStack: mock ? mock.techStack : undefined,
      location: row.notes?.includes("Location:") ? row.notes.split("Location:")[1].split("|")[0].trim() : (row.location || "Philippines"),
      sourceUrl: row.website,
      sourceType: "web_search",
      discoveredByAgentId: "agent-research"
    };
  }

  async getAll(): Promise<Lead[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalLeads();
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return this.getLocalLeads();
    }
    return (data as any[]).map(this.mapRowToLead);
  }

  async getById(id: string): Promise<Lead | null> {
    if (!isSupabaseConfigured()) {
      return this.getLocalLeads().find(l => l.id === id) || null;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
    if (error || !data) return null;
    return this.mapRowToLead(data);
  }

  async create(input: LeadCreateInput): Promise<Lead> {
    const existing = await this.getAll();
    const targetDomain = normalizeDomain(input.website);

    const duplicate = existing.find(l => normalizeDomain(l.website) === targetDomain);
    if (duplicate) {
      return duplicate;
    }

    const nextId = `LEAD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const notesWithLocation = input.location
      ? `Location: ${input.location} | ${input.notes || "Discovered by Research Agent"}`
      : (input.notes || "Discovered by Research Agent");

    if (!isSupabaseConfigured()) {
      const newLead: Lead = {
        id: nextId,
        company: input.company.trim(),
        website: input.website.trim(),
        industry: input.industry.trim(),
        websiteScore: input.websiteScore ?? Math.floor(35 + Math.random() * 25),
        opportunityScore: input.opportunityScore ?? Math.floor(80 + Math.random() * 15),
        status: input.status || "Discovered",
        detectedIssues: input.detectedIssues || [notesWithLocation],
        estimatedDealValue: "$6,500",
        discoveredAt: now,
        location: input.location || "Philippines",
        sourceUrl: input.sourceUrl || input.website,
        sourceType: "web_search",
        discoveredByAgentId: "agent-research"
      };
      const list = [newLead, ...this.getLocalLeads()];
      this.saveLocalLeads(list);
      return newLead;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      company_name: input.company.trim(),
      website: input.website.trim(),
      industry: input.industry.trim(),
      website_score: input.websiteScore ?? Math.floor(35 + Math.random() * 25),
      opportunity_score: input.opportunityScore ?? Math.floor(80 + Math.random() * 15),
      status: input.status || "Discovered",
      notes: notesWithLocation,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseLeadRepository.create] error:", error);
      const fallback: Lead = {
        id: nextId,
        company: input.company.trim(),
        website: input.website.trim(),
        industry: input.industry.trim(),
        websiteScore: 45,
        opportunityScore: 88,
        status: "Discovered",
        detectedIssues: [notesWithLocation],
        estimatedDealValue: "$6,500",
        discoveredAt: now,
        location: input.location || "Philippines"
      };
      return fallback;
    }

    return this.mapRowToLead(data);
  }

  async createMany(inputs: LeadCreateInput[]): Promise<{ created: Lead[]; skippedCount: number }> {
    const existing = await this.getAll();
    const existingDomains = new Set(existing.map(l => normalizeDomain(l.website)));

    const created: Lead[] = [];
    let skippedCount = 0;

    for (const input of inputs) {
      const domain = normalizeDomain(input.website);
      if (existingDomains.has(domain)) {
        skippedCount++;
        continue;
      }
      existingDomains.add(domain);
      const newLead = await this.create(input);
      created.push(newLead);
    }

    return { created, skippedCount };
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    if (!isSupabaseConfigured()) {
      const list = this.getLocalLeads();
      const match = list.find(l => l.id === id);
      if (!match) throw new Error(`Lead ${id} not found`);
      match.status = status;
      this.saveLocalLeads(list);
      return match;
    }

    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseLeadRepository.updateStatus] error:", error);
      const list = this.getLocalLeads();
      const match = list.find(l => l.id === id)!;
      match.status = status;
      this.saveLocalLeads(list);
      return match;
    }
    return this.mapRowToLead(data);
  }
}

export const leadRepository: ILeadRepository = new SupabaseLeadRepository();