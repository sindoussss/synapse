export type ProjectOverallHealth = "HEALTHY" | "ACTION_REQUIRED" | "BLOCKED" | "DEGRADED" | "FAILED" | "UNKNOWN";

export interface ProjectHealthBreakdown {
  overall: ProjectOverallHealth;
  codeHealth: "PASS" | "FAIL" | "UNKNOWN";
  visualHealth: "PASS" | "FAIL" | "UNKNOWN";
  functionalHealth: "PASS" | "FAIL" | "UNKNOWN";
  accessibilityHealth: "PASS" | "FAIL" | "UNKNOWN";
  securityHealth: "PASS" | "FAIL" | "UNKNOWN";
  buildHealth: "PASS" | "FAIL" | "UNKNOWN";
  deploymentHealth: "HEALTHY" | "DEGRADED" | "FAILED" | "UNKNOWN";
  paymentHealth: "PAID" | "PENDING" | "OVERDUE" | "UNKNOWN";
  deliveryHealth: "DELIVERED" | "READY" | "LOCKED" | "UNKNOWN";
  incidentsHealth: "CLEAN" | "ACTIVE_INCIDENT";
  reasons: string[];
}

export class ProjectHealthService {
  deriveHealth(params: {
    codePassed: boolean;
    visualPassed: boolean;
    functionalPassed: boolean;
    accessibilityPassed: boolean;
    securityPassed: boolean;
    buildPassed: boolean;
    deploymentStatus: "LIVE" | "DEPLOYED" | "DEGRADED" | "FAILED" | "UNKNOWN";
    isPaid: boolean;
    isDelivered: boolean;
    hasActiveIncident: boolean;
  }): ProjectHealthBreakdown {
    const reasons: string[] = [];

    const codeHealth = params.codePassed ? "PASS" : "FAIL";
    const visualHealth = params.visualPassed ? "PASS" : "FAIL";
    const functionalHealth = params.functionalPassed ? "PASS" : "FAIL";
    const accessibilityHealth = params.accessibilityPassed ? "PASS" : "FAIL";
    const securityHealth = params.securityPassed ? "PASS" : "FAIL";
    const buildHealth = params.buildPassed ? "PASS" : "FAIL";

    let deploymentHealth: "HEALTHY" | "DEGRADED" | "FAILED" | "UNKNOWN" = "UNKNOWN";
    if (params.deploymentStatus === "LIVE" || params.deploymentStatus === "DEPLOYED") deploymentHealth = "HEALTHY";
    else if (params.deploymentStatus === "DEGRADED") deploymentHealth = "DEGRADED";
    else if (params.deploymentStatus === "FAILED") deploymentHealth = "FAILED";

    const paymentHealth = params.isPaid ? "PAID" : "PENDING";
    const deliveryHealth = params.isDelivered ? "DELIVERED" : params.isPaid ? "READY" : "LOCKED";
    const incidentsHealth = params.hasActiveIncident ? "ACTIVE_INCIDENT" : "CLEAN";

    let overall: ProjectOverallHealth = "HEALTHY";

    if (!params.securityPassed || params.hasActiveIncident || deploymentHealth === "FAILED" || !params.buildPassed) {
      overall = "FAILED";
      if (!params.securityPassed) reasons.push("CRITICAL security finding detected.");
      if (params.hasActiveIncident) reasons.push("Active unresolved production incident.");
      if (deploymentHealth === "FAILED") reasons.push("Production deployment endpoint failure.");
      if (!params.buildPassed) reasons.push("Universal build compilation failure.");
    } else if (deploymentHealth === "DEGRADED" || !params.functionalPassed || !params.visualPassed || !params.accessibilityPassed) {
      overall = "DEGRADED";
      if (deploymentHealth === "DEGRADED") reasons.push("Deployment health check degraded.");
      if (!params.functionalPassed) reasons.push("Functional QA defect pending.");
      if (!params.visualPassed) reasons.push("Visual QA review pending.");
      if (!params.accessibilityPassed) reasons.push("Accessibility compliance issue.");
    } else if (!params.isPaid || !params.isDelivered || !params.codePassed) {
      overall = "ACTION_REQUIRED";
      if (!params.isPaid) reasons.push("Invoice payment confirmation pending.");
      if (!params.isDelivered && params.isPaid) reasons.push("Source delivery package ready for download.");
      if (!params.codePassed) reasons.push("Code review sign-off pending.");
    }

    return {
      overall,
      codeHealth,
      visualHealth,
      functionalHealth,
      accessibilityHealth,
      securityHealth,
      buildHealth,
      deploymentHealth,
      paymentHealth,
      deliveryHealth,
      incidentsHealth,
      reasons,
    };
  }
}

export const projectHealthService = new ProjectHealthService();