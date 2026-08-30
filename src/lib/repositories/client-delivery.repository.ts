import fs from "fs";
import path from "path";

export interface ClientRecord {
  clientId: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  contactEmail: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string;
  updatedAt: string;
}

export interface ClientProjectRecord {
  clientProjectId: string;
  clientId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  status: "INTAKE" | "IN_PROGRESS" | "IN_REVIEW" | "APPROVED" | "DEPLOYED" | "OPERATIONS" | "FAILED";
  releaseCandidateId?: string;
  deploymentId?: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneType =
  | "INTAKE"
  | "REQUIREMENTS"
  | "DESIGN"
  | "IMPLEMENTATION"
  | "QA"
  | "CLIENT_REVIEW"
  | "APPROVAL"
  | "DEPLOYMENT"
  | "HANDOFF"
  | "OPERATIONS";

export interface DeliveryMilestoneRecord {
  milestoneId: string;
  projectId: string;
  clientId: string;
  type: MilestoneType;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  evidenceIds: string[];
  responsibleActor: string;
  startedAt?: string;
  completedAt?: string;
  blockers: string[];
  approvalRequired: boolean;
  approvalGranted?: boolean;
}

export type ChangeRequestStatus =
  | "SUBMITTED"
  | "ANALYZING"
  | "CLARIFICATION_REQUIRED"
  | "AUTHORIZED"
  | "IMPLEMENTING"
  | "QA"
  | "CLIENT_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface ChangeRequestRecord {
  changeRequestId: string;
  projectId: string;
  clientId: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requestedBy: string;
  affectedArea: string;
  requirementClassification: "NEW_FEATURE" | "MODIFICATION" | "BUG_FIX" | "STYLE_TWEAK";
  estimatedComplexity: "LOW" | "MEDIUM" | "HIGH";
  status: ChangeRequestStatus;
  newSnapshotId?: string;
  newReleaseCandidateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentRecord {
  incidentId: string;
  projectId: string;
  deploymentId: string;
  detectedHealthVector: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedRoutes: string[];
  rollbackAvailability: boolean;
  status: "INCIDENT_DETECTED" | "INVESTIGATING" | "MITIGATION" | "RESOLVED" | "POSTMORTEM";
  mitigationAction?: string;
  resolutionSummary?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface VersionHistoryRecord {
  versionNumber: number;
  projectId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  releaseCandidateId: string;
  deploymentId?: string;
  deploymentUrl?: string;
  approvalId?: string;
  qaEvidenceIds: string[];
  healthEvidenceIds: string[];
  status: "ACTIVE_LIVE" | "SUPERSEDED" | "ROLLED_BACK" | "DRAFT";
  createdAt: string;
}

export class ClientDeliveryRepository {
  private clientsFile = path.resolve(process.cwd(), ".client_records_cache.json");
  private clientProjectsFile = path.resolve(process.cwd(), ".client_projects_cache.json");
  private milestonesFile = path.resolve(process.cwd(), ".delivery_milestones_cache.json");
  private changeRequestsFile = path.resolve(process.cwd(), ".change_requests_cache.json");
  private incidentsFile = path.resolve(process.cwd(), ".incidents_cache.json");
  private versionsFile = path.resolve(process.cwd(), ".version_history_cache.json");

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

  async saveClient(client: ClientRecord): Promise<ClientRecord> {
    const cache = this.readCache<ClientRecord>(this.clientsFile);
    const idx = cache.findIndex((c) => c.clientId === client.clientId);
    if (idx >= 0) cache[idx] = client;
    else cache.unshift(client);
    this.writeCache(this.clientsFile, cache);
    return client;
  }

  async getClient(clientId: string): Promise<ClientRecord | null> {
    const cache = this.readCache<ClientRecord>(this.clientsFile);
    return cache.find((c) => c.clientId === clientId) || null;
  }

  async saveClientProject(cp: ClientProjectRecord): Promise<ClientProjectRecord> {
    const cache = this.readCache<ClientProjectRecord>(this.clientProjectsFile);
    const idx = cache.findIndex((p) => p.clientProjectId === cp.clientProjectId);
    if (idx >= 0) cache[idx] = cp;
    else cache.unshift(cp);
    this.writeCache(this.clientProjectsFile, cache);
    return cp;
  }

  async getClientProjects(clientId: string): Promise<ClientProjectRecord[]> {
    const cache = this.readCache<ClientProjectRecord>(this.clientProjectsFile);
    return cache.filter((p) => p.clientId === clientId);
  }

  async getClientProject(projectId: string): Promise<ClientProjectRecord | null> {
    const cache = this.readCache<ClientProjectRecord>(this.clientProjectsFile);
    return cache.find((p) => p.projectId === projectId) || null;
  }

  async saveMilestone(m: DeliveryMilestoneRecord): Promise<DeliveryMilestoneRecord> {
    const cache = this.readCache<DeliveryMilestoneRecord>(this.milestonesFile);
    const idx = cache.findIndex((item) => item.milestoneId === m.milestoneId);
    if (idx >= 0) cache[idx] = m;
    else cache.unshift(m);
    this.writeCache(this.milestonesFile, cache);
    return m;
  }

  async getMilestones(projectId: string): Promise<DeliveryMilestoneRecord[]> {
    const cache = this.readCache<DeliveryMilestoneRecord>(this.milestonesFile);
    return cache.filter((m) => m.projectId === projectId);
  }

  async saveChangeRequest(cr: ChangeRequestRecord): Promise<ChangeRequestRecord> {
    const cache = this.readCache<ChangeRequestRecord>(this.changeRequestsFile);
    const idx = cache.findIndex((item) => item.changeRequestId === cr.changeRequestId);
    if (idx >= 0) cache[idx] = cr;
    else cache.unshift(cr);
    this.writeCache(this.changeRequestsFile, cache);
    return cr;
  }

  async getChangeRequests(projectId: string): Promise<ChangeRequestRecord[]> {
    const cache = this.readCache<ChangeRequestRecord>(this.changeRequestsFile);
    return projectId ? cache.filter((cr) => cr.projectId === projectId) : cache;
  }

  async saveIncident(inc: IncidentRecord): Promise<IncidentRecord> {
    const cache = this.readCache<IncidentRecord>(this.incidentsFile);
    const idx = cache.findIndex((item) => item.incidentId === inc.incidentId);
    if (idx >= 0) cache[idx] = inc;
    else cache.unshift(inc);
    this.writeCache(this.incidentsFile, cache);
    return inc;
  }

  async getIncidents(projectId: string): Promise<IncidentRecord[]> {
    const cache = this.readCache<IncidentRecord>(this.incidentsFile);
    return projectId ? cache.filter((inc) => inc.projectId === projectId) : cache;
  }

  async saveVersion(v: VersionHistoryRecord): Promise<VersionHistoryRecord> {
    const cache = this.readCache<VersionHistoryRecord>(this.versionsFile);
    const idx = cache.findIndex((item) => item.projectId === v.projectId && item.versionNumber === v.versionNumber);
    if (idx >= 0) cache[idx] = v;
    else cache.unshift(v);
    this.writeCache(this.versionsFile, cache);
    return v;
  }

  async getVersions(projectId: string): Promise<VersionHistoryRecord[]> {
    const cache = this.readCache<VersionHistoryRecord>(this.versionsFile);
    return (projectId ? cache.filter((v) => v.projectId === projectId) : cache).sort((a, b) => b.versionNumber - a.versionNumber);
  }
}

export const clientDeliveryRepository = new ClientDeliveryRepository();
