import { observabilityRepository } from "../../repositories/observability.repository";

export interface AnomalyAlert {
  alertId: string;
  timestamp: string;
  projectId: string;
  severity: "NORMAL" | "WATCH" | "ANOMALY" | "CRITICAL_ANOMALY";
  anomalyType: "LATENCY_SPIKE" | "RETRY_SPIKE" | "REPAIR_SPIKE" | "COST_SPIKE" | "UNUSUAL_FAILURES";
  description: string;
  evidenceId: string;
  requiredAction: "OPERATOR_REVIEW_REQUIRED";
}

export class AnomalyDetectionService {
  async detectAnomalies(projectId: string, organizationId: string): Promise<AnomalyAlert[]> {
    const telemetry = await observabilityRepository.getTelemetryByProject(projectId, organizationId);
    const alerts: AnomalyAlert[] = [];

    // Latency spike check (> 10000ms on build/inference)
    const slowExec = telemetry.filter((t) => t.durationMs > 10000);
    if (slowExec.length > 0) {
      alerts.push({
        alertId: `ALERT-LATENCY-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        projectId,
        severity: "ANOMALY",
        anomalyType: "LATENCY_SPIKE",
        description: `Detected ${slowExec.length} executions exceeding 10s latency threshold.`,
        evidenceId: slowExec[0].telemetryId,
        requiredAction: "OPERATOR_REVIEW_REQUIRED",
      });
    }

    // High retry frequency (> 2 retries)
    const highRetries = telemetry.filter((t) => t.retryCount >= 2);
    if (highRetries.length > 0) {
      alerts.push({
        alertId: `ALERT-RETRY-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        projectId,
        severity: "WATCH",
        anomalyType: "RETRY_SPIKE",
        description: `Detected repeated retries in ${highRetries.length} operations.`,
        evidenceId: highRetries[0].telemetryId,
        requiredAction: "OPERATOR_REVIEW_REQUIRED",
      });
    }

    return alerts;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
