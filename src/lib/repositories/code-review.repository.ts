import fs from "fs";
import path from "path";

export interface CodeFindingRecord {
  finding_id: string; // e.g. CODE-001
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category:
    | "Architecture"
    | "Maintainability"
    | "Type Safety"
    | "React Quality"
    | "Next.js Architecture"
    | "Security"
    | "Performance"
    | "Accessibility"
    | "Code Slop"
    | "Error Handling"
    | "State Management";
  file: string;
  symbol?: string;
  evidence: string;
  explanation: string;
  recommendation: string;
  confidence: number;
}

export interface DeterministicQAResult {
  typecheck: { passed: boolean; errors: string[]; durationMs: number };
  lint: { passed: boolean; errors: string[] };
  build: { passed: boolean; exitCode: number; durationMs: number };
  tests: { passed: boolean; total: number; failed: number };
  security: { passed: boolean; secretsFound: number; unsafeCodeFound: number; findings: string[] };
  runtime: { passed: boolean; httpStatus: number; consoleErrors: number; networkFailures: number };
}

export interface CodeReviewRecord {
  id: string; // e.g. CODE-REVIEW-2026-000001
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  snapshotId: string;
  manifestHash: string;
  reviewerProvider: "Google Gemini Free Tier + Deterministic Static Guard";
  reviewerModel: string;
  overall: "PASS" | "PASS_WITH_WARNINGS" | "REPAIR_REQUIRED" | "CRITICAL_REPAIR_REQUIRED";
  codeQualityScore: number; // 0-100
  aiCodeSlopRisk: number; // 0-10
  findings: CodeFindingRecord[];
  architectureFindings: string[];
  securityFindings: string[];
  performanceFindings: string[];
  maintainabilityFindings: string[];
  testabilityFindings: string[];
  deterministicQA: DeterministicQAResult;
  createdAt: string;
  isImmutable: boolean;
}

export interface CodeRepairTaskRecord {
  id: string; // e.g. CODE-REPAIR-TASK-001
  codeReviewId: string;
  findingId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  snapshotId: string;
  file: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  instruction: string;
  status: "pending" | "applied" | "verified_resolved" | "rejected";
  createdAt: string;
}

export interface CodeRegressionRecord {
  id: string;
  codeReviewId: string;
  baselineSnapshotId: string;
  repairSnapshotId: string;
  codeRegressionDetected: boolean;
  behaviorRegressionDetected: boolean;
  visualRegressionDetected: boolean;
  status: "ACCEPTED" | "REJECT_REPAIR";
  reason: string;
  createdAt: string;
}

export class CodeReviewRepository {
  private reviewsCacheFile = path.resolve(process.cwd(), ".code_reviews_cache.json");
  private repairTasksCacheFile = path.resolve(process.cwd(), ".code_repair_tasks_cache.json");
  private regressionsCacheFile = path.resolve(process.cwd(), ".code_regressions_cache.json");

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

  async saveCodeReview(review: CodeReviewRecord): Promise<CodeReviewRecord> {
    const cache = this.readCache<CodeReviewRecord>(this.reviewsCacheFile);
    const existingIndex = cache.findIndex((r) => r.id === review.id);
    if (existingIndex >= 0 && cache[existingIndex].isImmutable) {
      throw new Error(`Immutability Violation: Code Review ${review.id} is immutable.`);
    }
    if (existingIndex >= 0) cache[existingIndex] = review;
    else cache.unshift(review);
    this.writeCache(this.reviewsCacheFile, cache);
    return review;
  }

  async getCodeReview(id: string): Promise<CodeReviewRecord | null> {
    const cache = this.readCache<CodeReviewRecord>(this.reviewsCacheFile);
    return cache.find((r) => r.id === id) || null;
  }

  async getReviewsByProject(projectId: string): Promise<CodeReviewRecord[]> {
    const cache = this.readCache<CodeReviewRecord>(this.reviewsCacheFile);
    return cache.filter((r) => r.projectId === projectId);
  }

  async saveRepairTask(task: CodeRepairTaskRecord): Promise<CodeRepairTaskRecord> {
    const cache = this.readCache<CodeRepairTaskRecord>(this.repairTasksCacheFile);
    cache.unshift(task);
    this.writeCache(this.repairTasksCacheFile, cache);
    return task;
  }

  async saveRegression(reg: CodeRegressionRecord): Promise<CodeRegressionRecord> {
    const cache = this.readCache<CodeRegressionRecord>(this.regressionsCacheFile);
    cache.unshift(reg);
    this.writeCache(this.regressionsCacheFile, cache);
    return reg;
  }
}

export const codeReviewRepository = new CodeReviewRepository();