import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface EmailMessageRecord {
  id: string;
  leadId?: string;
  emailSendId?: string;
  outreachDraftId?: string;
  provider: string;
  providerMessageId?: string;
  providerThreadId?: string;
  inReplyTo?: string;
  direction: "outbound" | "inbound";
  sender: string;
  recipient: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  hasAttachments?: boolean;
  receivedAt: string;
  createdAt: string;
}

export interface IEmailMessageRepository {
  create(msg: Omit<EmailMessageRecord, "id" | "createdAt">): Promise<EmailMessageRecord>;
  getById(id: string): Promise<EmailMessageRecord | null>;
  getByProviderMessageId(providerMessageId: string): Promise<EmailMessageRecord | null>;
  getByLeadId(leadId: string): Promise<EmailMessageRecord[]>;
  getByEmailSendId(emailSendId: string): Promise<EmailMessageRecord[]>;
  getAll(): Promise<EmailMessageRecord[]>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".email_messages_cache.json");

export class SupabaseEmailMessageRepository implements IEmailMessageRepository {
  private getLocalMessages(): EmailMessageRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalMessages(items: EmailMessageRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<EmailMessageRecord, "id" | "createdAt">): Promise<EmailMessageRecord> {
    const nextId = `MSG-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: EmailMessageRecord = {
      ...input,
      id: nextId,
      createdAt: now,
    };

    const cached = this.getLocalMessages();
    cached.unshift(record);
    this.saveLocalMessages(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        lead_id: input.leadId || null,
        email_send_id: input.emailSendId || null,
        outreach_draft_id: input.outreachDraftId || null,
        provider: input.provider || "gmail",
        provider_message_id: input.providerMessageId || null,
        provider_thread_id: input.providerThreadId || null,
        in_reply_to: input.inReplyTo || null,
        direction: input.direction,
        sender: input.sender,
        recipient: input.recipient,
        subject: input.subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml || null,
        has_attachments: !!input.hasAttachments,
        received_at: input.receivedAt || now,
        created_at: now,
      };

      const { error } = await supabase.from("email_messages").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseEmailMessageRepository.create] Supabase table not ready, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<EmailMessageRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("email_messages").select("*").eq("id", id).single();
      if (!error && data) {
        return {
          id: data.id,
          leadId: data.lead_id || undefined,
          emailSendId: data.email_send_id || undefined,
          outreachDraftId: data.outreach_draft_id || undefined,
          provider: data.provider,
          providerMessageId: data.provider_message_id || undefined,
          providerThreadId: data.provider_thread_id || undefined,
          inReplyTo: data.in_reply_to || undefined,
          direction: data.direction as "outbound" | "inbound",
          sender: data.sender,
          recipient: data.recipient,
          subject: data.subject,
          bodyText: data.body_text,
          bodyHtml: data.body_html || undefined,
          hasAttachments: data.has_attachments,
          receivedAt: data.received_at,
          createdAt: data.created_at,
        };
      }
    }
    return this.getLocalMessages().find((m) => m.id === id) || null;
  }

  async getByProviderMessageId(providerMessageId: string): Promise<EmailMessageRecord | null> {
    if (!providerMessageId) return null;
    const cleanId = providerMessageId.trim();

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("provider_message_id", cleanId)
        .limit(1);

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          leadId: item.lead_id || undefined,
          emailSendId: item.email_send_id || undefined,
          outreachDraftId: item.outreach_draft_id || undefined,
          provider: item.provider,
          providerMessageId: item.provider_message_id || undefined,
          providerThreadId: item.provider_thread_id || undefined,
          inReplyTo: item.in_reply_to || undefined,
          direction: item.direction as "outbound" | "inbound",
          sender: item.sender,
          recipient: item.recipient,
          subject: item.subject,
          bodyText: item.body_text,
          bodyHtml: item.body_html || undefined,
          hasAttachments: item.has_attachments,
          receivedAt: item.received_at,
          createdAt: item.created_at,
        };
      }
    }

    return this.getLocalMessages().find((m) => m.providerMessageId?.trim() === cleanId) || null;
  }

  async getByLeadId(leadId: string): Promise<EmailMessageRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("lead_id", leadId)
        .order("received_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          leadId: item.lead_id || undefined,
          emailSendId: item.email_send_id || undefined,
          outreachDraftId: item.outreach_draft_id || undefined,
          provider: item.provider,
          providerMessageId: item.provider_message_id || undefined,
          providerThreadId: item.provider_thread_id || undefined,
          inReplyTo: item.in_reply_to || undefined,
          direction: item.direction as "outbound" | "inbound",
          sender: item.sender,
          recipient: item.recipient,
          subject: item.subject,
          bodyText: item.body_text,
          bodyHtml: item.body_html || undefined,
          hasAttachments: item.has_attachments,
          receivedAt: item.received_at,
          createdAt: item.created_at,
        }));
      }
    }
    return this.getLocalMessages().filter((m) => m.leadId === leadId);
  }

  async getByEmailSendId(emailSendId: string): Promise<EmailMessageRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("email_send_id", emailSendId)
        .order("received_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          leadId: item.lead_id || undefined,
          emailSendId: item.email_send_id || undefined,
          outreachDraftId: item.outreach_draft_id || undefined,
          provider: item.provider,
          providerMessageId: item.provider_message_id || undefined,
          providerThreadId: item.provider_thread_id || undefined,
          inReplyTo: item.in_reply_to || undefined,
          direction: item.direction as "outbound" | "inbound",
          sender: item.sender,
          recipient: item.recipient,
          subject: item.subject,
          bodyText: item.body_text,
          bodyHtml: item.body_html || undefined,
          hasAttachments: item.has_attachments,
          receivedAt: item.received_at,
          createdAt: item.created_at,
        }));
      }
    }
    return this.getLocalMessages().filter((m) => m.emailSendId === emailSendId);
  }

  async getAll(): Promise<EmailMessageRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .order("received_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          leadId: item.lead_id || undefined,
          emailSendId: item.email_send_id || undefined,
          outreachDraftId: item.outreach_draft_id || undefined,
          provider: item.provider,
          providerMessageId: item.provider_message_id || undefined,
          providerThreadId: item.provider_thread_id || undefined,
          inReplyTo: item.in_reply_to || undefined,
          direction: item.direction as "outbound" | "inbound",
          sender: item.sender,
          recipient: item.recipient,
          subject: item.subject,
          bodyText: item.body_text,
          bodyHtml: item.body_html || undefined,
          hasAttachments: item.has_attachments,
          receivedAt: item.received_at,
          createdAt: item.created_at,
        }));
      }
    }
    return this.getLocalMessages();
  }
}

export const emailMessageRepository: IEmailMessageRepository = new SupabaseEmailMessageRepository();