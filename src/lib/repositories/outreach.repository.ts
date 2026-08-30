import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type OutreachDraftStatus = "draft" | "waiting_approval" | "approved" | "rejected";

export interface OutreachPersonalization {
  auditSignalsUsed: string[];
  companyFactsUsed: string[];
  redesignImprovementsReferenced: string[];
}

export interface OutreachDraftRecord {
  id: string;
  leadId: string;
  taskId?: string;
  redesignProjectId?: string;
  deploymentId?: string;
  companyName: string;
  subject: string;
  body: string;
  followUp?: string;
  personalization: OutreachPersonalization;
  previewUrl: string;
  status: OutreachDraftStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface IOutreachRepository {
  create(draft: Omit<OutreachDraftRecord, "id" | "createdAt" | "updatedAt">): Promise<OutreachDraftRecord>;
  getById(id: string): Promise<OutreachDraftRecord | null>;
  getByTaskId(taskId: string): Promise<OutreachDraftRecord | null>;
  getByLeadId(leadId: string): Promise<OutreachDraftRecord[]>;
  getAll(): Promise<OutreachDraftRecord[]>;
  update(id: string, updates: Partial<OutreachDraftRecord>): Promise<OutreachDraftRecord>;
  updateStatus(id: string, status: OutreachDraftStatus, timestamp?: string): Promise<OutreachDraftRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".outreach_cache.json");

export class SupabaseOutreachRepository implements IOutreachRepository {
  private getLocalDrafts(): OutreachDraftRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalDrafts(items: OutreachDraftRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<OutreachDraftRecord, "id" | "createdAt" | "updatedAt">): Promise<OutreachDraftRecord> {
    const nextId = `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: OutreachDraftRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalDrafts();
    cached.unshift(record);
    this.saveLocalDrafts(cached);

    if (!isSupabaseConfigured()) {
      return record;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      lead_id: input.leadId,
      task_id: input.taskId || null,
      redesign_project_id: input.redesignProjectId || null,
      deployment_id: input.deploymentId || null,
      subject: input.subject,
      body: input.body,
      follow_up: input.followUp || null,
      personalization: input.personalization,
      preview_url: input.previewUrl,
      status: input.status,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("outreach_drafts").insert(insertPayload);
    if (error) {
      console.warn("[SupabaseOutreachRepository.create] Supabase table not ready, saved in cache:", error.message);
    }

    return record;
  }

  async getById(id: string): Promise<OutreachDraftRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("outreach_drafts")
        .select("*, leads(company_name)")
        .eq("id", id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          leadId: data.lead_id,
          taskId: data.task_id || undefined,
          redesignProjectId: data.redesign_project_id || undefined,
          deploymentId: data.deployment_id || undefined,
          companyName: data.leads?.company_name || "Target Company",
          subject: data.subject,
          body: data.body,
          followUp: data.follow_up || undefined,
          personalization: data.personalization || { auditSignalsUsed: [], companyFactsUsed: [], redesignImprovementsReferenced: [] },
          previewUrl: data.preview_url,
          status: data.status as OutreachDraftStatus,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          approvedAt: data.approved_at,
          rejectedAt: data.rejected_at,
        };
      }
    }

    return this.getLocalDrafts().find((d) => d.id === id) || null;
  }

  async getByTaskId(taskId: string): Promise<OutreachDraftRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("outreach_drafts")
        .select("*, leads(company_name)")
        .eq("task_id", taskId)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          leadId: data.lead_id,
          taskId: data.task_id || undefined,
          redesignProjectId: data.redesign_project_id || undefined,
          deploymentId: data.deployment_id || undefined,
          companyName: data.leads?.company_name || "Target Company",
          subject: data.subject,
          body: data.body,
          followUp: data.follow_up || undefined,
          personalization: data.personalization || { auditSignalsUsed: [], companyFactsUsed: [], redesignImprovementsReferenced: [] },
          previewUrl: data.preview_url,
          status: data.status as OutreachDraftStatus,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          approvedAt: data.approved_at,
          rejectedAt: data.rejected_at,
        };
      }
    }

    return this.getLocalDrafts().find((d) => d.taskId === taskId) || null;
  }

  async getByLeadId(leadId: string): Promise<OutreachDraftRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("outreach_drafts")
        .select("*, leads(company_name)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          leadId: d.lead_id,
          taskId: d.task_id || undefined,
          redesignProjectId: d.redesign_project_id || undefined,
          deploymentId: d.deployment_id || undefined,
          companyName: d.leads?.company_name || "Target Company",
          subject: d.subject,
          body: d.body,
          followUp: d.follow_up || undefined,
          personalization: d.personalization || { auditSignalsUsed: [], companyFactsUsed: [], redesignImprovementsReferenced: [] },
          previewUrl: d.preview_url,
          status: d.status as OutreachDraftStatus,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          approvedAt: d.approved_at,
          rejectedAt: d.rejected_at,
        }));
      }
    }

    return this.getLocalDrafts().filter((d) => d.leadId === leadId);
  }

  async getAll(): Promise<OutreachDraftRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("outreach_drafts")
        .select("*, leads(company_name)")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          leadId: d.lead_id,
          taskId: d.task_id || undefined,
          redesignProjectId: d.redesign_project_id || undefined,
          deploymentId: d.deployment_id || undefined,
          companyName: d.leads?.company_name || "Target Company",
          subject: d.subject,
          body: d.body,
          followUp: d.follow_up || undefined,
          personalization: d.personalization || { auditSignalsUsed: [], companyFactsUsed: [], redesignImprovementsReferenced: [] },
          previewUrl: d.preview_url,
          status: d.status as OutreachDraftStatus,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          approvedAt: d.approved_at,
          rejectedAt: d.rejected_at,
        }));
      }
    }

    return this.getLocalDrafts();
  }

  async update(id: string, updates: Partial<OutreachDraftRecord>): Promise<OutreachDraftRecord> {
    const now = new Date().toISOString();

    const cached = this.getLocalDrafts();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalDrafts(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = {
        updated_at: now,
      };
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.body !== undefined) payload.body = updates.body;
      if (updates.followUp !== undefined) payload.follow_up = updates.followUp;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.rejectedAt !== undefined) payload.rejected_at = updates.rejectedAt;
      if (updates.personalization !== undefined) payload.personalization = updates.personalization;

      await supabase.from("outreach_drafts").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as OutreachDraftRecord);
    if (!res) throw new Error(`Outreach draft ${id} not found.`);
    return res;
  }

  async updateStatus(id: string, status: OutreachDraftStatus, timestamp?: string): Promise<OutreachDraftRecord> {
    const now = timestamp || new Date().toISOString();
    const updates: Partial<OutreachDraftRecord> = { status };
    if (status === "approved") updates.approvedAt = now;
    if (status === "rejected") updates.rejectedAt = now;
    return this.update(id, updates);
  }
}

export const outreachRepository: IOutreachRepository = new SupabaseOutreachRepository();