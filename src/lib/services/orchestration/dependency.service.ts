import { workOrchestrationRepository, WorkItemRecord } from "../../repositories/work-orchestration.repository";

export interface DependencyCheckResult {
  satisfied: boolean;
  unsatisfiedDependencies: string[];
  dependencyDetails: Array<{ dependencyId: string; status: string; isComplete: boolean }>;
}

export class DependencyService {
  checkDependencies(item: WorkItemRecord): DependencyCheckResult {
    if (!item.dependencies || item.dependencies.length === 0) {
      return { satisfied: true, unsatisfiedDependencies: [], dependencyDetails: [] };
    }

    const unsatisfied: string[] = [];
    const details: Array<{ dependencyId: string; status: string; isComplete: boolean }> = [];

    for (const depId of item.dependencies) {
      const depItem = workOrchestrationRepository.getWorkItem(depId, item.projectId, item.organizationId);
      if (!depItem || depItem.status !== "SUCCEEDED") {
        unsatisfied.push(depId);
        details.push({
          dependencyId: depId,
          status: depItem ? depItem.status : "NOT_FOUND",
          isComplete: false,
        });
      } else {
        details.push({
          dependencyId: depId,
          status: depItem.status,
          isComplete: true,
        });
      }
    }

    return {
      satisfied: unsatisfied.length === 0,
      unsatisfiedDependencies: unsatisfied,
      dependencyDetails: details,
    };
  }
}

export const dependencyService = new DependencyService();