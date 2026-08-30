import fs from "fs";
import path from "path";
import { redesignRepository } from "../repositories/redesign.repository";
import { deploymentRepository, DeploymentRecord } from "../repositories/deployment.repository";
import { activityRepository } from "../repositories/activity.repository";
import { approvalRepository } from "../repositories/approval.repository";
import { vercelDeploymentProvider } from "../deployment/providers/vercel.provider";

export class DeploymentService {
  async requestPreviewDeployment(redesignProjectId: string): Promise<{
    deployment: DeploymentRecord;
    approvalId: string;
  }> {
    const project = await redesignRepository.getById(redesignProjectId);
    if (!project) {
      throw new Error(`Redesign project ${redesignProjectId} not found.`);
    }

    if (project.status !== "approved") {
      throw new Error(
        `Redesign concept for ${project.companyName} is in "${project.status}" status. Human operator must approve the concept before requesting deployment.`
      );
    }

    const now = new Date().toISOString();

    // 1. Create deployment record with status pending_approval
    const deployment = await deploymentRepository.create({
      redesignProjectId: project.id,
      leadId: project.leadId,
      taskId: project.taskId,
      provider: "vercel",
      deploymentType: "preview",
      status: "pending_approval",
      buildLogs: [`[${now}] Preview deployment requested by operator. Awaiting deployment authorization.`],
      validationResults: project.validationResults || { valid: true, checks: [] },
      requestedAt: now,
    });

    // 2. Create approval item
    const approval = await approvalRepository.create({
      taskId: project.taskId,
      action: "Preview Deployment Authorization",
      description: `Deploy isolated Next.js preview website for ${project.companyName} to Vercel Sandbox.`,
      riskLevel: "medium",
      payload: {
        deploymentId: deployment.id,
        redesignProjectId: project.id,
        companyName: project.companyName,
        provider: "Vercel",
        deploymentType: "Preview",
        filesCount: project.generatedFiles?.length || 3,
      },
    });

    // 3. Log Activity
    await activityRepository.add({
      type: "approval_event",
      title: `Preview Deployment Requested: ${project.companyName}`,
      description: `Deployment request created (${deployment.id}). Awaiting human operator deployment confirmation.`,
      level: "warning",
      agentName: "Human Operator",
      metadata: {
        deploymentId: deployment.id,
        redesignProjectId: project.id,
        company: project.companyName,
      },
    });

    return {
      deployment,
      approvalId: approval.id,
    };
  }

  async approveDeployment(deploymentId: string): Promise<DeploymentRecord> {
    const deployment = await deploymentRepository.getById(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment record ${deploymentId} not found.`);
    }

    if (deployment.status !== "pending_approval" && deployment.status !== "failed") {
      throw new Error(`Deployment ${deploymentId} is in "${deployment.status}" status (expected "pending_approval").`);
    }

    const project = await redesignRepository.getById(deployment.redesignProjectId);
    if (!project) {
      throw new Error(`Redesign project ${deployment.redesignProjectId} not found.`);
    }

    const now = new Date().toISOString();

    // 1. Mark status approved & building
    await deploymentRepository.update(deploymentId, {
      status: "building",
      approvedAt: now,
      startedAt: now,
      buildLogs: [...deployment.buildLogs, `[${now}] Deployment authorized by operator. Beginning build validation...`],
    });

    // 2. Locate isolated project directory
    const cleanLeadId = (project.leadId || "lead-unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    let projectDir = path.resolve(process.cwd(), "generated-sites", cleanLeadId);

    try {
      if (fs.existsSync(projectDir)) {
        const entries = fs.readdirSync(projectDir);
        if (entries.length > 0) {
          projectDir = path.join(projectDir, entries[0]);
        }
      }
    } catch {}

    // 3. Execute Vercel Deployment Provider
    const deployResult = await vercelDeploymentProvider.deployPreview(projectDir, {
      projectName: project.companyName,
      companyName: project.companyName,
      leadId: project.leadId,
      redesignProjectId: project.id,
    });

    // 4. Update deployment state
    const completedAt = new Date().toISOString();
    const updated = await deploymentRepository.update(deploymentId, {
      status: deployResult.status,
      providerDeploymentId: deployResult.providerDeploymentId,
      previewUrl: deployResult.previewUrl,
      buildLogs: [...deployment.buildLogs, ...deployResult.buildLogs],
      validationResults: deployResult.validation,
      completedAt: deployResult.success ? completedAt : undefined,
      failedAt: deployResult.success ? undefined : completedAt,
      error: deployResult.error,
    });

    // 5. If successful, update redesign project preview_path
    if (deployResult.success && deployResult.previewUrl) {
      await redesignRepository.updateStatus(project.id, "approved");
    }

    // 6. Log Activity
    await activityRepository.add({
      type: deployResult.success ? "task_completed" : "task_failed",
      title: deployResult.success
        ? `Live Preview Deployed: ${project.companyName}`
        : `Deployment Failed: ${project.companyName}`,
      description: deployResult.success
        ? `Successfully deployed preview to Vercel: ${deployResult.previewUrl}`
        : `Deployment failed: ${deployResult.error}`,
      level: deployResult.success ? "success" : "error",
      agentName: "Developer Agent",
      metadata: {
        deploymentId,
        previewUrl: deployResult.previewUrl || "none",
        provider: "Vercel",
      },
    });

    return updated;
  }

  async rejectDeployment(deploymentId: string, reason?: string): Promise<DeploymentRecord> {
    const deployment = await deploymentRepository.getById(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment record ${deploymentId} not found.`);
    }

    const updated = await deploymentRepository.update(deploymentId, {
      status: "cancelled",
      error: reason || "Operator cancelled deployment.",
      failedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Deployment Cancelled: ${deployment.id}`,
      description: `Operator rejected preview deployment: ${reason || "Cancelled by operator."}`,
      level: "warning",
      agentName: "Human Operator",
      metadata: { deploymentId },
    });

    return updated;
  }
}

export const deploymentService = new DeploymentService();