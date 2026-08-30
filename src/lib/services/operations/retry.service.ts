import fs from "fs";
import path from "path";

export type RecoveryClassification = "AUTO_RECOVERABLE" | "HUMAN_REVIEW_REQUIRED" | "PERMANENT_FAILURE";

export interface RetryContext {
  operationId: string;
  idempotencyKey: string;
  projectId: string;
  tenantId: string;
  environment: string;
  currentAttempt: number;
  maxAttempts: number;
  lastFailureReason?: string;
  isFinancialMutation: boolean;
  isOutboundCommunication: boolean;
  isDeployment: boolean;
}

export class RetryService {
  private executedIdempotencyKeys: Set<string> = new Set();

  classifyFailure(errorType: string, message: string): RecoveryClassification {
    const lower = (errorType + " " + message).toLowerCase();

    if (
      lower.includes("timeout") ||
      lower.includes("transient") ||
      lower.includes("syntax error") ||
      lower.includes("json parse") ||
      lower.includes("connection") ||
      lower.includes("refused") ||
      lower.includes("503") ||
      lower.includes("502") ||
      lower.includes("504") ||
      lower.includes("econnrefused")
    ) {
      return "AUTO_RECOVERABLE";
    }

    if (lower.includes("payment mismatch") || lower.includes("unknown financial") || lower.includes("max retries exceeded")) {
      return "HUMAN_REVIEW_REQUIRED";
    }

    if (lower.includes("cross-tenant") || lower.includes("secret leakage") || lower.includes("unauthorized production mutation")) {
      return "PERMANENT_FAILURE";
    }

    return "HUMAN_REVIEW_REQUIRED";
  }

  async executeWithRetry<T>(
    context: RetryContext,
    operation: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; attempts: number; classification: RecoveryClassification; escalatedToHuman: boolean }> {
    // Idempotency check for critical side-effects
    if (context.isFinancialMutation || context.isOutboundCommunication || context.isDeployment) {
      if (this.executedIdempotencyKeys.has(context.idempotencyKey)) {
        throw new Error(`DUPLICATE_OPERATION_BLOCKED: Operation with idempotencyKey '${context.idempotencyKey}' already executed.`);
      }
    }

    let attempts = 0;
    const maxAttempts = context.maxAttempts || 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await operation();
        if (context.isFinancialMutation || context.isOutboundCommunication || context.isDeployment) {
          this.executedIdempotencyKeys.add(context.idempotencyKey);
        }
        return {
          success: true,
          result: res,
          attempts,
          classification: "AUTO_RECOVERABLE",
          escalatedToHuman: false,
        };
      } catch (err: any) {
        context.lastFailureReason = err.message;
        const classification = this.classifyFailure(err.name || "Error", err.message);

        if (classification === "PERMANENT_FAILURE") {
          return {
            success: false,
            attempts,
            classification: "PERMANENT_FAILURE",
            escalatedToHuman: false,
          };
        }

        if (classification === "HUMAN_REVIEW_REQUIRED") {
          return {
            success: false,
            attempts,
            classification: "HUMAN_REVIEW_REQUIRED",
            escalatedToHuman: true,
          };
        }

        // AUTO_RECOVERABLE: continue loop until maxAttempts
        if (attempts >= maxAttempts) {
          return {
            success: false,
            attempts,
            classification: "HUMAN_REVIEW_REQUIRED",
            escalatedToHuman: true,
          };
        }
      }
    }

    return {
      success: false,
      attempts,
      classification: "HUMAN_REVIEW_REQUIRED",
      escalatedToHuman: true,
    };
  }
}

export const retryService = new RetryService();
