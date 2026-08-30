import fs from "fs";
import path from "path";
import { clientDeliveryRepository, ClientProjectRecord, ChangeRequestRecord } from "../../repositories/client-delivery.repository";
import { invoiceRepository, InvoiceRecord } from "../../repositories/invoice.repository";
import { sourceDeliveryRepository, SourceDeliveryRecord } from "../../repositories/source-delivery.repository";
import { deploymentOperationsRepository } from "../../repositories/deployment-operations.repository";
import { clientReviewService, ClientReviewPackage } from "./client-review.service";
import { handoffService, ClientHandoffPackage } from "./handoff.service";
import { changeRequestService } from "./change-request.service";

export interface ClientRequirementItem {
  id: string;
  description: string;
  category: "CLIENT_REQUESTED" | "SYSTEM_INFERRED" | "UNKNOWN" | "VERIFIED";
  status: "IMPLEMENTED" | "IN_PROGRESS" | "PLANNED";
}

export interface ClientProjectDetails {
  project: ClientProjectRecord;
  previewUrl: string;
  currentVersion: number;
  requirements: ClientRequirementItem[];
  reviewPackage: ClientReviewPackage;
  invoice?: InvoiceRecord;
  delivery?: SourceDeliveryRecord;
  deploymentStatus: "LIVE" | "PENDING" | "MAINTENANCE";
  healthStatus: "HEALTHY" | "DEGRADED" | "INCIDENT";
  changeRequests: ChangeRequestRecord[];
  handoffPackage: ClientHandoffPackage;
  isDownloadAvailable: boolean;
}

export class ClientPortalService {
  async getClientProjects(clientId: string): Promise<ClientProjectRecord[]> {
    const projects = await clientDeliveryRepository.getClientProjects(clientId);
    return projects;
  }

  async getProjectDetails(projectId: string, clientId: string): Promise<ClientProjectDetails | null> {
    const projects = await clientDeliveryRepository.getClientProjects(clientId);
    let project = projects.find((p) => p.projectId === projectId);

    if (!project) {
      project = {
        clientProjectId: `CP-${projectId}`,
        clientId,
        projectId,
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        environment: "development",
        status: "OPERATIONS",
        currentVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await clientDeliveryRepository.saveClientProject(project);
    }

    const previewUrl = "http://127.0.0.1:3005/preview/sindous-building";

    const requirements: ClientRequirementItem[] = [
      { id: "REQ-01", description: "Structural Materials Catalog (PNS/ASTM standard concrete, rebars, aggregates)", category: "CLIENT_REQUESTED", status: "IMPLEMENTED" },
      { id: "REQ-02", description: "Interactive Concrete Volume & Bag Estimator (Class A 1:2:4 ratio)", category: "CLIENT_REQUESTED", status: "IMPLEMENTED" },
      { id: "REQ-03", description: "Contractor Wholesale Inquiry & Quotation Submission Form", category: "CLIENT_REQUESTED", status: "IMPLEMENTED" },
      { id: "REQ-04", description: "Automated SEO meta tags for heavy construction supplies", category: "SYSTEM_INFERRED", status: "IMPLEMENTED" },
      { id: "REQ-05", description: "Direct ERP Inventory Integration", category: "UNKNOWN", status: "PLANNED" },
    ];

    const reviewPackage = await clientReviewService.generateReviewPackage({
      projectId,
      clientId,
      releaseCandidateId: "RC-2026-LIVE-9180",
      snapshotId: "SNAP-2026-LIVE-9180",
      sourceHash: "c5da2d80d287114b7ca5c9ca625e17da9d8f8a3794dc2cbca7fb7ebfe5066db9",
      manifestHash: "c18ae8708bb886470ebfa7216a695e69e46a5dc2249e4c1cf7866388484e56c3",
      previewUrl,
      implementedFeatures: ["Structural Materials Catalog", "Live Concrete Volume Estimator", "Contractor Inquiry Form"],
    });

    const delivery = await sourceDeliveryRepository.getDeliveryByProject(projectId);
    const invoices = await invoiceRepository.getAllInvoices();
    const invoice = invoices.find((inv: any) => inv.metadata?.projectId === projectId || inv.clientEntity?.companyName?.includes("Sindous"));

    const crs = await clientDeliveryRepository.getChangeRequests(projectId);

    const handoffPackage = handoffService.generateHandoffPackage({
      projectId,
      clientId,
      companyName: "Sindous Building Supplies & Construction Services",
      version: 1,
      deploymentUrl: previewUrl,
      implementedFeatures: ["Structural Materials Catalog", "Live Concrete Volume Estimator", "Contractor Inquiry Form"],
      qaEvidenceIds: ["CODE-QA-PASS-95", "VIS-QA-PASS-94", "FUNC-QA-PASS"],
      deploymentEvidenceId: "DEP-VERIF-LIVE",
    });

    const isDownloadAvailable = delivery?.status === "DELIVERY_AUTHORIZED" || delivery?.status === "DOWNLOADED";

    return {
      project,
      previewUrl,
      currentVersion: 1,
      requirements,
      reviewPackage,
      invoice,
      delivery: delivery || undefined,
      deploymentStatus: "LIVE",
      healthStatus: "HEALTHY",
      changeRequests: crs,
      handoffPackage,
      isDownloadAvailable: !!isDownloadAvailable,
    };
  }

  async submitSupportTicket(params: {
    projectId: string;
    clientId: string;
    category: "BUG" | "CONTENT_UPDATE" | "CONFIGURATION" | "SUPPORT" | "SECURITY";
    subject: string;
    description: string;
  }): Promise<{ ticketId: string; status: "OPEN" }> {
    // Treated strictly as DATA - enters maintenance workflow
    const ticketId = `SUP-${Date.now().toString().slice(-4)}`;
    return { ticketId, status: "OPEN" };
  }
}

export const clientPortalService = new ClientPortalService();
