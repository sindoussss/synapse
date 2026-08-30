import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { EmailSendStatus } from "../email/types";

export interface EmailSendRecord {
  id: string;
  outreachDraftId: string;
  leadId?: string;
  provider: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailSendStatus;
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

export interface IEmailSendRepository {
  create(send: Omit<EmailSendRecord, "id" | "createdAt" | "updatedAt">): Promise<EmailSendRecord>;
  getById(id: string): Promise<EmailSendRecord | null>;
  getByDraftId(draftId: string): Promise<EmailSendRecord[]>;
  getByLeadId(leadId: string): Promise<EmailSendRecord[]>;
  getAll(): Promise<EmailSendRecord[]>;
  update(id: string, updates: Partial<EmailSendRecord>): Promise<EmailSendRecord>;
  updateStatus(id: string, status: EmailSendStatus, timestamp?: string): Promise<EmailSendRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".email_sends_cache.json");

export class SupabaseEmailSendRepository implements IEmailSendRepository {
  private getLocalSends(): EmailSendRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalSends(items: EmailSendRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<EmailSendRecord, "id" | "createdAt" | "updatedAt">): Promise<EmailSendRecord> {
    const nextId = `SEND-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: EmailSendRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalSends();
    cached.unshift(record);
    this.saveLocalSends(cached);

    if (!isSupabaseConfigured()) {
      return record;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      outreach_draft_id: input.outreachDraftId,
      lead_id: input.leadId || null,
      provider: input.provider,
      sender: input.sender,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      status: input.status,
      requested_at: input.requestedAt || now,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("email_sends").insert(insertPayload);
    if (error) {
      console.warn("[SupabaseEmailSendRepository.create] Supabase table not ready, saved in cache:", error.message);
    }

    return record;
  }

  async getById(id: string): Promise<EmailSendRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          outreachDraftId: data.outreach_draft_id,
          leadId: data.lead_id || undefined,
          provider: data.provider,
          sender: data.sender,
          recipient: data.recipient,
          subject: data.subject,
          body: data.body,
          status: data.status as EmailSendStatus,
          providerMessageId: data.provider_message_id || undefined,
          providerThreadId: data.provider_thread_id || undefined,
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

    return this.getLocalSends().find((d) => d.id === id) || null;
  }

  async getByDraftId(draftId: string): Promise<EmailSendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("outreach_draft_id", draftId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          outreachDraftId: d.outreach_draft_id,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as EmailSendStatus,
          providerMessageId: d.provider_message_id || undefined,
          providerThreadId: d.provider_thread_id || undefined,
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

    return this.getLocalSends().filter((d) => d.outreachDraftId === draftId);
  }

  async getByLeadId(leadId: string): Promise<EmailSendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          outreachDraftId: d.outreach_draft_id,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as EmailSendStatus,
          providerMessageId: d.provider_message_id || undefined,
          providerThreadId: d.provider_thread_id || undefined,
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

    return this.getLocalSends().filter((d) => d.leadId === leadId);
  }

  async getAll(): Promise<EmailSendRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          outreachDraftId: d.outreach_draft_id,
          leadId: d.lead_id || undefined,
          provider: d.provider,
          sender: d.sender,
          recipient: d.recipient,
          subject: d.subject,
          body: d.body,
          status: d.status as EmailSendStatus,
          providerMessageId: d.provider_message_id || undefined,
          providerThreadId: d.provider_thread_id || undefined,
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

  async update(id: string, updates: Partial<EmailSendRecord>): Promise<EmailSendRecord> {
    const now = new Date().toISOString();

    const cached = this.getLocalSends();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalSends(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = {
        updated_at: now,
      };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.sentAt !== undefined) payload.sent_at = updates.sentAt;
      if (updates.failedAt !== undefined) payload.failed_at = updates.failedAt;
      if (updates.providerMessageId !== undefined) payload.provider_message_id = updates.providerMessageId;
      if (updates.providerThreadId !== undefined) payload.provider_thread_id = updates.providerThreadId;
      if (updates.error !== undefined) payload.error = updates.error;

      await supabase.from("email_sends").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as EmailSendRecord);
    if (!res) throw new Error(`Email send record ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: EmailSendStatus, timestamp?: string): Promise<EmailSendRecord> {
    const now = timestamp || new Date().toISOString();
    const updates: Partial<EmailSendRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "sent") updates.sentAt = now;
    if (status === "failed") updates.failedAt = now;
    return this.update(id, updates);
  }
}

export const emailSendRepository: IEmailSendRepository = new SupabaseEmailSendRepository();