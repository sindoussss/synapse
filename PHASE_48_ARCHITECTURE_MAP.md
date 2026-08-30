# SYNAPSE — PHASE 48 ARCHITECTURE MAP
## Comprehensive Dependency & Mutation Flow Map (Phases 35–47)

---

## 1. System Architecture Overview

SYNAPSE is a multi-tenant, evidence-driven autonomous operations and client delivery platform designed to execute client website redesigns, verified deployments, source code deliveries, and post-deployment operations.

\\\
                                  ┌───────────────────────────┐
                                  │      CLIENT PORTAL        │
                                  │   (View, Review, Accept)  │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌───────────────────────┐         ┌───────────────────────────┐         ┌──────────────────────────┐
│   OPERATOR DASHBOARD  │ ──────> │ PRIVILEGED ACTION FIREWALL│ <────── │     PAYPAL WEBHOOKS      │
│   (Approve, Release)  │         │   & EMERGENCY KILL SWITCH │         │   (Capture, Dispute)     │
└───────────────────────┘         └─────────────┬─────────────┘         └──────────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │            CORE SERVICE LAYER                │
                         │  - ProductionReleaseService                  │
                         │  - SourceDeliveryService                     │
                         │  - PayPalService                             │
                         │  - DeveloperAgentService                     │
                         │  - DisasterRecoveryService / RetryService    │
                         │  - SecurityAuditService                      │
                         │  - IntegrityVerificationService              │
                         │  - ConsistencyAuditService                   │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │          PERSISTENCE & REPOSITORIES          │
                         │  - source-delivery.repository                │
                         │  - production-release.repository             │
                         │  - payment-request.repository                │
                         │  - developer-workspace.repository            │
                         │  - observability.repository                  │
                         │  - client-delivery.repository                │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │             FILESYSTEM SANDBOX               │
                         │  - production-sites/<projectId>/             │
                         │  - release-workspaces/<releaseId>/           │
                         │  - .data/<json-cache-files>                  │
                         └──────────────────────────────────────────────┘
\\\

---

## 2. Service Layer Mapping

| Service | File Path | Primary Function | Upstream Callers | Downstream Dependencies |
|---|---|---|---|---|
| **SecurityAuditService** | src/lib/services/security/security-audit.service.ts | 14-point deterministic audit engine (tenant, isolation, path traversal, injection, etc.) | API routes, test suites, operator inspection | crypto, path |
| **IntegrityVerificationService** | src/lib/services/security/integrity-verification.service.ts | SHA-256 artifact hash registry and continuous comparison | Release candidate, snapshot, delivery package, audit verifiers | crypto |
| **PrivilegedActionFirewall** | src/lib/services/security/privileged-action-firewall.service.ts | Role-action authorization matrix for privileged mutations | Deployment, rollback, payment, delivery, config routes | Authoritative role matrix |
| **EmergencyKillSwitchService** | src/lib/services/security/emergency-kill-switch.service.ts | Persistent operational state machine (NORMAL / DEGRADED / READ_ONLY / EMERGENCY_STOP) | All mutation endpoints | .data/operational-state.json |
| **ConsistencyAuditService** | src/lib/services/security/consistency-audit.service.ts | Impossible relational state detector across 12 invariant categories | Audit jobs, operator checks | All repositories |
| **ProjectIsolationService** | src/lib/services/security/project-isolation.service.ts | Tenant, project, workspace, and client isolation verification | Service layer, API routes | Authoritative context |
| **ProductionReleaseService** | src/lib/services/production-release/production-release.service.ts | Eligibility evaluation, release candidate creation, deployment approval, DNS cutover, live confirmation, rollback | pi/production-release/* | productionReleaseRepository, developerAgentService, clientReviewRepository |
| **SourceDeliveryService** | src/lib/services/delivery/source-delivery.service.ts | Payment-gated source code package generation, hash binding, and authorization | pi/payments/paypal/verify, paypal.service | sourceDeliveryRepository, paymentVerificationService, sourcePackageService |
| **PayPalService** | src/lib/services/payments/paypal.service.ts | Payment requests, order creation, capture reconciliation, refund handling, reversal handling | pi/payments/paypal/* | paymentRequestRepository, invoiceRepository, payPalProvider, sourceDeliveryService |
| **DeveloperAgentService** | src/lib/services/developer/developer-agent.service.ts | Sandboxed code execution, snapshot creation, workspace rollback, path safety | pi/developer/* | developerWorkspaceRepository, projectRepository |
| **RetryService** | src/lib/services/operations/retry.service.ts | Bounded retries (max 3), idempotency enforcement, failure classification | Background tasks, payment operations | Idempotency keys |
| **DisasterRecoveryService** | src/lib/services/operations/disaster-recovery.service.ts | Worker lease acquisition, stale lease recovery, late-worker collision prevention | Multi-worker workflows | Lease registry |

---

## 3. Repositories & Data Persistence Flow

All repositories use structured, tenant/project-scoped JSON stores located under .data/:

| Repository | File Path | Data File / Cache Target | Key Models |
|---|---|---|---|
| sourceDeliveryRepository | src/lib/repositories/source-delivery.repository.ts | .data/source-deliveries.json | SourceDeliveryRecord, DeliveryAuditRecord |
| productionReleaseRepository | src/lib/repositories/production-release.repository.ts | .data/production-releases.json | ProductionReleaseRecord, ProjectDomainRecord |
| paymentRequestRepository | src/lib/repositories/payment-request.repository.ts | .data/payment-requests.json | PaymentRequestRecord, PaymentTransactionRecord |
| developerWorkspaceRepository | src/lib/repositories/developer-workspace.repository.ts | .data/developer-workspaces.json | WorkspaceSnapshotRecord, DeveloperExecutionRecord |
| observabilityRepository | src/lib/repositories/observability.repository.ts | .data/observability-telemetry.json | ExecutionTelemetryRecord |
| clientDeliveryRepository | src/lib/repositories/client-delivery.repository.ts | .data/client-deliveries.json | ProjectHandoverPackageRecord, IncidentRecord, VersionRecord |
| projectRepository | src/lib/repositories/project.repository.ts | .data/projects.json | ProjectRecord |
| invoiceRepository | src/lib/repositories/invoice.repository.ts | .data/invoices.json | InvoiceRecord |

---

## 4. Privileged Mutation Traces

### Trace 1: Production Deployment
\\\
[Operator Trigger] -> POST /api/production-release/approve
  -> Check EmergencyKillSwitch (isOperationAllowed: "DEPLOYMENT")
  -> Check PrivilegedActionFirewall (action: "PRODUCTION_DEPLOYMENT", role: "OPERATOR")
  -> productionReleaseService.approveProductionDeployment(releaseId)
    -> Verify release exists & status == "waiting_release_approval"
    -> Materialize deployment evidence (health, DNS, provider ID)
    -> updateRelease status -> "waiting_dns_approval"
    -> Record activity audit
\\\

### Trace 2: Live Confirmation
\\\
[Operator Trigger] -> POST /api/production-release/confirm-live
  -> Check EmergencyKillSwitch (isOperationAllowed: "DEPLOYMENT")
  -> Check PrivilegedActionFirewall (action: "PRODUCTION_DEPLOYMENT", role: "OPERATOR")
  -> productionReleaseService.confirmProductionLive(releaseId)
    -> updateRelease status -> "live"
    -> updateProject metadata.productionStatus -> "production_live"
    -> Record activity audit
\\\

### Trace 3: Production Rollback
\\\
[Operator Trigger] -> POST /api/production-release/rollback
  -> Check EmergencyKillSwitch (isOperationAllowed: "DEPLOYMENT")
  -> Check PrivilegedActionFirewall (action: "ROLLBACK", role: "OPERATOR")
  -> productionReleaseService.rollbackRelease(releaseId)
    -> Invalidate live release -> status: "rolled_back"
    -> Restore rollbackTargetUrl from rollbackEvidence
    -> Record activity audit
\\\

### Trace 4: PayPal Payment -> Source Delivery Authorization
\\\
[PayPal Webhook / Reconcile API] -> POST /api/payments/paypal/webhook (or verify)
  -> Check EmergencyKillSwitch (isOperationAllowed: "PAYMENT_MUTATION")
  -> payPalProvider.verifyWebhook(headers, rawBody) -> cryptographic signature check
  -> payPalService.reconcilePayPalCapture(orderId, captureId, amountMinor, currency)
    -> Idempotency check on captureId & eventId (blocks replay/duplicate)
    -> Currency matching check (PHP == PHP)
    -> Balance check (amount <= balanceDue)
    -> Record PaymentTransactionRecord
    -> updateInvoice (amountPaid, balanceDue, status: "paid")
    -> If invoice.status == "paid":
        -> sourceDeliveryService.processPaymentAndAuthorizeDelivery(...)
            -> Check Client Approval Exists (FAIL-CLOSED)
            -> Check Operator Approval Exists (FAIL-CLOSED)
            -> Check Snapshot Hash Matching (FAIL-CLOSED)
            -> Check Full Payment Satisfied (FAIL-CLOSED)
            -> sourcePackageService.generateDeliveryPackage(rawFiles)
            -> compute manifestHash & packageHash
            -> markPaymentConsumed(paymentId) (prevents reuse)
            -> save SourceDeliveryRecord (status: "DELIVERY_AUTHORIZED")
            -> draft notification (Operator approval required)
\\\

### Trace 5: Refund / Dispute Delivery Revocation
\\\
[PayPal Webhook] -> POST /api/payments/paypal/webhook (EVENT: REFUNDED or DISPUTED)
  -> Check EmergencyKillSwitch (isOperationAllowed: "PAYMENT_MUTATION")
  -> payPalService.handleRefundWebhook / handleReversalWebhook
    -> Update transaction status: "refunded" / "disputed"
    -> Fetch SourceDeliveryRecord by projectId
    -> Invalidate delivery -> status: "REVOKED" / "DELIVERY_INVALIDATED"
    -> Record invalidationReason and timestamp
\\\

---

## 5. Security & Isolation Boundaries

1. **Tenant Isolation**: Organizations are bounded by organizationId. Cross-org access is blocked at projectIsolationService and audited at securityAuditService.
2. **Project Isolation**: Workspace paths are sandboxed within production-sites/<projectId>/. Any relative path attempting .. escapes is blocked via alidatePathSafety.
3. **Emergency Stop Protection**: Global state machine stored in .data/operational-state.json. EMERGENCY_STOP unconditionally blocks deployments, source mutations, payments, deliveries, and maintenance.
4. **Secret Isolation**: Secrets (PAYPAL_CLIENT_SECRET, GMAIL_APP_PASSWORD, etc.) are stripped from prompts, logs, and client packages.
5. **AI Provider Boundary**: Runtime model execution is restricted to local Ollama models for code tasks and Gemini (read-only) for visual reviews. No external paid LLMs are permitted in runtime execution.