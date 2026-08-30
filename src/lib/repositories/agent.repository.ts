
import { Agent, AgentStatus } from "@/data/types";
import { MOCK_AGENTS } from "@/data/agents";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface IAgentRepository {
  getAll(): Promise<Agent[]>;
  getById(id: string): Promise<Agent | null>;
  updateStatus(id: string, status: AgentStatus): Promise<Agent>;
}

export class SupabaseAgentRepository implements IAgentRepository {
  private mapRowToAgent(row: any): Agent {
    const mockMatch = MOCK_AGENTS.find(a => a.id === row.id);
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status as AgentStatus,
      currentTask: mockMatch ? mockMatch.currentTask : "Active in autonomous pool",
      model: row.model_name || (mockMatch ? mockMatch.model : "gemini-2.5-flash"),
      tasksCompleted: mockMatch ? mockMatch.tasksCompleted : 0,
      uptime: mockMatch ? mockMatch.uptime : "99.9%",
      lastActive: "Live",
      capabilities: mockMatch ? mockMatch.capabilities : ["Autonomous Execution"],
      efficiencyRate: mockMatch ? mockMatch.efficiencyRate : 98.5,
    };
  }

  async getAll(): Promise<Agent[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_AGENTS;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase.from("agents").select("*");

    if (error || !data || data.length === 0) {
      return MOCK_AGENTS;
    }
    return (data as any[]).map(this.mapRowToAgent);
  }

  async getById(id: string): Promise<Agent | null> {
    if (!isSupabaseConfigured()) {
      return MOCK_AGENTS.find(a => a.id === id) || null;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
    if (error || !data) return MOCK_AGENTS.find(a => a.id === id) || null;
    return this.mapRowToAgent(data);
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    if (!isSupabaseConfigured()) {
      const match = MOCK_AGENTS.find(a => a.id === id);
      if (!match) throw new Error(`Agent ${id} not found`);
      match.status = status;
      return match;
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("agents")
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseAgentRepository.updateStatus] error:", error);
      const match = MOCK_AGENTS.find(a => a.id === id)!;
      match.status = status;
      return match;
    }
    return this.mapRowToAgent(data);
  }
}

export const agentRepository: IAgentRepository = new SupabaseAgentRepository();
