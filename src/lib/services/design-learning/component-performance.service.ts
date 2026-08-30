import { designLearningRepository } from "../../repositories/design-learning.repository";

export interface ComponentPerformanceSummary {
  componentId: string;
  version: number;
  sampleSize: number; // N
  projectCount: number;
  visualRegressions: number | string;
  accessibilityFailures: number | string;
  repairCount: number | string;
  incidentCount: number | string;
  rollbackCount: number | string;
  evidenceClassification: "N/A" | "INSUFFICIENT_EVIDENCE" | "OBSERVED" | "SUPPORTED";
  observationStatement: string;
  timeWindow: "7d" | "30d" | "90d" | "all-time";
}

export class ComponentPerformanceService {
  getPerformance(componentId: string, timeWindow: "7d" | "30d" | "90d" | "all-time" = "all-time"): ComponentPerformanceSummary {
    const usages = designLearningRepository.listUsages({ componentId });
    const N = usages.length;

    if (N === 0) {
      return {
        componentId,
        version: 1,
        sampleSize: 0,
        projectCount: 0,
        visualRegressions: "N/A",
        accessibilityFailures: "N/A",
        repairCount: "N/A",
        incidentCount: "N/A",
        rollbackCount: "N/A",
        evidenceClassification: "N/A",
        observationStatement: `Component '${componentId}' has N=0 recorded usages in the selected window.`,
        timeWindow,
      };
    }

    if (N === 1) {
      const u = usages[0];
      const outcomes = designLearningRepository.listOutcomes({ usageId: u.usageId });
      const reg = outcomes.filter((o) => o.metricType === "REGRESSION" && o.status === "FAILURE").length;

      return {
        componentId,
        version: u.componentVersion,
        sampleSize: 1,
        projectCount: 1,
        visualRegressions: reg,
        accessibilityFailures: 0,
        repairCount: 0,
        incidentCount: 0,
        rollbackCount: 0,
        evidenceClassification: "INSUFFICIENT_EVIDENCE",
        observationStatement: `Component '${componentId}' observed in N=1 project (${u.projectId}); statistical evidence is currently INSUFFICIENT_EVIDENCE.`,
        timeWindow,
      };
    }

    // N >= 2
    const projects = new Set(usages.map((u) => u.projectId));
    let totalReg = 0;
    let totalA11yFail = 0;
    let totalIncidents = 0;

    for (const u of usages) {
      const outcomes = designLearningRepository.listOutcomes({ usageId: u.usageId });
      totalReg += outcomes.filter((o) => o.metricType === "REGRESSION" && o.status === "FAILURE").length;
      totalA11yFail += outcomes.filter((o) => o.metricType === "ACCESSIBILITY_QA" && o.status === "FAILURE").length;
      totalIncidents += outcomes.filter((o) => o.metricType === "PRODUCTION_INCIDENT").length;
    }

    const classification = N >= 3 ? "SUPPORTED" : "OBSERVED";
    const observationStatement = `Component '${componentId}' was used across N=${N} projects (${projects.size} unique) with ${totalReg} recorded regressions and ${totalIncidents} production incidents.`;

    return {
      componentId,
      version: usages[0].componentVersion,
      sampleSize: N,
      projectCount: projects.size,
      visualRegressions: totalReg,
      accessibilityFailures: totalA11yFail,
      repairCount: 0,
      incidentCount: totalIncidents,
      rollbackCount: 0,
      evidenceClassification: classification,
      observationStatement,
      timeWindow,
    };
  }

  validateCausalClaim(claim: string): { isAllowed: boolean; reason: string } {
    const causalTerms = ["causes", "caused", "improves", "guarantees", "leads to", "drives"];
    const hasCausal = causalTerms.some((t) => claim.toLowerCase().includes(t));

    if (hasCausal && !claim.includes("CONTROLLED_EXPERIMENT")) {
      return {
        isAllowed: false,
        reason: "UNSUPPORTED_CAUSALITY_REJECTED: Observational project data cannot establish causality without pre-registered controlled experiment.",
      };
    }

    return { isAllowed: true, reason: "Evidence-backed descriptive statement." };
  }
}

export const componentPerformanceService = new ComponentPerformanceService();