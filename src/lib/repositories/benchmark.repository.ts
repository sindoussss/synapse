import fs from "fs";
import path from "path";

export interface BenchmarkBriefRecord {
  id: string; // e.g. BRIEF-01
  industry: string;
  companyName: string;
  targetAudience: string;
  businessGoals: string;
  brandPersonality: string;
  requiredPages: string[];
  requiredFunctionality: string[];
  colorPalette: { primary: string; secondary: string; background: string; accent: string };
  typographyStyle: string;
  layoutArchetype: string;
}

export type BenchmarkFailureCategory =
  | "NONE"
  | "DESIGN_FAILURE"
  | "RESPONSIVE_FAILURE"
  | "FUNCTIONAL_FAILURE"
  | "CODE_QUALITY_FAILURE"
  | "SECURITY_FAILURE"
  | "CONTENT_HALLUCINATION"
  | "ACCESSIBILITY_FAILURE"
  | "REGRESSION_FAILURE"
  | "PROVIDER_FAILURE"
  | "RUNTIME_FAILURE";

export interface BenchmarkResultRecord {
  benchmarkId: string;
  briefId: string;
  industry: string;
  companyName: string;
  status: "PASS" | "PARTIAL" | "FAIL";
  scores: {
    visualQuality: number; // /100
    codeQuality: number; // /100
    functionality: number; // /100
    accessibility: number; // /100
    originality: number; // /100
    contentIntegrity: number; // /100
    responsiveQuality: number; // /100
    weightedQualityScore: number; // /100
  };
  aiSlopRisk: number; // 0-10
  slopFlags: string[];
  viewports: {
    "375x812": "PASS" | "FAIL";
    "390x844": "PASS" | "FAIL";
    "768x1024": "PASS" | "FAIL";
    "1024x768": "PASS" | "FAIL";
    "1440x900": "PASS" | "FAIL";
  };
  buildPassed: boolean;
  runtimePassed: boolean;
  typecheckPassed: boolean;
  generationTimeMs: number;
  repairCyclesUsed: number;
  failureCategory: BenchmarkFailureCategory;
  failureDetails?: string;
  snapshotId: string;
  manifestHash: string;
  createdAt: string;
}

export interface BenchmarkRunRecord {
  runId: string;
  timestamp: string;
  totalBenchmarks: number; // N=10
  successfulBuilds: number;
  successfulRuntimes: number;
  visualPassRate: number;
  codeReviewPassRate: number;
  functionalPassRate: number;
  accessibilityPassRate: number;
  contentIntegrityPassRate: number;
  aiSlopAverage: number;
  averageVisualScore: number;
  averageCodeScore: number;
  averageWeightedScore: number;
  averageRepairCycles: number;
  regressionRate: number;
  hallucinationRate: number;
  averageGenerationTimeMs: number;
  finalVerdict: "BENCHMARK_PASS" | "BENCHMARK_PARTIAL" | "BENCHMARK_FAILED";
  results: BenchmarkResultRecord[];
}

export class BenchmarkRepository {
  private runsCacheFile = path.resolve(process.cwd(), ".benchmark_runs_cache.json");

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

  async saveRun(run: BenchmarkRunRecord): Promise<BenchmarkRunRecord> {
    const cache = this.readCache<BenchmarkRunRecord>(this.runsCacheFile);
    cache.unshift(run);
    this.writeCache(this.runsCacheFile, cache);
    return run;
  }

  async getLatestRun(): Promise<BenchmarkRunRecord | null> {
    const cache = this.readCache<BenchmarkRunRecord>(this.runsCacheFile);
    return cache[0] || null;
  }
}

export const benchmarkRepository = new BenchmarkRepository();