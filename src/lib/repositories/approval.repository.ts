
import { Approval, ApprovalStatus, RiskLevel } from "@/data/types";
import { MOCK_APPROVALS } from "@/data/approvals";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface IApprovalRepository {
  getAll(): Promise<Approval[]>;
  getById(id: string): Promise<Approval | null>;
  create(approval: { taskId?: string; action: string; description: string; riskLevel: RiskLevel; payload?: any }): Promise<Approval>;
  updateStatus(id: string, status: ApprovalStatus): Promise<Approval>;
}

const STORAGE_KEY = "synapse_ops_approvals_v2";

export class SupabaseApprovalRepository implements IApprovalRepository {
  private getLocalApprovals(): Approval[] {
    if (typeof window === "undefined") return [...MOCK_APPROVALS];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_APPROVALS));
        return [...MOCK_APPROVALS];
      }
      return JSON.parse(data);
    } catch {
      return [...MOCK_APPROVALS];
    }
  }

  private saveLocalApprovals(apps: Approval[]): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
      } catch {}
    }
  }

  private mapRowToApproval(row: any): Approval {
    return {
      id: row.id,
      action: row.action_type,
      riskLevel: row.risk_level as RiskLevel,
      reason: row.description,
      requestedByAgent: "Autonomous Agent",
      requestedByAgentId: "agent-sales",
      targetEntity: row.payload?.recipient || row.payload?.domain || "System Resource",
      status: row.status as ApprovalStatus,
      timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      details: {
        description: row.description,
        payloadPreview: row.payload || {},
        estimatedCost: row.payload?.cost || "$0.00",
        safetyChecksPassed: [
          "Policy verification passed",
          "Sandbox safety checked",
        ],
      },
      environment: row.environment || row.payload?.environment || "CONTROLLED_TEST_EXTERNAL_EFFECT",
    };
  }

  async getAll(): Promise<Approval[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalApprovals();
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("approvals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return this.getLocalApprovals();
    }
    return (data as any[]).map(this.mapRowToApproval);
  }

  async getById(id: string): Promise<Approval | null> {
    if (!isSupabaseConfigured()) {
      const local = this.getLocalApprovals();
      return local.find(a => a.id === id) || null;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase.from("approvals").select("*").eq("id", id).single();
    if (error || !data) return null;
    return this.mapRowToApproval(data);
  }

  async create(approval: { taskId?: string; action: string; description: string; riskLevel: RiskLevel; payload?: any }): Promise<Approval> {
    const newId = `APR-${Math.floor(200 + Math.random() * 800)}`;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const newApp: Approval = {
        id: newId,
        action: approval.action,
        riskLevel: approval.riskLevel,
        reason: approval.description,
        requestedByAgent: "Assigned Agent",
        requestedByAgentId: "agent-sales",
        targetEntity: approval.payload?.recipient || approval.payload?.target || "Target Workflow",
        status: "pending",
        timestamp: "Just now",
        details: {
          description: approval.description,
          payloadPreview: approval.payload || {},
          safetyChecksPassed: ["Policy threshold verified"]
        }
      };
      const list = [newApp, ...this.getLocalApprovals()];
      this.saveLocalApprovals(list);
      return newApp;
    }

    const supabase = getSupabaseClient()!;
    const insertPayload: any = {
      id: newId,
      task_id: approval.taskId || null,
      action_type: approval.action,
      description: approval.description,
      risk_level: approval.riskLevel,
      payload: approval.payload || null,
      status: "pending",
      created_at: now
    };

    const { data, error } = await supabase
      .from("approvals")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseApprovalRepository.create] error:", error);
      return this.create(approval);
    }
    return this.mapRowToApproval(data);
  }

  async updateStatus(id: string, status: ApprovalStatus): Promise<Approval> {
    if (!isSupabaseConfigured()) {
      const list = this.getLocalApprovals();
      const match = list.find(a => a.id === id);
      if (!match) throw new Error(`Approval ${id} not found`);
      match.status = status;
      this.saveLocalApprovals(list);
      return match;
    }

    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("approvals")
      .update({
        status,
        resolved_at: new Date().toISOString()
      } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseApprovalRepository.updateStatus] error:", error);
      const list = this.getLocalApprovals();
      const match = list.find(a => a.id === id)!;
      match.status = status;
      this.saveLocalApprovals(list);
      return match;
    }
    return this.mapRowToApproval(data);
  }
}

export const approvalRepository: IApprovalRepository = new SupabaseApprovalRepository();
