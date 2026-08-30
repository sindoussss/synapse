
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { INITIAL_TASKS } from "@/data/tasks";
import { MOCK_APPROVALS } from "@/data/approvals";

export async function seedSupabaseIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { seeded: false, message: "Supabase is not configured" };
  }
  const supabase = getSupabaseClient();
  if (!supabase) return { seeded: false, message: "No client" };

  try {
    const { data: existingAgents, error: agentCheckErr } = await supabase
      .from("agents")
      .select("id");

    if (agentCheckErr) {
      console.warn("Could not check agents table", agentCheckErr);
      return { seeded: false, message: agentCheckErr.message };
    }

    if (!existingAgents || existingAgents.length === 0) {
      console.log("[Supabase Seed] Seeding 5 initial autonomous agents...");
      const agentInserts = MOCK_AGENTS.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status,
        model_provider: a.model.includes("Groq") ? "Groq" : a.model.includes("Ollama") ? "Ollama Local" : "Google Cloud",
        model_name: a.model,
      }));

      await supabase.from("agents").insert(agentInserts as any);

      // Seed initial leads
      const leadInserts = MOCK_LEADS.map((l) => ({
        id: l.id,
        company_name: l.company,
        website: l.website,
        industry: l.industry,
        website_score: l.websiteScore,
        opportunity_score: l.opportunityScore,
        status: l.status,
        notes: l.detectedIssues.join(", "),
      }));
      await supabase.from("leads").insert(leadInserts as any);

      // Seed initial tasks
      const taskInserts = INITIAL_TASKS.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        status: t.status,
        priority: t.priority,
        assigned_agent_id: t.assignedAgentId,
        target_lead_id: t.targetLeadId || null,
        parent_task_id: t.parentTaskId || null,
        input: t.input || null,
        output: t.output || null,
        error: t.error || null,
        created_at: t.createdAt,
        started_at: t.startedAt || null,
        completed_at: t.completedAt || null,
      }));
      await supabase.from("tasks").insert(taskInserts as any);

      // Seed initial approvals
      const approvalInserts = MOCK_APPROVALS.map((app) => ({
        id: app.id,
        task_id: "TSK-1003",
        action_type: app.action,
        description: app.reason,
        risk_level: app.riskLevel,
        payload: app.details.payloadPreview,
        status: app.status,
      }));
      await supabase.from("approvals").insert(approvalInserts as any);

      return { seeded: true, message: "Successfully seeded initial agents, leads, tasks, and approvals into Supabase!" };
    }

    return { seeded: false, message: "Supabase database already contains agent records" };
  } catch (err: any) {
    console.error("Seed error:", err);
    return { seeded: false, message: err.message || "Failed to seed Supabase" };
  }
}
