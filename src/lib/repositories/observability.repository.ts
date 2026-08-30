import fs from "fs";
import path from "path";

export type TelemetryOperationType =
  | "MODEL_INFERENCE"
  | "CODE_GENERATION"
  | "CODE_REPAIR"
  | "CODE_REVIEW"
  | "VISUAL_REVIEW"
  | "BUILD"
  | "TYPECHECK"
  | "LINT"
  | "FUNCTIONAL_QA"
  | "SECURITY_SCAN"
  | "DEPLOYMENT"
  | "DEPLOYMENT_VERIFICATION"
  | "ROLLBACK"
  | "PAYMENT_VERIFICATION"
  | "SOURCE_PACKAGE_GENERATION"
  | "SOURCE_PACKAGE_DOWNLOAD"
  | "INCIDENT_RESPONSE";

export type CostCoverage = "KNOWN" | "ESTIMATED" | "UNKNOWN" | "NOT_APPLICABLE";

export interface ExecutionTelemetryRecord {
  telemetryId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: string;
  executionId: string;
  taskId: string;
  agent: string;
  provider: string;
  model: string;
  operationType: TelemetryOperationType;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "SUCCESS" | "FAILURE" | "REPAIRED" | "RETRY_EXHAUSTED" | "ROLLED_BACK";
  retryCount: number;
  fallbackUsed: boolean;
  fallbackModel?: string;
  inputEvidenceId?: string;
  outputEvidenceId?: string;
  errorCode?: string;
  errorCategory?: string;
  costEvidenceId?: string;
  tokens: {
    inputTokens: number | "UNKNOWN";
    outputTokens: number | "UNKNOWN";
  };
  cost: {
    providerCost: number | "UNKNOWN";
    localComputeCost: number | "UNKNOWN";
    infrastructureCost: number | "UNKNOWN";
    costCoverage: CostCoverage;
  };
  createdAt: string;
}

export class ObservabilityRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private telemetryFile = path.join(this.dataDir, "observability-telemetry.json");

  private readCache(): ExecutionTelemetryRecord[] {
    if (!fs.existsSync(this.telemetryFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.telemetryFile, "utf8"));
    } catch {
      return [];
    }
  }

  private writeCache(data: ExecutionTelemetryRecord[]): void {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.telemetryFile, JSON.stringify(data, null, 2), "utf8");
  }

  async recordExecution(record: ExecutionTelemetryRecord): Promise<ExecutionTelemetryRecord> {
    const cache = this.readCache();
    // Append-only persistence: historical telemetry is immutable
    cache.push(record);
    this.writeCache(cache);
    return record;
  }

  async getTelemetryByProject(projectId: string, organizationId: string): Promise<ExecutionTelemetryRecord[]> {
    const cache = this.readCache();
    return cache.filter((r) => r.projectId === projectId && r.organizationId === organizationId);
  }

  async getAllTelemetry(organizationId?: string): Promise<ExecutionTelemetryRecord[]> {
    const cache = this.readCache();
    return organizationId ? cache.filter((r) => r.organizationId === organizationId) : cache;
  }

  async getExecutionTrace(executionId: string): Promise<ExecutionTelemetryRecord[]> {
    const cache = this.readCache();
    return cache
      .filter((r) => r.executionId === executionId)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }
}

export const observabilityRepository = new ObservabilityRepository();
