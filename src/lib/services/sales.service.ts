import { Task, Lead } from "@/data/types";
import { taskRepository } from "../repositories/task.repository";
import { leadRepository } from "../repositories/lead.repository";
import { activityRepository } from "../repositories/activity.repository";
import { agentRepository } from "../repositories/agent.repository";
import { auditRepository, WebsiteAuditRecord } from "../repositories/audit.repository";
import { redesignRepository, RedesignProjectRecord } from "../repositories/redesign.repository";
import { deploymentRepository, DeploymentRecord } from "../repositories/deployment.repository";
import { outreachRepository, OutreachDraftRecord } from "../repositories/outreach.repository";
import { outreachDraftGenerator, SenderIdentity } from "./sales/outreach-draft.generator";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

export class SalesService {
  private getApiKey(customApiKey?: string): string {
    const key =
      customApiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "Gemini API key is required for Sales Agent drafting. Please configure GEMINI_API_KEY in .env.local."
      );
    }
    return key;
  }

  private getSenderIdentity(): SenderIdentity {
    return {
      name: "Alex Mercer",
      title: "Principal Digital Architect",
      company: MOCK_BUSINESS_SETTINGS.businessName || "Synapse Web Modernization Engine",
      email: "alex@synapseops.internal",
    };
  }

  async checkEligibility(leadId: string): Promise<{
    eligible: boolean;
    lead: Lead;
    redesignProject?: RedesignProjectRecord;
    deployment?: DeploymentRecord;
    reason?: string;
  }> {
    const lead = await leadRepository.getById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found.`);

    // 1. Check redesign project
    const redesigns = await redesignRepository.getByLeadId(leadId);
    const approvedRedesign = redesigns.find((r) => r.status === "approved") || redesigns[0];
    if (!approvedRedesign || approvedRedesign.status !== "approved") {
      return {
        eligible: false,
        lead,
        reason: `Lead ${lead.company} does not have an approved redesign concept. (Current status: ${approvedRedesign?.status || "none"})`,
      };
    }

    // 2. Check preview deployment
    const deployments = await deploymentRepository.getByRedesignId(approvedRedesign.id);
    const readyDeployment = deployments.find((d) => d.status === "ready" && d.previewUrl) || deployments[0];
    if (!readyDeployment || readyDeployment.status !== "ready" || !readyDeployment.previewUrl) {
      return {
        eligible: false,
        lead,
        redesignProject: approvedRedesign,
        reason: `Lead ${lead.company} does not have a READY preview deployment with a live URL. (Deployment status: ${readyDeployment?.status || "none"})`,
      };
    }

    return {
      eligible: true,
      lead,
      redesignProject: approvedRedesign,
      deployment: readyDeployment,
    };
  }

  async prepareOutreachTask(leadId: string): Promise<Task> {
    const eligibility = await this.checkEligibility(leadId);
    if (!eligibility.eligible) {
      throw new Error(`Outreach eligibility check failed: ${eligibility.reason}`);
    }

    const { lead, redesignProject, deployment } = eligibility;

    const task = await taskRepository.create({
      title: `Draft Personalized Outreach: ${lead.company}`,
      description: `Sales Agent task to formulate a respectful, evidence-grounded cold outreach email referencing real audit findings and live preview URL (${deployment!.previewUrl}) for ${lead.company}.`,
      type: "outreach_draft",
      status: "queued",
      priority: "high",
      assignedAgentId: "agent-sales",
      targetLeadId: lead.id,
      input: {
        leadId: lead.id,
        redesignProjectId: redesignProject!.id,
        deploymentId: deployment!.id,
        companyName: lead.company,
        website: lead.website,
        previewUrl: deployment!.previewUrl,
        industry: lead.industry,
      },
    });

    await activityRepository.add({
      type: "task_created",
      title: `Outreach Drafting Task Queued: ${lead.company}`,
      description: `Queued personalized outreach drafting task (${task.id}) for Sales Agent.`,
      level: "info",
      agentId: "agent-sales",
      agentName: "Sales Agent",
      metadata: { taskId: task.id, leadId: lead.id, company: lead.company },
    });

    return task;
  }

  async executeOutreachDrafting(
    taskId: string,
    customApiKey?: string
  ): Promise<{
    task: Task;
    outreachDraft: OutreachDraftRecord;
  }> {
    const task = await taskRepository.getById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    const now = new Date().toISOString();
    await taskRepository.update(taskId, {
      status: "running",
      startedAt: now,
      error: undefined,
    });
    await agentRepository.updateStatus("agent-sales", "running");

    await activityRepository.add({
      type: "task_started",
      title: `Sales Agent: Drafting ${task.id}`,
      description: `Sales Agent formulating personalized outreach package for "${task.input?.companyName || task.title}".`,
      level: "info",
      agentId: "agent-sales",
      agentName: "Sales Agent",
      metadata: { taskId: task.id },
    });

    try {
      const apiKey = this.getApiKey(customApiKey);

      // Load lead and audit evidence
      const leadId = task.targetLeadId || task.input?.leadId;
      let lead: Lead | null = null;
      if (leadId) lead = await leadRepository.getById(leadId);
      if (!lead) {
        lead = {
          id: leadId || "LEAD-TMP",
          company: task.input?.companyName || "Target Company",
          website: task.input?.website || "https://example.com",
          industry: task.input?.industry || "Logistics",
          websiteScore: 45,
          opportunityScore: 90,
          status: "Mockup Ready",
          detectedIssues: ["Mobile responsiveness", "Conversion friction"],
          estimatedDealValue: "$6,500",
          discoveredAt: now,
        };
      }

      let audit: WebsiteAuditRecord | null = null;
      if (leadId) {
        const audits = await auditRepository.getByLeadId(leadId);
        if (audits.length > 0) audit = audits[0];
      }

      let redesign: RedesignProjectRecord | null = null;
      if (task.input?.redesignProjectId) {
        redesign = await redesignRepository.getById(task.input.redesignProjectId);
      }
      if (!redesign && leadId) {
        const redesigns = await redesignRepository.getByLeadId(leadId);
        if (redesigns.length > 0) redesign = redesigns[0];
      }

      const previewUrl =
        task.input?.previewUrl ||
        redesign?.previewPath ||
        "https://synapse-preview-apex-logistics-5cgde481s-sindous.vercel.app";

      const sender = this.getSenderIdentity();

      // Generate Draft
      const draftData = await outreachDraftGenerator.generateDraft(
        lead,
        audit,
        redesign,
        previewUrl,
        sender,
        apiKey
      );

      // Store in repository
      const outreachDraft = await outreachRepository.create({
        leadId: lead.id,
        taskId: task.id,
        redesignProjectId: redesign ? redesign.id : undefined,
        deploymentId: task.input?.deploymentId,
        companyName: lead.company,
        subject: draftData.subject,
        body: draftData.emailBody,
        followUp: draftData.followUp,
        personalization: draftData.personalization,
        previewUrl,
        status: "waiting_approval",
      });

      // Update task to waiting_approval
      const deliverableOutput = {
        draftId: outreachDraft.id,
        companyName: lead.company,
        website: lead.website,
        previewUrl,
        subject: outreachDraft.subject,
        emailBody: outreachDraft.body,
        followUp: outreachDraft.followUp,
        personalization: outreachDraft.personalization,
        status: "waiting_approval",
      };

      const updatedTask = await taskRepository.update(taskId, {
        status: "waiting_approval",
        output: deliverableOutput,
        error: undefined,
      });

      await agentRepository.updateStatus("agent-sales", "idle");

      await activityRepository.add({
        type: "task_status_changed",
        title: `Outreach Draft Ready for Review: ${lead.company}`,
        description: `Sales Agent synthesized personalized cold outreach email referencing real audit findings and live preview URL. Awaiting operator approval.`,
        level: "warning",
        agentId: "agent-sales",
        agentName: "Sales Agent",
        metadata: {
          taskId: task.id,
          draftId: outreachDraft.id,
          company: lead.company,
          status: "waiting_approval",
        },
      });

      return {
        task: updatedTask,
        outreachDraft,
      };
    } catch (err: any) {
      console.error("[SalesService.executeOutreachDrafting] error:", err);

      const failedTask = await taskRepository.update(taskId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err.message || "Outreach drafting failed.",
      });

      await agentRepository.updateStatus("agent-sales", "idle");

      await activityRepository.add({
        type: "task_failed",
        title: `Sales Agent Failed: ${task.id}`,
        description: `Outreach drafting failed: ${err.message}`,
        level: "error",
        agentId: "agent-sales",
        agentName: "Sales Agent",
        metadata: { taskId: task.id, error: err.message },
      });

      throw new Error(err.message || "Outreach drafting failed.");
    }
  }

  async approveDraft(draftId: string): Promise<OutreachDraftRecord> {
    const draft = await outreachRepository.getById(draftId);
    if (!draft) throw new Error(`Outreach draft ${draftId} not found.`);

    const now = new Date().toISOString();
    const updated = await outreachRepository.updateStatus(draftId, "approved", now);

    // Update task
    if (draft.taskId) {
      await taskRepository.update(draft.taskId, {
        status: "completed",
        completedAt: now,
      });
    }

    // Update lead status to Outreach Ready
    if (draft.leadId) {
      await leadRepository.updateStatus(draft.leadId, "Contacted");
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Operator Approved Outreach Draft: ${draft.companyName}`,
      description: `Operator authorized personalized outreach email (${draft.id}). Marked lead as Outreach Ready. (No external communications dispatched in Phase 9).`,
      level: "success",
      agentName: "Human Operator",
      metadata: { draftId, company: draft.companyName },
    });

    return updated;
  }

  async updateDraft(
    draftId: string,
    updates: { subject?: string; body?: string; followUp?: string }
  ): Promise<OutreachDraftRecord> {
    const draft = await outreachRepository.getById(draftId);
    if (!draft) throw new Error(`Outreach draft ${draftId} not found.`);

    const updated = await outreachRepository.update(draftId, updates);

    // Update task output if attached
    if (draft.taskId) {
      const task = await taskRepository.getById(draft.taskId);
      if (task && task.output) {
        await taskRepository.update(draft.taskId, {
          output: {
            ...task.output,
            subject: updated.subject,
            emailBody: updated.body,
            followUp: updated.followUp,
          },
        });
      }
    }

    return updated;
  }

  async rejectDraft(draftId: string, reason?: string): Promise<OutreachDraftRecord> {
    const draft = await outreachRepository.getById(draftId);
    if (!draft) throw new Error(`Outreach draft ${draftId} not found.`);

    const updated = await outreachRepository.updateStatus(draftId, "rejected");

    if (draft.taskId) {
      await taskRepository.update(draft.taskId, {
        status: "failed",
        error: reason || "Operator rejected outreach draft.",
      });
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Operator Rejected Outreach Draft: ${draft.companyName}`,
      description: `Operator rejected draft (${draft.id}): ${reason || "Needs refinement."}`,
      level: "warning",
      agentName: "Human Operator",
      metadata: { draftId, company: draft.companyName },
    });

    return updated;
  }
}

export const salesService = new SalesService();