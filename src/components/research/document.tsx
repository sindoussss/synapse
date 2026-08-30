import {
  DEFECTS,
  KEYWORDS,
  PAPER,
  PHASE_RESULTS,
  RESEARCH_QUESTIONS,
  REQUIREMENT_STATES,
  TEST_SUITES,
  VIEWPORTS,
} from "@/lib/research/catalog";
import {
  ActionMatrix,
  ArchitectureFigure,
  ApprovalBoundaryFigure,
  ClientJourneyFigure,
  DevelopmentLifecycleFigure,
  EventTimeline,
  EvidenceBadge,
  EvidenceFigure,
  PaymentGateFigure,
  ProvenanceExplorer,
  ScreenshotFigure,
  SecurityBoundaryFigure,
  VersionTimeline,
  WorkerRecoveryFigure,
} from "./figures";
import { Equation } from "./math";
import { ConcurrencyChart, SamplePolicyChart, SuiteSizeChart } from "./graphs";
import { ResearchNav } from "./nav";

export function ResearchDocument() {
  return (
    <div className="research-shell" id="top">
      <a className="research-skip" href="#abstract">
        Skip to abstract
      </a>
      <ResearchNav />
      <div className="research-main">
      <article className="research-doc">
        <p className="research-kicker">Engineering research presentation · not a product page</p>
        <h1 className="research-title">
          SYNAPSE: Evidence-Driven Autonomous Web Development
        </h1>
        <p className="research-authors">
          {PAPER.authors[0].name}
          <br />
          {PAPER.authors[0].affiliation}
        </p>
        <p className="research-lede">
          A governed software-production system combining AI-assisted development,
          deterministic verification, human authorization, durable execution, and
          auditable workflow state.
        </p>

        <dl className="research-meta">
          <div>
            <dt>Authors / Project</dt>
            <dd>
              {PAPER.authors[0].name}
              <br />
              {PAPER.authors[0].affiliation}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {PAPER.version}
              <br />
              {PAPER.certification}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{PAPER.lastUpdated}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>
              {PAPER.version} · {PAPER.releaseCandidate}
            </dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd>
              {PAPER.repositoryUrl ? (
                <a href={PAPER.repositoryUrl} target="_blank" rel="noopener noreferrer">
                  {PAPER.repositoryUrl.replace(/^https:\/\//, "")}
                </a>
              ) : (
                "URL not published in this workspace"
              )}
            </dd>
          </div>
          <div>
            <dt>Research status</dt>
            <dd>Internal engineering evaluation. Not independently replicated.</dd>
          </div>
          <div>
            <dt>Snapshot ID</dt>
            <dd>
              <code>{PAPER.snapshotId}</code>
            </dd>
          </div>
          <div>
            <dt>Source hash (reported)</dt>
            <dd>
              <code>{PAPER.sourceHash.slice(0, 16)}…</code>
            </dd>
          </div>
        </dl>

        <section id="abstract">
          <h2>Abstract</h2>
          <p>
            Traditional AI coding systems can generate useful software but may produce
            hallucinated claims, insecure code, visually generic interfaces, unauthorized
            actions, fragile workflows, and non-durable execution. SYNAPSE explores an
            alternative architecture in which AI-generated work is surrounded by
            deterministic validation, evidence gates, independent review, human approval,
            durable task execution, immutable workflow history, payment controls, and
            deployment verification.
          </p>
          <p>
            This document does not claim that the architecture solves those problems
            universally. The system is designed to keep unknown facts labeled unknown, to
            fail closed on privileged mutations, and to reconstruct workflow state from an
            append-only event log. In the evaluated implementation, those behaviors were
            exercised primarily through internally authored acceptance tests dated through
            30 August 2026.
          </p>
        </section>

        <section id="keywords">
          <h2>Keywords</h2>
          <ul className="research-keywords">
            {KEYWORDS.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </section>

        <section id="introduction">
          <h2>1. Introduction</h2>
          <p>
            The practical problem is not whether a language model can emit HTML or
            TypeScript. It is whether an organization can treat that emission as a
            production artifact without accepting invented requirements, unaudited
            mutations, or irreversible side effects. SYNAPSE is designed as a wrapping
            architecture: generation is allowed only inside a workspace; promotion to
            clients, payment, and production is a separate, fail-closed process.
          </p>
          <p>
            This paper describes how that wrapping is specified in the evaluated
            implementation. It does not report a randomized trial against other coding
            agents. Where a formula is given, it is the rule the software is designed to
            enforce, not a fitted statistical model of real-world reliability.
          </p>
        </section>

        <section id="research-questions">
          <h2>1.1 Research questions</h2>
          <p>
            The following questions motivated the design. They are not proven conclusions.
          </p>
          {RESEARCH_QUESTIONS.map((q) => (
            <p className="research-rq" key={q.id}>
              <strong>{q.id}</strong>
              {q.text}
            </p>
          ))}
        </section>

        <section id="approach">
          <h2>2. Approach</h2>
          <p>
            The system is a pipeline from commercial intake to source delivery. At each
            step a record is either supported by bound evidence, left unknown, marked
            conflicting, or rejected. Autonomous work may proceed only when a policy
            classifies the action as safe or bounded. Privileged actions require an
            operator decision bound to a snapshot hash.
          </p>
        </section>

        <section id="arch-01">
          <h2>2.1 Requirements intelligence</h2>
          <p>
            <code>RequirementIntelligenceService</code> types requirements as{" "}
            <code>EXPLICIT | INFERRED | UNKNOWN | CONFLICTING | VERIFIED</code>. The
            system is designed so that unstated audience, budget, or deadline fields remain
            UNKNOWN instead of being fabricated as client facts.
          </p>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Meaning in the evaluated implementation</th>
              </tr>
            </thead>
            <tbody>
              {REQUIREMENT_STATES.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.id}</code>
                  </td>
                  <td>{row.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="footnote">
            Source: src/lib/services/developer/requirement-intelligence.service.ts and
            Phase 64 anti-hallucination note. No external user study of hallucination rate
            is reported here.
          </p>
        </section>

        <section id="gating">
          <h2>2.2 Evidence gating</h2>
          <p>
            Let a claim be a triple <em>c</em> = (<em>text</em>, <em>source</em>, <em>σ</em>),
            where <em>σ</em> is a status in a finite set. The evaluated implementation uses
          </p>
          <Equation n="1">
            σ(c) ∈ {"{"}EXPLICIT, INFERRED, UNKNOWN, CONFLICTING, VERIFIED{"}"}
          </Equation>
          <p>
            Inference is allowed, but it does not upgrade status. In particular the system
            is designed so that
          </p>
          <Equation n="2">
            σ(c) = UNKNOWN ⇏ σ(c) = VERIFIED
          </Equation>
          <p>
            A default assumption, if one is recorded for planning, is stored separately
            from the UNKNOWN item. Authoritative workflow state is intended to be updated
            only when a later gate emits VERIFIED, REJECTED, or an explicit human
            resolution of CONFLICTING. Figure 2 shows the designed pipeline.
          </p>
          <EvidenceFigure />
        </section>

        <section id="architecture">
          <h2>2.3 System architecture</h2>
          <p>
            SYNAPSE is a multi-tenant operations and client-delivery platform for website
            production. The public claim of this paper is architectural: generation is
            nested inside verification, authorization, durability, and financial gates. The
            commercial lifecycle below is the designed path in the evaluated codebase.
          </p>
          <ArchitectureFigure />
        </section>

        <section id="operator-console">
          <h2>2.3.1 Operator console</h2>
          <p>
            The evaluated implementation includes a separate operator console from this
            paper. The screenshot below is internal engineering evidence of that console
            as captured on 31 August 2026. It illustrates layout and governance surfaces,
            not live production traffic. Counts visible in the capture (queued work, leads,
            pending approvals) are instance state at capture time and are not results of
            this paper.
          </p>
          <ScreenshotFigure
            src="/research/operator-overview.png"
            alt="SYNAPSE operator console showing operations overview, a strategic goal input, running work, and a fleet table."
            title="Figure. Operator overview (internal capture)"
            caption="INTERNAL_ENGINEERING_EVIDENCE. Operator overview: command input, running work, and fleet roster. Source tree: github.com/sindoussss/synapse."
          />
        </section>

        <section id="arch-02">
          <h2>2.4 Design intelligence</h2>
          <p>
            Phase 53 introduces a versioned component library (design brief → design system
            → library → provenance). Phase 54 adds evidence-driven learning from visual QA,
            responsiveness, accessibility, repairs, and client review. Recommendations
            require operator review. The system is designed not to auto-publish design
            policy.
          </p>
          <ProvenanceExplorer />
          <p>
            Phase 54 forbids promoting a design rule from a single project. Write <em>n</em>{" "}
            for the number of independent outcome records attached to a component. The
            engine is designed to apply
          </p>
          <Equation n="7">
            n = 0 → N/A,   n = 1 → INSUFFICIENT_EVIDENCE,   n ≥ 2 → OBSERVED
          </Equation>
          <p>
            Phase 53 reports a structural-overlap score <em>s</em>(A, B) ≤ 0.35 between two
            example sites. That inequality is an internal check on those two compositions,
            not a proven diversity bound for all future sites.
          </p>
          <SamplePolicyChart />
        </section>

        <section id="arch-03">
          <h2>2.5 AI development</h2>
          <p>
            The developer agent is designed to operate in a sandboxed workspace under an
            authorized change manifest. Phase 47–48 document local Ollama models for code
            tasks and Gemini as read-only visual review. AI_DEVELOPER_AGENT has an empty
            privileged-action list in the firewall.
          </p>
          <DevelopmentLifecycleFigure />
        </section>

        <section id="arch-04">
          <h2>2.6 Verification</h2>
          <p>
            In the evaluated implementation, Phase 64 reports eight QA gates: linting, build
            compilation, unit tests, integration tests, responsiveness, visual hierarchy,
            security audit, and accessibility. Responsiveness was evaluated at{" "}
            {VIEWPORTS.join(", ")}. These are internally designed checks.
          </p>
          <table>
            <thead>
              <tr>
                <th>Gate</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TypeScript</td>
                <td>Static analysis (<code>tsc --noEmit</code> reported 0 errors at certification).</td>
              </tr>
              <tr>
                <td>Lint / build</td>
                <td>Deterministic compile and lint; unknown framework blocks packaging.</td>
              </tr>
              <tr>
                <td>Security</td>
                <td>14-point audit engine described in Phase 47.</td>
              </tr>
              <tr>
                <td>Code review</td>
                <td>Separate from generation; snapshot-bound.</td>
              </tr>
              <tr>
                <td>Visual review</td>
                <td>Read-only critique. Not a deployment grant.</td>
              </tr>
              <tr>
                <td>Functional review</td>
                <td>Client and operator review sessions (Phase 62).</td>
              </tr>
              <tr>
                <td>Content integrity</td>
                <td>Hash registry for snapshots, manifests, packages, audit records.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="arch-05">
          <h2>2.7 Human governance</h2>
          <p>
            Phase 60 centralizes approval requests, immutable decisions, exceptions, and
            resume-after-decision. Combined with the emergency stop state machine (NORMAL,
            DEGRADED, READ_ONLY, EMERGENCY_STOP) and the privileged action firewall, the
            design goal is that high-risk actions remain visible and human-gated.
          </p>
          <ScreenshotFigure
            src="/research/approval-queue.png"
            alt="SYNAPSE action approval queue with filter tabs and a table of deployment and configuration requests."
            title="Figure. Action approval queue (internal capture)"
            caption="INTERNAL_ENGINEERING_EVIDENCE. Human-gated approval queue for privileged operations (deployment, configuration, source delivery). Statuses in the capture are instance state, not a published trial."
          />
          <ApprovalBoundaryFigure />
          <ActionMatrix />
        </section>

        <section id="arch-06">
          <h2>2.8 Durable execution</h2>
          <p>
            Phase 57 provides the work queue. Phase 58 adds workers, leases, monotonic
            fencing tokens, retries, and dead letters. Phase 59 adds hash-chained events,
            snapshot comparison, outbox dispatch, and crash-resume classification
            (SAFE_TO_RESUME, SAFE_TO_RETRY, WAITING_EXTERNAL, WAITING_HUMAN).
          </p>
          <p>
            Events are designed as a hash chain. Let <em>e<sub>i</sub></em> be the
            canonical payload of event <em>i</em> and let ∥ denote concatenation. Then
          </p>
          <Equation n="3">
            h<sub>0</sub> = SHA256(e<sub>0</sub>),   h<sub>i</sub> = SHA256(e<sub>i</sub> ∥ h<sub>i−1</sub>)
          </Equation>
          <p>
            Any mutation, deletion, or gap that changes a stored hash is designed to raise
            EVENT_CHAIN_INTEGRITY_VIOLATION. Worker writes use a monotonic fencing token
            τ. After a crash, a successor claims the lease with τ′ = τ + 1. A stale worker
            presenting τ is rejected:
          </p>
          <Equation n="4">
            write allowed ⇔ τ<sub>worker</sub> = τ<sub>lease</sub>
          </Equation>
          <p>
            Transient retries are bounded. If <em>k</em> is the attempt index,
          </p>
          <Equation n="5">
            k ≤ 3;   k &gt; 3 → dead-letter / human escalation
          </Equation>
          <ConcurrencyChart />
          <EventTimeline />
          <WorkerRecoveryFigure />
        </section>

        <section id="arch-07">
          <h2>2.9 Financial controls</h2>
          <p>
            Phase 63 uses integer minor units, an append-only ledger (PAYMENT, REFUND,
            REVERSAL, DISPUTE, ADJUSTMENT), and invoice states including DRAFT, ISSUED,
            PARTIALLY_PAID, FULLY_PAID, REFUNDED, DISPUTED. Missing FX rates remain UNKNOWN.
            Delivery stays locked on partial payment.
          </p>
          <p>
            Money is an integer in minor units (centavos or cents), never a binary float.
            Let <em>D</em> be amount due and <em>P</em> amount paid, both in ℕ. Currency
            codes must match. The delivery predicate is designed as
          </p>
          <Equation n="6">
            FULLY_PAID ⇔ P ≥ D ∧ curr(P) = curr(D),   LOCKED ⇔ P &lt; D
          </Equation>
          <p>
            A refund, reversal, or active dispute is designed to revoke an authorized
            package rather than rewrite the ledger row. Missing FX rates stay UNKNOWN;
            currencies are not summed across silos.
          </p>
          <PaymentGateFigure />
          <p className="footnote">
            Phase 64 limitation <code>PAYPAL_SANDBOX_VERIFIED</code>: live production capture
            requires production credentials and is not claimed as LIVE_VERIFIED here.
          </p>
        </section>

        <section id="arch-08">
          <h2>2.10 Client delivery</h2>
          <p>
            Clients preview snapshot-bound iframes, comment, open change requests, approve,
            pay, download source when authorized, and receive a handoff. Operator notes,
            prompt templates, and credentials are designed to be out of client scope.
          </p>
          <ClientJourneyFigure />
        </section>

        <section id="methodology">
          <h2>3. Experiment</h2>
          <div className="callout">
            Internal acceptance-test results are engineering verification evidence and
            should not be interpreted as independently replicated scientific benchmarks.
          </div>
          <p>
            SYNAPSE was evaluated through staged internal engineering verification. Each
            later phase report re-runs prior suites. Test names live in the repository root
            as <code>test_phase*.ts</code> files. Sample sizes are the test counts in those
            files (typically 40 cases; Phase 48 has 20; Phase 50 has 30). Tests are
            authored by the same project that implements the system, so leakage of
            implementation details into fixtures is possible and was not independently
            audited.
          </p>
          <p>
            There is no randomized comparison against another coding agent. Results are
            environment-dependent (local Node, JSON stores under <code>.data/</code>,
            configured Ollama/Gemini/PayPal sandbox). Model dependence is explicit: runtime
            developer models are documented as local Ollama; visual review as Gemini
            read-only.
          </p>
          <SuiteSizeChart />
          <div className="matrix-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>What was tested</th>
                  <th>Reported tests</th>
                </tr>
              </thead>
              <tbody>
                {PHASE_RESULTS.map((row) => (
                  <tr key={row.phase}>
                    <td>{row.phase}</td>
                    <td>{row.what}</td>
                    <td>{row.tests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="evaluation">
          <h2>4. Observed defects</h2>
          <p>
            Phase 48 recorded three genuine defects found while checking earlier claims
            against the code. Research credibility depends on leaving these visible.
          </p>
          {DEFECTS.map((d) => (
            <div key={d.id} className="research-rq">
              <h3>
                {d.id}. {d.title}
              </h3>
              <p>
                <span className="research-kicker">{d.component}</span>
              </p>
              <p>
                <strong>Discovery.</strong> {d.discovery}
              </p>
              <p>
                <strong>Impact.</strong> {d.impact}
              </p>
              <p>
                <strong>Remediation.</strong> {d.remediation}
              </p>
              <p>
                <strong>Regression verification.</strong> {d.regression}{" "}
                <EvidenceBadge type="CONTROLLED_TEST" />
              </p>
            </div>
          ))}
        </section>

        <section id="security">
          <h2>5. Security</h2>
          <p>
            The evaluated control plane is designed around isolation, binding, and
            fail-closed privileged paths. Phase 47 lists twelve adversarial findings that
            the suite itself generated and then blocked. That is not a third-party
            penetration test.
          </p>
          <SecurityBoundaryFigure />
          <p>
            During EMERGENCY_STOP, deployments, source mutation, payment mutation, source
            delivery, and autonomous repair are blocked. Health checks, audit inspection,
            incident creation, evidence collection, and operator recovery remain allowed.
          </p>
        </section>

        <section id="results">
          <h2>6. Results</h2>
          <p>
            Reported pass counts are copied from phase markdown reports. They are labeled
            INTERNAL REPORT unless a stronger evidence type applies. No row is
            LIVE_VERIFIED production traffic.
          </p>
          <div className="matrix-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>System</th>
                  <th>Evaluation type</th>
                  <th>Reported result</th>
                  <th>Evidence type</th>
                </tr>
              </thead>
              <tbody>
                {PHASE_RESULTS.map((row) => (
                  <tr key={`r-${row.phase}`}>
                    <td>{row.phase}</td>
                    <td>{row.system}</td>
                    <td>{row.evaluation}</td>
                    <td>
                      {row.reported}
                      <div className="footnote">INTERNAL REPORT</div>
                    </td>
                    <td>
                      <EvidenceBadge type={row.evidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            Phase 64 aggregate 650/650 is a sum of in-repo suites, not an external
            benchmark. Third-party hosting in that report uses local staging adapters when
            production tokens are unset (<code>CONTROLLED_TEST_ONLY</code> deployments).
          </p>
        </section>

        <section id="limitations">
          <h2>7. Limitations</h2>
          <p>SYNAPSE, as documented here, is:</p>
          <ul>
            <li>one engineering implementation, not a family of independent systems;</li>
            <li>tested primarily through internally designed tests;</li>
            <li>not independently reproduced by an outside laboratory;</li>
            <li>not scientifically benchmarked against a controlled baseline;</li>
            <li>dependent on its execution environment and JSON-backed stores;</li>
            <li>dependent on configured providers (Ollama, Gemini, PayPal sandbox);</li>
            <li>subject to unknown real-world edge cases.</li>
          </ul>
          <p>
            Explicit UNKNOWN items in the reports include hardware amortization and
            electricity cost, unregistered/deleted artifact hashes, human labor cost, and
            FX conversion when rates are unconfigured. Live PayPal production settlement is
            documented as not covered by the automated suite.
          </p>
        </section>

        <section id="non-claims">
          <h2>8. What SYNAPSE does not claim</h2>
          <ul>
            <li>perfect hallucination prevention;</li>
            <li>perfect security;</li>
            <li>zero bugs;</li>
            <li>universal framework support;</li>
            <li>universal deployment support;</li>
            <li>autonomous financial authority;</li>
            <li>autonomous production authority;</li>
            <li>scientific proof of superiority over other coding systems.</li>
          </ul>
        </section>

        <section id="timeline">
          <h2>9. Research timeline</h2>
          <VersionTimeline />
        </section>

        <section id="appendix">
          <h2>A. Technical appendix</h2>
          <h3>Architecture terminology</h3>
          <p>
            Authoritative state: records that gates have accepted. Evidence: bound artifact
            or check output. UNKNOWN: absence of evidence. Privileged action: mutation
            listed in PrivilegedActionFirewall.
          </p>
          <h3>Evidence categories</h3>
          <p>
            LIVE_VERIFIED, CONTROLLED_TEST, INTERNAL_ENGINEERING_EVIDENCE, UNKNOWN,
            NOT_VERIFIED, NOT_SUPPORTED — used on this site to avoid inflating internal
            tests into scientific results.
          </p>
          <h3>Selected state machines (from reports)</h3>
          <ul>
            <li>
              Kill switch: NORMAL | DEGRADED | READ_ONLY | EMERGENCY_STOP
            </li>
            <li>
              Invoice: DRAFT, ISSUED, PARTIALLY_PAID, FULLY_PAID, OVERDUE, REFUNDED,
              DISPUTED, VOID, CANCELLED, SUPERSEDED, RECONCILIATION_REQUIRED
            </li>
            <li>
              Review session: OPEN, IN_PROGRESS, CLIENT_APPROVED,
              CLIENT_REQUESTED_CHANGES, EXPIRED, CLOSED, SUPERSEDED
            </li>
            <li>Worker: claim → execute → heartbeat / drain / DLQ (Phase 58)</li>
            <li>Delivery: LOCKED | AUTHORIZED | REVOKED / INVALIDATED</li>
          </ul>
        </section>

        <section id="reproducibility">
          <h2>Reproducibility</h2>
          <p>
            A researcher with the repository can re-run the named suites on the frozen
            candidate <code>{PAPER.releaseCandidate}</code> (reported{" "}
            {PAPER.lastUpdated}). Environment assumptions in the reports include local
            Node.js, TypeScript 5.x, JSON stores under <code>.data/</code>, PayPal sandbox
            rather than live capture, and the five viewports listed above. Model
            configuration in Phases 47–48: local Ollama for developer tasks; Gemini
            read-only for visual review. API keys, PayPal secrets, and private client
            records must not be published with any reproduction package.
          </p>
          <p className="footnote">Suites named in later reports: {TEST_SUITES.join(", ")}.</p>
        </section>

        <section id="sources">
          <h2>Source / research links</h2>
          <ul>
            <li>
              GitHub:{" "}
              {PAPER.repositoryUrl ? (
                <a href={PAPER.repositoryUrl} target="_blank" rel="noopener noreferrer">
                  {PAPER.repositoryUrl}
                </a>
              ) : (
                "not published — placeholder only"
              )}
            </li>
            <li>Research PDF: use the browser print dialog (A4/Letter CSS supplied)</li>
            <li>
              Methodology: <a href="#methodology">#methodology</a>
            </li>
            <li>
              Architecture: <a href="#architecture">#architecture</a>
            </li>
            <li>
              Release: <code>{PAPER.releaseCandidate}</code> · {PAPER.certification}
            </li>
          </ul>
        </section>
      </article>

      <footer className="research-footer">
        <p className="research-wordmark" style={{ display: "block" }}>
          SYNAPSE
        </p>
        <p>Evidence-driven autonomous web development.</p>
        <p>
          {PAPER.version}
          <br />
          {PAPER.certification}
        </p>
        <p>Research project.</p>
        <nav aria-label="Footer">
          {PAPER.repositoryUrl ? (
            <a href={PAPER.repositoryUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          ) : (
            <span>GitHub</span>
          )}
          <a href="#abstract">Research</a>
          <a href="#architecture">Architecture</a>
          <a href="#methodology">Methodology</a>
        </nav>
      </footer>
      </div>
    </div>
  );
}
