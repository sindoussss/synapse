import fs from "fs";
import path from "path";

export type DriftClassification =
  | "NO_DRIFT"
  | "MINOR_DRIFT"
  | "MAJOR_DRIFT"
  | "UNAUTHORIZED_DRIFT"
  | "CONFLICTING_CHANGE";

export interface DriftAnalysisResult {
  projectId: string;
  classification: DriftClassification;
  driftDetected: boolean;
  unauthorizedScopeExpansion: boolean;
  missingRequirements: string[];
  conflictingRequirements: string[];
  findings: string[];
  releaseBlocker: boolean;
}

export class RequirementDriftService {
  analyzeDrift(params: {
    projectId: string;
    originalRequirements: string[];
    approvedRequirements: string[];
    currentImplementedFeatures: string[];
    requestedChanges: string[];
  }): DriftAnalysisResult {
    const findings: string[] = [];
    let classification: DriftClassification = "NO_DRIFT";
    let unauthorizedScopeExpansion = false;
    let releaseBlocker = false;

    // Check if current implementation dropped any approved requirement
    const missing = params.approvedRequirements.filter(
      (req) => !params.currentImplementedFeatures.some((f) => f.toLowerCase().includes(req.toLowerCase().slice(0, 10)))
    );
    if (missing.length > 0) {
      classification = "MAJOR_DRIFT";
      findings.push(`Approved requirement(s) missing in current implementation: ${missing.join(", ")}`);
      releaseBlocker = true;
    }

    // Check for unauthorized scope expansion (features added without CR authorization)
    const unauthorizedFeatures = params.currentImplementedFeatures.filter(
      (f) =>
        !params.approvedRequirements.some((req) => f.toLowerCase().includes(req.toLowerCase().slice(0, 10))) &&
        !params.requestedChanges.some((cr) => f.toLowerCase().includes(cr.toLowerCase().slice(0, 10)))
    );
    if (unauthorizedFeatures.length > 0) {
      classification = "UNAUTHORIZED_DRIFT";
      unauthorizedScopeExpansion = true;
      findings.push(`Unauthorized scope expansion detected: ${unauthorizedFeatures.join(", ")}`);
      releaseBlocker = true;
    }

    return {
      projectId: params.projectId,
      classification,
      driftDetected: classification !== "NO_DRIFT",
      unauthorizedScopeExpansion,
      missingRequirements: missing,
      conflictingRequirements: [],
      findings,
      releaseBlocker,
    };
  }
}

export const requirementDriftService = new RequirementDriftService();
