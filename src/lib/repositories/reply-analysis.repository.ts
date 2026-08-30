import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ReplyClassification =
  | "interested"
  | "question"
  | "meeting_request"
  | "pricing_request"
  | "revision_request"
  | "not_interested"
  | "unsubscribe"
  | "out_of_office"
  | "wrong_contact"
  | "unclear";

export interface ReplyAnalysisRecord {
  id: string;
  emailMessageId: string;
  leadId?: string;
  classification: ReplyClassification;
  confidence: number;
  summary: string;
  questions: string[];
  requestedActions: string[];
  commercialSignals: string[];
  suggestedNextStep: string;
  needsHumanAttention: boolean;
  createdAt: string;
}

export interface IReplyAnalysisRepository {
  create(analysis: Omit<ReplyAnalysisRecord, "id" | "createdAt">): Promise<ReplyAnalysisRecord>;
  getById(id: string): Promise<ReplyAnalysisRecord | null>;
  getByMessageId(emailMessageId: string): Promise<ReplyAnalysisRecord | null>;
  getByLeadId(leadId: string): Promise<ReplyAnalysisRecord[]>;
  getAll(): Promise<ReplyAnalysisRecord[]>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".reply_analyses_cache.json");

export class SupabaseReplyAnalysisRepository implements IReplyAnalysisRepository {
  private getLocalAnalyses(): ReplyAnalysisRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalAnalyses(items: ReplyAnalysisRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ReplyAnalysisRecord, "id" | "createdAt">): Promise<ReplyAnalysisRecord> {
    const nextId = `ANA-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ReplyAnalysisRecord = {
      ...input,
      id: nextId,
      createdAt: now,
    };

    const cached = this.getLocalAnalyses();
    cached.unshift(record);
    this.saveLocalAnalyses(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        email_message_id: input.emailMessageId,
        lead_id: input.leadId || null,
        classification: input.classification,
        confidence: input.confidence,
        summary: input.summary,
        questions: input.questions,
        requested_actions: input.requestedActions,
        commercial_signals: input.commercialSignals,
        suggested_next_step: input.suggestedNextStep,
        needs_human_attention: input.needsHumanAttention,
        created_at: now,
      };

      const { error } = await supabase.from("reply_analyses").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseReplyAnalysisRepository.create] Supabase table not ready, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ReplyAnalysisRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("reply_analyses").select("*").eq("id", id).single();
      if (!error && data) {
        return {
          id: data.id,
          emailMessageId: data.email_message_id,
          leadId: data.lead_id || undefined,
          classification: data.classification as ReplyClassification,
          confidence: Number(data.confidence),
          summary: data.summary,
          questions: data.questions || [],
          requestedActions: data.requested_actions || [],
          commercialSignals: data.commercial_signals || [],
          suggestedNextStep: data.suggested_next_step,
          needsHumanAttention: data.needs_human_attention,
          createdAt: data.created_at,
        };
      }
    }
    return this.getLocalAnalyses().find((a) => a.id === id) || null;
  }

  async getByMessageId(emailMessageId: string): Promise<ReplyAnalysisRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("reply_analyses")
        .select("*")
        .eq("email_message_id", emailMessageId)
        .limit(1);

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          emailMessageId: item.email_message_id,
          leadId: item.lead_id || undefined,
          classification: item.classification as ReplyClassification,
          confidence: Number(item.confidence),
          summary: item.summary,
          questions: item.questions || [],
          requestedActions: item.requested_actions || [],
          commercialSignals: item.commercial_signals || [],
          suggestedNextStep: item.suggested_next_step,
          needsHumanAttention: item.needs_human_attention,
          createdAt: item.created_at,
        };
      }
    }
    return this.getLocalAnalyses().find((a) => a.emailMessageId === emailMessageId) || null;
  }

  async getByLeadId(leadId: string): Promise<ReplyAnalysisRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("reply_analyses")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          emailMessageId: item.email_message_id,
          leadId: item.lead_id || undefined,
          classification: item.classification as ReplyClassification,
          confidence: Number(item.confidence),
          summary: item.summary,
          questions: item.questions || [],
          requestedActions: item.requested_actions || [],
          commercialSignals: item.commercial_signals || [],
          suggestedNextStep: item.suggested_next_step,
          needsHumanAttention: item.needs_human_attention,
          createdAt: item.created_at,
        }));
      }
    }
    return this.getLocalAnalyses().filter((a) => a.leadId === leadId);
  }

  async getAll(): Promise<ReplyAnalysisRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("reply_analyses").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          emailMessageId: item.email_message_id,
          leadId: item.lead_id || undefined,
          classification: item.classification as ReplyClassification,
          confidence: Number(item.confidence),
          summary: item.summary,
          questions: item.questions || [],
          requestedActions: item.requested_actions || [],
          commercialSignals: item.commercial_signals || [],
          suggestedNextStep: item.suggested_next_step,
          needsHumanAttention: item.needs_human_attention,
          createdAt: item.created_at,
        }));
      }
    }
    return this.getLocalAnalyses();
  }
}

export const replyAnalysisRepository: IReplyAnalysisRepository = new SupabaseReplyAnalysisRepository();