import fs from "fs";
import path from "path";
import { PostDeploymentVerificationRecord } from "./deployment-adapter";

export interface ProductionHealthEvaluation {
  projectId: string;
  deploymentId: string;
  url: string;
  timestamp: string;
  httpHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  routeHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  runtimeHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  interactionHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  visualHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  contentHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  securityHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  overallHealth: "HEALTHY" | "DEGRADED" | "FAILED";
  blockers: string[];
  evidenceIds: string[];
}

export class ProductionHealthService {
  /**
   * Independent HTTP probe. Does not invent 200/HEALTHY.
   * Timeouts and network errors stay NOT_VERIFIED.
   */
  async probeHttp(url: string): Promise<{
    url: string;
    httpStatus: number | "NOT_VERIFIED";
    healthStatus: "HEALTHY" | "FAILED" | "NOT_VERIFIED";
    evidenceClass: "LIVE" | "CONTROLLED_TEST";
    error?: string;
  }> {
    if (!url || url === "NOT_VERIFIED" || !/^https?:\/\//i.test(url)) {
      return {
        url: url || "NOT_VERIFIED",
        httpStatus: "NOT_VERIFIED",
        healthStatus: "NOT_VERIFIED",
        evidenceClass: "LIVE",
        error: "NO_PROBE_URL",
      };
    }

    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      return {
        url,
        httpStatus: res.status,
        healthStatus: res.status === 200 ? "HEALTHY" : "FAILED",
        evidenceClass: "LIVE",
      };
    } catch (err: any) {
      const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError" || /timeout/i.test(String(err?.message));
      return {
        url,
        httpStatus: "NOT_VERIFIED",
        healthStatus: "NOT_VERIFIED",
        evidenceClass: "LIVE",
        error: timedOut ? "PROBE_TIMEOUT" : "PROBE_FAILED",
      };
    }
  }

  evaluateHealth(verif: PostDeploymentVerificationRecord, projectId: string): ProductionHealthEvaluation {
    const blockers: string[] = [];
    const evidenceIds: string[] = [];

    if (verif.httpHealth === "FAILED") blockers.push("HTTP endpoint returned error status.");
    if (verif.routeHealth === "FAILED") blockers.push("Expected route unreachable.");
    if (verif.runtimeHealth === "FAILED") blockers.push("Unhandled exception detected in runtime.");
    if (verif.interactionHealth === "FAILED") blockers.push("Critical interactive calculator/form failed.");
    if (verif.contentHealth === "FAILED") blockers.push("Unsupported factual claim found in live content.");
    if (verif.securityHealth === "FAILED") blockers.push("Critical security header missing.");

    verif.checks.forEach((c) => {
      evidenceIds.push(`CHECK-${c.name.replace(/\s+/g, "-").toUpperCase()}-${c.status}`);
    });

    let overall: "HEALTHY" | "DEGRADED" | "FAILED" = "HEALTHY";
    if (blockers.length > 0) {
      overall = blockers.some((b) => b.includes("HTTP") || b.includes("runtime")) ? "FAILED" : "DEGRADED";
    }

    return {
      projectId,
      deploymentId: verif.deploymentId,
      url: verif.url,
      timestamp: new Date().toISOString(),
      httpHealth: verif.httpHealth,
      routeHealth: verif.routeHealth,
      runtimeHealth: verif.runtimeHealth,
      interactionHealth: verif.interactionHealth,
      visualHealth: verif.visualHealth,
      contentHealth: verif.contentHealth,
      securityHealth: verif.securityHealth,
      overallHealth: overall,
      blockers,
      evidenceIds,
    };
  }
}

export const productionHealthService = new ProductionHealthService();
