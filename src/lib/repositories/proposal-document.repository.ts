import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ProposalDocumentStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "superseded";

export interface ProposalDocumentRecord {
  id: string;
  proposalId: string;
  opportunityId: string;
  leadId: string;
  proposalVersion: number;
  documentVersion: number;
  status: ProposalDocumentStatus;
  title: string;
  renderedHtml: string;
  pdfPathOrUrl: string;
  contentHash: string;
  generatedAt: string;
  approvedAt?: string | null;
  supersededAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProposalDocumentRepository {
  create(input: Omit<ProposalDocumentRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalDocumentRecord>;
  getById(id: string): Promise<ProposalDocumentRecord | null>;
  getByProposalId(proposalId: string): Promise<ProposalDocumentRecord[]>;
  getByOpportunityId(opportunityId: string): Promise<ProposalDocumentRecord[]>;
  getAll(): Promise<ProposalDocumentRecord[]>;
  update(id: string, updates: Partial<ProposalDocumentRecord>): Promise<ProposalDocumentRecord>;
  updateStatus(id: string, status: ProposalDocumentStatus): Promise<ProposalDocumentRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".proposal_documents_cache.json");

export class SupabaseProposalDocumentRepository implements IProposalDocumentRepository {
  private getLocalDocuments(): ProposalDocumentRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalDocuments(items: ProposalDocumentRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ProposalDocumentRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalDocumentRecord> {
    const nextId = `PDOC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ProposalDocumentRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalDocuments();
    cached.unshift(record);
    this.saveLocalDocuments(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        proposal_id: input.proposalId,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        proposal_version: input.proposalVersion || 1,
        document_version: input.documentVersion || 1,
        status: input.status || "waiting_approval",
        title: input.title,
        rendered_html: input.renderedHtml,
        pdf_path_or_url: input.pdfPathOrUrl,
        content_hash: input.contentHash,
        generated_at: input.generatedAt || now,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("proposal_documents").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseProposalDocumentRepository.create] Supabase insert warning, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ProposalDocumentRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposal_documents").select("*").eq("id", id).single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalDocuments().find((d) => d.id === id) || null;
  }

  async getByProposalId(proposalId: string): Promise<ProposalDocumentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposal_documents")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("document_version", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDocuments().filter((d) => d.proposalId === proposalId);
  }

  async getByOpportunityId(opportunityId: string): Promise<ProposalDocumentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposal_documents")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDocuments().filter((d) => d.opportunityId === opportunityId);
  }

  async getAll(): Promise<ProposalDocumentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposal_documents").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDocuments();
  }

  async update(id: string, updates: Partial<ProposalDocumentRecord>): Promise<ProposalDocumentRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalDocuments();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalDocuments(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.supersededAt !== undefined) payload.superseded_at = updates.supersededAt;
      if (updates.pdfPathOrUrl !== undefined) payload.pdf_path_or_url = updates.pdfPathOrUrl;
      if (updates.contentHash !== undefined) payload.content_hash = updates.contentHash;

      await supabase.from("proposal_documents").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as ProposalDocumentRecord);
    if (!res) throw new Error(`Proposal document ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: ProposalDocumentStatus): Promise<ProposalDocumentRecord> {
    const now = new Date().toISOString();
    const updates: Partial<ProposalDocumentRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "superseded") updates.supersededAt = now;
    return this.update(id, updates);
  }

  private mapFromDb(d: any): ProposalDocumentRecord {
    return {
      id: d.id,
      proposalId: d.proposal_id,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      proposalVersion: d.proposal_version || 1,
      documentVersion: d.document_version || 1,
      status: d.status as ProposalDocumentStatus,
      title: d.title,
      renderedHtml: d.rendered_html || "",
      pdfPathOrUrl: d.pdf_path_or_url || "",
      contentHash: d.content_hash || "",
      generatedAt: d.generated_at,
      approvedAt: d.approved_at,
      supersededAt: d.superseded_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }
}

export const proposalDocumentRepository: IProposalDocumentRepository = new SupabaseProposalDocumentRepository();