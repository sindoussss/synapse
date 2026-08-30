import fs from "fs";
import path from "path";
import { PostDeploymentVerificationRecord, RollbackResult } from "../services/deployment/deployment-adapter";

export type DeploymentState =
  | "DEPLOYMENT_PENDING"
  | "DEPLOYMENT_AUTHORIZED"
  | "DEPLOYING"
  | "DEPLOYED"
  | "VERIFYING"
  | "LIVE"
  | "DEGRADED"
  | "ROLLBACK_PENDING"
  | "ROLLING_BACK"
  | "ROLLED_BACK"
  | "FAILED";

export interface ApprovalBindingRecord {
  approvalId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  releaseCandidateId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  approvedBy: string;
  approvedAt: string;
  status: "ACTIVE" | "INVALIDATED";
  invalidationReason?: string;
}

export interface DeploymentRecord {
  deploymentId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: string;
  releaseCandidateId: string;
  approvalId: string;
  version: number;
  provider: string;
  deploymentUrl: string;
  sourceHash: string;
  manifestHash: string;
  currentState: DeploymentState;
  startedAt: string;
  completedAt?: string;
  verificationId?: string;
  rollbackId?: string;
}

export interface DeploymentAuditLogRecord {
  auditId: string;
  timestamp: string;
  actor: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: string;
  releaseCandidateId: string;
  approvalId?: string;
  deploymentId?: string;
  action: string;
  result: "SUCCESS" | "BLOCKED" | "FAILED";
  reason?: string;
}

export class DeploymentOperationsRepository {
  private approvalsCache = path.resolve(process.cwd(), ".deployment_approvals_cache.json");
  private deploymentsCache = path.resolve(process.cwd(), ".deployment_records_cache.json");
  private auditsCache = path.resolve(process.cwd(), ".deployment_audits_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }

  async saveApproval(approval: ApprovalBindingRecord): Promise<ApprovalBindingRecord> {
    const cache = this.readCache<ApprovalBindingRecord>(this.approvalsCache);
    cache.unshift(approval);
    this.writeCache(this.approvalsCache, cache);
    return approval;
  }

  async getApproval(approvalId: string): Promise<ApprovalBindingRecord | null> {
    const cache = this.readCache<ApprovalBindingRecord>(this.approvalsCache);
    return cache.find((a) => a.approvalId === approvalId) || null;
  }

  async saveDeployment(deployment: DeploymentRecord): Promise<DeploymentRecord> {
    const cache = this.readCache<DeploymentRecord>(this.deploymentsCache);
    const idx = cache.findIndex((d) => d.deploymentId === deployment.deploymentId);
    if (idx >= 0) cache[idx] = deployment;
    else cache.unshift(deployment);
    this.writeCache(this.deploymentsCache, cache);
    return deployment;
  }

  async getDeployment(deploymentId: string): Promise<DeploymentRecord | null> {
    const cache = this.readCache<DeploymentRecord>(this.deploymentsCache);
    return cache.find((d) => d.deploymentId === deploymentId) || null;
  }

  async getDeploymentsByProject(projectId: string): Promise<DeploymentRecord[]> {
    const cache = this.readCache<DeploymentRecord>(this.deploymentsCache);
    return cache.filter((d) => d.projectId === projectId);
  }

  async recordAudit(audit: DeploymentAuditLogRecord): Promise<DeploymentAuditLogRecord> {
    const cache = this.readCache<DeploymentAuditLogRecord>(this.auditsCache);
    cache.unshift(audit);
    this.writeCache(this.auditsCache, cache);
    return audit;
  }

  async getAudits(projectId: string): Promise<DeploymentAuditLogRecord[]> {
    const cache = this.readCache<DeploymentAuditLogRecord>(this.auditsCache);
    return cache.filter((a) => a.projectId === projectId);
  }
}

export const deploymentOperationsRepository = new DeploymentOperationsRepository();
