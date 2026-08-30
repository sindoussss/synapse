import { organizationRepository, OrganizationRecord, OrganizationContactRecord, IsolationIncidentRecord } from "../../repositories/organization.repository";
import { projectRepository } from "../../repositories/project.repository";
import { activityRepository } from "../../repositories/activity.repository";
import crypto from "crypto";

export interface ExecutionContext {
  executionId: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  opportunityId?: string;
  taskId?: string;
}

export class MultiTenantService {
  async validateBoundary(params: {
    context: ExecutionContext;
    targetOrgId: string;
    targetProjectId?: string;
    action: string;
    actor?: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    if (params.context.organizationId !== params.targetOrgId) {
      const incident: IsolationIncidentRecord = {
        id: `INC-${Date.now().toString().slice(-6)}`,
        incidentType: "CROSS_CLIENT_WRITE_BLOCKED",
        actor: params.actor || "agent",
        executionId: params.context.executionId,
        sourceOrganizationId: params.context.organizationId,
        targetOrganizationId: params.targetOrgId,
        targetProjectId: params.targetProjectId,
        actionAttempted: params.action,
        blockedAt: new Date().toISOString(),
      };
      await organizationRepository.logIncident(incident);

      try {
        await activityRepository.add({
          agentName: "Security Guard",
          type: "lead_created" as any,
          level: "warning",
          title: `Cross-Client Access Blocked: ${incident.incidentType}`,
          description: `Execution [${params.context.organizationId}] attempted ${params.action} on target [${params.targetOrgId}]. Access denied.`,
        });
      } catch {}

      throw new Error(`Security Violation: Cross-client access blocked! Source org '${params.context.organizationId}' cannot access target org '${params.targetOrgId}'.`);
    }

    if (params.targetProjectId && params.context.projectId && params.context.projectId !== params.targetProjectId) {
      throw new Error(`Security Violation: Cross-project access blocked! Source project '${params.context.projectId}' cannot write to target project '${params.targetProjectId}'.`);
    }

    return { allowed: true };
  }

  async validateCompletedProjectWrite(projectId: string): Promise<void> {
    const project = await projectRepository.getProjectById(projectId);
    if (project && project.status === "completed") {
      throw new Error(`Operational Violation: Project [${project.projectNumber}] is COMPLETED and operationally immutable. Modifications blocked.`);
    }
  }

  async claimTaskLease(params: {
    taskId: string;
    agentId: string;
    organizationId: string;
    projectId?: string;
  }) {
    const now = Date.now();
    const expiresAt = new Date(now + 60000).toISOString(); // 60s lease
    return organizationRepository.claimExecutionLease({
      id: `LSE-${now.toString().slice(-4)}`,
      taskId: params.taskId,
      agentId: params.agentId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      claimedAt: new Date(now).toISOString(),
      expiresAt,
      heartbeatAt: new Date(now).toISOString(),
    });
  }

  async acquireProjectLock(params: {
    projectId: string;
    organizationId: string;
    executionId: string;
  }) {
    const now = Date.now();
    const expiresAt = new Date(now + 30000).toISOString();
    return organizationRepository.acquireWorkspaceLock({
      projectId: params.projectId,
      organizationId: params.organizationId,
      lockedByExecutionId: params.executionId,
      lockedAt: new Date(now).toISOString(),
      expiresAt,
    });
  }
}

export const multiTenantService = new MultiTenantService();