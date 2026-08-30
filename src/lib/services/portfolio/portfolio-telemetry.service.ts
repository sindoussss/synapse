import { observabilityRepository } from "../../repositories/observability.repository";
import { modelEconomicsService } from "../observability/model-economics.service";
import { failureIntelligenceService } from "../observability/failure-intelligence.service";

export interface PortfolioTelemetrySummary {
  timeWindow: "7d" | "30d" | "90d" | "all-time";
  sampleSize: number;
  totalExecutions: number | "N/A";
  totalKnownAiCost: number | "N/A";
  averageDurationMs: number | "N/A";
  firstPassSuccessRate: number | "N/A";
  activeAnomaliesCount: number;
}

export class PortfolioTelemetryService {
  async getPortfolioSummary(
    timeWindow: "7d" | "30d" | "90d" | "all-time" = "all-time",
    organizationId?: string
  ): Promise<PortfolioTelemetrySummary> {
    const all = await observabilityRepository.getAllTelemetry(organizationId);

    if (all.length === 0) {
      return {
        timeWindow,
        sampleSize: 0,
        totalExecutions: "N/A",
        totalKnownAiCost: "N/A",
        averageDurationMs: "N/A",
        firstPassSuccessRate: "N/A",
        activeAnomaliesCount: 0,
      };
    }

    const totalKnownAiCost = all.reduce((sum, r) => (typeof r.cost.providerCost === "number" ? sum + r.cost.providerCost : sum), 0);
    const avgDuration = Math.round(all.reduce((sum, r) => sum + r.durationMs, 0) / all.length);
    const firstPass = all.filter((r) => r.retryCount === 0 && r.status === "SUCCESS").length;

    return {
      timeWindow,
      sampleSize: all.length,
      totalExecutions: all.length,
      totalKnownAiCost: Math.round(totalKnownAiCost * 100) / 100,
      averageDurationMs: avgDuration,
      firstPassSuccessRate: Math.round((firstPass / all.length) * 100),
      activeAnomaliesCount: 0,
    };
  }
}

export const portfolioTelemetryService = new PortfolioTelemetryService();
