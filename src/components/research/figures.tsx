"use client";

import { useState } from "react";
import {
  ACTION_MATRIX,
  CLIENT_JOURNEY,
  DESIGN_COMPONENTS,
  EVIDENCE_BRANCHES,
  EVIDENCE_PIPELINE,
  PIPELINE,
  SUPPORTING_SYSTEMS,
  TIMELINE,
  WORKFLOW_EVENTS,
  type EvidenceType,
} from "@/lib/research/catalog";

export function EvidenceBadge({ type }: { type: EvidenceType }) {
  const cls =
    type === "LIVE_VERIFIED"
      ? "badge-live"
      : type === "CONTROLLED_TEST"
        ? "badge-test"
        : type === "INTERNAL_ENGINEERING_EVIDENCE"
          ? "badge-internal"
          : "badge-unknown";
  return <span className={`badge ${cls}`}>{type.replaceAll("_", " ")}</span>;
}

function FlowColumn({
  items,
  caption,
  title,
}: {
  items: readonly { id: string; label: string; body?: string }[];
  caption: string;
  title: string;
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const current = items.find((item) => item.id === active) ?? items[0];
  return (
    <figure className="figure">
      <div className="figure-head">{title}</div>
      <div className="flow" role="list">
        {items.map((item, index) => (
          <div key={item.id} role="listitem">
            {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
            <button
              type="button"
              className="flow-btn"
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          </div>
        ))}
      </div>
      {current?.body ? (
        <div className="flow-note" role="region" aria-live="polite">
          <strong>{current.label}.</strong> {current.body}
        </div>
      ) : null}
      <figcaption className="figure-cap">{caption}</figcaption>
    </figure>
  );
}

export function ArchitectureFigure() {
  const [active, setActive] = useState<string>(PIPELINE[0].id);
  const current =
    PIPELINE.find((item) => item.id === active) ??
    SUPPORTING_SYSTEMS.find((item) => item.id === active) ??
    PIPELINE[0];
  return (
    <figure className="figure" id="figure-1">
      <div className="figure-head">Figure 1. SYNAPSE System Architecture</div>
      <div className="flow" role="list">
        {PIPELINE.map((item, index) => (
          <div key={item.id} role="listitem">
            {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
            <button
              type="button"
              className="flow-btn"
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          </div>
        ))}
      </div>
      <div className="arch-grid">
        {SUPPORTING_SYSTEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            aria-pressed={active === item.id}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flow-note" role="region" aria-live="polite">
        <strong>{current.label}.</strong> {"body" in current ? current.body : ""}
      </div>
      <figcaption className="figure-cap">
        Primary commercial and delivery pipeline with supporting control-plane systems.
        Click a stage for the evaluated-implementation description. This diagram is a
        research schematic, not a live telemetry feed.
      </figcaption>
    </figure>
  );
}

export function EvidenceFigure() {
  const [active, setActive] = useState<string>(EVIDENCE_PIPELINE[0].id);
  const stage = EVIDENCE_PIPELINE.find((item) => item.id === active);
  const notes: Record<string, string> = {
    raw: "Prompts, documents, CRM fields, screenshots, and provider payloads enter unclassified.",
    extract: "Deterministic parsers and model-assisted extractors emit candidate claims with sources.",
    classify: "Each claim is labeled EXPLICIT, INFERRED, UNKNOWN, CONFLICTING, or VERIFIED.",
    evidence: "Supporting artifacts (hashes, invoices, test output) are attached or the claim stays UNKNOWN.",
    validate: "Gates accept, reject, or hold. UNKNOWN is not coerced into VERIFIED.",
    auth: "Only passing, bound claims become authoritative workflow state.",
  };
  return (
    <figure className="figure" id="figure-2">
      <div className="figure-head">Figure 2. Evidence-Gating Pipeline</div>
      <div className="flow">
        {EVIDENCE_PIPELINE.map((item, index) => (
          <div key={item.id}>
            {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
            <button
              type="button"
              className="flow-btn"
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          </div>
        ))}
      </div>
      <div className="chip-row">
        {EVIDENCE_BRANCHES.map((branch) => (
          <span key={branch.id} className="chip" title={branch.note}>
            {branch.label}
          </span>
        ))}
      </div>
      <div className="flow-note">
        <strong>{stage?.label}.</strong> {stage ? notes[stage.id] : ""}{" "}
        <em>UNKNOWN ≠ VERIFIED.</em>
      </div>
      <figcaption className="figure-cap">
        Designed classification path. Branches are status labels in code and reports, not
        measured precision/recall.
      </figcaption>
    </figure>
  );
}

export function DevelopmentLifecycleFigure() {
  return (
    <FlowColumn
      title="Figure 3. AI Development Lifecycle"
      caption="Designed lifecycle around the developer agent. Bounded autonomy does not imply unsupervised production authority."
      items={[
        { id: "manifest", label: "AUTHORIZED CHANGE MANIFEST", body: "Work is intended to proceed only from an explicit, scoped change list rather than unbounded prompt execution." },
        { id: "isolate", label: "WORKSPACE ISOLATION", body: "Writes are designed to stay inside production-sites/<projectId>/ with path-safety checks." },
        { id: "agent", label: "DEVELOPER AGENT", body: "Local Ollama models are documented as the runtime developer models. External paid LLMs are reported as blocked for runtime execution." },
        { id: "qa", label: "CODE QA", body: "TypeScript, lint, build, and related deterministic gates in the evaluated implementation." },
        { id: "visual", label: "VISUAL REVIEW", body: "Read-only visual critique. Does not itself authorize deployment or delivery." },
      ]}
    />
  );
}

export function ApprovalBoundaryFigure() {
  return (
    <FlowColumn
      title="Figure 4. Human Approval Boundary"
      caption="Phase 60 request → decision store. Approvals bind snapshot hashes and can expire or invalidate after mutation."
      items={[
        { id: "halt", label: "AUTOMATION HALT", body: "Policy engine classifies AUTO, HUMAN_APPROVAL, HUMAN_ONLY, or FORBIDDEN." },
        { id: "request", label: "APPROVAL REQUEST", body: "Scoped request with evidence, consequences, and remaining blockers." },
        { id: "decision", label: "OPERATOR DECISION", body: "APPROVE, REJECT, or REQUEST_CHANGES. Duplicate decisions return ALREADY_DECIDED." },
        { id: "bind", label: "SNAPSHOT BINDING", body: "Mutated source after approval yields APPROVAL_INVALIDATED." },
        { id: "resume", label: "RESUMABLE WORK", body: "Approved work re-enters the orchestrator; rejected work does not silently continue." },
      ]}
    />
  );
}

export function WorkerRecoveryFigure() {
  return (
    <figure className="figure" id="figure-5">
      <div className="figure-head">Figure 5. Worker Recovery Model</div>
      <div className="flow">
        {["WORKER A", "CLAIM", "CRASH", "LEASE EXPIRES", "WORKER B", "CLAIM", "COMPLETE"].map(
          (label, index) => (
            <div key={`a-${index}`}>
              {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
              <div className="flow-btn" style={{ cursor: "default" }}>
                {label}
              </div>
            </div>
          ),
        )}
      </div>
      <div className="flow-note">
        Then: WORKER A RETURNS → FENCING TOKEN INVALID → WRITE REJECTED. Phase 58 reports
        REJECTED_STALE_EXECUTION for this collision. Stale-worker protection matters because
        a recovered process can otherwise complete a side-effect that a successor already
        finished or that a human has since revoked.
      </div>
      <figcaption className="figure-cap">
        Designed fencing model from Phase 58. Not a live worker trace.
      </figcaption>
    </figure>
  );
}

export function PaymentGateFigure() {
  return (
    <figure className="figure" id="figure-6">
      <div className="figure-head">Figure 6. Payment → Delivery Gate</div>
      <div className="flow">
        {[
          "INVOICE",
          "PAYPAL",
          "SERVER VERIFICATION",
          "WEBHOOK",
          "FULLY PAID",
          "SNAPSHOT CHECK",
          "PACKAGE HASH",
          "DELIVERY AUTHORIZED",
          "CLIENT DOWNLOAD",
        ].map((label, index) => (
          <div key={label}>
            {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
            <div className="flow-btn" style={{ cursor: "default" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="chip-row">
        <span className="chip">PARTIAL PAYMENT → LOCKED</span>
        <span className="chip">REFUND → REVOKED</span>
        <span className="chip">DISPUTE → REVIEW / REVOKED</span>
      </div>
      <figcaption className="figure-cap">
        Designed fail-closed chain from Phases 40–43, 48, and 63. PayPal paths in the
        certification report are sandbox-verified, not live-settlement verified.
      </figcaption>
    </figure>
  );
}

export function EventTimeline() {
  const [seq, setSeq] = useState<string>(WORKFLOW_EVENTS[0].seq);
  const event = WORKFLOW_EVENTS.find((item) => item.seq === seq) ?? WORKFLOW_EVENTS[0];
  return (
    <figure className="figure" id="figure-7">
      <div className="figure-head">Figure 7. Workflow Event Reconstruction</div>
      <div className="flow">
        {WORKFLOW_EVENTS.map((item) => (
          <button
            key={item.seq}
            type="button"
            className="flow-btn"
            aria-pressed={seq === item.seq}
            onClick={() => setSeq(item.seq)}
          >
            EVENT {item.seq} · {item.type}
          </button>
        ))}
      </div>
      <dl className="research-meta" style={{ margin: "0.4rem 0.75rem 0.8rem", border: 0, paddingTop: 0 }}>
        <div>
          <dt>Event ID</dt>
          <dd>EVT-{event.seq}</dd>
        </div>
        <div>
          <dt>Actor</dt>
          <dd>{event.actor}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>schematic (not a live log)</dd>
        </div>
        <div>
          <dt>State transition</dt>
          <dd>
            {event.from} → {event.to}
          </dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{event.evidence}</dd>
        </div>
        <div>
          <dt>Correlation ID</dt>
          <dd>{event.correlation}</dd>
        </div>
        <div>
          <dt>Causation ID</dt>
          <dd>{event.causation}</dd>
        </div>
      </dl>
      <figcaption className="figure-cap">
        Schematic of the Phase 59 event model (hash chain, correlationId, causationId).
        Phase 59 reported 6 events in its test store; this eleven-step sequence is a
        teaching reconstruction, not a certified production log.
      </figcaption>
    </figure>
  );
}

export function ClientJourneyFigure() {
  return (
    <figure className="figure" id="figure-8">
      <div className="figure-head">Figure 8. Client Review → Change Request → New Version</div>
      <div className="chip-row">
        {CLIENT_JOURNEY.map((step, index) => (
          <span key={step} className="chip">
            {index + 1}. {step}
          </span>
        ))}
      </div>
      <div className="flow-note">
        In Phase 62, comments bind to snapshotId, manifestHash, and sourceHash. Converting
        feedback queues a CHANGE_REQUEST work item. A new version supersedes the prior
        review session so comments cannot land on an obsolete snapshot.
      </div>
      <figcaption className="figure-cap">
        Customer journey as implemented in the evaluated client review workspace—not a
        marketing funnel metric.
      </figcaption>
    </figure>
  );
}

export function ActionMatrix() {
  const [action, setAction] = useState<string>(ACTION_MATRIX[0].action);
  const row = ACTION_MATRIX.find((item) => item.action === action) ?? ACTION_MATRIX[0];
  return (
    <figure className="figure">
      <div className="figure-head">Autonomous action boundary</div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>Action</th>
              <th>AI</th>
              <th>Worker</th>
              <th>Operator</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ACTION_MATRIX.map((item) => (
              <tr
                key={item.action}
                className={item.action === action ? "selected" : undefined}
              >
                <td>
                  <button
                    type="button"
                    onClick={() => setAction(item.action)}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      font: "inherit",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {item.action}
                  </button>
                </td>
                <td>{item.ai}</td>
                <td>{item.worker}</td>
                <td>{item.operator}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flow-note">
        <strong>{row.action}.</strong> {row.note}
      </div>
      <figcaption className="figure-cap">
        Derived from PHASE_47_SECURITY_ACCEPTANCE_REPORT.md §6 and
        privileged-action-firewall.service.ts. Click a row for the source note.
      </figcaption>
    </figure>
  );
}

export function ProvenanceExplorer() {
  const [id, setId] = useState<string>(DESIGN_COMPONENTS[0].id);
  const item = DESIGN_COMPONENTS.find((row) => row.id === id) ?? DESIGN_COMPONENTS[0];
  return (
    <figure className="figure">
      <div className="figure-head">Component provenance explorer</div>
      <div className="chip-row">
        {DESIGN_COMPONENTS.map((row) => (
          <button
            key={row.id}
            type="button"
            className="chip"
            aria-pressed={id === row.id}
            onClick={() => setId(row.id)}
          >
            {row.id}
          </button>
        ))}
      </div>
      <div className="flow">
        {["COMPONENT", "VALIDATION", "USAGE", "OUTCOME", "OBSERVATION", "RECOMMENDATION"].map(
          (label, index) => (
            <div key={`pay-${index}`}>
              {index > 0 ? <div className="flow-arrow" aria-hidden>↓</div> : null}
              <div className="flow-btn" style={{ cursor: "default" }}>
                {label}
              </div>
            </div>
          ),
        )}
      </div>
      <div className="flow-note">
        <strong>
          {item.id} {item.version}
        </strong>{" "}
        · {item.state} · {item.pattern}. {item.note} After recommendation: operator review
        (ACCEPT / REJECT / REQUEST_MORE_EVIDENCE). SYNAPSE does not automatically rewrite
        design rules.
      </div>
      <figcaption className="figure-cap">
        Components named in Phase 53. Learning loop from Phase 54. Anti-causality rejects
        ungrounded “X causes conversion” claims.
      </figcaption>
    </figure>
  );
}

export function VersionTimeline() {
  const [phase, setPhase] = useState<string>(TIMELINE[TIMELINE.length - 1].phase);
  const item = TIMELINE.find((row) => row.phase === phase) ?? TIMELINE[0];
  return (
    <figure className="figure">
      <div className="figure-head">Research timeline</div>
      <div className="chip-row">
        {TIMELINE.map((row) => (
          <button
            key={row.phase}
            type="button"
            className="chip"
            aria-pressed={phase === row.phase}
            onClick={() => setPhase(row.phase)}
          >
            {row.phase}
          </button>
        ))}
      </div>
      <div className="flow-note">
        <strong>
          Phase {item.phase} — {item.title}.
        </strong>{" "}
        {item.note} <EvidenceBadge type={item.evidence} />
      </div>
      <figcaption className="figure-cap">
        Chronology as requested, with evidence labels for whether a report file was actually
        present in the inspected tree.
      </figcaption>
    </figure>
  );
}

export function SecurityBoundaryFigure() {
  return (
    <figure className="figure">
      <div className="figure-head">Security boundary visualization</div>
      <div className="arch-grid">
        {[
          ["Tenant", "organizationId; cross-org access denied"],
          ["Project", "projectId; PROJECT_BOUNDARY_VIOLATION"],
          ["Workspace", "production-sites/<projectId>/"],
          ["Snapshot", "SHA-256 bind; mutation invalidates delivery"],
          ["Manifest", "hash registry + comparison"],
          ["Package", "packageHash before download"],
          ["Approval", "scope + snapshot match"],
          ["Webhook", "signature verify; fail-closed"],
          ["Replay", "idempotent capture/event IDs"],
          ["Kill switch", "EMERGENCY_STOP blocks mutations"],
          ["Firewall", "empty privileged lists for AI/worker/webhook"],
          ["Path/secrets", "traversal blocked; secrets stripped"],
        ].map(([label, body]) => (
          <div key={label} className="chip" style={{ cursor: "default" }}>
            <strong>{label}</strong>
            <div style={{ textTransform: "none", letterSpacing: 0, marginTop: "0.25rem" }}>
              {body}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="figure-cap">
        Boundaries described in Phases 47–48. Adversarial findings in those reports were
        generated and blocked inside the project’s own test harness.
      </figcaption>
    </figure>
  );
}

export function ScreenshotFigure({
  src,
  alt,
  title,
  caption,
}: {
  src: string;
  alt: string;
  title: string;
  caption: string;
}) {
  return (
    <figure className="figure">
      <div className="figure-head">{title}</div>
      <img className="figure-photo" src={src} alt={alt} />
      <figcaption className="figure-cap">{caption}</figcaption>
    </figure>
  );
}
