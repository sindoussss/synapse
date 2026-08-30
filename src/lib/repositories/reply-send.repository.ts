import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ReplySendStatus =
  | "pending_approval"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "rejected";

export interface ReplySendRecord {
  id: string;
  responseDraftId: string;
  replyAnalysisId?: string;
  emailMessageId?: string;
  leadId?: string;
  provider: string;
  providerThreadId?: string;
  inReplyToMessageId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: ReplySendStatus;
  providerMessageId?: string;
  requestedAt: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReplySendRepository {
  create(send: Omit<ReplySendRecord, "id" | "createdAt" | "updatedAt">): Promise<ReplySendRecord>;
  getById(id: string): Promise<ReplySendRecord | null>;
  getByDraftId(draftId: string): Promise<ReplySendRecord[]>;
  getByLeadId(leadId: string): Promise<ReplySendRecord[]>;
  getAll(): Promise<ReplySendRecord[]>;
  update(id: string, updates: Partial<ReplySendRecord>): Promise<ReplySendRecord>;
  updateStatus(id: string, status: ReplySendStatus, timestamp?: string): Promise<ReplySendRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".reply_sends_cache.json");

export class SupabaseReplySendRepository implements IReplySendRepository {
  private getLocalSends(): ReplySendRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalSends(items: ReplySendRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ReplySendRecord, "id" | "createdAt" | "updatedAt">): Promise<ReplySendRecord> {
    const nextId = `RSEND-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ReplySendRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalSends();
    cached.unshift(record);
    this.saveLocalSends(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        response_draft_id: input.responseDraftId,
        reply_analysis_id: input.replyAnalysisId || null,
        email_message_id: input.emailMessageId || null,
        lead_id: input.leadId || null,
        provider: input.provider || "gmail",
        provider_thread_id: input.providerThreadId || null,
        in_reply_to_message_id: input.inReplyToMessageId,
        sender: input.sender,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        status: input.status || "pending_approval",
        requested_at: input.requestedAt || now,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("reply_sends").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseReplySendRepository.create] Supabase table not ready, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ReplySendRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("reply_sends").select("*").eq("id", id).single();
      if (!error && data) {
        return {
          id: data.id,
          responseDraftId: data.response_draft_id,
          replyAnalysisId: data.reply_analysis_id || undefined,
          emailMessageId: data.email_message_id || undefined,
          leadId: data.lead_id || undefined,
          provider: data.provider,
          providerThreadId: data.provider_thread_id || undefined,
          inReplyToMessageId: data.in_reply_to_message_id,
          sender: data.sender,
          recipient: data.recipient,
          subject: data.subject,
          body: data.body,
          status: data.status as ReplySendStatus,
          providerMessageId: data.provider_message_id || undefined,
          requestedAt: data.requested_at,
          approvedAt: data.approved_at,
          sentAt: data.sent_at,
          failedAt: data.failed_at,
          error: data.error,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }
    return this.getLocalSends().find((s) => s.id === id) || null;
  }

  async getByDraftId(draftId: string): Promise<ReplySendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("reply_sends")
        .select("*")
        .eq("response_draft_id", draftId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          responseDraftId: d.response_draft_id,
          replyAnalysisId: d.reply_analysis_id || undefined,
          emailMessageId: d.email_message_id || undefined,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          providerThreadId: d.provider_thread_id || undefined,
          inReplyToMessageId: d.in_reply_to_message_id,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as ReplySendStatus,
          providerMessageId: d.provider_message_id || undefined,
          requestedAt: d.requested_at,
          approvedAt: d.approved_at,
          sentAt: d.sent_at,
          failedAt: d.failed_at,
          error: d.error,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }
    return this.getLocalSends().filter((s) => s.responseDraftId === draftId);
  }

  async getByLeadId(leadId: string): Promise<ReplySendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("reply_sends")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          responseDraftId: d.response_draft_id,
          replyAnalysisId: d.reply_analysis_id || undefined,
          emailMessageId: d.email_message_id || undefined,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          providerThreadId: d.provider_thread_id || undefined,
          inReplyToMessageId: d.in_reply_to_message_id,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as ReplySendStatus,
          providerMessageId: d.provider_message_id || undefined,
          requestedAt: d.requested_at,
          approvedAt: d.approved_at,
          sentAt: d.sent_at,
          failedAt: d.failed_at,
          error: d.error,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }
    return this.getLocalSends().filter((s) => s.leadId === leadId);
  }

  async getAll(): Promise<ReplySendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("reply_sends").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          responseDraftId: d.response_draft_id,
          replyAnalysisId: d.reply_analysis_id || undefined,
          emailMessageId: d.email_message_id || undefined,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          providerThreadId: d.provider_thread_id || undefined,
          inReplyToMessageId: d.in_reply_to_message_id,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as ReplySendStatus,
          providerMessageId: d.provider_message_id || undefined,
          requestedAt: d.requested_at,
          approvedAt: d.approved_at,
          sentAt: d.sent_at,
          failedAt: d.failed_at,
          error: d.error,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }
    return this.getLocalSends();
  }

  async update(id: string, updates: Partial<ReplySendRecord>): Promise<ReplySendRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalSends();
    const match = cached.find((s) => s.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalSends(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.sentAt !== undefined) payload.sent_at = updates.sentAt;
      if (updates.failedAt !== undefined) payload.failed_at = updates.failedAt;
      if (updates.providerMessageId !== undefined) payload.provider_message_id = updates.providerMessageId;
      if (updates.error !== undefined) payload.error = updates.error;
      await supabase.from("reply_sends").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as ReplySendRecord);
    if (!res) throw new Error(`Reply send record ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: ReplySendStatus, timestamp?: string): Promise<ReplySendRecord> {
    const now = timestamp || new Date().toISOString();
    const updates: Partial<ReplySendRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "sent") updates.sentAt = now;
    if (status === "failed") updates.failedAt = now;
    return this.update(id, updates);
  }
}

export const replySendRepository: IReplySendRepository = new SupabaseReplySendRepository();