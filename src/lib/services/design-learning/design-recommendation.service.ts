import { designLearningRepository } from "../../repositories/design-learning.repository";
import { componentPerformanceService } from "./component-performance.service";

export interface LearningRecommendationResult {
  subjectId: string;
  recommendationStatus: "RECOMMENDED" | "OPTIONAL" | "UNKNOWN" | "INSUFFICIENT_EVIDENCE" | "INCOMPATIBLE";
  sampleSize: number; // N
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidenceBasis: string[];
  reason: string;
  limitations: string;
  requiresOperatorAdoption: boolean;
}

export class DesignRecommendationService {
  generateRecommendation(params: {
    subjectId: string;
    industry: string;
    targetAudience: string;
    requirements: string[];
  }): LearningRecommendationResult {
    const perf = componentPerformanceService.getPerformance(params.subjectId);
    const learnings = designLearningRepository.listLearnings({ subjectId: params.subjectId });

    if (perf.sampleSize === 0) {
      return {
        subjectId: params.subjectId,
        recommendationStatus: "UNKNOWN",
        sampleSize: 0,
        confidence: "LOW",
        evidenceBasis: [],
        reason: `No prior project evidence exists for '${params.subjectId}'.`,
        limitations: "Telemetry incomplete; requires exploratory testing.",
        requiresOperatorAdoption: false,
      };
    }

    if (perf.sampleSize === 1) {
      return {
        subjectId: params.subjectId,
        recommendationStatus: "INSUFFICIENT_EVIDENCE",
        sampleSize: 1,
        confidence: "LOW",
        evidenceBasis: learnings.map((l) => l.learningId),
        reason: `Single sample (N=1) observed for '${params.subjectId}'.`,
        limitations: "Small sample size prevents confident recommendation.",
        requiresOperatorAdoption: false,
      };
    }

    // N >= 2
    const hasRegressions = typeof perf.visualRegressions === "number" && perf.visualRegressions > 0;
    const recStatus = hasRegressions ? "OPTIONAL" : "RECOMMENDED";
    const confidence = perf.sampleSize >= 3 ? "HIGH" : "MEDIUM";

    return {
      subjectId: params.subjectId,
      recommendationStatus: recStatus,
      sampleSize: perf.sampleSize,
      confidence,
      evidenceBasis: learnings.map((l) => l.learningId),
      reason: perf.observationStatement,
      limitations: "Correlational observational data across past client projects.",
      requiresOperatorAdoption: true,
    };
  }
}

export const designRecommendationService = new DesignRecommendationService();