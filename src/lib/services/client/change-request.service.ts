import fs from "fs";
import path from "path";
import { clientDeliveryRepository, ChangeRequestRecord } from "../../repositories/client-delivery.repository";

export class ChangeRequestService {
  async submitChangeRequest(params: {
    projectId: string;
    clientId: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    requestedBy: string;
    affectedArea: string;
    requirementClassification: "NEW_FEATURE" | "MODIFICATION" | "BUG_FIX" | "STYLE_TWEAK";
  }): Promise<ChangeRequestRecord> {
    const cr: ChangeRequestRecord = {
      changeRequestId: `CR-${Date.now().toString().slice(-4)}`,
      projectId: params.projectId,
      clientId: params.clientId,
      description: params.description,
      priority: params.priority,
      requestedBy: params.requestedBy,
      affectedArea: params.affectedArea,
      requirementClassification: params.requirementClassification,
      estimatedComplexity: params.priority === "CRITICAL" || params.priority === "HIGH" ? "HIGH" : "MEDIUM",
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return await clientDeliveryRepository.saveChangeRequest(cr);
  }

  async authorizeChangeRequest(changeRequestId: string, authorizedBy: string): Promise<ChangeRequestRecord> {
    const crs = await clientDeliveryRepository.getChangeRequests("");
    const cr = crs.find((c) => c.changeRequestId === changeRequestId);
    if (!cr) throw new Error(`Change Request ${changeRequestId} not found.`);
    cr.status = "AUTHORIZED";
    cr.updatedAt = new Date().toISOString();
    return await clientDeliveryRepository.saveChangeRequest(cr);
  }
}

export const changeRequestService = new ChangeRequestService();
