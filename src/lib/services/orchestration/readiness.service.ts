import { WorkItemRecord, WorkStatus } from "../../repositories/work-orchestration.repository";
import { dependencyService } from "./dependency.service";
import { blockerService } from "./blocker.service";

export interface ReadinessEvaluationResult {
  status: WorkStatus;
  isReady: boolean;
  blockingReasons: string[];
  nextAction: string;
}

export class ReadinessService {
  evaluateReadiness(item: WorkItemRecord, context: {
    isPaid: boolean;
    hasClientApproval: boolean;
    hasOperatorApproval: boolean;
    buildPassed: boolean;
    qaPassed: boolean;
    securityPassed: boolean;
    hasActiveIncident: boolean;
    hasMissingConfig: boolean;
  }): ReadinessEvaluationResult {
    // 1. Dependency Check
    const depCheck = dependencyService.checkDependencies(item);
    if (!depCheck.satisfied) {
      return {
        status: "BLOCKED",
        isReady: false,
        blockingReasons: [`DEPENDENCIES_UNSATISFIED: [${depCheck.unsatisfiedDependencies.join(", ")}]`],
        nextAction: `Complete prerequisite tasks: ${depCheck.unsatisfiedDependencies.join(", ")}`,
      };
    }

    // 2. Blocker Diagnostics
    const blockers = blockerService.diagnoseBlockers({
      workType: item.workType,
      isPaid: context.isPaid,
      hasClientApproval: context.hasClientApproval,
      hasOperatorApproval: context.hasOperatorApproval,
      buildPassed: context.buildPassed,
      qaPassed: context.qaPassed,
      securityPassed: context.securityPassed,
      hasActiveIncident: context.hasActiveIncident,
      hasMissingConfig: context.hasMissingConfig,
    });

    if (blockers.length > 0) {
      const hasHumanBlocker = blockers.some(
        (b) => b.category === "CLIENT_APPROVAL_REQUIRED" || b.category === "OPERATOR_APPROVAL_REQUIRED"
      );

      return {
        status: hasHumanBlocker ? "WAITING_HUMAN" : "BLOCKED",
        isReady: false,
        blockingReasons: blockers.map((b) => `${b.category}: ${b.reason}`),
        nextAction: blockers[0].nextAction,
      };
    }

    return {
      status: "READY",
      isReady: true,
      blockingReasons: [],
      nextAction: `Ready to claim and execute by eligible actors [${item.eligibleActors.join(", ")}].`,
    };
  }
}

export const readinessService = new ReadinessService();