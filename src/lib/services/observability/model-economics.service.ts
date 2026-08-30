import { observabilityRepository, ExecutionTelemetryRecord } from "../../repositories/observability.repository";

export interface LatencyDistribution {
  p50: number | "N/A";
  p90: number | "N/A";
  p95: number | "N/A";
  p99: number | "N/A";
  min: number | "N/A";
  max: number | "N/A";
  avg: number | "N/A";
}

export interface ModelEconomicsSummary {
  provider: string;
  model: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  fallbackCount: number;
  totalKnownProviderCost: number;
  costCoverage: "KNOWN" | "PARTIAL" | "UNKNOWN";
  latency: LatencyDistribution;
}

export class ModelEconomicsService {
  computeLatency(durations: number[]): LatencyDistribution {
    if (durations.length === 0) {
      return { p50: "N/A", p90: "N/A", p95: "N/A", p99: "N/A", min: "N/A", max: "N/A", avg: "N/A" };
    }
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    const getPercentile = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / sorted.length),
    };
  }

  async getModelEconomics(organizationId?: string): Promise<Record<string, ModelEconomicsSummary>> {
    const all = await observabilityRepository.getAllTelemetry(organizationId);
    const summaries: Record<string, ModelEconomicsSummary> = {};

    for (const record of all) {
      const key = `${record.provider}::${record.model}`;
      if (!summaries[key]) {
        summaries[key] = {
          provider: record.provider,
          model: record.model,
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          retryCount: 0,
          fallbackCount: 0,
          totalKnownProviderCost: 0,
          costCoverage: record.provider === "Ollama" ? "KNOWN" : record.cost.costCoverage === "KNOWN" ? "KNOWN" : "PARTIAL",
          latency: { p50: "N/A", p90: "N/A", p95: "N/A", p99: "N/A", min: "N/A", max: "N/A", avg: "N/A" },
        };
      }

      const s = summaries[key];
      s.executionCount++;
      if (record.status === "SUCCESS") s.successCount++;
      else s.failureCount++;
      s.retryCount += record.retryCount;
      if (record.fallbackUsed) s.fallbackCount++;

      if (typeof record.cost.providerCost === "number") {
        s.totalKnownProviderCost += record.cost.providerCost;
      }
    }

    // Compute latencies per model
    for (const key of Object.keys(summaries)) {
      const [provider, model] = key.split("::");
      const durations = all.filter((r) => r.provider === provider && r.model === model).map((r) => r.durationMs);
      summaries[key].latency = this.computeLatency(durations);
    }

    return summaries;
  }
}

export const modelEconomicsService = new ModelEconomicsService();
