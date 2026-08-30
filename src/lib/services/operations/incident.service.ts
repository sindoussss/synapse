import fs from "fs";
import path from "path";
import { clientDeliveryRepository, IncidentRecord } from "../../repositories/client-delivery.repository";

export class IncidentService {
  async triggerIncident(params: {
    projectId: string;
    deploymentId: string;
    detectedHealthVector: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    affectedRoutes: string[];
    mitigationAction?: string;
  }): Promise<IncidentRecord> {
    const inc: IncidentRecord = {
      incidentId: `INC-${Date.now().toString().slice(-4)}`,
      projectId: params.projectId,
      deploymentId: params.deploymentId,
      detectedHealthVector: params.detectedHealthVector,
      severity: params.severity,
      affectedRoutes: params.affectedRoutes,
      rollbackAvailability: true,
      status: "INCIDENT_DETECTED",
      mitigationAction: params.mitigationAction,
      createdAt: new Date().toISOString(),
    };
    return await clientDeliveryRepository.saveIncident(inc);
  }

  async resolveIncident(incidentId: string, resolutionSummary: string): Promise<IncidentRecord> {
    const incs = await clientDeliveryRepository.getIncidents("");
    const inc = incs.find((i) => i.incidentId === incidentId);
    if (!inc) throw new Error(`Incident ${incidentId} not found.`);
    inc.status = "RESOLVED";
    inc.resolutionSummary = resolutionSummary;
    inc.resolvedAt = new Date().toISOString();
    return await clientDeliveryRepository.saveIncident(inc);
  }
}

export const incidentService = new IncidentService();
