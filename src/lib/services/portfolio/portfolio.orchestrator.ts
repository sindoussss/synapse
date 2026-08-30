import fs from "fs";
import path from "path";
import { portfolioRepository, PortfolioRecord, ProjectPortfolioMembershipRecord } from "../../repositories/portfolio.repository";
import { portfolioAuditRepository } from "../../repositories/portfolio-audit.repository";
import { clientDeliveryOrchestrator, ClientDeliveryExecutionResult } from "../client/client-delivery.orchestrator";
import { concurrentExecutionService } from "./concurrent-execution.service";

export interface MultiProjectExecutionResult {
  portfolio: PortfolioRecord;
  projectResults: Record<string, ClientDeliveryExecutionResult>;
  totalProjects: number;
  allProjectsInOperations: boolean;
}

export class PortfolioOrchestrator {
  async executePortfolioProjects(params: {
    portfolioId: string;
    organizationId: string;
    workspaceId: string;
    portfolioName: string;
    projects: Array<{
      projectId: string;
      clientName: string;
      contactEmail: string;
      rawPrompt: string;
      files: Record<string, string>;
    }>;
  }): Promise<MultiProjectExecutionResult> {
    const org = params.organizationId;
    const ws = params.workspaceId;

    const portfolio: PortfolioRecord = {
      portfolioId: params.portfolioId,
      organizationId: org,
      workspaceId: ws,
      name: params.portfolioName,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await portfolioRepository.savePortfolio(portfolio);

    const projectResults: Record<string, ClientDeliveryExecutionResult> = {};

    for (const proj of params.projects) {
      // 1. Record Membership
      await portfolioRepository.saveMembership({
        membershipId: `MEM-${proj.projectId}`,
        portfolioId: portfolio.portfolioId,
        projectId: proj.projectId,
        clientId: `CLI-${proj.projectId}`,
        organizationId: org,
        workspaceId: ws,
        role: "PRIMARY",
        joinedAt: new Date().toISOString(),
      });

      // 2. Start Concurrent Execution
      const job = await concurrentExecutionService.startJob(proj.projectId);

      // 3. Execute Complete Client Delivery
      const res = await clientDeliveryOrchestrator.executeFullClientDelivery({
        clientId: `CLI-${proj.projectId}`,
        clientName: proj.clientName,
        contactEmail: proj.contactEmail,
        organizationId: org,
        workspaceId: ws,
        rawPrompt: proj.rawPrompt,
        files: proj.files,
        grantClientApproval: true,
        grantOperatorDeploymentApproval: true,
      });

      concurrentExecutionService.completeJob(job.jobId);
      projectResults[proj.projectId] = res;

      await portfolioAuditRepository.recordAudit({
        auditId: `AUDIT-${proj.projectId}`,
        portfolioId: portfolio.portfolioId,
        projectId: proj.projectId,
        organizationId: org,
        workspaceId: ws,
        actor: "Portfolio Orchestrator",
        action: "PROJECT_DELIVERY_COMPLETED",
        result: "SUCCESS",
        timestamp: new Date().toISOString(),
      });
    }

    const allInOps = Object.values(projectResults).every((r) => r.finalState === "OPERATIONS");

    return {
      portfolio,
      projectResults,
      totalProjects: params.projects.length,
      allProjectsInOperations: allInOps,
    };
  }
}

export const portfolioOrchestrator = new PortfolioOrchestrator();
