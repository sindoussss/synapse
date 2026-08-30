import { Task } from "@/data/types";
import { CEOPlanOutput } from "../ai/types";
import { modelRouter } from "../ai/model-router";
import { agentRepository } from "../repositories/agent.repository";
import { taskRepository } from "../repositories/task.repository";
import { activityRepository } from "../repositories/activity.repository";
import { entityVerificationService } from "./entity-verification.service";

export class CEOService {
  async planGoal(goal: string): Promise<CEOPlanOutput> {
    const agents = await agentRepository.getAll();
    const rawPlan = await modelRouter.executePlanWithRouting(goal, agents, "agent-ceo");
    
    // Apply deterministic entity verification and evidence gating
    const { sanitizedPlan, validation } = entityVerificationService.validateAndSanitizePlan(rawPlan, goal);
    sanitizedPlan.validation = validation;

    return sanitizedPlan;
  }

  async approveAndCreateTasks(
    plan: CEOPlanOutput,
    originalGoalPrompt: string
  ): Promise<{ createdTasks: Task[]; summary: string }> {
    // Server-side deterministic validation before database insertion
    const { validation } = entityVerificationService.validateAndSanitizePlan(plan, originalGoalPrompt);
    
    if (!validation.valid && validation.errors.length > 0) {
      throw new Error(`PLAN_VALIDATION_FAILED: Cannot inject invalid or unverified tasks into Supabase. Violations: ${validation.errors.join("; ")}`);
    }

    const agents = await agentRepository.getAll();

    const findAgentIdByRole = (role: string): string => {
      const normalizedRole = role.toLowerCase();
      const match = agents.find(
        (a) =>
          a.role.toLowerCase().includes(normalizedRole) ||
          a.name.toLowerCase().includes(normalizedRole) ||
          normalizedRole.includes(a.name.toLowerCase())
      );
      if (match) return match.id;

      if (normalizedRole.includes("research") || normalizedRole.includes("discovery")) return "agent-research";
      if (normalizedRole.includes("analyst") || normalizedRole.includes("audit") || normalizedRole.includes("site")) return "agent-analyst";
      if (normalizedRole.includes("dev") || normalizedRole.includes("mockup") || normalizedRole.includes("code")) return "agent-developer";
      if (normalizedRole.includes("sales") || normalizedRole.includes("outreach") || normalizedRole.includes("email")) return "agent-sales";
      return "agent-research";
    };

    const createdTasks: Task[] = [];

    for (const t of plan.tasks) {
      const agentId = findAgentIdByRole(t.assignedAgentRole);
      const explicitEnv = t.environment || plan.environment || (validation.entityStatus === "UNVERIFIED" ? "CONTROLLED_TEST" : "LIVE_REAL");

      const created = await taskRepository.create({
        title: t.title,
        description: t.description,
        type: t.type as any,
        status: "queued",
        priority: t.priority,
        assignedAgentId: agentId,
        input: t.input,
        environment: explicitEnv,
      });
      createdTasks.push(created);
    }

    await activityRepository.add({
      type: "agent_action",
      title: "CEO Agent: Strategic Plan Approved",
      description: `CEO Agent analyzed goal: "${plan.goalSummary}" and synthesized ${createdTasks.length} operational tasks.`,
      level: "success",
      agentId: "agent-ceo",
      agentName: "CEO Agent",
      metadata: {
        goalPrompt: originalGoalPrompt,
        goalSummary: plan.goalSummary,
        reasoning: plan.reasoningSummary,
        taskCount: createdTasks.length,
        createdTaskIds: createdTasks.map((t) => t.id).join(", "),
        entityVerificationStatus: validation.entityStatus,
      },
    });

    await activityRepository.add({
      type: "task_created",
      title: `Queued ${createdTasks.length} Autonomous Tasks`,
      description: `Operator approved CEO plan. Injected ${createdTasks.length} tasks into execution queue.`,
      level: "info",
      agentName: "Operator",
      metadata: {
        taskIds: createdTasks.map((t) => t.id).join(", "),
      },
    });

    return {
      createdTasks,
      summary: `Successfully generated and queued ${createdTasks.length} tasks in Supabase.`,
    };
  }
}

export const ceoService = new CEOService();