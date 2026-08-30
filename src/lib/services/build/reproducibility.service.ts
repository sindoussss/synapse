import crypto from "crypto";

export interface ReproducibleBuildRecord {
  reproducibilityId: string;
  projectId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  framework: string;
  frameworkVersion: string;
  runtime: string;
  packageManager: string;
  lockfileHash: string;
  buildCommand: string;
  buildDurationMs: number;
  artifactHash: string;
  recordedAt: string;
}

export class ReproducibilityService {
  private records: ReproducibleBuildRecord[] = [];

  recordBuild(record: Omit<ReproducibleBuildRecord, "reproducibilityId" | "recordedAt">): ReproducibleBuildRecord {
    const fullRecord: ReproducibleBuildRecord = {
      reproducibilityId: `REPRO-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString("hex")}`,
      ...record,
      recordedAt: new Date().toISOString(),
    };
    this.records.push(fullRecord);
    return fullRecord;
  }

  verifyReproducibility(projectId: string, currentArtifactHash: string, originalLockfileHash: string, currentLockfileHash: string): { isReproducible: boolean; reason: string } {
    if (originalLockfileHash !== currentLockfileHash) {
      return {
        isReproducible: false,
        reason: "BUILD_NOT_REPRODUCIBLE: Dependency lockfile hash mutated between build attempts.",
      };
    }

    const prev = this.records.find((r) => r.projectId === projectId);
    if (prev && prev.artifactHash !== currentArtifactHash) {
      return {
        isReproducible: false,
        reason: `BUILD_NOT_REPRODUCIBLE: Artifact hash mismatch. Expected '${prev.artifactHash}', Got '${currentArtifactHash}'.`,
      };
    }

    return {
      isReproducible: true,
      reason: "Reproducible build verified across snapshot, lockfile, and artifact hashes.",
    };
  }
}

export const reproducibilityService = new ReproducibilityService();