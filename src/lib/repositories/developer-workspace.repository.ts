import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface WorkspaceSnapshotRecord {
  id: string;
  projectId: string;
  taskId?: string;
  snapshotType: "before_execution" | "after_execution" | "rollback" | "manual";
  manifestHash: string;
  fileManifest: Array<{ path: string; hash: string; size: number }>;
  filesContent?: Record<string, string>; // For full rollback restore
  createdBy: string;
  createdAt: string;
}

export interface DeveloperExecutionRecord {
  id: string;
  projectId: string;
  taskId: string;
  status: "running" | "waiting_approval" | "approved" | "rejected" | "failed" | "rolled_back";
  plan: Record<string, any>;
  filesChanged: Array<{ file: string; action: "created" | "modified" | "deleted" }>;
  buildResult: {
    command: string;
    exitCode: number;
    durationMs: number;
    output?: string;
    errors?: string[];
  };
  securityScan: {
    passed: boolean;
    findings: string[];
  };
  scopeValidation: {
    passed: boolean;
    contractualItems: string[];
    excludedItemsDetected: string[];
  };
  repairAttempts: number;
  beforeSnapshotId?: string;
  afterSnapshotId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ContentPlaceholderRecord {
  id: string;
  projectId: string;
  file: string;
  location: string;
  placeholderType: "logo" | "service_description" | "contact_recipient" | "copy";
  description: string;
  dependencyId?: string;
  status: "placeholder" | "client_provided" | "approved" | "resolved";
  createdAt: string;
}

export class DeveloperWorkspaceRepository {
  private snapshotsCacheFile = path.resolve(process.cwd(), ".workspace_snapshots_cache.json");
  private executionsCacheFile = path.resolve(process.cwd(), ".developer_executions_cache.json");
  private placeholdersCacheFile = path.resolve(process.cwd(), ".content_placeholders_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch {}
  }

  // --- Snapshots ---
  async createSnapshot(snapshot: WorkspaceSnapshotRecord): Promise<WorkspaceSnapshotRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("workspace_snapshots").insert({
          id: snapshot.id,
          project_id: snapshot.projectId,
          task_id: snapshot.taskId,
          snapshot_type: snapshot.snapshotType,
          manifest_hash: snapshot.manifestHash,
          file_manifest: snapshot.fileManifest,
          created_by: snapshot.createdBy,
          created_at: snapshot.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<WorkspaceSnapshotRecord>(this.snapshotsCacheFile);
    cache.unshift(snapshot);
    this.writeCache(this.snapshotsCacheFile, cache);
    return snapshot;
  }

  async getSnapshotById(id: string): Promise<WorkspaceSnapshotRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("workspace_snapshots").select("*").eq("id", id).single();
        if (data) return this.mapSnapshotDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<WorkspaceSnapshotRecord>(this.snapshotsCacheFile);
    return cache.find((s) => s.id === id) || null;
  }

  // --- Executions ---
  async createExecution(exec: DeveloperExecutionRecord): Promise<DeveloperExecutionRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("developer_executions").insert({
          id: exec.id,
          project_id: exec.projectId,
          task_id: exec.taskId,
          status: exec.status,
          plan: exec.plan,
          files_changed: exec.filesChanged,
          build_result: exec.buildResult,
          security_scan: exec.securityScan,
          scope_validation: exec.scopeValidation,
          repair_attempts: exec.repairAttempts,
          before_snapshot_id: exec.beforeSnapshotId,
          after_snapshot_id: exec.afterSnapshotId,
          created_at: exec.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<DeveloperExecutionRecord>(this.executionsCacheFile);
    cache.unshift(exec);
    this.writeCache(this.executionsCacheFile, cache);
    return exec;
  }

  async updateExecution(id: string, updates: Partial<DeveloperExecutionRecord>): Promise<DeveloperExecutionRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("developer_executions").update({
          status: updates.status,
          build_result: updates.buildResult,
          files_changed: updates.filesChanged,
          security_scan: updates.securityScan,
          scope_validation: updates.scopeValidation,
          repair_attempts: updates.repairAttempts,
          after_snapshot_id: updates.afterSnapshotId,
          completed_at: updates.completedAt,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<DeveloperExecutionRecord>(this.executionsCacheFile);
    const idx = cache.findIndex((e) => e.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.executionsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  async getExecutionById(id: string): Promise<DeveloperExecutionRecord | null> {
    const cache = this.readCache<DeveloperExecutionRecord>(this.executionsCacheFile);
    return cache.find((e) => e.id === id) || null;
  }

  async getExecutionByTaskId(taskId: string): Promise<DeveloperExecutionRecord | null> {
    const cache = this.readCache<DeveloperExecutionRecord>(this.executionsCacheFile);
    return cache.find((e) => e.taskId === taskId) || null;
  }

  // --- Placeholders ---
  async createPlaceholders(placeholders: ContentPlaceholderRecord[]): Promise<ContentPlaceholderRecord[]> {
    const cache = this.readCache<ContentPlaceholderRecord>(this.placeholdersCacheFile);
    for (const p of placeholders) {
      cache.unshift(p);
    }
    this.writeCache(this.placeholdersCacheFile, cache);
    return placeholders;
  }

  async getPlaceholdersByProject(projectId: string): Promise<ContentPlaceholderRecord[]> {
    const cache = this.readCache<ContentPlaceholderRecord>(this.placeholdersCacheFile);
    return cache.filter((p) => p.projectId === projectId);
  }

  private mapSnapshotDbToRecord(db: any): WorkspaceSnapshotRecord {
    return {
      id: db.id,
      projectId: db.project_id,
      taskId: db.task_id,
      snapshotType: db.snapshot_type,
      manifestHash: db.manifest_hash,
      fileManifest: db.file_manifest || [],
      createdBy: db.created_by,
      createdAt: db.created_at,
    };
  }
}

export const developerWorkspaceRepository = new DeveloperWorkspaceRepository();