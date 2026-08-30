import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface ResponseDraftRecord {
  id: string;
  replyAnalysisId: string;
  leadId?: string;
  subject: string;
  body: string;
  grounding: {
    prospectStatementsUsed?: string[];
    companyFactsUsed?: string[];
    previousConversationUsed?: string[];
    redesignImprovementsReferenced?: string[];
  };
  status: "waiting_approval" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
}

export interface IResponseDraftRepository {
  create(draft: Omit<ResponseDraftRecord, "id" | "createdAt" | "updatedAt">): Promise<ResponseDraftRecord>;
  getById(id: string): Promise<ResponseDraftRecord | null>;
  getByAnalysisId(replyAnalysisId: string): Promise<ResponseDraftRecord | null>;
  getByLeadId(leadId: string): Promise<ResponseDraftRecord[]>;
  getAll(): Promise<ResponseDraftRecord[]>;
  update(id: string, updates: Partial<ResponseDraftRecord>): Promise<ResponseDraftRecord>;
  updateStatus(id: string, status: "waiting_approval" | "approved" | "rejected"): Promise<ResponseDraftRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".response_drafts_cache.json");

export class SupabaseResponseDraftRepository implements IResponseDraftRepository {
  private getLocalDrafts(): ResponseDraftRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalDrafts(items: ResponseDraftRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<ResponseDraftRecord, "id" | "createdAt" | "updatedAt">): Promise<ResponseDraftRecord> {
    const nextId = `RESP-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: ResponseDraftRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalDrafts();
    cached.unshift(record);
    this.saveLocalDrafts(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        reply_analysis_id: input.replyAnalysisId,
        lead_id: input.leadId || null,
        subject: input.subject,
        body: input.body,
        grounding: input.grounding || {},
        status: input.status || "waiting_approval",
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("response_drafts").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseResponseDraftRepository.create] Supabase table not ready, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<ResponseDraftRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("response_drafts").select("*").eq("id", id).single();
      if (!error && data) {
        return {
          id: data.id,
          replyAnalysisId: data.reply_analysis_id,
          leadId: data.lead_id || undefined,
          subject: data.subject,
          body: data.body,
          grounding: data.grounding || {},
          status: data.status as any,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          approvedAt: data.approved_at,
        };
      }
    }
    return this.getLocalDrafts().find((d) => d.id === id) || null;
  }

  async getByAnalysisId(replyAnalysisId: string): Promise<ResponseDraftRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("response_drafts")
        .select("*")
        .eq("reply_analysis_id", replyAnalysisId)
        .limit(1);

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          replyAnalysisId: item.reply_analysis_id,
          leadId: item.lead_id || undefined,
          subject: item.subject,
          body: item.body,
          grounding: item.grounding || {},
          status: item.status as any,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          approvedAt: item.approved_at,
        };
      }
    }
    return this.getLocalDrafts().find((d) => d.replyAnalysisId === replyAnalysisId) || null;
  }

  async getByLeadId(leadId: string): Promise<ResponseDraftRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("response_drafts")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          replyAnalysisId: item.reply_analysis_id,
          leadId: item.lead_id || undefined,
          subject: item.subject,
          body: item.body,
          grounding: item.grounding || {},
          status: item.status as any,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          approvedAt: item.approved_at,
        }));
      }
    }
    return this.getLocalDrafts().filter((d) => d.leadId === leadId);
  }

  async getAll(): Promise<ResponseDraftRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("response_drafts").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          replyAnalysisId: item.reply_analysis_id,
          leadId: item.lead_id || undefined,
          subject: item.subject,
          body: item.body,
          grounding: item.grounding || {},
          status: item.status as any,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          approvedAt: item.approved_at,
        }));
      }
    }
    return this.getLocalDrafts();
  }

  async update(id: string, updates: Partial<ResponseDraftRecord>): Promise<ResponseDraftRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalDrafts();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalDrafts(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.body !== undefined) payload.body = updates.body;
      if (updates.grounding !== undefined) payload.grounding = updates.grounding;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      await supabase.from("response_drafts").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as ResponseDraftRecord);
    if (!res) throw new Error(`Response draft ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: "waiting_approval" | "approved" | "rejected"): Promise<ResponseDraftRecord> {
    const updates: Partial<ResponseDraftRecord> = { status };
    if (status === "approved") updates.approvedAt = new Date().toISOString();
    return this.update(id, updates);
  }
}

export const responseDraftRepository: IResponseDraftRepository = new SupabaseResponseDraftRepository();