import { Task, Lead } from "@/data/types";
import { taskRepository } from "../repositories/task.repository";
import { leadRepository } from "../repositories/lead.repository";
import { activityRepository } from "../repositories/activity.repository";
import { agentRepository } from "../repositories/agent.repository";
import { auditRepository, WebsiteAuditRecord } from "../repositories/audit.repository";
import { redesignRepository, RedesignProjectRecord, DesignBrief } from "../repositories/redesign.repository";
import { designBriefGenerator } from "./developer/design-brief.generator";
import { codeGenerator } from "./developer/code-generator";

export class DeveloperService {
  private getApiKey(customApiKey?: string): string {
    const key =
      customApiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "Gemini API key is required for Developer Agent execution. Please configure GEMINI_API_KEY in .env.local."
      );
    }
    return key;
  }

  async createMockupTask(leadId: string, forceOverride: boolean = false): Promise<Task> {
    const lead = await leadRepository.getById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found.`);

    // Qualification check
    if (lead.opportunityScore < 40 && !forceOverride) {
      throw new Error(
        `Lead ${lead.company} has an Opportunity Score of ${lead.opportunityScore}/100 (< 40 threshold: SKIP). Redesign concept generation skipped unless manually overridden.`
      );
    }

    const audits = await auditRepository.getByLeadId(lead.id);
    const latestAudit = audits.length > 0 ? audits[0] : null;

    return taskRepository.create({
      title: `Generate Personalized Redesign Concept: ${lead.company}`,
      description: `Developer Agent task to scaffold an evidence-based, responsive Next.js frontend redesign concept addressing audit deficiencies for ${lead.company}.`,
      type: "mockup_development",
      status: "queued",
      priority: "high",
      assignedAgentId: "agent-developer",
      targetLeadId: lead.id,
      input: {
        leadId: lead.id,
        auditId: latestAudit ? latestAudit.id : undefined,
        companyName: lead.company,
        website: lead.website,
        industry: lead.industry,
        opportunityScore: lead.opportunityScore,
      },
    });
  }

  async executeMockupDevelopment(
    taskId: string,
    customApiKey?: string
  ): Promise<{
    task: Task;
    redesignProject: RedesignProjectRecord;
  }> {
    const task = await taskRepository.getById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const typeNorm = task.type.toLowerCase().replace(/[\s_-]/g, "");
    if (!typeNorm.includes("mockup") && !typeNorm.includes("dev")) {
      throw new Error(`Task ${taskId} is of type "${task.type}". Developer Agent only executes mockup_development tasks.`);
    }

    // 1. Set task & agent to running
    const now = new Date().toISOString();
    await taskRepository.update(taskId, {
      status: "running",
      startedAt: now,
      error: undefined,
    });
    await agentRepository.updateStatus("agent-developer", "running");

    await activityRepository.add({
      type: "task_started",
      title: `Developer Agent: Coding ${task.id}`,
      description: `Developer Agent initiated personalized Next.js redesign concept generation for "${task.input?.companyName || task.title}".`,
      level: "info",
      agentId: "agent-developer",
      agentName: "Developer Agent",
      metadata: { taskId: task.id },
    });

    try {
      const apiKey = this.getApiKey(customApiKey);

      // 2. Load lead and audit evidence
      const leadId = task.targetLeadId || task.input?.leadId;
      let lead: Lead | null = null;
      if (leadId) {
        lead = await leadRepository.getById(leadId);
      }
      if (!lead) {
        lead = {
          id: leadId || "LEAD-TMP",
          company: task.input?.companyName || "Target Company",
          website: task.input?.website || "https://example.com",
          industry: task.input?.industry || "Real Estate",
          websiteScore: 45,
          opportunityScore: 90,
          status: "Audited",
          detectedIssues: ["Mobile responsiveness", "Conversion friction"],
          estimatedDealValue: "$6,500",
          discoveredAt: now,
          location: "Philippines",
        };
      }

      let audit: WebsiteAuditRecord | null = null;
      if (leadId) {
        const audits = await auditRepository.getByLeadId(leadId);
        if (audits.length > 0) audit = audits[0];
      }

      // 3. Formulate structured Design Brief
      const brief: DesignBrief = await designBriefGenerator.generateBrief(lead, audit, apiKey);

      // 4. Generate isolated concept code & files
      const projectId = `proj-${Date.now()}`;
      const genResult = await codeGenerator.generateConceptProject(
        lead,
        audit,
        brief,
        projectId,
        apiKey
      );

      // 5. Store redesign project record
      const redesignProject = await redesignRepository.create({
        leadId: lead.id,
        auditId: audit ? audit.id : undefined,
        taskId: task.id,
        companyName: lead.company,
        status: "waiting_approval",
        designBrief: brief,
        generatedFiles: genResult.files,
        previewPath: `/api/developer/preview/${projectId}`,
        validationResults: genResult.validation,
      });

      // 6. Update task to waiting_approval with rich deliverable output
      const deliverableOutput = {
        projectId: redesignProject.id,
        companyName: lead.company,
        website: lead.website,
        status: "waiting_approval",
        designBrief: brief,
        generatedFiles: genResult.files,
        previewUrl: redesignProject.previewPath,
        validationResults: genResult.validation,
      };

      const updatedTask = await taskRepository.update(taskId, {
        status: "waiting_approval",
        output: deliverableOutput,
        error: undefined,
      });

      // 7. Reset Developer Agent to idle
      await agentRepository.updateStatus("agent-developer", "idle");

      // 8. Log activity
      await activityRepository.add({
        type: "task_status_changed",
        title: `Redesign Concept Ready for Review: ${task.id}`,
        description: `Developer Agent generated runnable Next.js concept for ${lead.company} (3 files generated, validation PASSED). Awaiting operator approval.`,
        level: "warning",
        agentId: "agent-developer",
        agentName: "Developer Agent",
        metadata: {
          taskId: task.id,
          projectId: redesignProject.id,
          company: lead.company,
          status: "waiting_approval",
        },
      });

      return {
        task: updatedTask,
        redesignProject,
      };
    } catch (err: any) {
      console.error("[DeveloperService.executeMockupDevelopment] error:", err);

      const failedTask = await taskRepository.update(taskId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err.message || "Concept generation failed.",
      });

      await agentRepository.updateStatus("agent-developer", "idle");

      await activityRepository.add({
        type: "task_failed",
        title: `Developer Agent Failed: ${task.id}`,
        description: `Concept generation failed: ${err.message}`,
        level: "error",
        agentId: "agent-developer",
        agentName: "Developer Agent",
        metadata: { taskId: task.id, error: err.message },
      });

      throw new Error(err.message || "Concept generation failed.");
    }
  }

  async approveRedesign(projectId: string): Promise<RedesignProjectRecord> {
    const project = await redesignRepository.getById(projectId);
    if (!project) throw new Error(`Redesign project ${projectId} not found.`);

    const now = new Date().toISOString();
    const updated = await redesignRepository.updateStatus(projectId, "approved", now);

    // Update task
    if (project.taskId) {
      await taskRepository.update(project.taskId, {
        status: "completed",
        completedAt: now,
      });
    }

    // Update lead status to Mockup Ready
    if (project.leadId) {
      await leadRepository.updateStatus(project.leadId, "Mockup Ready");
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Operator Approved Redesign: ${project.companyName}`,
      description: `Operator approved frontend concept (${project.id}). Marked status as Mockup Ready for future outreach.`,
      level: "success",
      agentName: "Human Operator",
      metadata: { projectId, company: project.companyName },
    });

    return updated;
  }

  async rejectRedesign(projectId: string, reason?: string): Promise<RedesignProjectRecord> {
    const project = await redesignRepository.getById(projectId);
    if (!project) throw new Error(`Redesign project ${projectId} not found.`);

    const updated = await redesignRepository.updateStatus(projectId, "rejected");

    if (project.taskId) {
      await taskRepository.update(project.taskId, {
        status: "failed",
        error: reason || "Operator rejected concept design.",
      });
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Operator Rejected Redesign: ${project.companyName}`,
      description: `Operator rejected concept (${project.id}): ${reason || "Needs design revision"}`,
      level: "warning",
      agentName: "Human Operator",
      metadata: { projectId, company: project.companyName },
    });

    return updated;
  }
}

export const developerService = new DeveloperService();