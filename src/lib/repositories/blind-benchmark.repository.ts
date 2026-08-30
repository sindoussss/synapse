import fs from "fs";
import path from "path";

export interface BlindBenchmarkBriefRecord {
  id: string; // e.g. BLIND-01
  industry: string;
  companyName: string;
  targetAudience: string;
  primaryConversionGoal: string;
  brandPersonality: string;
  requiredSections: string[];
  functionalRequirements: string[];
  contentConstraints: string[];
  accessibilityRequirements: string[];
  responsiveRequirements: string[];
  isAmbiguous: boolean; // >= 30% of briefs
  ambiguityDescription?: string;
  hasDesignTension: boolean; // >= 25% of briefs
  designTensionDescription?: string;
  hasIncompleteData: boolean; // >= 25% of briefs
  incompleteDataFields?: string[];
  colorPalette: { primary: string; secondary: string; background: string; accent: string };
  typographyStyle: string;
  layoutArchetype: string;
}

export type BlindFailureCategory =
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

export interface BlindBenchmarkResultRecord {
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
  functionalPassed: boolean;
  hallucinationPassed: boolean;
  generationTimeMs: number;
  repairCyclesUsed: number;
  failureCategory: BlindFailureCategory;
  failureDetails?: string;
  snapshotId: string;
  manifestHash: string;
  createdAt: string;
}

export interface BlindBenchmarkRunRecord {
  runId: string;
  timestamp: string;
  sampleSize: number; // N = 20
  buildSuccessRate: { numerator: number; denominator: number; percentage: number };
  runtimeSuccessRate: { numerator: number; denominator: number; percentage: number };
  visualPassRate: { numerator: number; denominator: number; percentage: number };
  codeReviewPassRate: { numerator: number; denominator: number; percentage: number };
  accessibilityPassRate: { numerator: number; denominator: number; percentage: number };
  functionalPassRate: { numerator: number; denominator: number; percentage: number };
  hallucinationRate: { numerator: number; denominator: number; percentage: number };
  aiSlopAverage: number;
  regressionRate: { numerator: number; denominator: number; percentage: number };
  averageVisualScore: number;
  averageCodeScore: number;
  averageWeightedScore: number;
  medianGenerationTimeMs: number;
  p95GenerationTimeMs: number;
  repairSuccessRate: { numerator: number; denominator: number; percentage: number };
  finalVerdict: "BENCHMARK_PASS" | "BENCHMARK_PARTIAL" | "BENCHMARK_FAILED";
  results: BlindBenchmarkResultRecord[];
}

export class BlindBenchmarkRepository {
  private runsCacheFile = path.resolve(process.cwd(), ".blind_benchmark_runs_cache.json");

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

  async saveRun(run: BlindBenchmarkRunRecord): Promise<BlindBenchmarkRunRecord> {
    const cache = this.readCache<BlindBenchmarkRunRecord>(this.runsCacheFile);
    cache.unshift(run);
    this.writeCache(this.runsCacheFile, cache);
    return run;
  }

  async getLatestRun(): Promise<BlindBenchmarkRunRecord | null> {
    const cache = this.readCache<BlindBenchmarkRunRecord>(this.runsCacheFile);
    return cache[0] || null;
  }
}

export const blindBenchmarkRepository = new BlindBenchmarkRepository();