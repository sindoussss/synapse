import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface ProjectRecord {
  id: string;
  projectNumber: string;
  opportunityId: string;
  leadId: string;
  agreementId: string;
  agreementVersion: number;
  agreementDocumentId?: string;
  name: string;
  status: "draft" | "planning" | "waiting_approval" | "ready" | "in_progress" | "blocked" | "client_review" | "completed" | "cancelled";
  currency: string;
  contractValueMinor: number;
  verifiedPaidMinor: number;
  outstandingMinor: number;
  plannedStartDate?: string;
  contractualEndDate?: string;
  scopeSnapshot: Array<{
    id: string;
    title: string;
    description: string;
    classification: "contractual" | "approved_change" | "internal_implementation" | "suggested" | "excluded";
  }>;
  exclusionsSnapshot: string[];
  clientResponsibilities: string[];
  commercialSnapshot: Record<string, any>;
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  metadata: Record<string, any>;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sequence: number;
  status: "planned" | "ready" | "in_progress" | "blocked" | "client_review" | "completed";
  isContractual: boolean;
  targetDate?: string;
  acceptanceCriteria: string[];
  createdAt: string;
  completedAt?: string;
}

export interface ChangeRequestRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  requestedBy: string;
  status: "candidate" | "under_review" | "approved" | "rejected";
  scopeClassification: "outside_contractual_scope" | "approved_change";
  commercialImpact: Record<string, any>;
  createdAt: string;
}

export class ProjectRepository {
  private projectsCacheFile = path.resolve(process.cwd(), ".projects_cache.json");
  private milestonesCacheFile = path.resolve(process.cwd(), ".project_milestones_cache.json");
  private changeRequestsCacheFile = path.resolve(process.cwd(), ".project_change_requests_cache.json");

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

  async getNextProjectNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const projects = await this.getAllProjects();
    const prefix = `PRJ-${year}-`;
    const yearProjects = projects.filter((p) => p.projectNumber && p.projectNumber.startsWith(prefix));
    let maxSeq = 0;
    for (const p of yearProjects) {
      const parts = p.projectNumber.split("-");
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(6, "0")}`;
  }

  async createProject(project: ProjectRecord): Promise<ProjectRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("projects").insert({
          id: project.id,
          project_number: project.projectNumber,
          opportunity_id: project.opportunityId,
          lead_id: project.leadId,
          agreement_id: project.agreementId,
          agreement_version: project.agreementVersion,
          agreement_document_id: project.agreementDocumentId,
          name: project.name,
          status: project.status,
          currency: project.currency,
          contract_value_minor: project.contractValueMinor,
          verified_paid_minor: project.verifiedPaidMinor,
          outstanding_minor: project.outstandingMinor,
          planned_start_date: project.plannedStartDate,
          contractual_end_date: project.contractualEndDate,
          scope_snapshot: project.scopeSnapshot,
          exclusions_snapshot: project.exclusionsSnapshot,
          client_responsibilities: project.clientResponsibilities,
          commercial_snapshot: project.commercialSnapshot,
          created_by: project.createdBy,
          created_at: project.createdAt,
          metadata: project.metadata,
        });
      } catch {}
    }

    const cache = this.readCache<ProjectRecord>(this.projectsCacheFile);
    cache.unshift(project);
    this.writeCache(this.projectsCacheFile, cache);
    return project;
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("projects").select("*").eq("id", id).single();
        if (data) return this.mapProjectDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<ProjectRecord>(this.projectsCacheFile);
    return cache.find((p) => p.id === id) || null;
  }

  async getProjectByOpportunityId(opportunityId: string): Promise<ProjectRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("projects").select("*").eq("opportunity_id", opportunityId).single();
        if (data) return this.mapProjectDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<ProjectRecord>(this.projectsCacheFile);
    return cache.find((p) => p.opportunityId === opportunityId) || null;
  }

  async getAllProjects(): Promise<ProjectRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) return data.map(this.mapProjectDbToRecord);
      } catch {}
    }

    return this.readCache<ProjectRecord>(this.projectsCacheFile);
  }

  async updateProject(id: string, updates: Partial<ProjectRecord>): Promise<ProjectRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("projects").update({
          status: updates.status,
          approved_at: updates.approvedAt,
          started_at: updates.startedAt,
          completed_at: updates.completedAt,
          cancelled_at: updates.cancelledAt,
          metadata: updates.metadata,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<ProjectRecord>(this.projectsCacheFile);
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.projectsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Milestones ---
  async createMilestones(milestones: MilestoneRecord[]): Promise<MilestoneRecord[]> {
    const cache = this.readCache<MilestoneRecord>(this.milestonesCacheFile);
    for (const m of milestones) {
      cache.push(m);
    }
    this.writeCache(this.milestonesCacheFile, cache);
    return milestones;
  }

  async getMilestonesByProject(projectId: string): Promise<MilestoneRecord[]> {
    const cache = this.readCache<MilestoneRecord>(this.milestonesCacheFile);
    return cache.filter((m) => m.projectId === projectId).sort((a, b) => a.sequence - b.sequence);
  }

  // --- Change Requests ---
  async createChangeRequest(cr: ChangeRequestRecord): Promise<ChangeRequestRecord> {
    const cache = this.readCache<ChangeRequestRecord>(this.changeRequestsCacheFile);
    cache.unshift(cr);
    this.writeCache(this.changeRequestsCacheFile, cache);
    return cr;
  }

  async getChangeRequestsByProject(projectId: string): Promise<ChangeRequestRecord[]> {
    const cache = this.readCache<ChangeRequestRecord>(this.changeRequestsCacheFile);
    return cache.filter((c) => c.projectId === projectId);
  }

  private mapProjectDbToRecord(db: any): ProjectRecord {
    return {
      id: db.id,
      projectNumber: db.project_number,
      opportunityId: db.opportunity_id,
      leadId: db.lead_id,
      agreementId: db.agreement_id,
      agreementVersion: db.agreement_version,
      agreementDocumentId: db.agreement_document_id,
      name: db.name,
      status: db.status,
      currency: db.currency || "PHP",
      contractValueMinor: Number(db.contract_value_minor),
      verifiedPaidMinor: Number(db.verified_paid_minor),
      outstandingMinor: Number(db.outstanding_minor),
      plannedStartDate: db.planned_start_date,
      contractualEndDate: db.contractual_end_date,
      scopeSnapshot: db.scope_snapshot || [],
      exclusionsSnapshot: db.exclusions_snapshot || [],
      clientResponsibilities: db.client_responsibilities || [],
      commercialSnapshot: db.commercial_snapshot || {},
      createdBy: db.created_by,
      createdAt: db.created_at,
      approvedAt: db.approved_at,
      startedAt: db.started_at,
      completedAt: db.completed_at,
      cancelledAt: db.cancelled_at,
      metadata: db.metadata || {},
    };
  }
}

export const projectRepository = new ProjectRepository();