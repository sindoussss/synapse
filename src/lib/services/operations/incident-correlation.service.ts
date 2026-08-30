import fs from "fs";
import path from "path";
import { IncidentRecord } from "../../repositories/client-delivery.repository";

export type IncidentScope = "PROJECT_LOCAL" | "WORKSPACE_LOCAL" | "PROVIDER_WIDE" | "PLATFORM_WIDE";

export interface CorrelatedIncidentReport {
  correlationId: string;
  scope: IncidentScope;
  affectedProjects: string[];
  commonRootCause: string;
  evidencePreservedPerProject: boolean;
  remediationProposal: string;
}

export class IncidentCorrelationService {
  correlateIncidents(incidents: IncidentRecord[]): CorrelatedIncidentReport {
    const affectedProjects = Array.from(new Set(incidents.map((i) => i.projectId)));
    const sameVector = incidents.length > 1 && incidents.every((i) => i.detectedHealthVector === incidents[0].detectedHealthVector);

    let scope: IncidentScope = "PROJECT_LOCAL";
    let cause = "Isolated project-level error.";

    if (affectedProjects.length > 1 && sameVector) {
      scope = "PLATFORM_WIDE";
      cause = `Shared infrastructure error: ${incidents[0].detectedHealthVector} detected across multiple projects.`;
    }

    return {
      correlationId: `CORR-${Date.now().toString().slice(-4)}`,
      scope,
      affectedProjects,
      commonRootCause: cause,
      evidencePreservedPerProject: true,
      remediationProposal: "Execute localized remediation tasks without bulk mutating unaffected projects.",
    };
  }
}

export const incidentCorrelationService = new IncidentCorrelationService();
