import { observabilityRepository } from "../../repositories/observability.repository";

export interface ProjectCostBreakdown {
  projectId: string;
  totalExecutions: number;
  knownAiCost: number;
  knownInfrastructureCost: number;
  localComputeCost: "UNKNOWN" | number;
  humanLaborCost: "UNKNOWN";
  costCoverage: "KNOWN" | "PARTIAL" | "UNKNOWN";
}

export class ProjectCostService {
  async getProjectCost(projectId: string, organizationId: string): Promise<ProjectCostBreakdown> {
    const telemetry = await observabilityRepository.getTelemetryByProject(projectId, organizationId);

    let knownAiCost = 0;
    let knownInfra = 0;

    for (const t of telemetry) {
      if (typeof t.cost.providerCost === "number") knownAiCost += t.cost.providerCost;
      if (typeof t.cost.infrastructureCost === "number") knownInfra += t.cost.infrastructureCost;
    }

    return {
      projectId,
      totalExecutions: telemetry.length,
      knownAiCost: Math.round(knownAiCost * 100) / 100,
      knownInfrastructureCost: Math.round(knownInfra * 100) / 100,
      localComputeCost: "UNKNOWN",
      humanLaborCost: "UNKNOWN",
      costCoverage: "PARTIAL", // Partial coverage because human labor & local hardware amortizations are unmeasured
    };
  }
}

export const projectCostService = new ProjectCostService();
