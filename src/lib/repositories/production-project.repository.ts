import fs from "fs";
import path from "path";

export type ProductionProjectState =
  | "INTAKE"
  | "REQUIREMENTS_PENDING"
  | "REQUIREMENTS_VERIFIED"
  | "DESIGN_PENDING"
  | "DESIGN_APPROVED"
  | "IMPLEMENTATION"
  | "CODE_REVIEW"
  | "VISUAL_REVIEW"
  | "FUNCTIONAL_REVIEW"
  | "SECURITY_REVIEW"
  | "CONTENT_REVIEW"
  | "RELEASE_CANDIDATE"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "DEPLOYMENT_ELIGIBLE"
  | "DEPLOYING"
  | "LIVE"
  | "ROLLED_BACK"
  | "FAILED";

export interface ProjectTimelineEvent {
  eventId: string;
  projectId: string;
  fromState: ProductionProjectState;
  toState: ProductionProjectState;
  timestamp: string;
  actor: string;
  providerModel?: string;
  inputSnapshotId?: string;
  outputSnapshotId?: string;
  evidenceIds: string[];
  failureReason?: string;
  repairCycle: number;
  authorizationContext?: string;
}

export interface ProductionProjectRecord {
  id: string; // e.g. PRJ-2026-0001
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  companyName: string;
  industry: string;
  currentState: ProductionProjectState;
  snapshotId: string;
  manifestHash: string;
  sourceHash: string;
  designBriefId?: string;
  designSystemId?: string;
  changeManifestId?: string;
  codeReviewId?: string;
  visualReviewId?: string;
  releaseCandidateId?: string;
  timeline: ProjectTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  isImmutable: boolean;
}

export class ProductionProjectRepository {
  private projectsCacheFile = path.resolve(process.cwd(), ".production_projects_state_cache.json");

  private validTransitions: Record<ProductionProjectState, ProductionProjectState[]> = {
    INTAKE: ["REQUIREMENTS_PENDING", "FAILED"],
    REQUIREMENTS_PENDING: ["REQUIREMENTS_VERIFIED", "FAILED"],
    REQUIREMENTS_VERIFIED: ["DESIGN_PENDING", "FAILED"],
    DESIGN_PENDING: ["DESIGN_APPROVED", "FAILED"],
    DESIGN_APPROVED: ["IMPLEMENTATION", "FAILED"],
    IMPLEMENTATION: ["CODE_REVIEW", "FAILED"],
    CODE_REVIEW: ["VISUAL_REVIEW", "IMPLEMENTATION", "FAILED"],
    VISUAL_REVIEW: ["FUNCTIONAL_REVIEW", "IMPLEMENTATION", "FAILED"],
    FUNCTIONAL_REVIEW: ["SECURITY_REVIEW", "IMPLEMENTATION", "FAILED"],
    SECURITY_REVIEW: ["CONTENT_REVIEW", "IMPLEMENTATION", "FAILED"],
    CONTENT_REVIEW: ["RELEASE_CANDIDATE", "IMPLEMENTATION", "FAILED"],
    RELEASE_CANDIDATE: ["WAITING_APPROVAL", "FAILED"],
    WAITING_APPROVAL: ["APPROVED", "IMPLEMENTATION", "FAILED"],
    APPROVED: ["DEPLOYMENT_ELIGIBLE", "FAILED"],
    DEPLOYMENT_ELIGIBLE: ["DEPLOYING", "FAILED"],
    DEPLOYING: ["LIVE", "ROLLED_BACK", "FAILED"],
    LIVE: ["ROLLED_BACK", "FAILED"],
    ROLLED_BACK: ["FAILED", "IMPLEMENTATION"],
    FAILED: ["INTAKE", "IMPLEMENTATION"],
  };

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

  async saveProject(project: ProductionProjectRecord): Promise<ProductionProjectRecord> {
    const cache = this.readCache<ProductionProjectRecord>(this.projectsCacheFile);
    const idx = cache.findIndex((p) => p.id === project.id);
    if (idx >= 0) cache[idx] = project;
    else cache.unshift(project);
    this.writeCache(this.projectsCacheFile, cache);
    return project;
  }

  async getProject(id: string): Promise<ProductionProjectRecord | null> {
    const cache = this.readCache<ProductionProjectRecord>(this.projectsCacheFile);
    return cache.find((p) => p.id === id) || null;
  }

  async transitionState(params: {
    projectId: string;
    toState: ProductionProjectState;
    actor: string;
    evidenceIds: string[];
    providerModel?: string;
    failureReason?: string;
    repairCycle?: number;
  }): Promise<ProductionProjectRecord> {
    const project = await this.getProject(params.projectId);
    if (!project) throw new Error(`Project not found: ${params.projectId}`);

    const fromState = project.currentState;
    const allowed = this.validTransitions[fromState] || [];
    if (!allowed.includes(params.toState)) {
      throw new Error(`Invalid State Transition: Cannot transition from '${fromState}' to '${params.toState}'. Allowed: [${allowed.join(", ")}]`);
    }

    const event: ProjectTimelineEvent = {
      eventId: `EVT-${Date.now().toString().slice(-4)}`,
      projectId: project.id,
      fromState,
      toState: params.toState,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      providerModel: params.providerModel,
      evidenceIds: params.evidenceIds,
      failureReason: params.failureReason,
      repairCycle: params.repairCycle || 0,
      authorizationContext: `ORG=${project.organizationId}, ENV=${project.environment}`,
    };

    project.currentState = params.toState;
    project.timeline.push(event);
    project.updatedAt = new Date().toISOString();

    return await this.saveProject(project);
  }
}

export const productionProjectRepository = new ProductionProjectRepository();
