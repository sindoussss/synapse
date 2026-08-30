import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AuditScores, RecommendedAction } from "../services/audit/score-calculator";

export interface AuditFinding {
  category: "performance" | "mobile" | "seo" | "accessibility" | "conversion" | "design";
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
  recommendation: string;
}

export interface WebsiteAuditRecord {
  id: string;
  leadId?: string;
  taskId: string;
  website: string;
  scores: AuditScores;
  findings: AuditFinding[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
  recommendedAction: RecommendedAction;
  createdAt: string;
}

export interface IWebsiteAuditRepository {
  create(audit: Omit<WebsiteAuditRecord, "id" | "createdAt">): Promise<WebsiteAuditRecord>;
  getByTaskId(taskId: string): Promise<WebsiteAuditRecord | null>;
  getByLeadId(leadId: string): Promise<WebsiteAuditRecord[]>;
}

const STORAGE_KEY = "synapse_ops_audits_v2";

export class SupabaseWebsiteAuditRepository implements IWebsiteAuditRepository {
  private getLocalAudits(): WebsiteAuditRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAudits(items: WebsiteAuditRecord[]): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }

  async create(input: Omit<WebsiteAuditRecord, "id" | "createdAt">): Promise<WebsiteAuditRecord> {
    const nextId = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: WebsiteAuditRecord = {
      ...input,
      id: nextId,
      createdAt: now,
    };

    if (!isSupabaseConfigured()) {
      const list = [record, ...this.getLocalAudits()];
      this.saveLocalAudits(list);
      return record;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      lead_id: input.leadId || null,
      task_id: input.taskId,
      website: input.website,
      performance_score: input.scores.performance,
      mobile_score: input.scores.mobile,
      seo_score: input.scores.seo,
      accessibility_score: input.scores.accessibility,
      conversion_score: input.scores.conversion,
      design_score: input.scores.design,
      website_score: input.scores.website,
      redesign_opportunity_score: input.scores.redesignOpportunity,
      findings: input.findings,
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      summary: input.summary,
      recommended_action: input.recommendedAction,
      created_at: now,
    };

    const { data, error } = await supabase
      .from("website_audits")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn("[SupabaseWebsiteAuditRepository.create] table not ready or error, saving in local fallback:", error.message);
      const list = [record, ...this.getLocalAudits()];
      this.saveLocalAudits(list);
      return record;
    }

    return record;
  }

  async getByTaskId(taskId: string): Promise<WebsiteAuditRecord | null> {
    if (!isSupabaseConfigured()) {
      return this.getLocalAudits().find((a) => a.taskId === taskId) || null;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("website_audits")
      .select("*")
      .eq("task_id", taskId)
      .single();

    if (error || !data) {
      return this.getLocalAudits().find((a) => a.taskId === taskId) || null;
    }

    return {
      id: data.id,
      leadId: data.lead_id || undefined,
      taskId: data.task_id,
      website: data.website,
      scores: {
        performance: data.performance_score,
        mobile: data.mobile_score,
        seo: data.seo_score,
        accessibility: data.accessibility_score,
        conversion: data.conversion_score,
        design: data.design_score,
        website: data.website_score,
        redesignOpportunity: data.redesign_opportunity_score,
      },
      findings: data.findings || [],
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      summary: data.summary,
      recommendedAction: data.recommended_action,
      createdAt: data.created_at,
    };
  }

  async getByLeadId(leadId: string): Promise<WebsiteAuditRecord[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalAudits().filter((a) => a.leadId === leadId);
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("website_audits")
      .select("*")
      .eq("lead_id", leadId);

    if (error || !data) return this.getLocalAudits().filter((a) => a.leadId === leadId);

    return data.map((d: any) => ({
      id: d.id,
      leadId: d.lead_id || undefined,
      taskId: d.task_id,
      website: d.website,
      scores: {
        performance: d.performance_score,
        mobile: d.mobile_score,
        seo: d.seo_score,
        accessibility: d.accessibility_score,
        conversion: d.conversion_score,
        design: d.design_score,
        website: d.website_score,
        redesignOpportunity: d.redesign_opportunity_score,
      },
      findings: d.findings || [],
      strengths: d.strengths || [],
      weaknesses: d.weaknesses || [],
      summary: d.summary,
      recommendedAction: d.recommended_action,
      createdAt: d.created_at,
    }));
  }
}

export const auditRepository: IWebsiteAuditRepository = new SupabaseWebsiteAuditRepository();