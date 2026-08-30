import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface QARunRecord {
  id: string;
  projectId: string;
  workspaceSnapshotId: string;
  manifestHash: string;
  status: "queued" | "running" | "failed" | "defects_found" | "passed" | "waiting_approval" | "approved" | "stale";
  buildStatus: "passed" | "failed" | "pending";
  runtimeStatus: "passed" | "failed" | "pending";
  viewportResults: Array<{
    viewport: string;
    width: number;
    height: number;
    passed: boolean;
    overflowDetected: boolean;
    screenshotPath?: string;
    notes?: string;
  }>;
  functionalResults: Record<string, any>;
  accessibilityResults: {
    tool: string;
    violationsCount: number;
    violations: Array<{ id: string; impact: string; description: string; node?: string }>;
  };
  visualResults: {
    passed: boolean;
    designDivergenceDetected: boolean;
    notes?: string;
  };
  consoleResults: Array<{ type: "error" | "warn" | "log"; message: string }>;
  networkResults: Array<{ url: string; status: number; error?: string }>;
  linkResults: {
    validCount: number;
    brokenCount: number;
    brokenLinks: string[];
  };
  defectCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  startedAt: string;
  completedAt?: string;
  approvedAt?: string;
  createdBy: string;
}

export interface QADefectRecord {
  id: string;
  qaRunId: string;
  projectId: string;
  taskId?: string;
  title: string;
  description: string;
  category: "build" | "runtime" | "responsive" | "visual" | "accessibility" | "navigation" | "form" | "content" | "asset" | "performance" | "security" | "contractual" | "design_divergence";
  severity: "critical" | "high" | "medium" | "low";
  route?: string;
  viewport?: string;
  evidence: Record<string, any>;
  contractualSource?: string;
  status: "open" | "repair_queued" | "repair_in_progress" | "awaiting_retest" | "resolved" | "wont_fix";
  createdAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
}

export class QARepository {
  private runsCacheFile = path.resolve(process.cwd(), ".qa_runs_cache.json");
  private defectsCacheFile = path.resolve(process.cwd(), ".qa_defects_cache.json");

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

  // --- Runs ---
  async createRun(run: QARunRecord): Promise<QARunRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("qa_runs").insert({
          id: run.id,
          project_id: run.projectId,
          workspace_snapshot_id: run.workspaceSnapshotId,
          manifest_hash: run.manifestHash,
          status: run.status,
          build_status: run.buildStatus,
          runtime_status: run.runtimeStatus,
          viewport_results: run.viewportResults,
          functional_results: run.functionalResults,
          accessibility_results: run.accessibilityResults,
          visual_results: run.visualResults,
          console_results: run.consoleResults,
          network_results: run.networkResults,
          link_results: run.linkResults,
          defect_count: run.defectCount,
          critical_count: run.criticalCount,
          high_count: run.highCount,
          medium_count: run.mediumCount,
          low_count: run.lowCount,
          started_at: run.startedAt,
          created_by: run.createdBy,
        });
      } catch {}
    }

    const cache = this.readCache<QARunRecord>(this.runsCacheFile);
    cache.unshift(run);
    this.writeCache(this.runsCacheFile, cache);
    return run;
  }

  async updateRun(id: string, updates: Partial<QARunRecord>): Promise<QARunRecord | null> {
    const cache = this.readCache<QARunRecord>(this.runsCacheFile);
    const idx = cache.findIndex((r) => r.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.runsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  async getRunById(id: string): Promise<QARunRecord | null> {
    const cache = this.readCache<QARunRecord>(this.runsCacheFile);
    return cache.find((r) => r.id === id) || null;
  }

  async getRunsByProject(projectId: string): Promise<QARunRecord[]> {
    const cache = this.readCache<QARunRecord>(this.runsCacheFile);
    return cache.filter((r) => r.projectId === projectId);
  }

  // --- Defects ---
  async createDefect(defect: QADefectRecord): Promise<QADefectRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("qa_defects").insert({
          id: defect.id,
          qa_run_id: defect.qaRunId,
          project_id: defect.projectId,
          task_id: defect.taskId,
          title: defect.title,
          description: defect.description,
          category: defect.category,
          severity: defect.severity,
          route: defect.route,
          viewport: defect.viewport,
          evidence: defect.evidence,
          contractual_source: defect.contractualSource,
          status: defect.status,
          created_at: defect.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<QADefectRecord>(this.defectsCacheFile);
    cache.unshift(defect);
    this.writeCache(this.defectsCacheFile, cache);
    return defect;
  }

  async updateDefect(id: string, updates: Partial<QADefectRecord>): Promise<QADefectRecord | null> {
    const cache = this.readCache<QADefectRecord>(this.defectsCacheFile);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.defectsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  async getDefectsByRun(qaRunId: string): Promise<QADefectRecord[]> {
    const cache = this.readCache<QADefectRecord>(this.defectsCacheFile);
    return cache.filter((d) => d.qaRunId === qaRunId);
  }

  async getDefectsByProject(projectId: string): Promise<QADefectRecord[]> {
    const cache = this.readCache<QADefectRecord>(this.defectsCacheFile);
    return cache.filter((d) => d.projectId === projectId);
  }
}

export const qaRepository = new QARepository();