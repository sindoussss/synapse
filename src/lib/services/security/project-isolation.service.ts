export interface IsolationContext {
  organizationId: string;
  workspaceId: string;
  projectId: string;
  clientId: string;
  snapshotId?: string;
  releaseCandidateId?: string;
  deploymentId?: string;
}

export class ProjectIsolationService {
  validateIsolation(caller: IsolationContext, target: IsolationContext): { allowed: boolean; violationType?: string; reason?: string } {
    if (caller.organizationId !== target.organizationId) {
      return {
        allowed: false,
        violationType: "TENANT_BOUNDARY_VIOLATION",
        reason: `Caller tenant '${caller.organizationId}' cannot access target tenant '${target.organizationId}'.`,
      };
    }

    if (caller.workspaceId !== target.workspaceId) {
      return {
        allowed: false,
        violationType: "WORKSPACE_BOUNDARY_VIOLATION",
        reason: `Caller workspace '${caller.workspaceId}' cannot access target workspace '${target.workspaceId}'.`,
      };
    }

    if (caller.projectId !== target.projectId) {
      return {
        allowed: false,
        violationType: "PROJECT_BOUNDARY_VIOLATION",
        reason: `Caller project '${caller.projectId}' cannot access target project '${target.projectId}'.`,
      };
    }

    if (caller.clientId !== target.clientId) {
      return {
        allowed: false,
        violationType: "CLIENT_ISOLATION_VIOLATION",
        reason: `Caller client '${caller.clientId}' cannot access target client '${target.clientId}'.`,
      };
    }

    return { allowed: true };
  }

  validateEvidenceScope(evidenceProjectId: string, targetProjectId: string): { allowed: boolean; violationType?: string } {
    if (evidenceProjectId !== targetProjectId) {
      return { allowed: false, violationType: "EVIDENCE_SCOPE_VIOLATION" };
    }
    return { allowed: true };
  }

  validateApprovalScope(approvalProjectId: string, targetProjectId: string): { allowed: boolean; violationType?: string } {
    if (approvalProjectId !== targetProjectId) {
      return { allowed: false, violationType: "APPROVAL_SCOPE_VIOLATION" };
    }
    return { allowed: true };
  }
}

export const projectIsolationService = new ProjectIsolationService();
