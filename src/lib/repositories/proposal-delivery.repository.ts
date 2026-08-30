import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ProposalDeliveryStatus =
  | "pending_approval"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "rejected";

export interface ProposalDeliveryRecord {
  id: string;
  proposalDocumentId: string;
  proposalId: string;
  opportunityId: string;
  leadId: string;
  provider: string;
  recipient: string;
  subject: string;
  body: string;
  attachmentReference: string;
  status: ProposalDeliveryStatus;
  providerMessageId?: string;
  providerThreadId?: string;
  requestedAt: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProposalDeliveryRepository {
  create(input: Omit<ProposalDeliveryRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalDeliveryRecord>;
  getById(id: string): Promise<ProposalDeliveryRecord | null>;
  getByDocumentId(documentId: string): Promise<ProposalDeliveryRecord[]>;
  getByOpportunityId(opportunityId: string): Promise<ProposalDeliveryRecord[]>;
  getAll(): Promise<ProposalDeliveryRecord[]>;
  update(id: string, updates: Partial<ProposalDeliveryRecord>): Promise<ProposalDeliveryRecord>;
  updateStatus(id: string, status: ProposalDeliveryStatus): Promise<ProposalDeliveryRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".proposal_deliveries_cache.json");

export class SupabaseProposalDeliveryRepository implements IProposalDeliveryRepository {
  private getLocalDeliveries(): ProposalDeliveryRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalDeliveries(items: ProposalDeliveryRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ProposalDeliveryRecord, "id" | "createdAt" | "updatedAt">): Promise<ProposalDeliveryRecord> {
    const nextId = `PDEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ProposalDeliveryRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalDeliveries();
    cached.unshift(record);
    this.saveLocalDeliveries(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        proposal_document_id: input.proposalDocumentId,
        proposal_id: input.proposalId,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        provider: input.provider || "gmail",
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        attachment_reference: input.attachmentReference,
        status: input.status || "pending_approval",
        requested_at: input.requestedAt || now,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("proposal_deliveries").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseProposalDeliveryRepository.create] Supabase insert warning, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ProposalDeliveryRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposal_deliveries").select("*").eq("id", id).single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalDeliveries().find((d) => d.id === id) || null;
  }

  async getByDocumentId(documentId: string): Promise<ProposalDeliveryRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposal_deliveries")
        .select("*")
        .eq("proposal_document_id", documentId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDeliveries().filter((d) => d.proposalDocumentId === documentId);
  }

  async getByOpportunityId(opportunityId: string): Promise<ProposalDeliveryRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("proposal_deliveries")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDeliveries().filter((d) => d.opportunityId === opportunityId);
  }

  async getAll(): Promise<ProposalDeliveryRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("proposal_deliveries").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalDeliveries();
  }

  async update(id: string, updates: Partial<ProposalDeliveryRecord>): Promise<ProposalDeliveryRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalDeliveries();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalDeliveries(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.sentAt !== undefined) payload.sent_at = updates.sentAt;
      if (updates.failedAt !== undefined) payload.failed_at = updates.failedAt;
      if (updates.providerMessageId !== undefined) payload.provider_message_id = updates.providerMessageId;
      if (updates.providerThreadId !== undefined) payload.provider_thread_id = updates.providerThreadId;
      if (updates.error !== undefined) payload.error = updates.error;

      await supabase.from("proposal_deliveries").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as ProposalDeliveryRecord);
    if (!res) throw new Error(`Proposal delivery ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: ProposalDeliveryStatus): Promise<ProposalDeliveryRecord> {
    const now = new Date().toISOString();
    const updates: Partial<ProposalDeliveryRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "sent") updates.sentAt = now;
    if (status === "failed") updates.failedAt = now;
    return this.update(id, updates);
  }

  private mapFromDb(d: any): ProposalDeliveryRecord {
    return {
      id: d.id,
      proposalDocumentId: d.proposal_document_id,
      proposalId: d.proposal_id,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      provider: d.provider || "gmail",
      recipient: d.recipient,
      subject: d.subject,
      body: d.body,
      attachmentReference: d.attachment_reference,
      status: d.status as ProposalDeliveryStatus,
      providerMessageId: d.provider_message_id || undefined,
      providerThreadId: d.provider_thread_id || undefined,
      requestedAt: d.requested_at,
      approvedAt: d.approved_at,
      sentAt: d.sent_at,
      failedAt: d.failed_at,
      error: d.error,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }
}

export const proposalDeliveryRepository: IProposalDeliveryRepository = new SupabaseProposalDeliveryRepository();