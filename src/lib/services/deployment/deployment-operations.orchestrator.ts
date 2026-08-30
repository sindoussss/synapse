import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  DeploymentAdapter,
  localStagingDeploymentAdapter,
  vercelDeploymentAdapter,
  PostDeploymentVerificationRecord,
  RollbackResult,
} from "./deployment-adapter";
import {
  deploymentOperationsRepository,
  ApprovalBindingRecord,
  DeploymentRecord,
  DeploymentState,
} from "../../repositories/deployment-operations.repository";
import { productionHealthService, ProductionHealthEvaluation } from "./production-health.service";

export interface DeploymentExecutionRequest {
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  releaseCandidateId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  approvalId: string;
  providerChoice: "local_staging" | "vercel";
  files: Record<string, string>;
  actor: string;
}

export interface DeploymentExecutionResponse {
  deploymentId: string;
  projectId: string;
  releaseCandidateId: string;
  status: "DEPLOYMENT_AUTHORIZED" | "DEPLOYED" | "LIVE" | "DEPLOYMENT_BLOCKED" | "ROLLED_BACK" | "FAILED";
  deploymentUrl?: string;
  healthEvaluation?: ProductionHealthEvaluation;
  rollbackResult?: RollbackResult;
  auditTrailId: string;
  blockReason?: string;
}

export class DeploymentOperationsOrchestrator {
  async executeControlledDeployment(req: DeploymentExecutionRequest): Promise<DeploymentExecutionResponse> {
    const deploymentId = `DEP-${Date.now().toString().slice(-4)}`;

    // 1. Audit Start
    await deploymentOperationsRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: req.actor,
      organizationId: req.organizationId,
      projectId: req.projectId,
      workspaceId: req.workspaceId,
      environment: req.environment,
      releaseCandidateId: req.releaseCandidateId,
      approvalId: req.approvalId,
      deploymentId,
      action: "DEPLOYMENT_REQUESTED",
      result: "SUCCESS",
    });

    // 2. Validate Human Approval Binding (Snapshot, Source Hash, Manifest Hash, Tenant, Project)
    const approval = await deploymentOperationsRepository.getApproval(req.approvalId);
    if (!approval || approval.status === "INVALIDATED") {
      const reason = !approval ? "Approval record not found." : `Approval invalidated: ${approval.invalidationReason}`;
      await this.recordFailure(req, deploymentId, "APPROVAL_INVALID", reason);
      return { deploymentId, projectId: req.projectId, releaseCandidateId: req.releaseCandidateId, status: "DEPLOYMENT_BLOCKED", blockReason: reason, auditTrailId: `AUDIT-${Date.now()}` };
    }

    if (approval.organizationId !== req.organizationId || approval.projectId !== req.projectId) {
      const reason = "Cross-tenant / cross-project authorization attempt blocked.";
      await this.recordFailure(req, deploymentId, "TENANT_MISMATCH", reason);
      return { deploymentId, projectId: req.projectId, releaseCandidateId: req.releaseCandidateId, status: "DEPLOYMENT_BLOCKED", blockReason: reason, auditTrailId: `AUDIT-${Date.now()}` };
    }

    if (approval.snapshotId !== req.snapshotId || approval.sourceHash !== req.sourceHash || approval.manifestHash !== req.manifestHash) {
      const reason = "APPROVAL_SNAPSHOT_MISMATCH: Source files or manifest mutated after approval.";
      await this.recordFailure(req, deploymentId, "SNAPSHOT_MISMATCH", reason);
      return { deploymentId, projectId: req.projectId, releaseCandidateId: req.releaseCandidateId, status: "DEPLOYMENT_BLOCKED", blockReason: reason, auditTrailId: `AUDIT-${Date.now()}` };
    }

    // 3. Provider Resolution
    const adapter: DeploymentAdapter = req.providerChoice === "vercel" ? vercelDeploymentAdapter : localStagingDeploymentAdapter;
    if (!adapter.isAvailable()) {
      const reason = "Deployment provider credentials unavailable.";
      await this.recordFailure(req, deploymentId, "PROVIDER_UNAVAILABLE", reason);
      return { deploymentId, projectId: req.projectId, releaseCandidateId: req.releaseCandidateId, status: "DEPLOYMENT_BLOCKED", blockReason: reason, auditTrailId: `AUDIT-${Date.now()}` };
    }

    // 4. Create Initial Deployment Record
    let record: DeploymentRecord = {
      deploymentId,
      projectId: req.projectId,
      organizationId: req.organizationId,
      workspaceId: req.workspaceId,
      environment: req.environment,
      releaseCandidateId: req.releaseCandidateId,
      approvalId: req.approvalId,
      version: 1,
      provider: adapter.name,
      deploymentUrl: "",
      sourceHash: req.sourceHash,
      manifestHash: req.manifestHash,
      currentState: "DEPLOYING",
      startedAt: new Date().toISOString(),
    };
    await deploymentOperationsRepository.saveDeployment(record);

    // 5. Execute Deployment via Adapter
    const deployRes = await adapter.deploy(
      {
        deploymentId,
        projectId: req.projectId,
        organizationId: req.organizationId,
        workspaceId: req.workspaceId,
        environment: req.environment,
        releaseCandidateId: req.releaseCandidateId,
        snapshotId: req.snapshotId,
        sourceHash: req.sourceHash,
        manifestHash: req.manifestHash,
        approvalId: req.approvalId,
      },
      req.files
    );

    if (deployRes.status !== "DEPLOYED") {
      record.currentState = "FAILED";
      await deploymentOperationsRepository.saveDeployment(record);
      return { deploymentId, projectId: req.projectId, releaseCandidateId: req.releaseCandidateId, status: "FAILED", blockReason: deployRes.errorReason, auditTrailId: `AUDIT-${Date.now()}` };
    }

    record.deploymentUrl = deployRes.deploymentUrl;
    record.currentState = "VERIFYING";
    await deploymentOperationsRepository.saveDeployment(record);

    // 6. Post-Deployment Verification
    const verif = await adapter.verifyDeployment(deployRes.deploymentUrl);
    const health = productionHealthService.evaluateHealth(verif, req.projectId);

    if (health.overallHealth === "FAILED") {
      // Auto Rollback
      record.currentState = "ROLLING_BACK";
      const rb = await adapter.rollback(deploymentId, "DEP-PREVIOUS-STABLE");
      record.currentState = "ROLLED_BACK";
      record.rollbackId = rb.rollbackId;
      await deploymentOperationsRepository.saveDeployment(record);

      await deploymentOperationsRepository.recordAudit({
        auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        actor: "Auto Rollback Engine",
        organizationId: req.organizationId,
        projectId: req.projectId,
        workspaceId: req.workspaceId,
        environment: req.environment,
        releaseCandidateId: req.releaseCandidateId,
        deploymentId,
        action: "ROLLBACK_COMPLETED",
        result: "SUCCESS",
        reason: `Critical verification failure: ${health.blockers.join(", ")}`,
      });

      return {
        deploymentId,
        projectId: req.projectId,
        releaseCandidateId: req.releaseCandidateId,
        status: "ROLLED_BACK",
        deploymentUrl: rb.restoredUrl,
        healthEvaluation: health,
        rollbackResult: rb,
        auditTrailId: `AUDIT-${Date.now()}`,
      };
    }

    record.currentState = "LIVE";
    record.completedAt = new Date().toISOString();
    record.verificationId = verif.verificationId;
    await deploymentOperationsRepository.saveDeployment(record);

    await deploymentOperationsRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: req.actor,
      organizationId: req.organizationId,
      projectId: req.projectId,
      workspaceId: req.workspaceId,
      environment: req.environment,
      releaseCandidateId: req.releaseCandidateId,
      deploymentId,
      action: "DEPLOYMENT_COMPLETED",
      result: "SUCCESS",
    });

    return {
      deploymentId,
      projectId: req.projectId,
      releaseCandidateId: req.releaseCandidateId,
      status: "LIVE",
      deploymentUrl: deployRes.deploymentUrl,
      healthEvaluation: health,
      auditTrailId: `AUDIT-${Date.now()}`,
    };
  }

  private async recordFailure(req: DeploymentExecutionRequest, deploymentId: string, action: string, reason: string) {
    await deploymentOperationsRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: req.actor,
      organizationId: req.organizationId,
      projectId: req.projectId,
      workspaceId: req.workspaceId,
      environment: req.environment,
      releaseCandidateId: req.releaseCandidateId,
      approvalId: req.approvalId,
      deploymentId,
      action,
      result: "BLOCKED",
      reason,
    });
  }
}

export const deploymentOperationsOrchestrator = new DeploymentOperationsOrchestrator();
