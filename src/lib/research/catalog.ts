export type EvidenceType =
  | "LIVE_VERIFIED"
  | "CONTROLLED_TEST"
  | "INTERNAL_ENGINEERING_EVIDENCE"
  | "UNKNOWN"
  | "NOT_VERIFIED"
  | "NOT_SUPPORTED";

export const PAPER = {
  title: "SYNAPSE",
  subtitle: "Evidence-Driven Autonomous Web Development",
  longTitle: "Evidence-Driven Autonomous Web Development Platform",
  description:
    "An engineering research project exploring evidence-gated AI development, deterministic verification, human governance, durable workflow execution, and auditable software production.",
  authors: [
    {
      name: "John Daniel M. Casili",
      affiliation: "SYNAPSE Research & Engineering Project",
    },
  ],
  version: "V1.0",
  certification: "V1_CERTIFIED_WITH_LIMITATIONS",
  releaseCandidate: "RC-SYNAPSE-V1.0-PROD",
  lastUpdated: "2026-08-31",
  snapshotId: "SNAP-SINDOUS-FINAL",
  sourceHash:
    "a9406accb7cc98e2689620579e0a0d4c5d88812bfd38b556b66802e3b8a3b836",
  repositoryUrl: "https://github.com/sindoussss/synapse" as string | null,
  pdfUrl: null as string | null,
} as const;

export const KEYWORDS = [
  "AI Software Engineering",
  "Agentic Development",
  "Human-in-the-Loop",
  "Evidence Gating",
  "Autonomous Systems",
  "Software Verification",
  "Workflow Durability",
  "Web Development",
  "AI Safety",
] as const;

export const RESEARCH_QUESTIONS = [
  {
    id: "RQ1",
    text: "Can deterministic evidence gates reduce unsupported factual claims in AI-generated project artifacts?",
  },
  {
    id: "RQ2",
    text: "Can independent code and visual review improve detection of generated defects?",
  },
  {
    id: "RQ3",
    text: "Can durable workflow/event architectures allow safe recovery from interrupted AI execution?",
  },
  {
    id: "RQ4",
    text: "Can bounded autonomous execution coexist with strict human control over high-risk actions?",
  },
  {
    id: "RQ5",
    text: "Can reusable validated design components improve engineering efficiency without causing template convergence?",
  },
] as const;

export const PIPELINE = [
  { id: "lead", label: "LEAD", body: "Inbound commercial contact is recorded as a lead. Missing fields remain unlabeled rather than invented." },
  { id: "crm", label: "CRM", body: "Organization, client, and opportunity records are bound by organizationId, clientId, and projectId in the evaluated implementation." },
  { id: "sales", label: "SALES", body: "Sales copilot assistance is designed to cite verified catalog and requirement state. Ungrounded cost and FX values remain UNKNOWN." },
  { id: "proposal", label: "PROPOSAL", body: "Proposals are intended to be evidence-grounded against catalog pricing and explicit requirements." },
  { id: "agreement", label: "AGREEMENT", body: "Electronic agreement binding is a commercial gate before project provisioning in the evaluated lifecycle." },
  { id: "project", label: "PROJECT", body: "A project record becomes the authoritative scope container for requirements, design, work, and delivery." },
  { id: "requirements", label: "REQUIREMENTS", body: "RequirementIntelligenceService classifies items as EXPLICIT, INFERRED, UNKNOWN, CONFLICTING, or VERIFIED." },
  { id: "design", label: "DESIGN", body: "Design brief, design system, and library provenance constrain generation. Validated library versions are treated as immutable." },
  { id: "ai-dev", label: "AI DEVELOPMENT", body: "A developer agent is designed to mutate only an isolated workspace under an authorized change manifest." },
  { id: "qa", label: "DETERMINISTIC QA", body: "The evaluated implementation reports eight QA gates including lint, build, tests, responsiveness, visual hierarchy, security audit, and accessibility." },
  { id: "indep-review", label: "INDEPENDENT REVIEW", body: "Code review and visual review are designed as separate checks from generation. Visual review is described as read-only Gemini critique in Phase 47–48 reports." },
  { id: "client-review", label: "CLIENT REVIEW", body: "Clients comment on snapshot-bound previews. Comments convert to CHANGE_REQUEST work items rather than live file mutations." },
  { id: "approval", label: "HUMAN APPROVAL", body: "Privileged mutations require operator decisions. Approvals bind snapshot and source hashes and can expire or invalidate." },
  { id: "payment", label: "PAYMENT", body: "Integer minor-unit invoices, PayPal capture, ledger entries, and reconciliation. Sandbox verification is documented; live settlement is a stated limitation." },
  { id: "build", label: "BUILD", body: "Universal build packaging detects framework evidence, uses command allowlists, and emits SHA-256 artifacts. FRAMEWORK_UNKNOWN blocks build." },
  { id: "deploy", label: "DEPLOYMENT", body: "Production deployment is classified HUMAN_APPROVAL_REQUIRED and is blocked for AI agents, webhooks, and workers at the firewall." },
  { id: "verify", label: "VERIFICATION", body: "Integrity verification compares registered SHA-256 hashes for snapshots, manifests, packages, and audit records." },
  { id: "source", label: "SOURCE DELIVERY", body: "Delivery unlocks only after full payment, matching snapshot hashes, client approval, and operator authorization. Partial payment remains locked." },
  { id: "ops", label: "OPERATIONS", body: "Handoff, incidents, notifications, and emergency-stop remain available after delivery. EMERGENCY_STOP still permits health and audit inspection." },
] as const;

export const SUPPORTING_SYSTEMS = [
  { id: "orchestrator", label: "WORK ORCHESTRATOR", body: "Priority queue, leases, and blocked-successor progression (Phase 57)." },
  { id: "runtime", label: "WORKER RUNTIME", body: "Claim, execute, heartbeat, fencing tokens, drain, bounded concurrency, dead letters (Phase 58)." },
  { id: "events", label: "WORKFLOW EVENTS", body: "Append-only hash-chained event log with correlation and causation identifiers (Phase 59)." },
  { id: "firewall", label: "SECURITY FIREWALL", body: "PrivilegedActionFirewall role-action matrix plus emergency kill switch (Phase 47)." },
  { id: "observability", label: "OBSERVABILITY", body: "Append-only telemetry. Hardware and labor cost remain UNKNOWN (Phase 46–47)." },
  { id: "recovery", label: "RECOVERY", body: "Stale-lease reclaim, event replay, outbox side-effects, crash resume classification (Phases 58–59)." },
  { id: "notification", label: "NOTIFICATION", body: "Client and operator notifications with preference controls (Phase 61)." },
  { id: "billing", label: "BILLING", body: "Invoices, ledger, reconciliation, refunds, disputes, delivery revocation (Phase 63)." },
] as const;

export const EVIDENCE_PIPELINE = [
  { id: "raw", label: "RAW INPUT" },
  { id: "extract", label: "EXTRACTION" },
  { id: "classify", label: "CLASSIFICATION" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "validate", label: "VALIDATION" },
  { id: "auth", label: "AUTHORITATIVE STATE" },
] as const;

export const EVIDENCE_BRANCHES = [
  { id: "supported", label: "SUPPORTED", note: "Bound to an explicit source or passing check." },
  { id: "unknown", label: "UNKNOWN", note: "Absence of evidence. Must not be treated as VERIFIED." },
  { id: "conflicting", label: "CONFLICTING", note: "Two sources disagree; held for human adjudication." },
  { id: "rejected", label: "REJECTED", note: "Fails a deterministic gate or policy rule." },
] as const;

export const REQUIREMENT_STATES = [
  { id: "EXPLICIT", body: "Stated in user prompt or verified client input (source USER_PROMPT or VERIFIED_CLIENT)." },
  { id: "INFERRED", body: "Derived from context. Marked ASSUMED / UNVERIFIED until confirmed." },
  { id: "UNKNOWN", body: "Unstated. Stored on unknownRequirements. Default assumptions, if used, are recorded separately and do not convert UNKNOWN into VERIFIED." },
  { id: "CONFLICTING", body: "Incompatible constraints in the same intake (example in code: premium and approachable style)." },
  { id: "VERIFIED", body: "Confirmed against client or later authoritative evidence. Distinct from inference." },
] as const;

export const ACTION_MATRIX: Array<{
  action: string;
  ai: string;
  worker: string;
  operator: string;
  status: string;
  note: string;
}> = [
  {
    action: "Telemetry collection",
    ai: "AUTO",
    worker: "AUTO",
    operator: "AUTO",
    status: "SAFE_AUTONOMOUS",
    note: "Phase 47 matrix: append-only telemetry. Allowed during EMERGENCY_STOP as health/audit class operations.",
  },
  {
    action: "Code generation",
    ai: "BOUNDED AUTONOMOUS",
    worker: "BOUNDED AUTONOMOUS",
    operator: "SUPERVISES",
    status: "BOUNDED_AUTONOMOUS",
    note: "Workspace isolation and change-manifest constraints. Production source mutation remains HUMAN_APPROVAL_REQUIRED.",
  },
  {
    action: "Build",
    ai: "BOUNDED AUTONOMOUS",
    worker: "BOUNDED AUTONOMOUS",
    operator: "SUPERVISES",
    status: "BOUNDED_AUTONOMOUS",
    note: "Allowlisted commands, lockfile preflight, FRAMEWORK_UNKNOWN → BUILD_BLOCKED (Phase 55).",
  },
  {
    action: "Visual review",
    ai: "AUTO / READ ONLY",
    worker: "AUTO / READ ONLY",
    operator: "REVIEWS",
    status: "SAFE_AUTONOMOUS",
    note: "Phase 47–48: Gemini restricted to read-only visual critique. Not a privileged mutation.",
  },
  {
    action: "Production deployment",
    ai: "FORBIDDEN",
    worker: "FORBIDDEN",
    operator: "HUMAN APPROVAL",
    status: "HUMAN_APPROVAL_REQUIRED",
    note: "PrivilegedActionFirewall: AI_DEVELOPER_AGENT, BACKGROUND_WORKER, WEBHOOK allowed lists are empty for PRODUCTION_DEPLOYMENT.",
  },
  {
    action: "Payment mutation",
    ai: "FORBIDDEN",
    worker: "FORBIDDEN",
    operator: "HUMAN ONLY",
    status: "HUMAN_ONLY",
    note: "Financial exceptions, refunds, and disputes are operator-only in the Phase 47 matrix.",
  },
  {
    action: "Source delivery",
    ai: "FORBIDDEN",
    worker: "FORBIDDEN",
    operator: "CONDITIONAL",
    status: "HUMAN_APPROVAL_REQUIRED",
    note: "Requires verified full payment, snapshot match, client approval, and operator authorization. Fail-closed if any gate fails.",
  },
  {
    action: "Cross-tenant mutation",
    ai: "FORBIDDEN",
    worker: "FORBIDDEN",
    operator: "FORBIDDEN*",
    status: "FORBIDDEN",
    note: "TENANT_BOUNDARY_VIOLATION when callerOrgId ≠ targetOrgId. Operator TENANT_MIGRATION exists in the firewall type list but cross-org mismatch is still denied.",
  },
];

export const WORKFLOW_EVENTS = [
  { seq: "001", type: "PROJECT_CREATED", actor: "OPERATOR", from: "∅", to: "INTAKE", evidence: "Project record created", correlation: "CORR-DEMO-01", causation: "—" },
  { seq: "002", type: "REQUIREMENTS_VERIFIED", actor: "OPERATOR", from: "INTAKE", to: "REQUIREMENTS", evidence: "EXPLICIT/VERIFIED items; UNKNOWN preserved", correlation: "CORR-DEMO-01", causation: "EVT-001" },
  { seq: "003", type: "DESIGN_APPROVED", actor: "OPERATOR", from: "REQUIREMENTS", to: "DESIGN", evidence: "Design brief + library provenance", correlation: "CORR-DEMO-01", causation: "EVT-002" },
  { seq: "004", type: "IMPLEMENTATION_STARTED", actor: "WORKER", from: "DESIGN", to: "IMPLEMENTATION", evidence: "Authorized change manifest", correlation: "CORR-DEMO-01", causation: "EVT-003" },
  { seq: "005", type: "BUILD_FAILED", actor: "SYSTEM", from: "IMPLEMENTATION", to: "BUILD_FAILED", evidence: "Deterministic compiler/test failure", correlation: "CORR-DEMO-01", causation: "EVT-004" },
  { seq: "006", type: "REPAIR_STARTED", actor: "WORKER", from: "BUILD_FAILED", to: "REPAIR", evidence: "Bounded repair attempt (max 3)", correlation: "CORR-DEMO-01", causation: "EVT-005" },
  { seq: "007", type: "BUILD_COMPLETED", actor: "SYSTEM", from: "REPAIR", to: "BUILT", evidence: "Artifact SHA-256 registered", correlation: "CORR-DEMO-01", causation: "EVT-006" },
  { seq: "008", type: "QA_PASSED", actor: "SYSTEM", from: "BUILT", to: "QA", evidence: "QA gate results bound to snapshot", correlation: "CORR-DEMO-01", causation: "EVT-007" },
  { seq: "009", type: "CLIENT_APPROVED", actor: "CLIENT_SESSION", from: "QA", to: "CLIENT_APPROVED", evidence: "Snapshot-bound review session", correlation: "CORR-DEMO-01", causation: "EVT-008" },
  { seq: "010", type: "PAYMENT_VERIFIED", actor: "WEBHOOK/OPERATOR", from: "CLIENT_APPROVED", to: "FULLY_PAID", evidence: "Ledger + invoice minor units", correlation: "CORR-DEMO-01", causation: "EVT-009" },
  { seq: "011", type: "DELIVERY_AUTHORIZED", actor: "OPERATOR", from: "FULLY_PAID", to: "DELIVERY_AUTHORIZED", evidence: "Package hash + approvals", correlation: "CORR-DEMO-01", causation: "EVT-010" },
] as const;

export const CLIENT_JOURNEY = [
  "DISCOVER",
  "PROPOSAL",
  "PROJECT",
  "PREVIEW",
  "REVIEW",
  "COMMENT",
  "CHANGE REQUEST",
  "NEW VERSION",
  "APPROVAL",
  "PAYMENT",
  "DELIVERY",
  "HANDOFF",
] as const;

export const DESIGN_COMPONENTS = [
  { id: "QuoteCalculator", version: "v1", state: "VALIDATED", pattern: "STRUCTURAL_12_COLUMN", note: "Cited in Phase 53 library record list." },
  { id: "Header", version: "v1", state: "VALIDATED", pattern: "STRUCTURAL_12_COLUMN", note: "Immutable once VALIDATED; mutation throws IMMUTABLE_VERSION_VIOLATION." },
  { id: "ProductGrid", version: "v1", state: "VALIDATED", pattern: "EDITORIAL_MASONRY", note: "Adaptations bind to a target project without mutating library source." },
  { id: "SpecificationTable", version: "v1", state: "VALIDATED", pattern: "STRUCTURAL_12_COLUMN", note: "Project-private components are excluded from cross-project queries." },
] as const;

export const PHASE_RESULTS: Array<{
  phase: string;
  system: string;
  tests: string;
  reported: string;
  evaluation: string;
  evidence: EvidenceType;
  what: string;
}> = [
  { phase: "47", system: "Security hardening & isolation", tests: "40 / 40", reported: "SECURITY_PASS (internal)", evaluation: "Adversarial suite in-repo", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Tenant/project isolation, firewall, kill switch, hashes, webhook authenticity, path traversal, secret filtering." },
  { phase: "48", system: "Independent verification", tests: "20 / 20", reported: "SECURE baseline; 3 defects remediated", evaluation: "Second-pass forensic suite in the same repository", evidence: "CONTROLLED_TEST", what: "Re-audited Phases 35–47 against the live codebase. Not an external laboratory replication." },
  { phase: "49", system: "Final platform certification", tests: "40 / 40", reported: "CERTIFIED PRODUCTION READY (internal freeze)", evaluation: "Internal certification suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Lifecycle, visual regression, provider failure paths. Live PayPal settlement listed NOT_APPLICABLE for the automated suite." },
  { phase: "50", system: "Launch rehearsal", tests: "30 / 30", reported: "PASS (cited by later reports)", evaluation: "test_phase50_launch_rehearsal.ts", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "End-to-end rehearsal. Dedicated markdown report was not present in the inspected tree; counts are taken from later phase reports." },
  { phase: "51", system: "CRM / sales", tests: "40 / 40", reported: "PASS (cited by later reports)", evaluation: "test_phase51_crm_sales.ts", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Lead → opportunity → proposal binding. Dedicated markdown report not in the inspected tree." },
  { phase: "52", system: "Sales copilot", tests: "40 / 40", reported: "SALES_COPILOT_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Quote intelligence with VERIFIED / EXPLICIT / UNKNOWN cost handling." },
  { phase: "53", system: "Design library", tests: "40 / 40", reported: "DESIGN_LIBRARY_PASS; ≤35% similarity (internal)", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Immutable validated components, anti-template checks on two example projects." },
  { phase: "54", system: "Design learning", tests: "40 / 40", reported: "DESIGN_LEARNING_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Outcome aggregation, N=1 protection, anti-causality, operator review before policy change." },
  { phase: "55", system: "Build / deployment packaging", tests: "40 / 40", reported: "BUILD_DEPLOYMENT_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Framework detection, allowlisted builds, secret-free handoff packages." },
  { phase: "56", system: "Project control", tests: "40 / 40", reported: "PROJECT_CONTROL_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Read-model command center; unknown requirement/cost remain UNKNOWN." },
  { phase: "57", system: "Work orchestration", tests: "40 / 40", reported: "WORK_ORCHESTRATOR_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Priority queue and lease scheduling." },
  { phase: "58", system: "Worker runtime", tests: "40 / 40", reported: "WORKER_RUNTIME_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Fencing, heartbeats, DLQ, bounded concurrency. Fleet counts in the report are test-fixture indicators." },
  { phase: "59", system: "Workflow durability", tests: "40 / 40", reported: "WORKFLOW_DURABILITY_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Hash-chained events, replay, outbox, crash resume classification." },
  { phase: "60", system: "Human approval", tests: "40 / 40", reported: "HUMAN_APPROVAL_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Request/decision store, expiry, snapshot binding, exception log." },
  { phase: "61", system: "Notifications", tests: "40 / 40", reported: "NOTIFICATION_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Client/operator notification delivery and preferences." },
  { phase: "62", system: "Client collaboration", tests: "40 / 40", reported: "CLIENT_COLLABORATION_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Snapshot-bound comments, change requests, attachment limits, operator-only notes." },
  { phase: "63", system: "Billing", tests: "40 / 40", reported: "BILLING_PASS", evaluation: "Internal acceptance suite", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Minor-unit ledger, reconciliation, delivery revoke on refund/dispute." },
  { phase: "64", system: "V1 certification", tests: "40 / 40 (suite); 650 / 650 (reported aggregate)", reported: "V1_CERTIFIED_WITH_LIMITATIONS", evaluation: "Internal certification rollup", evidence: "INTERNAL_ENGINEERING_EVIDENCE", what: "Release freeze hashes, limitation register, aggregate in-repo regression count." },
];

export const DEFECTS = [
  {
    id: "DEF-01",
    title: "Payment state classification discrepancy",
    component: "payment-verification.service.ts",
    discovery:
      "Phase 48 independent verification: zero-paid and partial payments were both grouped under PARTIALLY_PAID, so unpaid deliveries returned PAYMENT_PENDING instead of PAYMENT_VERIFICATION_FAILED.",
    impact:
      "An unpaid invoice could be described as pending rather than failed verification, weakening the delivery gate’s failure signal.",
    remediation:
      "Separated paidAmountMinor <= 0 to return UNVERIFIED with PAYMENT_VERIFICATION_FAILED.",
    regression: "Phase 48 Test 6 reported PASS after the change.",
  },
  {
    id: "DEF-02",
    title: "PayPal webhook fail-open condition",
    component: "paypal.provider.ts",
    discovery:
      "When webhook IDs or PayPal credentials were unconfigured, verifyWebhook fell through and returned isValid: true.",
    impact:
      "Unverifiable webhook traffic could have been treated as authentic (fail-open).",
    remediation:
      "Refactored to fail closed: isValid: false with WEBHOOK_VERIFICATION_UNAVAILABLE unless a valid signature is verified.",
    regression: "Phase 48 Test 12 reported PASS after the change.",
  },
  {
    id: "DEF-03",
    title: "Service-level authorization bypass",
    component: "production-release.service.ts & paypal.service.ts",
    discovery:
      "Privileged mutations relied on route-level checks rather than service-entry firewall and emergency-stop enforcement.",
    impact:
      "A direct service call could skip HTTP-layer authorization and kill-switch policy.",
    remediation:
      "Embedded emergencyKillSwitch and privilegedActionFirewall at approveProductionDeployment, confirmProductionLive, rollbackRelease, approveAndCreatePayPalOrder, and processPaymentAndAuthorizeDelivery.",
    regression: "Phase 48 Tests 4, 5, and 15 reported PASS after the change.",
  },
] as const;

export const TIMELINE = [
  { phase: "22B", title: "Boundaries", note: "Named in the requested chronology. No dedicated report file was present in the inspected repository.", evidence: "NOT_VERIFIED" as EvidenceType },
  { phase: "30", title: "Design intelligence", note: "Named in the requested chronology. No dedicated report file was present in the inspected repository.", evidence: "NOT_VERIFIED" as EvidenceType },
  { phase: "31", title: "Code review", note: "Named in the requested chronology. No dedicated report file was present in the inspected repository.", evidence: "NOT_VERIFIED" as EvidenceType },
  { phase: "35", title: "Production lifecycle", note: "Phase 48 architecture map covers Phases 35–47 as the production control plane.", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "40", title: "Payment-gated delivery", note: "Phase 63 cites Phases 40–43 as the origin of delivery revocation on refund/dispute.", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "47", title: "Security hardening", note: "PHASE_47_SECURITY_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "48", title: "Independent verification", note: "PHASE_48_INDEPENDENT_VERIFICATION_REPORT.md — in-repo forensic pass, not external replication.", evidence: "CONTROLLED_TEST" as EvidenceType },
  { phase: "55", title: "Universal build/deployment", note: "PHASE_55_BUILD_DEPLOYMENT_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "57", title: "Work orchestration", note: "PHASE_57_WORK_ORCHESTRATOR_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "58", title: "Worker runtime", note: "PHASE_58_WORKER_RUNTIME_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "59", title: "Workflow durability", note: "PHASE_59_WORKFLOW_DURABILITY_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "60", title: "Human approval", note: "PHASE_60_HUMAN_APPROVAL_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "63", title: "Financial operations", note: "PHASE_63_BILLING_ACCEPTANCE_REPORT.md", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
  { phase: "64", title: "V1 certification", note: "PHASE_64_V1_CERTIFICATION_REPORT.md — V1_CERTIFIED_WITH_LIMITATIONS", evidence: "INTERNAL_ENGINEERING_EVIDENCE" as EvidenceType },
];

export const TOC = [
  { href: "#abstract", n: "", label: "Abstract", level: 1 },
  { href: "#introduction", n: "1", label: "Introduction", level: 1 },
  { href: "#research-questions", n: "1.1", label: "Research questions", level: 2 },
  { href: "#approach", n: "2", label: "Approach", level: 1 },
  { href: "#arch-01", n: "2.1", label: "Requirements", level: 2 },
  { href: "#gating", n: "2.2", label: "Evidence gating", level: 2 },
  { href: "#architecture", n: "2.3", label: "System architecture", level: 2 },
  { href: "#operator-console", n: "2.3.1", label: "Operator console", level: 2 },
  { href: "#arch-02", n: "2.4", label: "Design intelligence", level: 2 },
  { href: "#arch-03", n: "2.5", label: "AI development", level: 2 },
  { href: "#arch-04", n: "2.6", label: "Verification", level: 2 },
  { href: "#arch-05", n: "2.7", label: "Human governance", level: 2 },
  { href: "#arch-06", n: "2.8", label: "Durable execution", level: 2 },
  { href: "#arch-07", n: "2.9", label: "Financial controls", level: 2 },
  { href: "#arch-08", n: "2.10", label: "Client delivery", level: 2 },
  { href: "#methodology", n: "3", label: "Experiment", level: 1 },
  { href: "#evaluation", n: "4", label: "Observed defects", level: 1 },
  { href: "#security", n: "5", label: "Security", level: 1 },
  { href: "#results", n: "6", label: "Results", level: 1 },
  { href: "#limitations", n: "7", label: "Limitations", level: 1 },
  { href: "#non-claims", n: "8", label: "What is not claimed", level: 1 },
  { href: "#timeline", n: "9", label: "Timeline", level: 1 },
  { href: "#appendix", n: "A", label: "Appendix", level: 1 },
] as const;

export const SUITE_SIZES = [
  { phase: "47", n: 40 },
  { phase: "48", n: 20 },
  { phase: "49", n: 40 },
  { phase: "50", n: 30 },
  { phase: "51", n: 40 },
  { phase: "52", n: 40 },
  { phase: "53", n: 40 },
  { phase: "54", n: 40 },
  { phase: "55", n: 40 },
  { phase: "56", n: 40 },
  { phase: "57", n: 40 },
  { phase: "58", n: 40 },
  { phase: "59", n: 40 },
  { phase: "60", n: 40 },
  { phase: "61", n: 40 },
  { phase: "62", n: 40 },
  { phase: "63", n: 40 },
  { phase: "64", n: 40 },
] as const;

export const TEST_SUITES = [
  "test_phase47_security_hardening.ts",
  "test_phase48_independent_verification.ts",
  "test_phase49_final_certification.ts",
  "test_phase50_launch_rehearsal.ts",
  "test_phase51_crm_sales.ts",
  "test_phase52_sales_copilot.ts",
  "test_phase53_design_library.ts",
  "test_phase54_design_learning.ts",
  "test_phase55_build_deployment.ts",
  "test_phase56_project_control.ts",
  "test_phase57_work_orchestrator.ts",
  "test_phase58_worker_runtime.ts",
  "test_phase59_workflow_durability.ts",
  "test_phase60_human_approval.ts",
  "test_phase61_notifications.ts",
  "test_phase62_client_collaboration.ts",
  "test_phase63_billing.ts",
  "test_phase64_final_v1_certification.ts",
] as const;

export const VIEWPORTS = ["375×812", "390×844", "768×1024", "1024×768", "1440×900"] as const;
