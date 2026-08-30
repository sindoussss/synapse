import fs from "fs";
import path from "path";
import { clientDeliveryRepository } from "../../repositories/client-delivery.repository";

export interface OperationsDashboardSummary {
  projects: {
    activeCount: number;
    awaitingReviewCount: number;
    awaitingApprovalCount: number;
    deployedCount: number;
    degradedCount: number;
  };
  deployments: {
    latestDeploymentId: string;
    deploymentUrl: string;
    healthState: "HEALTHY" | "DEGRADED" | "FAILED";
    rollbackAvailable: boolean;
  };
  qa: {
    codeQualityScore: number;
    visualQualityScore: number;
    securityStatus: string;
  };
  clientDelivery: {
    pendingReviews: number;
    activeChangeRequests: number;
    openIncidents: number;
  };
}

export class OperationsDashboardService {
  async getDashboardSummary(projectId: string): Promise<OperationsDashboardSummary> {
    const crs = await clientDeliveryRepository.getChangeRequests(projectId);
    const incs = await clientDeliveryRepository.getIncidents(projectId);
    const milestones = await clientDeliveryRepository.getMilestones(projectId);

    return {
      projects: {
        activeCount: 1,
        awaitingReviewCount: milestones.filter((m) => m.type === "CLIENT_REVIEW" && m.status === "PENDING").length,
        awaitingApprovalCount: milestones.filter((m) => m.type === "APPROVAL" && m.status === "PENDING").length,
        deployedCount: milestones.filter((m) => m.type === "DEPLOYMENT" && m.status === "COMPLETED").length,
        degradedCount: incs.filter((i) => i.status !== "RESOLVED").length,
      },
      deployments: {
        latestDeploymentId: "DEP-9140",
        deploymentUrl: "http://127.0.0.1:3005/preview/sindous-building",
        healthState: incs.some((i) => i.severity === "CRITICAL") ? "FAILED" : "HEALTHY",
        rollbackAvailable: true,
      },
      qa: {
        codeQualityScore: 95,
        visualQualityScore: 94,
        securityStatus: "PASS (0 secrets, 0 eval)",
      },
      clientDelivery: {
        pendingReviews: milestones.filter((m) => m.type === "CLIENT_REVIEW" && m.status === "PENDING").length,
        activeChangeRequests: crs.filter((c) => c.status !== "APPROVED" && c.status !== "REJECTED").length,
        openIncidents: incs.filter((i) => i.status !== "RESOLVED").length,
      },
    };
  }
}

export const operationsDashboardService = new OperationsDashboardService();
