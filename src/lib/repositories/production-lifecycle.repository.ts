import fs from "fs";
import path from "path";

export interface AuthorizedChangeManifestRecord {
  manifestId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  snapshotId: string;
  allowedFiles: string[];
  allowedDirectories: string[];
  intendedChanges: string[];
  sharedFilesRequiringJustification: string[];
  forbiddenFiles: string[];
  createdAt: string;
}

export type CandidateAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

export interface ProductionCandidateReviewRecord {
  reviewId: string;
  projectId: string;
  companyName: string;
  environment: string;
  snapshotId: string;
  manifestHash: string;
  filesChanged: string[];
  requirementsSummary: {
    explicitCount: number;
    inferredCount: number;
    unknownCount: number;
    conflictingCount: number;
  };
  designDecisionsCount: number;
  deterministicGates: {
    build: "PASS" | "FAIL";
    typecheck: "PASS" | "FAIL";
    lint: "PASS" | "FAIL";
    security: "PASS" | "FAIL";
    runtime: "PASS" | "FAIL";
  };
  visualReviewScore: number;
  codeReviewScore: number;
  functionalStatus: "PASS" | "FAIL";
  hallucinationStatus: "CLEAN" | "CONTAMINATED";
  regressionStatus: "PASS" | "FAIL";
  aiProvider: string;
  generationCost: string;
  generationTimeMs: number;
  repairCyclesCount: number;
  status: "WAITING_APPROVAL" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  actionTakenBy?: string;
  actionTakenAt?: string;
  releaseCandidateId?: string;
}

export class ProductionLifecycleRepository {
  private manifestsCacheFile = path.resolve(process.cwd(), ".authorized_manifests_cache.json");
  private reviewsCacheFile = path.resolve(process.cwd(), ".candidate_reviews_cache.json");

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

  async saveManifest(m: AuthorizedChangeManifestRecord): Promise<AuthorizedChangeManifestRecord> {
    const cache = this.readCache<AuthorizedChangeManifestRecord>(this.manifestsCacheFile);
    cache.unshift(m);
    this.writeCache(this.manifestsCacheFile, cache);
    return m;
  }

  async saveReview(r: ProductionCandidateReviewRecord): Promise<ProductionCandidateReviewRecord> {
    const cache = this.readCache<ProductionCandidateReviewRecord>(this.reviewsCacheFile);
    const idx = cache.findIndex((item) => item.reviewId === r.reviewId);
    if (idx >= 0) cache[idx] = r;
    else cache.unshift(r);
    this.writeCache(this.reviewsCacheFile, cache);
    return r;
  }
}

export const productionLifecycleRepository = new ProductionLifecycleRepository();
