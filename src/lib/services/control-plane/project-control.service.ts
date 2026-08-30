import { buildProfileRepository, BuildProfileRecord } from "../../repositories/build-profile.repository";
import { buildArtifactRepository, BuildArtifactRecord } from "../../repositories/build-artifact.repository";
import { deploymentTargetRepository } from "../../repositories/deployment-target.repository";
import { actionRequiredService, PendingActionItem } from "./action-required.service";
import { projectHealthService, ProjectHealthBreakdown, ProjectOverallHealth } from "./project-health.service";

export interface ProjectControlSummaryRow {
  projectId: string;
  projectName: string;
  clientName: string;
  organizationId: string;
  stage: string;
  health: ProjectOverallHealth;
  buildStatus: string;
  qaStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  deploymentStatus: string;
  lastActivity: string;
  actionRequiredCount: number;
}

export interface ProjectControlSnapshot {
  project: {
    projectId: string;
    name: string;
    organizationId: string;
    workspaceId: string;
    environment: string;
    version: string;
    stage: string;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    clientId: string;
    name: string;
    email: string;
    organization: string;
  };
  commercial: {
    opportunityId: string;
    proposalId: string;
    contractValue: number;
    currency: string;
    invoiceId: string;
    paidAmount: number;
    outstandingAmount: number;
    isPaid: boolean;
    paymentEnvironment: string;
  };
  requirements: {
    explicitCount: number;
    inferredCount: number;
    unknownCount: number;
    verifiedCount: number;
    status: "COMPLETE" | "PENDING_CLARIFICATION";
  };
  design: {
    theme: string;
    designSystemVersion: string;
    componentCount: number;
    pattern: string;
    learningRecommendationsCount: number;
  };
  implementation: {
    currentTask: string;
    developerModel: string;
    snapshotId: string;
    sourceHash: string;
    manifestHash: string;
  };
  qa: {
    codeReview: "PASS" | "FAIL";
    visualReview: "PASS" | "FAIL";
    functionalQA: "PASS" | "FAIL";
    accessibility: "PASS" | "FAIL";
    security: "PASS" | "FAIL";
    contentIntegrity: "PASS" | "FAIL";
  };
  release: {
    releaseCandidateId: string;
    buildProfileId: string;
    buildStatus: string;
    artifactId: string;
    artifactHash: string;
    isApproved: boolean;
  };
  delivery: {
    sourcePackageUnlocked: boolean;
    deliveryStatus: string;
    downloadCount: number;
    packageHash: string;
  };
  deployment: {
    targetProvider: string;
    deploymentStatus: string;
    liveUrl: string;
    lastVerified: string;
    rollbackTarget: string;
  };
  operations: {
    health: ProjectHealthBreakdown;
    activeIncidentsCount: number;
    changeRequestsCount: number;
  };
  telemetry: {
    executionCount: number;
    latestModel: string;
    latestLatencyMs: number;
    costUsd: number | "UNKNOWN";
    costCoverage: string;
  };
  actionsRequired: PendingActionItem[];
  timeline: Array<{ stage: string; status: string; timestamp: string; actor: string }>;
}

export class ProjectControlService {
  // Hardened authoritative project registry mock composition
  private projects = [
    {
      projectId: "PRJ-SINDOUS-01",
      name: "Sindous Building Supplies E-Commerce Portal",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-SINDOUS-01",
      clientId: "CLI-SINDOUS-01",
      clientName: "Sindous Commercial Corp.",
      clientEmail: "sindousbuilding@gmail.com",
      environment: "production",
      version: "v1.0.0-rc49",
      stage: "COMPLETED",
      opportunityId: "OPP-SINDOUS-01",
      proposalId: "PROP-SINDOUS-01",
      contractValue: 88000,
      currency: "PHP",
      invoiceId: "INV-2026-1309",
      paidAmount: 88000,
      outstandingAmount: 0,
      isPaid: true,
      snapshotId: "SNAP-SINDOUS-FINAL-2026",
      sourceHash: "ec03c0219e3d01719a9b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f50617",
      manifestHash: "man-sindous-final-2026",
      releaseCandidateId: "RC-FINAL-P49-SINDOUS",
      buildProfileId: "BP-SINDOUS-01-V1",
      artifactId: "ART-SINDOUS-01-V1",
      artifactHash: "a9406accb7cc98e26bc1c272421f5f3e9b1d0349887711425121858169680371",
      liveUrl: "https://sindous.ph",
      lastActivity: "2026-08-30T10:00:00.000Z",
    },
    {
      projectId: "PRJ-LUXE-01",
      name: "Luxe Fine Dining Experience & Booking",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-LUXE-01",
      clientId: "CLI-LUXE-01",
      clientName: "Luxe Hospitality Group",
      clientEmail: "contact@luxedining.ph",
      environment: "production",
      version: "v0.9.1-p53",
      stage: "CLIENT_REVIEW",
      opportunityId: "OPP-LUXE-01",
      proposalId: "PROP-LUXE-01",
      contractValue: 125000,
      currency: "PHP",
      invoiceId: "INV-2026-1402",
      paidAmount: 0,
      outstandingAmount: 125000,
      isPaid: false,
      snapshotId: "SNAP-LUXE-PREVIEW-01",
      sourceHash: "src-luxe-preview-hash-9988",
      manifestHash: "man-luxe-preview-hash-9988",
      releaseCandidateId: "RC-LUXE-P53-01",
      buildProfileId: "BP-LUXE-01",
      artifactId: "ART-LUXE-01",
      artifactHash: "art-luxe-hash-11223344",
      liveUrl: "http://127.0.0.1:3005",
      lastActivity: "2026-08-30T09:30:00.000Z",
    },
  ];

  listProjects(callingOrgId: string, filter?: { status?: string; search?: string }): ProjectControlSummaryRow[] {
    const authorized = this.projects.filter((p) => p.organizationId === callingOrgId);

    const rows: ProjectControlSummaryRow[] = authorized.map((p) => {
      const isPaid = p.isPaid;
      const isDelivered = p.stage === "COMPLETED";
      const health = projectHealthService.deriveHealth({
        codePassed: true,
        visualPassed: true,
        functionalPassed: true,
        accessibilityPassed: true,
        securityPassed: true,
        buildPassed: true,
        deploymentStatus: "LIVE",
        isPaid,
        isDelivered,
        hasActiveIncident: false,
      });

      const actions = actionRequiredService.evaluateActions({
        projectId: p.projectId,
        stage: p.stage,
        isPaid,
        hasApprovedRelease: true,
        qaPassed: true,
        buildPassed: true,
        deploymentHealthy: true,
        hasOpenIncidents: false,
        hasPendingClarifications: false,
        hasPendingChangeRequest: false,
        sourceDelivered: isDelivered,
      });

      return {
        projectId: p.projectId,
        projectName: p.name,
        clientName: p.clientName,
        organizationId: p.organizationId,
        stage: p.stage,
        health: health.overall,
        buildStatus: "VALIDATED",
        qaStatus: "PASS",
        paymentStatus: isPaid ? "PAID" : "PENDING",
        deliveryStatus: isDelivered ? "DELIVERED" : "LOCKED",
        deploymentStatus: "LIVE",
        lastActivity: p.lastActivity,
        actionRequiredCount: actions.length,
      };
    });

    if (!filter) return rows;

    return rows.filter((r) => {
      if (filter.status && filter.status !== "ALL" && r.health !== filter.status && r.stage !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return r.projectName.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) || r.projectId.toLowerCase().includes(q);
      }
      return true;
    });
  }

  getProjectSnapshot(projectId: string, callingOrgId: string): ProjectControlSnapshot | null {
    const p = this.projects.find((proj) => proj.projectId === projectId);
    if (!p) return null;
    if (p.organizationId !== callingOrgId) return null; // Cross-tenant blocked

    const isPaid = p.isPaid;
    const isDelivered = p.stage === "COMPLETED";
    const health = projectHealthService.deriveHealth({
      codePassed: true,
      visualPassed: true,
      functionalPassed: true,
      accessibilityPassed: true,
      securityPassed: true,
      buildPassed: true,
      deploymentStatus: "LIVE",
      isPaid,
      isDelivered,
      hasActiveIncident: false,
    });

    const actionsRequired = actionRequiredService.evaluateActions({
      projectId: p.projectId,
      stage: p.stage,
      isPaid,
      hasApprovedRelease: true,
      qaPassed: true,
      buildPassed: true,
      deploymentHealthy: true,
      hasOpenIncidents: false,
      hasPendingClarifications: false,
      hasPendingChangeRequest: false,
      sourceDelivered: isDelivered,
    });

    const timeline = [
      { stage: "INTAKE", status: "COMPLETED", timestamp: "2026-08-28T09:00:00Z", actor: "CLIENT" },
      { stage: "REQUIREMENTS", status: "COMPLETED", timestamp: "2026-08-28T10:30:00Z", actor: "OPERATOR" },
      { stage: "DESIGN", status: "COMPLETED", timestamp: "2026-08-28T14:00:00Z", actor: "OPERATOR" },
      { stage: "IMPLEMENTATION", status: "COMPLETED", timestamp: "2026-08-29T08:00:00Z", actor: "AI_DEVELOPER_AGENT" },
      { stage: "QA", status: "COMPLETED", timestamp: "2026-08-29T11:00:00Z", actor: "QA_ENGINE" },
      { stage: "CLIENT_REVIEW", status: "COMPLETED", timestamp: "2026-08-29T15:00:00Z", actor: "CLIENT" },
      { stage: "APPROVAL", status: "COMPLETED", timestamp: "2026-08-29T16:00:00Z", actor: "CLIENT" },
      { stage: "BUILD", status: "COMPLETED", timestamp: "2026-08-29T16:30:00Z", actor: "UNIVERSAL_BUILD_ENGINE" },
      { stage: "DEPLOYMENT", status: "COMPLETED", timestamp: "2026-08-29T17:00:00Z", actor: "OPERATOR" },
      { stage: "PAYMENT", status: isPaid ? "COMPLETED" : "PENDING", timestamp: isPaid ? "2026-08-30T08:00:00Z" : "-", actor: "PAYPAL_GATEWAY" },
      { stage: "DELIVERY", status: isDelivered ? "COMPLETED" : "LOCKED", timestamp: isDelivered ? "2026-08-30T09:00:00Z" : "-", actor: "OPERATOR" },
      { stage: "OPERATIONS", status: "LIVE", timestamp: "2026-08-30T10:00:00Z", actor: "PRODUCTION_OPERATIONS" },
    ];

    return {
      project: {
        projectId: p.projectId,
        name: p.name,
        organizationId: p.organizationId,
        workspaceId: p.workspaceId,
        environment: p.environment,
        version: p.version,
        stage: p.stage,
        createdAt: "2026-08-28T09:00:00Z",
        updatedAt: p.lastActivity,
      },
      client: {
        clientId: p.clientId,
        name: p.clientName,
        email: p.clientEmail,
        organization: p.clientName,
      },
      commercial: {
        opportunityId: p.opportunityId,
        proposalId: p.proposalId,
        contractValue: p.contractValue,
        currency: p.currency,
        invoiceId: p.invoiceId,
        paidAmount: p.paidAmount,
        outstandingAmount: p.outstandingAmount,
        isPaid: p.isPaid,
        paymentEnvironment: "PAYPAL_LIVE",
      },
      requirements: {
        explicitCount: 8,
        inferredCount: 4,
        unknownCount: 0,
        verifiedCount: 12,
        status: "COMPLETE",
      },
      design: {
        theme: "Industrial Commercial Minimal",
        designSystemVersion: "DS-v2.1",
        componentCount: 14,
        pattern: "B2B_SUPPLIES_CATALOG",
        learningRecommendationsCount: 3,
      },
      implementation: {
        currentTask: "TASK-RELEASE-P49-FINAL",
        developerModel: "local-ollama-gemma4-12b",
        snapshotId: p.snapshotId,
        sourceHash: p.sourceHash,
        manifestHash: p.manifestHash,
      },
      qa: {
        codeReview: "PASS",
        visualReview: "PASS",
        functionalQA: "PASS",
        accessibility: "PASS",
        security: "PASS",
        contentIntegrity: "PASS",
      },
      release: {
        releaseCandidateId: p.releaseCandidateId,
        buildProfileId: p.buildProfileId,
        buildStatus: "VALIDATED",
        artifactId: p.artifactId,
        artifactHash: p.artifactHash,
        isApproved: true,
      },
      delivery: {
        sourcePackageUnlocked: isDelivered,
        deliveryStatus: isDelivered ? "DELIVERED" : "LOCKED",
        downloadCount: isDelivered ? 1 : 0,
        packageHash: p.sourceHash,
      },
      deployment: {
        targetProvider: "VERCEL / LOCAL_STAGING",
        deploymentStatus: "LIVE",
        liveUrl: p.liveUrl,
        lastVerified: "2026-08-30T10:00:00Z",
        rollbackTarget: "ART-SINDOUS-01-V1",
      },
      operations: {
        health,
        activeIncidentsCount: 0,
        changeRequestsCount: 0,
      },
      telemetry: {
        executionCount: 24,
        latestModel: "gemma-4-12B-coder",
        latestLatencyMs: 412,
        costUsd: "UNKNOWN",
        costCoverage: "100%",
      },
      actionsRequired,
      timeline,
    };
  }
}

export const projectControlService = new ProjectControlService();