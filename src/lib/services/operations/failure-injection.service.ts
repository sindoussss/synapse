import fs from "fs";
import path from "path";

export type RehearsalEnvironment = "LIVE_REAL" | "PRODUCTION_REHEARSAL" | "CONTROLLED_TEST" | "DEVELOPMENT";

export type FailureMode =
  | "MODEL_TIMEOUT"
  | "MODEL_MALFORMED_OUTPUT"
  | "BUILD_SYNTAX_ERROR"
  | "BUILD_TYPECHECK_ERROR"
  | "DEPLOYMENT_HTTP_500"
  | "DEPLOYMENT_TIMEOUT"
  | "DELAYED_WEBHOOK"
  | "DUPLICATE_WEBHOOK"
  | "STALE_APPROVAL"
  | "STALE_SNAPSHOT"
  | "CORRUPTED_PACKAGE"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "PAYMENT_REFUND"
  | "TRANSIENT_DB_FAILURE"
  | "WORKER_CRASH"
  | "PROMPT_INJECTION";

export interface InjectedFailureRecord {
  injectionId: string;
  timestamp: string;
  environment: RehearsalEnvironment;
  projectId: string;
  failureMode: FailureMode;
  targetComponent: string;
  description: string;
  label: "FAILURE_INJECTION";
  detected: boolean;
  contained: boolean;
  recovered: boolean;
  recoveryType?: "AUTO_RECOVERED" | "HUMAN_REVIEW_REQUIRED" | "ROLLED_BACK";
}

export class FailureInjectionService {
  private activeInjections: InjectedFailureRecord[] = [];

  injectFailure(params: {
    environment: RehearsalEnvironment;
    projectId: string;
    failureMode: FailureMode;
    targetComponent: string;
    description: string;
  }): InjectedFailureRecord {
    if (params.environment === "LIVE_REAL") {
      throw new Error("SECURITY_VIOLATION: Failure injection is strictly prohibited in LIVE_REAL production environment.");
    }

    const record: InjectedFailureRecord = {
      injectionId: `INJ-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      projectId: params.projectId,
      failureMode: params.failureMode,
      targetComponent: params.targetComponent,
      description: params.description,
      label: "FAILURE_INJECTION",
      detected: false,
      contained: false,
      recovered: false,
    };

    this.activeInjections.push(record);
    return record;
  }

  recordDetection(injectionId: string, contained: boolean, recovered: boolean, recoveryType: "AUTO_RECOVERED" | "HUMAN_REVIEW_REQUIRED" | "ROLLED_BACK") {
    const inj = this.activeInjections.find((i) => i.injectionId === injectionId);
    if (inj) {
      inj.detected = true;
      inj.contained = contained;
      inj.recovered = recovered;
      inj.recoveryType = recoveryType;
    }
  }

  getAllInjections(): InjectedFailureRecord[] {
    return [...this.activeInjections];
  }
}

export const failureInjectionService = new FailureInjectionService();
