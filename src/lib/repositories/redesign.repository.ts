import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { taskRepository } from "./task.repository";

export type RedesignProjectStatus =
  | "draft"
  | "generating"
  | "generated"
  | "validation_failed"
  | "waiting_approval"
  | "approved"
  | "rejected";

export interface DesignBrief {
  companyName: string;
  designDirection: string;
  targetAudience: string;
  primaryGoal: string;
  preserve: string[];
  improve: string[];
  pageSections: string[];
  visualDirection: {
    style: string;
    typography: string;
    layout: string;
    imagery: string;
    motion: string;
  };
}

export interface ValidationCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidationSummary {
  valid: boolean;
  checks: ValidationCheckResult[];
  repairAttempts: number;
  warnings?: string[];
}

export interface GeneratedFileRecord {
  path: string;
  size: number;
  type: string;
  contentSnippet?: string;
}

export interface RedesignProjectRecord {
  id: string;
  leadId?: string;
  auditId?: string;
  taskId: string;
  companyName: string;
  status: RedesignProjectStatus;
  designBrief: DesignBrief;
  generatedFiles: GeneratedFileRecord[];
  previewPath: string;
  validationResults: ValidationSummary;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
}

export interface IRedesignRepository {
  create(project: Omit<RedesignProjectRecord, "id" | "createdAt" | "updatedAt">): Promise<RedesignProjectRecord>;
  getById(id: string): Promise<RedesignProjectRecord | null>;
  getByTaskId(taskId: string): Promise<RedesignProjectRecord | null>;
  getByLeadId(leadId: string): Promise<RedesignProjectRecord[]>;
  updateStatus(id: string, status: RedesignProjectStatus, approvedAt?: string): Promise<RedesignProjectRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".redesign_cache.json");

export class SupabaseRedesignRepository implements IRedesignRepository {
  private getLocalProjects(): RedesignProjectRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalProjects(items: RedesignProjectRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<RedesignProjectRecord, "id" | "createdAt" | "updatedAt">): Promise<RedesignProjectRecord> {
    const nextId = `REDESIGN-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: RedesignProjectRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    // Save to reliable file cache
    const cached = this.getLocalProjects();
    cached.unshift(record);
    this.saveLocalProjects(cached);

    if (!isSupabaseConfigured()) {
      return record;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      lead_id: input.leadId || null,
      audit_id: input.auditId || null,
      task_id: input.taskId,
      company_name: input.companyName,
      status: input.status,
      design_brief: input.designBrief,
      generated_files: input.generatedFiles,
      preview_path: input.previewPath,
      validation_results: input.validationResults,
      created_at: now,
      updated_at: now,
      approved_at: input.approvedAt || null,
    };

    const { data, error } = await supabase
      .from("redesign_projects")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn("[SupabaseRedesignRepository.create] table not ready or error, saving in local fallback:", error.message);
      return record;
    }

    return record;
  }

  async getById(id: string): Promise<RedesignProjectRecord | null> {
    // 1. Try Supabase
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("redesign_projects")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          leadId: data.lead_id || undefined,
          auditId: data.audit_id || undefined,
          taskId: data.task_id,
          companyName: data.company_name,
          status: data.status as RedesignProjectStatus,
          designBrief: data.design_brief,
          generatedFiles: data.generated_files || [],
          previewPath: data.preview_path,
          validationResults: data.validation_results || { valid: true, checks: [], repairAttempts: 0 },
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          approvedAt: data.approved_at,
        };
      }
    }

    // 2. Try file cache
    const match = this.getLocalProjects().find((p) => p.id === id);
    if (match) return match;

    // 3. Try from task outputs
    const allTasks = await taskRepository.getAll();
    for (const t of allTasks) {
      if (t.output?.projectId === id) {
        return {
          id: t.output.projectId,
          leadId: t.targetLeadId,
          taskId: t.id,
          companyName: t.output.companyName || "Target Company",
          status: t.output.status || "waiting_approval",
          designBrief: t.output.designBrief,
          generatedFiles: t.output.generatedFiles || [],
          previewPath: t.output.previewUrl || `/api/developer/preview/${t.output.projectId}`,
          validationResults: t.output.validationResults || { valid: true, checks: [], repairAttempts: 0 },
          createdAt: t.createdAt,
          updatedAt: t.completedAt || t.createdAt,
        };
      }
    }

    return null;
  }

  async getByTaskId(taskId: string): Promise<RedesignProjectRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("redesign_projects")
        .select("*")
        .eq("task_id", taskId)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          leadId: data.lead_id || undefined,
          auditId: data.audit_id || undefined,
          taskId: data.task_id,
          companyName: data.company_name,
          status: data.status as RedesignProjectStatus,
          designBrief: data.design_brief,
          generatedFiles: data.generated_files || [],
          previewPath: data.preview_path,
          validationResults: data.validation_results || { valid: true, checks: [], repairAttempts: 0 },
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          approvedAt: data.approved_at,
        };
      }
    }

    const match = this.getLocalProjects().find((p) => p.taskId === taskId);
    if (match) return match;

    const task = await taskRepository.getById(taskId);
    if (task && task.output?.projectId) {
      return {
        id: task.output.projectId,
        leadId: task.targetLeadId,
        taskId: task.id,
        companyName: task.output.companyName || "Target Company",
        status: task.output.status || "waiting_approval",
        designBrief: task.output.designBrief,
        generatedFiles: task.output.generatedFiles || [],
        previewPath: task.output.previewUrl || `/api/developer/preview/${task.output.projectId}`,
        validationResults: task.output.validationResults || { valid: true, checks: [], repairAttempts: 0 },
        createdAt: task.createdAt,
        updatedAt: task.completedAt || task.createdAt,
      };
    }

    return null;
  }

  async getByLeadId(leadId: string): Promise<RedesignProjectRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("redesign_projects")
        .select("*")
        .eq("lead_id", leadId);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          leadId: d.lead_id || undefined,
          auditId: d.audit_id || undefined,
          taskId: d.task_id,
          companyName: d.company_name,
          status: d.status as RedesignProjectStatus,
          designBrief: d.design_brief,
          generatedFiles: d.generated_files || [],
          previewPath: d.preview_path,
          validationResults: d.validation_results || { valid: true, checks: [], repairAttempts: 0 },
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          approvedAt: d.approved_at,
        }));
      }
    }

    return this.getLocalProjects().filter((p) => p.leadId === leadId);
  }

  async updateStatus(
    id: string,
    status: RedesignProjectStatus,
    approvedAt?: string
  ): Promise<RedesignProjectRecord> {
    const now = new Date().toISOString();

    // 1. Update in local file cache
    const cached = this.getLocalProjects();
    const match = cached.find((p) => p.id === id);
    if (match) {
      match.status = status;
      match.updatedAt = now;
      if (approvedAt !== undefined) match.approvedAt = approvedAt;
      this.saveLocalProjects(cached);
    }

    // 2. Try Supabase
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const updatePayload: any = {
        status,
        updated_at: now,
      };
      if (approvedAt !== undefined) {
        updatePayload.approved_at = approvedAt;
      }

      await supabase
        .from("redesign_projects")
        .update(updatePayload)
        .eq("id", id);
    }

    const result = (await this.getById(id)) || (match as RedesignProjectRecord);
    if (!result) throw new Error(`Redesign project ${id} not found.`);
    return result;
  }
}

export const redesignRepository: IRedesignRepository = new SupabaseRedesignRepository();