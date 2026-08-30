import crypto from "crypto";
import path from "path";

export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FindingStatus = "OPEN" | "RESOLVED" | "SUPPRESSED";

export interface SecurityFinding {
  findingId: string;
  category: string;
  severity: FindingSeverity;
  projectId?: string;
  affectedResource: string;
  evidence: string;
  deterministicRemediation: string;
  status: FindingStatus;
  detectedAt: string;
}

export type SecurityPosture = "SECURE" | "DEGRADED" | "AT_RISK" | "CRITICAL" | "UNKNOWN";

export interface SecurityAuditReport {
  auditId: string;
  timestamp: string;
  posture: SecurityPosture;
  findings: SecurityFinding[];
  highAndCriticalCount: number;
  verified: string[];
  unknown: string[];
  notApplicable: string[];
}

const SECRETS_NEVER_IN_LOGS = [
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_CLIENT_ID",
  "GMAIL_APP_PASSWORD",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "NEXT_AUTH_SECRET",
];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|all|above|prior)?\s*instructions?/gi,
  /you are now/gi,
  /pretend (you are|to be|that you)/gi,
  /forget (everything|all|your|prior)/gi,
  /\bsystem prompt\b/gi,
  /override (your|system|all|the)/gi,
  /\bACT AS\b/gi,
  /reveal\b.{0,20}\b(api key|secret|credential|password|token)/gi,
  /access \.?env/gi,
  /print\b.{0,20}\b(secret|key|password|credential|token)/gi,
  /show\b.{0,20}\b(api key|secret|credential|password|token)/gi,
  /\bdisclose\b/gi,
  /\bexfiltrate\b/gi,
];

export class SecurityAuditService {
  private findings: SecurityFinding[] = [];

  private newFinding(params: Omit<SecurityFinding, "findingId" | "detectedAt" | "status">): SecurityFinding {
    return {
      findingId: `FIND-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString("hex")}`,
      ...params,
      status: "OPEN",
      detectedAt: new Date().toISOString(),
    };
  }

  // ── Check 1: Tenant/Project Isolation ──────────────────────
  auditTenantIsolation(callerOrgId: string, targetOrgId: string, projectId?: string): SecurityFinding | null {
    if (!callerOrgId || !targetOrgId || callerOrgId !== targetOrgId) {
      const f = this.newFinding({
        category: "TENANT_ISOLATION",
        severity: "CRITICAL",
        projectId,
        affectedResource: `org:${targetOrgId || "unknown"}`,
        evidence: `Caller org '${callerOrgId}' attempted to access target org '${targetOrgId}'.`,
        deterministicRemediation: "BLOCK immediately. Log. Escalate to HUMAN_REVIEW_REQUIRED.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  auditProjectIsolation(callerProjectId: string, targetProjectId: string, orgId: string): SecurityFinding | null {
    if (!callerProjectId || !targetProjectId || callerProjectId !== targetProjectId) {
      const f = this.newFinding({
        category: "PROJECT_ISOLATION",
        severity: "HIGH",
        projectId: targetProjectId,
        affectedResource: `project:${targetProjectId || "unknown"}`,
        evidence: `Caller project '${callerProjectId}' attempted access to project '${targetProjectId}' in org '${orgId}'.`,
        deterministicRemediation: "BLOCK. Return PROJECT_BOUNDARY_VIOLATION. Emit audit event.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 2: Approval Binding Validity ────────────────────
  auditApprovalBinding(approvalProjectId: string, targetProjectId: string): SecurityFinding | null {
    if (approvalProjectId !== targetProjectId) {
      const f = this.newFinding({
        category: "APPROVAL_BINDING",
        severity: "CRITICAL",
        projectId: targetProjectId,
        affectedResource: `approval:project:${approvalProjectId}`,
        evidence: `Approval bound to project '${approvalProjectId}' applied to project '${targetProjectId}'.`,
        deterministicRemediation: "INVALIDATE approval. Return APPROVAL_SCOPE_MISMATCH. Require new approval.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 3: Snapshot Integrity ─────────────────────────
  auditSnapshotIntegrity(approvedHash: string, currentHash: string, snapshotId: string): SecurityFinding | null {
    if (approvedHash !== currentHash) {
      const f = this.newFinding({
        category: "SNAPSHOT_INTEGRITY",
        severity: "CRITICAL",
        affectedResource: `snapshot:${snapshotId}`,
        evidence: `Snapshot '${snapshotId}' hash changed. Approved: '${approvedHash.slice(0,16)}...' Current: '${currentHash.slice(0,16)}...'`,
        deterministicRemediation: "INVALIDATE delivery. Return SNAPSHOT_MUTATION_DETECTED. Do NOT auto-repair. Escalate.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 4: Secret Exposure ────────────────────────────
  auditSecretExposure(content: string, context: string): SecurityFinding | null {
    for (const key of SECRETS_NEVER_IN_LOGS) {
      const val = process.env[key];
      if (val && val.length > 6 && content.includes(val)) {
        const f = this.newFinding({
          category: "SECRET_EXPOSURE",
          severity: "CRITICAL",
          affectedResource: `env:${key}`,
          evidence: `Secret '${key}' value detected in: ${context}. Value NOT logged.`,
          deterministicRemediation: "Immediately scrub content. Rotate credential. Audit all logs.",
        });
        this.findings.push(f);
        return f;
      }
    }
    return null;
  }

  // ── Check 5: Path Traversal ─────────────────────────────
  auditPathTraversal(requestedPath: string, allowedRoot: string): SecurityFinding | null {
    const normalRoot = path.normalize(allowedRoot) + path.sep;
    let resolved: string;
    try {
      resolved = path.normalize(path.resolve(allowedRoot, requestedPath));
    } catch {
      resolved = requestedPath;
    }
    if (!resolved.startsWith(normalRoot) && resolved !== path.normalize(allowedRoot)) {
      const f = this.newFinding({
        category: "PATH_TRAVERSAL",
        severity: "CRITICAL",
        affectedResource: requestedPath,
        evidence: `Path '${requestedPath}' resolves outside allowed root '${allowedRoot}'.`,
        deterministicRemediation: "BLOCK operation. Return PATH_TRAVERSAL_BLOCKED. Do not write file.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 6: Unauthorized Autonomous Action ──────────────
  auditAutonomousAction(
    action: string,
    classification: "SAFE_AUTONOMOUS" | "BOUNDED_AUTONOMOUS" | "HUMAN_APPROVAL_REQUIRED" | "HUMAN_ONLY" | "FORBIDDEN"
  ): SecurityFinding | null {
    if (classification === "FORBIDDEN") {
      const f = this.newFinding({
        category: "AUTONOMOUS_ACTION_BOUNDARY",
        severity: "CRITICAL",
        affectedResource: `action:${action}`,
        evidence: `Forbidden autonomous action '${action}' was attempted.`,
        deterministicRemediation: "BLOCK immediately. Return FORBIDDEN_ACTION. Emit CRITICAL audit event.",
      });
      this.findings.push(f);
      return f;
    }
    if (classification === "HUMAN_ONLY") {
      const f = this.newFinding({
        category: "AUTONOMOUS_ACTION_BOUNDARY",
        severity: "HIGH",
        affectedResource: `action:${action}`,
        evidence: `HUMAN_ONLY action '${action}' attempted autonomously.`,
        deterministicRemediation: "BLOCK. Return HUMAN_ONLY_REQUIRED. Escalate to operator.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 7: Payment State Consistency ──────────────────
  auditPaymentConsistency(params: {
    invoiceId: string;
    isPaid: boolean;
    paidAmount: number;
    expectedAmount: number;
    isRefunded: boolean;
    deliveryAuthorized: boolean;
  }): SecurityFinding | null {
    if (params.deliveryAuthorized && !params.isPaid) {
      const f = this.newFinding({
        category: "PAYMENT_CONSISTENCY",
        severity: "CRITICAL",
        affectedResource: `invoice:${params.invoiceId}`,
        evidence: `Delivery authorized for invoice '${params.invoiceId}' but payment not confirmed.`,
        deterministicRemediation: "REVOKE delivery authorization. Require payment re-verification.",
      });
      this.findings.push(f);
      return f;
    }
    if (params.isRefunded && params.deliveryAuthorized) {
      const f = this.newFinding({
        category: "PAYMENT_CONSISTENCY",
        severity: "CRITICAL",
        affectedResource: `invoice:${params.invoiceId}`,
        evidence: `Refunded invoice '${params.invoiceId}' still has active delivery authorization.`,
        deterministicRemediation: "REVOKE delivery immediately. Emit DELIVERY_REVOKED audit event.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 8: Webhook Replay / Forgery ─────────────────
  auditWebhookAuthenticity(params: {
    webhookId: string;
    hasValidSignature: boolean;
    isReplay: boolean;
    source: string;
  }): SecurityFinding | null {
    if (!params.hasValidSignature) {
      const f = this.newFinding({
        category: "WEBHOOK_AUTHENTICITY",
        severity: "CRITICAL",
        affectedResource: `webhook:${params.webhookId}`,
        evidence: `Webhook '${params.webhookId}' from '${params.source}' failed signature verification.`,
        deterministicRemediation: "REJECT webhook. Return 401. Do NOT process payload.",
      });
      this.findings.push(f);
      return f;
    }
    if (params.isReplay) {
      const f = this.newFinding({
        category: "WEBHOOK_REPLAY",
        severity: "HIGH",
        affectedResource: `webhook:${params.webhookId}`,
        evidence: `Replay of already-processed webhook '${params.webhookId}' detected.`,
        deterministicRemediation: "REJECT with 200 (idempotent ignore). Do NOT double-credit.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 9: Duplicate Financial Mutation ───────────────
  auditDuplicateFinancialMutation(idempotencyKey: string, alreadyExecuted: boolean): SecurityFinding | null {
    if (alreadyExecuted) {
      const f = this.newFinding({
        category: "DUPLICATE_FINANCIAL_MUTATION",
        severity: "CRITICAL",
        affectedResource: `idempotencyKey:${idempotencyKey}`,
        evidence: `Financial operation with key '${idempotencyKey}' was already executed. Duplicate blocked.`,
        deterministicRemediation: "BLOCK. Return DUPLICATE_OPERATION_BLOCKED. Do not process.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 10: Environment Separation ────────────────────
  auditEnvironmentSeparation(requestedEnv: string, systemEnv: string): SecurityFinding | null {
    if (requestedEnv === "LIVE_REAL" && systemEnv !== "LIVE_REAL") {
      const f = this.newFinding({
        category: "ENVIRONMENT_SEPARATION",
        severity: "HIGH",
        affectedResource: `env:${requestedEnv}`,
        evidence: `Attempt to access LIVE_REAL environment from system running in '${systemEnv}'.`,
        deterministicRemediation: "BLOCK. Return ENVIRONMENT_BOUNDARY_VIOLATION.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 11: Prompt Injection Audit ────────────────────
  auditPromptInjection(content: string, source: string): { finding: SecurityFinding | null; sanitized: string } {
    let sanitized = content;
    let detected = false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, "[INJECTION_PATTERN_REMOVED]");
      }
      pattern.lastIndex = 0;
    }
    if (detected) {
      const f = this.newFinding({
        category: "PROMPT_INJECTION",
        severity: "HIGH",
        affectedResource: `source:${source}`,
        evidence: `Prompt injection pattern detected and neutralized in '${source}'.`,
        deterministicRemediation: "SANITIZE untrusted input. Treat as DATA only.",
      });
      this.findings.push(f);
      return { finding: f, sanitized };
    }
    return { finding: null, sanitized };
  }

  // ── Check 12: API Input Validation ──────────────────────
  auditInputValidation(payload: Record<string, unknown>, requiredFields: string[], endpoint: string): SecurityFinding | null {
    const missing = requiredFields.filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === "");
    if (missing.length > 0) {
      const f = this.newFinding({
        category: "API_INPUT_VALIDATION",
        severity: "HIGH",
        affectedResource: `endpoint:${endpoint}`,
        evidence: `Missing required fields [${missing.join(", ")}] in request to '${endpoint}'.`,
        deterministicRemediation: "REJECT request with 400 Bad Request. Do not process.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 13: Package Integrity ─────────────────────────
  auditPackageIntegrity(expectedHash: string, actualHash: string, packageId: string): SecurityFinding | null {
    if (expectedHash !== actualHash) {
      const f = this.newFinding({
        category: "PACKAGE_INTEGRITY",
        severity: "CRITICAL",
        affectedResource: `package:${packageId}`,
        evidence: `Package '${packageId}' hash mismatch. Expected '${expectedHash}' Got '${actualHash}'.`,
        deterministicRemediation: "INVALIDATE package. Block download. Escalate to HUMAN_REVIEW_REQUIRED.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Check 14: Worker Lease Safety ───────────────────────
  auditWorkerLeaseSafety(leaseExpired: boolean, workerId: string, taskId: string): SecurityFinding | null {
    if (leaseExpired) {
      const f = this.newFinding({
        category: "WORKER_LEASE_SAFETY",
        severity: "HIGH",
        affectedResource: `task:${taskId}`,
        evidence: `Worker '${workerId}' attempted execution on expired lease for task '${taskId}'.`,
        deterministicRemediation: "REJECT worker operation. Reclaim lease. Block late execution.",
      });
      this.findings.push(f);
      return f;
    }
    return null;
  }

  // ── Compile Final Report ──────────────────────────────
  compileReport(): SecurityAuditReport {
    const highCritical = this.findings.filter((f) => f.severity === "HIGH" || f.severity === "CRITICAL");

    let posture: SecurityPosture;
    if (this.findings.length === 0) {
      posture = "SECURE";
    } else if (highCritical.filter((f) => f.severity === "CRITICAL").length > 0) {
      posture = "CRITICAL";
    } else if (highCritical.length > 0) {
      posture = "AT_RISK";
    } else {
      posture = "DEGRADED";
    }

    return {
      auditId: `AUDIT-${Date.now().toString().slice(-8)}`,
      timestamp: new Date().toISOString(),
      posture,
      findings: this.findings,
      highAndCriticalCount: highCritical.length,
      verified: [
        "TENANT_ISOLATION",
        "PROJECT_ISOLATION",
        "APPROVAL_BINDING",
        "SNAPSHOT_INTEGRITY",
        "SECRET_EXPOSURE",
        "PATH_TRAVERSAL",
        "PAYMENT_CONSISTENCY",
        "WEBHOOK_AUTHENTICITY",
        "DUPLICATE_FINANCIAL_MUTATION",
        "ENVIRONMENT_SEPARATION",
        "AUTONOMOUS_ACTION_BOUNDARY",
        "PROMPT_INJECTION",
        "API_INPUT_VALIDATION",
        "PACKAGE_INTEGRITY",
        "WORKER_LEASE_SAFETY"
      ],
      unknown: [],
      notApplicable: [],
    };
  }

  clearFindings(): void {
    this.findings = [];
  }

  getFindings(): SecurityFinding[] {
    return [...this.findings];
  }
}

export const securityAuditService = new SecurityAuditService();
