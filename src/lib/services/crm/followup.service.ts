import { crmRepository, CRMLead, CRMOpportunity } from "../../repositories/crm.repository";
import { opportunityHealthService } from "./opportunity-health.service";

export interface FollowUpTask {
  taskId: string;
  organizationId: string;
  leadId?: string;
  opportunityId?: string;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggestedAction: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "EXECUTED" | "DISMISSED";
  operatorChoice?: "APPROVE_AND_SEND" | "EDIT" | "DISMISS";
  createdAt: string;
}

export class FollowUpService {
  private tasks: FollowUpTask[] = [];

  generateFollowUpTasks(organizationId: string): FollowUpTask[] {
    const opps = crmRepository.listOpportunities(organizationId);
    const leads = crmRepository.listLeads(organizationId);
    const newTasks: FollowUpTask[] = [];

    // 1. Opportunity checks
    for (const opp of opps) {
      const health = opportunityHealthService.assessHealth(opp.opportunityId, organizationId);
      if (opp.stage === "PROPOSAL_PENDING") {
        newTasks.push({
          taskId: `TASK-FU-${opp.opportunityId.slice(-4)}-1`,
          organizationId,
          leadId: opp.leadId,
          opportunityId: opp.opportunityId,
          reason: "Pricing request / commercial intent verified. Proposal draft required.",
          priority: "HIGH",
          suggestedAction: "Draft and review custom proposal based on client scope.",
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
        });
      } else if (opp.stage === "PROPOSAL_SENT") {
        newTasks.push({
          taskId: `TASK-FU-${opp.opportunityId.slice(-4)}-2`,
          organizationId,
          leadId: opp.leadId,
          opportunityId: opp.opportunityId,
          reason: "Proposal sent to prospect; awaiting decision.",
          priority: health.health === "AT_RISK" ? "HIGH" : "MEDIUM",
          suggestedAction: "Check proposal view status and schedule gentle follow-up check-in.",
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 2. Lead checks
    for (const lead of leads) {
      if (lead.lifecycleStage === "VERIFIED" && lead.qualificationState === "PENDING") {
        newTasks.push({
          taskId: `TASK-FU-${lead.leadId.slice(-4)}-Q`,
          organizationId,
          leadId: lead.leadId,
          reason: "Verified business lead requires qualification triage.",
          priority: "MEDIUM",
          suggestedAction: "Evaluate industry fit and prepare outreach strategy.",
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.tasks = newTasks;
    return newTasks;
  }

  reviewTask(taskId: string, choice: "APPROVE_AND_SEND" | "EDIT" | "DISMISS", operator: string): FollowUpTask {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) throw new Error(`Follow-up task ${taskId} not found.`);
    task.operatorChoice = choice;
    task.status = choice === "APPROVE_AND_SEND" ? "APPROVED" : choice === "DISMISS" ? "DISMISSED" : "PENDING_APPROVAL";
    return task;
  }

  approveTask(taskId: string, operator: string): FollowUpTask {
    return this.reviewTask(taskId, "APPROVE_AND_SEND", operator);
  }
}

export const followUpService = new FollowUpService();