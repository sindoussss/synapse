import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DeploymentStatus, ValidationResult } from "../deployment/types";

export interface DeploymentRecord {
  id: string;
  redesignProjectId: string;
  leadId?: string;
  taskId?: string;
  provider: "vercel" | string;
  deploymentType: "preview" | "production";
  status: DeploymentStatus;
  providerDeploymentId?: string;
  previewUrl?: string;
  commitHash?: string;
  buildLogs: string[];
  validationResults: ValidationResult;
  requestedAt: string;
  approvedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IDeploymentRepository {
  create(deployment: Omit<DeploymentRecord, "id" | "createdAt" | "updatedAt">): Promise<DeploymentRecord>;
  getById(id: string): Promise<DeploymentRecord | null>;
  getByRedesignId(redesignId: string): Promise<DeploymentRecord[]>;
  getAll(): Promise<DeploymentRecord[]>;
  update(id: string, updates: Partial<DeploymentRecord>): Promise<DeploymentRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".deployments_cache.json");

export class SupabaseDeploymentRepository implements IDeploymentRepository {
  private getLocalDeployments(): DeploymentRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalDeployments(items: DeploymentRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<DeploymentRecord, "id" | "createdAt" | "updatedAt">): Promise<DeploymentRecord> {
    const nextId = `DEP-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: DeploymentRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalDeployments();
    cached.unshift(record);
    this.saveLocalDeployments(cached);

    if (!isSupabaseConfigured()) {
      return record;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: nextId,
      redesign_project_id: input.redesignProjectId,
      lead_id: input.leadId || null,
      task_id: input.taskId || null,
      provider: input.provider,
      deployment_type: input.deploymentType,
      status: input.status,
      provider_deployment_id: input.providerDeploymentId || null,
      preview_url: input.previewUrl || null,
      build_logs: input.buildLogs || [],
      validation_results: input.validationResults || { valid: true, checks: [] },
      requested_at: input.requestedAt || now,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("deployments")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn("[SupabaseDeploymentRepository.create] Supabase table not ready, saved in cache:", error.message);
      return record;
    }

    return record;
  }

  async getById(id: string): Promise<DeploymentRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("deployments")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          redesignProjectId: data.redesign_project_id,
          leadId: data.lead_id || undefined,
          taskId: data.task_id || undefined,
          provider: data.provider,
          deploymentType: data.deployment_type,
          status: data.status as DeploymentStatus,
          providerDeploymentId: data.provider_deployment_id || undefined,
          previewUrl: data.preview_url || undefined,
          buildLogs: data.build_logs || [],
          validationResults: data.validation_results || { valid: true, checks: [] },
          requestedAt: data.requested_at,
          approvedAt: data.approved_at,
          startedAt: data.started_at,
          completedAt: data.completed_at,
          failedAt: data.failed_at,
          error: data.error,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }

    return this.getLocalDeployments().find((d) => d.id === id) || null;
  }

  async getByRedesignId(redesignId: string): Promise<DeploymentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("deployments")
        .select("*")
        .eq("redesign_project_id", redesignId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          redesignProjectId: d.redesign_project_id,
          leadId: d.lead_id || undefined,
          taskId: d.task_id || undefined,
          provider: d.provider,
          deploymentType: d.deployment_type,
          status: d.status as DeploymentStatus,
          providerDeploymentId: d.provider_deployment_id || undefined,
          previewUrl: d.preview_url || undefined,
          buildLogs: d.build_logs || [],
          validationResults: d.validation_results || { valid: true, checks: [] },
          requestedAt: d.requested_at,
          approvedAt: d.approved_at,
          startedAt: d.started_at,
          completedAt: d.completed_at,
          failedAt: d.failed_at,
          error: d.error,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }

    return this.getLocalDeployments().filter((d) => d.redesignProjectId === redesignId);
  }

  async getAll(): Promise<DeploymentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("deployments")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          redesignProjectId: d.redesign_project_id,
          leadId: d.lead_id || undefined,
          taskId: d.task_id || undefined,
          provider: d.provider,
          deploymentType: d.deployment_type,
          status: d.status as DeploymentStatus,
          providerDeploymentId: d.provider_deployment_id || undefined,
          previewUrl: d.preview_url || undefined,
          buildLogs: d.build_logs || [],
          validationResults: d.validation_results || { valid: true, checks: [] },
          requestedAt: d.requested_at,
          approvedAt: d.approved_at,
          startedAt: d.started_at,
          completedAt: d.completed_at,
          failedAt: d.failed_at,
          error: d.error,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }

    return this.getLocalDeployments();
  }

  async update(id: string, updates: Partial<DeploymentRecord>): Promise<DeploymentRecord> {
    const now = new Date().toISOString();

    const cached = this.getLocalDeployments();
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalDeployments(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = {
        updated_at: now,
      };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.startedAt !== undefined) payload.started_at = updates.startedAt;
      if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
      if (updates.failedAt !== undefined) payload.failed_at = updates.failedAt;
      if (updates.previewUrl !== undefined) payload.preview_url = updates.previewUrl;
      if (updates.providerDeploymentId !== undefined) payload.provider_deployment_id = updates.providerDeploymentId;
      if (updates.buildLogs !== undefined) payload.build_logs = updates.buildLogs;
      if (updates.validationResults !== undefined) payload.validation_results = updates.validationResults;
      if (updates.error !== undefined) payload.error = updates.error;

      await supabase.from("deployments").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as DeploymentRecord);
    if (!res) throw new Error(`Deployment ${id} not found.`);
    return res;
  }
}

export const deploymentRepository: IDeploymentRepository = new SupabaseDeploymentRepository();