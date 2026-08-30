import { observabilityRepository } from "../../repositories/observability.repository";

export interface FailureCategoryMetrics {
  category: string;
  count: number;
  affectedProjects: string[];
  affectedProviders: string[];
}

export class FailureIntelligenceService {
  async getFailureIntelligence(organizationId?: string): Promise<{
    totalFailures: number;
    firstPassSuccessRate: number | "N/A";
    repairRate: number | "N/A";
    humanEscalationRate: number | "N/A";
    categories: FailureCategoryMetrics[];
  }> {
    const all = await observabilityRepository.getAllTelemetry(organizationId);
    if (all.length === 0) {
      return {
        totalFailures: 0,
        firstPassSuccessRate: "N/A",
        repairRate: "N/A",
        humanEscalationRate: "N/A",
        categories: [],
      };
    }

    const failures = all.filter((r) => r.status !== "SUCCESS");
    const repairs = all.filter((r) => r.operationType === "CODE_REPAIR" || r.status === "REPAIRED");
    const firstPass = all.filter((r) => r.retryCount === 0 && r.status === "SUCCESS");

    const categoryMap: Record<string, { count: number; projects: Set<string>; providers: Set<string> }> = {};

    for (const f of failures) {
      const cat = f.errorCategory || "UNKNOWN_FAILURE";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, projects: new Set(), providers: new Set() };
      categoryMap[cat].count++;
      categoryMap[cat].projects.add(f.projectId);
      categoryMap[cat].providers.add(f.provider);
    }

    return {
      totalFailures: failures.length,
      firstPassSuccessRate: Math.round((firstPass.length / all.length) * 100),
      repairRate: Math.round((repairs.length / all.length) * 100),
      humanEscalationRate: Math.round((failures.filter((f) => f.status === "RETRY_EXHAUSTED").length / (failures.length || 1)) * 100),
      categories: Object.entries(categoryMap).map(([cat, val]) => ({
        category: cat,
        count: val.count,
        affectedProjects: Array.from(val.projects),
        affectedProviders: Array.from(val.providers),
      })),
    };
  }
}

export const failureIntelligenceService = new FailureIntelligenceService();
