import fs from "fs";
import path from "path";
import crypto from "crypto";

export type FrameworkType =
  | "NEXT_JS"
  | "REACT_STATIC"
  | "STATIC_HTML"
  | "VITE"
  | "OTHER_SUPPORTED"
  | "FRAMEWORK_UNKNOWN";

export type RuntimeType = "NODE_JS" | "STATIC_BROWSER";

export type ArtifactType =
  | "SOURCE_PACKAGE"
  | "BUILD_OUTPUT"
  | "STATIC_EXPORT"
  | "HANDOFF_PACKAGE";

export type DeploymentTargetType =
  | "LOCAL_STAGING"
  | "VERCEL"
  | "STATIC_HOSTING";

export type BuildProfileStatus =
  | "DRAFT"
  | "VALIDATING"
  | "VALIDATED"
  | "BLOCKED"
  | "SUPERSEDED";

export interface BuildProfileRecord {
  buildProfileId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  framework: FrameworkType;
  frameworkVersion: string;
  runtime: RuntimeType;
  runtimeVersion: string;
  packageManager: "npm" | "pnpm" | "yarn" | "none";
  packageManagerVersion: string;
  buildCommand: string;
  outputDirectory: string;
  startCommand: string;
  installCommand: string;
  sourceDirectory: string;
  artifactType: ArtifactType;
  deploymentTarget: DeploymentTargetType;
  requiredEnvironmentVariables: string[];
  optionalEnvironmentVariables: string[];
  configurationEvidence: string[];
  sourceHash: string;
  manifestHash: string;
  status: BuildProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export class BuildProfileRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "build-profiles.json");
  private profiles: BuildProfileRecord[] = [];

  constructor() {
    this.loadState();
    if (this.profiles.length === 0) {
      this.seedInitialProfile();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.profiles = raw.profiles || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        profiles: this.profiles,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialProfile(): void {
    const initialProfile: BuildProfileRecord = {
      buildProfileId: "BP-SINDOUS-01-V1",
      projectId: "PRJ-SINDOUS-01",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-SINDOUS-01",
      environment: "production",
      framework: "NEXT_JS",
      frameworkVersion: "14.2.5",
      runtime: "NODE_JS",
      runtimeVersion: "20.x",
      packageManager: "npm",
      packageManagerVersion: "10.8.2",
      buildCommand: "npm run build",
      outputDirectory: ".next",
      startCommand: "npm run start",
      installCommand: "npm install",
      sourceDirectory: "production-sites/PRJ-SINDOUS-01",
      artifactType: "BUILD_OUTPUT",
      deploymentTarget: "LOCAL_STAGING",
      requiredEnvironmentVariables: ["NEXT_PUBLIC_SITE_URL", "CONTACT_RECIPIENT_EMAIL"],
      optionalEnvironmentVariables: ["ANALYTICS_ID"],
      configurationEvidence: ["package.json", "next.config.mjs", "tsconfig.json"],
      sourceHash: "ec03c0219e3d01719a9b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f50617",
      manifestHash: "man-sindous-final-2026",
      status: "VALIDATED",
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };

    this.profiles = [initialProfile];
    this.saveState();
  }

  getProfile(buildProfileId: string, callingProjectId?: string, callingOrgId?: string): BuildProfileRecord | null {
    const p = this.profiles.find((bp) => bp.buildProfileId === buildProfileId);
    if (!p) return null;

    if (callingProjectId && p.projectId !== callingProjectId) return null;
    if (callingOrgId && p.organizationId !== callingOrgId) return null;

    return p;
  }

  getLatestProfileForProject(projectId: string, orgId?: string): BuildProfileRecord | null {
    const list = this.profiles.filter((p) => p.projectId === projectId && (!orgId || p.organizationId === orgId));
    if (list.length === 0) return null;
    return list[list.length - 1];
  }

  saveProfile(profile: BuildProfileRecord, actorRole: "OPERATOR" | "SYSTEM" | "AI_DEVELOPER_AGENT"): BuildProfileRecord {
    if (actorRole === "AI_DEVELOPER_AGENT") {
      throw new Error("UNAUTHORIZED_PROFILE_MUTATION: AI Developer Agent cannot directly create or publish build profiles.");
    }

    const existing = this.profiles.find((p) => p.buildProfileId === profile.buildProfileId);
    if (existing && existing.status === "VALIDATED" && existing.sourceHash !== profile.sourceHash) {
      throw new Error(`IMMUTABLE_BUILD_PROFILE_VIOLATION: Cannot mutate validated build profile '${profile.buildProfileId}' in-place.`);
    }

    const idx = this.profiles.findIndex((p) => p.buildProfileId === profile.buildProfileId);
    if (idx >= 0) {
      this.profiles[idx] = { ...profile, updatedAt: new Date().toISOString() };
    } else {
      this.profiles.push(profile);
    }
    this.saveState();
    return profile;
  }
}

export const buildProfileRepository = new BuildProfileRepository();