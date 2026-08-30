import fs from "fs";
import path from "path";

export type ReleaseCandidateStatus =
  | "RELEASE_BLOCKED"
  | "REVIEW_REQUIRED"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "DEPLOYING"
  | "LIVE"
  | "ROLLED_BACK"
  | "FAILED";

export interface ReleaseCandidateRecord {
  id: string; // e.g. RC-2026-000001
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  snapshotId: string;
  manifestHash: string;
  sourceHash: string;
  createdAt: string;
  createdBy: string;
  status: ReleaseCandidateStatus;
  isImmutable: boolean;
  metadata?: Record<string, any>;
}

export class ProductionAcceptanceRepository {
  private candidatesCacheFile = path.resolve(process.cwd(), ".release_candidates_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }

  async saveCandidate(candidate: ReleaseCandidateRecord): Promise<ReleaseCandidateRecord> {
    const cache = this.readCache<ReleaseCandidateRecord>(this.candidatesCacheFile);
    const existingIndex = cache.findIndex((c) => c.id === candidate.id);
    if (existingIndex >= 0 && cache[existingIndex].isImmutable && cache[existingIndex].status === "APPROVED") {
      throw new Error(`Immutability Violation: Approved Release Candidate ${candidate.id} cannot be modified.`);
    }
    if (existingIndex >= 0) cache[existingIndex] = candidate;
    else cache.unshift(candidate);
    this.writeCache(this.candidatesCacheFile, cache);
    return candidate;
  }

  async getCandidate(id: string): Promise<ReleaseCandidateRecord | null> {
    const cache = this.readCache<ReleaseCandidateRecord>(this.candidatesCacheFile);
    return cache.find((c) => c.id === id) || null;
  }

  async getCandidatesByProject(projectId: string): Promise<ReleaseCandidateRecord[]> {
    const cache = this.readCache<ReleaseCandidateRecord>(this.candidatesCacheFile);
    return cache.filter((c) => c.projectId === projectId);
  }
}

export const productionAcceptanceRepository = new ProductionAcceptanceRepository();