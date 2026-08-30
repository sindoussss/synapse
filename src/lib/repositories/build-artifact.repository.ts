import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ArtifactType } from "./build-profile.repository";

export type ArtifactStatus = "GENERATING" | "READY" | "INVALID" | "REVOKED";

export interface BuildArtifactRecord {
  artifactId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  buildProfileId: string;
  snapshotId: string;
  releaseCandidateId: string;
  artifactType: ArtifactType;
  fileCount: number;
  totalSize: number;
  files: string[];
  sourceHash: string;
  manifestHash: string;
  artifactHash: string;
  status: ArtifactStatus;
  createdAt: string;
  immutableAt?: string;
}

const FORBIDDEN_FILE_PATTERNS = [
  /^\.env/i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /paypal_secret/i,
  /credentials\.json/i,
];

export class BuildArtifactRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "build-artifacts.json");
  private artifacts: BuildArtifactRecord[] = [];

  constructor() {
    this.loadState();
    if (this.artifacts.length === 0) {
      this.seedInitialArtifact();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.artifacts = raw.artifacts || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        artifacts: this.artifacts,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialArtifact(): void {
    const srcHash = "ec03c0219e3d01719a9b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f50617";
    const manHash = "man-sindous-final-2026";
    const artHash = crypto.createHash("sha256").update(srcHash + ":" + manHash + ":P49").digest("hex");

    const initialArtifact: BuildArtifactRecord = {
      artifactId: "ART-SINDOUS-01-V1",
      projectId: "PRJ-SINDOUS-01",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-SINDOUS-01",
      buildProfileId: "BP-SINDOUS-01-V1",
      snapshotId: "SNAP-SINDOUS-FINAL-2026",
      releaseCandidateId: "RC-FINAL-P49-SINDOUS",
      artifactType: "BUILD_OUTPUT",
      fileCount: 42,
      totalSize: 1845000,
      files: [".next/static/chunks/main.js", ".next/server/app/page.js", "public/favicon.ico"],
      sourceHash: srcHash,
      manifestHash: manHash,
      artifactHash: artHash,
      status: "READY",
      createdAt: "2026-08-29T10:10:00.000Z",
      immutableAt: "2026-08-29T10:10:05.000Z",
    };

    this.artifacts = [initialArtifact];
    this.saveState();
  }

  getArtifact(artifactId: string, callingProjectId?: string, callingOrgId?: string): BuildArtifactRecord | null {
    const a = this.artifacts.find((art) => art.artifactId === artifactId);
    if (!a) return null;

    if (callingProjectId && a.projectId !== callingProjectId) return null;
    if (callingOrgId && a.organizationId !== callingOrgId) return null;

    return a;
  }

  listArtifacts(filter?: { projectId?: string; orgId?: string; artifactType?: ArtifactType }): BuildArtifactRecord[] {
    return this.artifacts.filter((a) => {
      if (filter?.projectId && a.projectId !== filter.projectId) return false;
      if (filter?.orgId && a.organizationId !== filter.orgId) return false;
      if (filter?.artifactType && a.artifactType !== filter.artifactType) return false;
      return true;
    });
  }

  validateArtifactContent(fileList: string[]): { isValid: boolean; forbiddenFiles: string[] } {
    const forbiddenFiles = fileList.filter((f) => FORBIDDEN_FILE_PATTERNS.some((p) => p.test(path.basename(f))));
    return {
      isValid: forbiddenFiles.length === 0,
      forbiddenFiles,
    };
  }

  saveArtifact(artifact: BuildArtifactRecord, actorRole: "OPERATOR" | "SYSTEM" | "AI_DEVELOPER_AGENT"): BuildArtifactRecord {
    if (actorRole === "AI_DEVELOPER_AGENT") {
      throw new Error("UNAUTHORIZED_ARTIFACT_MUTATION: AI Developer Agent cannot directly create or publish build artifacts.");
    }

    // Check content safety
    const contentCheck = this.validateArtifactContent(artifact.files);
    if (!contentCheck.isValid) {
      throw new Error(`FORBIDDEN_FILES_IN_ARTIFACT: Artifact contains forbidden secret files: [${contentCheck.forbiddenFiles.join(", ")}]`);
    }

    const existing = this.artifacts.find((a) => a.artifactId === artifact.artifactId);
    if (existing && existing.status === "READY" && existing.artifactHash !== artifact.artifactHash) {
      throw new Error(`IMMUTABLE_ARTIFACT_VIOLATION: Cannot mutate finalized artifact '${artifact.artifactId}' in-place.`);
    }

    const idx = this.artifacts.findIndex((a) => a.artifactId === artifact.artifactId);
    if (idx >= 0) {
      this.artifacts[idx] = artifact;
    } else {
      this.artifacts.push(artifact);
    }
    this.saveState();
    return artifact;
  }
}

export const buildArtifactRepository = new BuildArtifactRepository();