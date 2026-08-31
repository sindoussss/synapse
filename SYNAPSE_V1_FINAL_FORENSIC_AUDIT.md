# SYNAPSE V1.0 — FINAL POST-REMEDIATION FORENSIC AUDIT

**Auditor:** Independent Grok 4.6 (fresh pass; previous audit and resolution docs were not treated as truth)  
**Scope:** Post-remediation codebase as of 2026-08-31  
**Mode:** Read-only inspect → reproduce → root cause. No product fixes.  
**Dev server probed:** `http://localhost:3010`  
**Rule applied:** CONFIRMED BUG requires inspect + reproduce + root cause. Speculative concerns are labeled SPECULATIVE.

---

## Executive verdict

| Item | Result |
|---|---|
| SYN-BUG-001 (HTTP auth boundary) | **CLOSED** |
| SYN-BUG-002 (PayPal caller-supplied reconcile) | **CLOSED** |
| SYN-BUG-003 (Refund/dispute delivery revocation) | **CLOSED** |
| Operator HttpOnly HMAC session | **HOLDS** for `/api/*` |
| CLIENT_AUTH_NOT_IMPLEMENTED | **Still true. Not a PASS.** |
| V1 status | **V1_REMEDIATION_REQUIRED** |

SYN-BUG-001/002/003 are closed on the paths they named. They are not a general certification that privileged state is consistent.

What remains broken is a different layer: authenticated (and some unauthenticated HTML) paths that still mint financial or operational authority without the controls those remediations introduced.

This audit does **not** certify SYNAPSE V1.

---

## Method

1. Traced HTTP identity (`http-identity.ts`, `enforce-http-auth.ts`, `http-route-policy.ts`, `proxy.ts`) against live requests.  
2. Traced PayPal verify → provider → invoice → ledger → delivery.  
3. Re-ran targeted regressions: SYN-BUG-001 12/12, SYN-BUG-002 3/3, SYN-BUG-003 5/5, operator session 16/16, Phase 59 workflow 40/40.  
4. Live-probed unauthenticated/forged HTTP and HTML.  
5. In-process reproduction under `EMERGENCY_STOP` for handover reconcile, DNS cutover, production approve, and invoice verify. Kill-switch state was restored to `NORMAL`. Throwaway audit invoices were stripped.

Secrets from `.env.local` were not copied into this report.

---

## Prior criticals — closed / open

### SYN-BUG-001 — CLOSED

**Claim tested:** unauthenticated / forged identity must not reach operator APIs.

Live HTTP (`localhost:3010`):

| Probe | Result |
|---|---|
| No credentials → `/api/projects/list`, `/api/invoices/list`, `/api/ai/health`, `/api/production-release/approve`, `/api/handover/payment/reconcile`, `/api/payments/paypal/verify` | `401 UNAUTHENTICATED` |
| `Authorization: Bearer forged-operator-token` | `401` |
| `x-role` / `x-actor-role: OPERATOR` without valid credential | `401` |
| Forged `synapse_operator_session` cookie | `401` |
| Wrong login password | `401`, no session cookie with a token value |
| PayPal webhook without signature headers | `400 UNSIGNED_WEBHOOK` (reachable without operator session; cryptographically fail-closed) |
| `/api/auth/session` unauthenticated | `200 { authenticated: false, principal: null }` |

Code: identity is Bearer `SYNAPSE_OPERATOR_TOKEN` (timing-safe SHA-256 compare) **or** HMAC session cookie. Caller `actorRole`, `organizationId`, and `projectId` are not identity. Default route class is `OPERATOR_AUTHENTICATED`. `proxy.ts` matcher `/api/:path*` plus per-route `denyUnlessAuthenticated` / `requireHttpPrincipal`. All 136 `src/app/api/**/route.ts` files import the HTTP gate.

Privileged production-release HTTP routes pass `principal.actorRole` into the existing firewall (no longer defaulting the HTTP caller to OPERATOR at the route).

Regression: `test_syn_bug_001_http_auth.ts` **12/12**.

**Not confused with:** “a helper exists.” The live routes returned 401.

---

### Operator session — HOLDS (API). See SYN-FIN-003 for HTML.

| Check | Evidence |
|---|---|
| Password not leaked in HTML/JS | `/login` 200, 13608 bytes; no `SYNAPSE_OPERATOR_TOKEN` / `SYNAPSE_OPERATOR_PASSWORD` / `SYNAPSE_SESSION_SECRET` |
| Token not in login JSON | Login returns `{ ok, principal }`; cookie is `Set-Cookie` |
| HttpOnly | `sessionCookieOptions().httpOnly === true` |
| Secure | `secure: process.env.NODE_ENV === "production"` — appropriate for local/dev HTTP |
| SameSite | `lax` |
| Integrity | HMAC-SHA256 over canonical JSON; tamper / expire fail in session tests 2–4 |
| Forged cookie | Live + tests: 401 |
| Expired cookie | Session test 3: blocked |
| Logout | Clears cookie (`maxAge: 0`). No server-side session store. Stolen cookie remains valid until `exp` (12h). Documented limitation, not a confirmed bypass of HMAC. |
| Role upgrade | `verifyOperatorSessionCookie` requires `actorRole === "OPERATOR"`; claims are signed. Body/header role ignored (session test 5). |
| Org/project from client | Issued from env (`SYNAPSE_OPERATOR_ORGANIZATION_ID` / `WORKSPACE_ID`), not login body. Query org mismatch → 403 when principal is tenant-bound (session tests 6–8). |

Regression: `test_operator_session_auth.ts` **16/16**.

`OperatorSessionGate` is a **client** wrapper. It correctly hides operator chrome after JS runs. It does **not** prevent Next.js from serializing Server Component children into the RSC payload. That gap is SYN-FIN-003, not a reopening of SYN-BUG-001.

---

### SYN-BUG-002 — CLOSED

**Claim tested:** `POST /api/payments/paypal/verify` must not trust caller capture / amount / currency / `deliveryContext`.

Route forwards only `orderId`, optional `captureId`, optional `eventId`.

`reconcilePayPalCapture`:

- Requires `emergencyKillSwitch` `PAYMENT_MUTATION`
- Calls `payPalProvider.getPaymentStatus` then `getTransaction`
- Rejects non-completed orders (`PAYMENT_UNVERIFIED`)
- Amount/currency taken from provider capture
- Caller `deliveryContext` ignored; **no delivery unlock on this path**
- Overpayment returns review-required without silent unlock

Live unauthenticated verify: `401`.  
Forged capture regression: **3/3** — invoice unchanged, `PAYMENT_UNVERIFIED`.

---

### SYN-BUG-003 — CLOSED

**Claim tested:** refund / reversal / dispute must not treat PayPal `custom_id` as `projectId`; must preserve historical capture; must revoke delivery.

Webhook maps `custom_id` as `paymentRequestId`. Compensating ledger rows are appended (`metadata.role = COMPENSATING`). Original `succeeded` capture is not rewritten. Refund/reversal unwind invoice paid amount. Dispute suspends delivery without unwinding paid amount. `revokeDeliveriesForFinancialEvent` uses `listDeliveriesByInvoice`. Duplicate refund id is idempotent.

Regression: `test_syn_bug_003_refund_delivery_revocation.ts` **5/5**.

---

## Confirmed findings (post-remediation)

### SYN-FIN-001

**SEVERITY:** HIGH  
**STATUS:** CONFIRMED

**Title:** Handover payment reconcile still treats caller amount + fake capture as verified PayPal settlement, including during `EMERGENCY_STOP`.

**Reproduction**

1. Authenticated HTTP is required (`POST /api/handover/payment/reconcile` → 401 without session/token). This is **not** an unauthenticated bypass.  
2. In-process, with kill switch transitioned to `EMERGENCY_STOP` (`PAYMENT_MUTATION` policy = blocked):  
   - Created unpaid invoice  
   - Called `handoverService.reconcileFinalPayment({ invoiceId, amountPaidMinor: 1, providerTransactionId: "FORGED-CAPTURE-NOT-FROM-PAYPAL" })`  
3. Observed:  
   - `newlyReconciled: true`  
   - invoice `status: "paid"`, `amountPaid: 1`  
   - payment `status: "verified"`  
   - `notes: "Authenticated final milestone settlement via PayPal API."`  
   - **No PayPal provider call**  
4. Contrast: `approveProductionDeployment` under the same stop returned `EMERGENCY_STOP_BLOCKED`.  
5. Kill switch restored to `NORMAL`. Throwaway invoice/payment rows stripped.

**Root cause**

`handoverService.reconcileFinalPayment` writes a verified PayPal payment from the HTTP/body arguments. It does not call `payPalProvider`. It does not call `emergencyKillSwitch` or `privilegedActionFirewall`. Remaining receivable is hardcoded `8800000`.

The HTTP route passes `body` straight through after `denyUnlessAuthenticated`.

**Affected files**

- `src/lib/services/handover/handover.service.ts` (`reconcileFinalPayment`)  
- `src/app/api/handover/payment/reconcile/route.ts`

**Security impact**

Anyone holding a valid operator bearer or session can mark an operational invoice paid with a forged capture id and an arbitrary amount, including while emergency stop is active. The ledger note asserts PayPal API authentication that did not occur.

**Business impact**

False “fully paid” state on the operational invoice store (`.invoices_cache.json` / invoice repository). This is a second payment authority beside the remediated PayPal reconcile path. Receivables, handover readiness, and any downstream logic that trusts `invoice.status === "paid"` can be wrong.

This is **not** a reopening of SYN-BUG-002 (that verify path is closed). It is the remaining caller-supplied payment write on a different route.

---

### SYN-FIN-002

**SEVERITY:** HIGH  
**STATUS:** CONFIRMED

**Title:** DNS cutover skips emergency stop and privileged-action firewall, and writes fabricated DNS/TLS/health evidence.

**Reproduction**

1. Unauthenticated `POST /api/production-release/dns/cutover` → `401` (HTTP boundary holds).  
2. Under `EMERGENCY_STOP`, `isOperationAllowed("DEPLOYMENT")` = blocked.  
3. `productionReleaseService.approveDNSCutover({ releaseId: "REL-AUDIT-DOES-NOT-EXIST", domainName: "forged.example.com" })` returned **`Release not found`**, not `EMERGENCY_STOP_BLOCKED`.  
4. Control: `approveProductionDeployment` on the same stop **did** return `EMERGENCY_STOP_BLOCKED` (kill switch is first in that function).

Therefore the DNS path never consults the kill switch. A real `releaseId` would proceed to persist domain + release updates while stop is active.

Code also writes, without a DNS or Vercel provider call:

- `ownershipStatus: "verified"`, `verificationStatus: "verified"`  
- `customDomainHttp: 200`, fabricated Let’s Encrypt TLS text  
- `postCutoverBrowserHealth: "PASS"`  
- fabricated MX/TXT snapshots and a contact-form success note to `sales@apexlogistics.com`

**Root cause**

`approveDNSCutover` has no `emergencyKillSwitch` and no `privilegedActionFirewall` call. Evidence fields are constants / concatenations, not provider results.

**Affected files**

- `src/lib/services/production-release/production-release.service.ts` (`approveDNSCutover`)  
- `src/app/api/production-release/dns/cutover/route.ts` (auth only)

**Security impact**

Authenticated operator (or stolen session) can record a verified DNS cutover during emergency stop. Subsequent `confirmProductionLive` can be driven by false “verified” DNS/health state.

**Business impact**

False production-cutover evidence. Operators and later automation can treat a domain as live/verified when no DNS change was proven.

---

### SYN-FIN-003

**SEVERITY:** HIGH  
**STATUS:** CONFIRMED

**Title:** Unauthenticated GET of operator approval pages serializes the approval-control store into the HTML/RSC payload.

**Reproduction** (no cookie):

| URL | Result |
|---|---|
| `GET /finance` | 200, “Checking operator session…”, no invoice payload |
| `GET /billing` | 200, gate spinner only, **no** `INV-2026-001` |
| `GET /approvals` | 200, 58165 bytes, gate spinner **and** RSC `requests:[{approvalRequestId:"APPR-DEPLOY-001", organizationId:"ORG-CASILI-01", ... requestType:"PRODUCTION_DEPLOYMENT", proposedAction:"Promote verified build artifact to live production domain https://sindous.ph", ...}]` plus persisted `APPR-*` ids |
| `GET /approvals/APPR-DEPLOY-001` | 200, 16634 bytes: proposed action, `sindous.ph`, `SNAP-SINDOUS-FINAL`, truncated source hash |

`/api/approvals/approve` without auth remains `401`. This is **read** disclosure, not an unauthenticated mutate.

**Root cause**

`/approvals` and `/approvals/[approvalRequestId]` are Server Components that read `approvalControlRepository` / `approvalControlService` at render time. `OperatorSessionGate` is a client component: on SSR it renders a spinner and does not display children, but Next.js still executes the Server Component page and embeds the Flight/RSC payload in the document. There is no server-side session check on HTML routes.

**Affected files**

- `src/app/approvals/page.tsx`  
- `src/app/approvals/[approvalRequestId]/page.tsx`  
- `src/components/layout/OperatorSessionGate.tsx`  
- `src/components/layout/RootChrome.tsx`  
- persisted approval-control data (seed `APPR-DEPLOY-001` plus runtime `APPR-*`)

**Security impact**

Any anonymous client who can reach the dashboard origin learns operator approval inventory: request types, production domain intent, snapshot ids, hashes, org/project/workflow ids, statuses. That is reconnaissance against the privileged control plane.

**Business impact**

Confidential operator workflow and production-promotion intent is public on the wire. Client-gated API auth does not cover this surface.

---

### SYN-FIN-004

**SEVERITY:** MEDIUM  
**STATUS:** CONFIRMED

**Title:** `approveProductionDeployment` records a hardcoded production URL and fabricated health evidence without calling Vercel.

**Reproduction**

Inspect `approveProductionDeployment` after the HTTP/firewall/kill-switch gates:

```text
providerDeploymentId = dpl_prod_<timestamp>
productionUrl = https://apex-logistics-prod.vercel.app
healthEvidence.httpStatus = 200
tlsStatus = VALID
homepageRender = SUCCESS
```

No `vercelDeploymentProvider` (or equivalent) call on this path. Contrast: `deploymentService.approveDeployment` *does* call `vercelDeploymentProvider.deployPreview`.

HTTP: unauthenticated approve → 401. Kill switch: blocked (reproduced). Firewall: evaluated with authenticated `actorRole`.

**Root cause**

The function persists synthetic provider evidence after authorization succeeds. Authorization is not the same as provider confirmation.

**Affected files**

- `src/lib/services/production-release/production-release.service.ts` (`approveProductionDeployment`)

**Security impact**

An authorized operator action still creates false “deployed + healthy” state. That state is used as if it were live evidence (`WAITING_DNS_APPROVAL`, later confirm-live metadata).

**Business impact**

Operators can believe a production candidate is on Vercel at `apex-logistics-prod.vercel.app` when no deployment occurred. Integrity of the release record is not tied to the provider.

---

### SYN-FIN-005

**SEVERITY:** MEDIUM  
**STATUS:** CONFIRMED

**Title:** Several privileged mutation paths skip `emergencyKillSwitch` (and often the firewall) after HTTP auth.

**Reproduction**

| Path | During `EMERGENCY_STOP` | Kill switch consulted? |
|---|---|---|
| `approveProductionDeployment` | `EMERGENCY_STOP_BLOCKED` | Yes |
| PayPal `reconcilePayPalCapture` / refund / reversal | (code: first statement is kill check) | Yes |
| `sourceDeliveryService.processPaymentAndAuthorizeDelivery` | (code: first statement is kill check) | Yes |
| `approveDNSCutover` | `Release not found` (not stop) | **No** — see SYN-FIN-002 |
| `handoverService.reconcileFinalPayment` | invoice marked **paid** | **No** — see SYN-FIN-001 |
| `invoiceService.verifyPayment` | `Payment not found` (not stop) | **No** |
| `POST /api/invoices/payments/record` | (code: `recordPayment` has no kill check) | **No** |
| `POST /api/invoices/payments/reverse` | (code: no kill check) | **No** |
| `POST /api/deployment/approve` → `deploymentService.approveDeployment` | (code: no kill check; **does** call Vercel) | **No** |
| `POST /api/approvals/approve` | (code: no kill check; outreach send) | **No** |

`verifyPayment` during stop returning “Payment not found” proves the stop is not the first gate: a real `pending_verification` payment would verify.

**Root cause**

Kill switch is implemented per service method, not as a mandatory HTTP/policy wrapper. Several mutation routes only call `denyUnlessAuthenticated`.

**Affected files**

- `src/lib/services/invoices/invoice.service.ts` (`verifyPayment`, `recordPayment`, reverse)  
- `src/app/api/invoices/payments/verify/route.ts`  
- `src/app/api/invoices/payments/record/route.ts`  
- `src/app/api/invoices/payments/reverse/route.ts`  
- `src/lib/services/deployment.service.ts` (`approveDeployment`)  
- `src/app/api/deployment/approve/route.ts`  
- `src/app/api/approvals/approve/route.ts`  
- plus SYN-FIN-001 / SYN-FIN-002 files

**Security impact**

Emergency stop does not actually freeze all privileged mutations. Preview Vercel deploy, manual invoice verify/record, outreach approval, handover pay, and DNS cutover can still run.

**Business impact**

Incident response that relies on `EMERGENCY_STOP` can still move money-adjacent state, preview deploys, and DNS records.

Health/audit: `/api/ai/health` is operator-authenticated (401 anonymous). It does not go through `DEPLOYMENT`/`PAYMENT_MUTATION` blocks. Authenticated health/audit remain reachable as intended by the post-001 design.

---

### SYN-FIN-006

**SEVERITY:** MEDIUM  
**STATUS:** CONFIRMED

**Title:** Public `/client/billing` renders the persisted Phase 63 billing store (`billing.repository` / `.data/billing-ledger.json`) with no client identity.

**Reproduction**

`GET /client/billing` (no cookie) → 200, 88213 bytes, HTML contains `INV-2026-001`, `FULLY_PAID`, `PRJ-SINDOUS-01`, PHP amounts.

`RootChrome.isPublicChromePath` skips `OperatorSessionGate` for `/client*`. The page imports `billingRepository.listInvoices` for hardcoded `ORG-CASILI-01` / `client_sindous`. That is the same repository the operator `/billing` page uses (operator HTML is gated; this URL is not).

`GET /api/invoices/list` on the same origin without auth → `401`. Fixture IDs on client URLs **do not** authorize operator APIs.

**Root cause**

Client portal is explicitly unauthenticated. `/client/billing` is not fixture-only in-memory UI: it reads the on-disk billing ledger.

**Affected files**

- `src/app/client/billing/page.tsx`  
- `src/lib/repositories/billing.repository.ts`  
- `src/components/layout/RootChrome.tsx`

**Security impact**

Unauthenticated read of commercial invoices/milestones/receipts stored in the Phase 63 ledger. Not an API write. Not a SYN-BUG-001 bypass.

**Business impact**

Anyone who can load the app origin can view that ledger. If operators later write live invoices into this store, they become public on `/client/billing`.

**Related (not this bug):** `CLIENT_AUTH_NOT_IMPLEMENTED` — see Non-bugs / not implemented.

---

## Approval stack

**Determination: B — two real approval authorities exist.**

| Stack | Store | HTTP | Kill switch / firewall | Used by |
|---|---|---|---|---|
| A | `approval.repository` | `POST /api/approvals/approve` (operator auth) | Neither | `TaskContext` / outreach; hardcoded fallbacks `PLT-SINDOUS-PILOT`, `ORG-SINDOUS-BUILDING` |
| B | `approval-control.repository` | **No API route** | Yes, on `processDecision` | `/approvals` Server Components (hardcoded `ORG-CASILI-01`) |

Stack A does not call `productionReleaseService` or PayPal. Approving `APR-*` does not approve `APPR-DEPLOY-001`. IDs and stores do not alias.

**Exploitability:** no reproduced path where A authorizes a B-gated production/payment action, or the reverse.

**Classification:** **NOT_A_BUG** as an authorization-inconsistency exploit. Dual domain is real and confusing; SYN-FIN-003 is the confirmed defect on stack B (unauthenticated read). SYN-FIN-005 covers stack A missing kill switch.

---

## Billing authority

**Operational PayPal / AR (authoritative for SYN-BUG-002/003):**

`payPalProvider` → `paymentRequestRepository` transactions → `invoiceRepository` balances.

After 002/003, that chain is provider-led on the verify/webhook paths.

**Phase 63 commercial ledger (separate):**

`billing.repository` (`.data/billing-ledger.json`) + `financialReconciliationService` (reconciles *that* ledger to *those* invoices).

**Handover (SYN-FIN-001)** writes `invoiceRepository` without PayPal.

Two stores exist. They are not kept in lockstep. I did **not** reproduce a privileged action that reads store A as paid while store B is unpaid (or the reverse) and then unlocks delivery. Duplication alone is **NOT_A_BUG**. SYN-FIN-001 is the confirmed false write into the operational invoice store. SYN-FIN-006 is unauthenticated read of the Phase 63 store.

`paymentVerificationService.verifyProjectPayment` trusts caller `paidAmountMinor` and is **not** wired to an HTTP route (`processPaymentAndAuthorizeDelivery` has no route caller in `src/`). **SPECULATIVE** for HTTP; not confirmed.

---

## Workflow durability

**STATUS:** NO_CONFIRMED_BUG_FOUND

`workflowEventRepository` is append-only (hash chain). Replay reconstructs `activeWorkItems`; `WORK_COMPLETED` removes an item from the active set but does not delete the event. Phase 59 test 40: crash → restart → reconstruct → resume. **40/40 PASS**.

No reproduced case of a completed task disappearing from the event log on replay.

---

## Client portal

**CLIENT_AUTH_NOT_IMPLEMENTED** — explicit. Not converted to PASS.

| Surface | What it is |
|---|---|
| `/client`, `/client/projects/[id]`, handoff, changes | Hardcoded Sindous fixture UI (`CLI-SINDOUS-01`, `PRJ-SINDOUS-01`, local React state, “Authenticated Session” is copy) |
| `/client/projects/.../review` | Reads `clientReviewRepository` with hardcoded `ORG-CASILI-01` — fixture/collaboration store, no client session |
| `/client/billing` | **SYN-FIN-006** — persisted ledger, not just in-page constants |
| Client → `/api/*` operator routes | **401** (session test 9–10; live probes) |
| `classifyApiPath` `CLIENT_AUTHENTICATED` | Declared, **never assigned**. All `/api/*` except auth/webhook/embed are operator-authenticated |

Fixture IDs on client URLs cannot call operator APIs. They can render fixture/collaboration/billing-store data because those pages are public chrome.

**Do not treat incomplete client login as a vulnerability by itself.** SYN-FIN-006 is classified because it exposes the operator-used billing ledger, not because client auth is missing in the abstract.

---

## API surface (post-001)

- No live unauthenticated operator API found.  
- Forged bearer, forged cookie, forged role, forged org/project query without a valid principal: rejected.  
- Client/worker attempting operator API: no such HTTP identities are issued → 401.  
- Hardcoded fallbacks remain **inside** authenticated handlers (e.g. approvals/approve org/pilot ids). That is operator-authorized data defaulting, not anonymous identity.  
- Query-only tenant check: if `SYNAPSE_OPERATOR_ORGANIZATION_ID` is unset, `denyScopeMismatch` is a no-op. **SPECULATIVE** unless that env is empty in a given deployment.  
- POST body `organizationId` is not compared in the central gate. **SPECULATIVE** without a shown identity change.  
- Public: `/api/auth/login|logout|session`, `/api/payments/paypal/webhook` (signed), `/api/agreements/signing/embed-url` (Dropbox Sign `signatureId` capability). Fake `signatureId` → 500 from provider, not 401. Dropbox `clientId` would be returned on success (typical public embed id). **NOT_A_BUG** for the public-embed design.

---

## Privileged services / emergency stop

Covered by SYN-FIN-001, 002, 004, 005.

Also checked:

- `developer-agent.service` SOURCE_MUTATION: has kill switch (inspect).  
- `sourceDeliveryService`: has kill switch + firewall (inspect). Download enforces clientId/org match and blocks non-authorized statuses (inspect). No public download HTTP route found.  
- `review-attachment.repository.validateAttachment`: rejects `..` / `/` / `\` in filenames (inspect). Not live-abused.  
- Direct in-process `actorRole = "OPERATOR"` defaults remain on some service signatures. HTTP production-release routes now pass principal role. In-process callers (tests/fixtures) can still inherit OPERATOR. **Not an HTTP bypass.** SPECULATIVE / test-harness.

---

## Secrets

| Location | Classification |
|---|---|
| Production source reads `process.env` for PayPal, Gmail, operator token/password, session secret | Expected. Not hardcoded live values in login/gate HTML |
| `/login` HTML/JS | No `SYNAPSE_OPERATOR_TOKEN` / `SYNAPSE_OPERATOR_PASSWORD` |
| Session JSON | Principal only |
| Phase 49 sentinel `SYN-TEST-SENTINEL-NOT-A-REAL-SECRET` | Test fixture, not a real secret |
| Logs policy `SECRETS_NEVER_IN_LOGS` | Scanner concern, not a live dump in this pass |
| `.env.local` | Environment file (not reproduced into this report) |

**No confirmed production-source secret leak into browser HTML.**

---

## Notifications as authority

`notificationService.draftNotification` creates `WAITING_HUMAN_APPROVAL` drafts. No invoice, deployment, or approval mutation from notification create.

Live unsigned PayPal webhook cannot credit an invoice.

**STATUS:** NOT_A_BUG (notifications are not authority).

---

## File / artifact access

- Operator artifact APIs: 401 without session.  
- Cross-tenant API with bound operator org: blocked in session tests 6–8.  
- Client download in `sourceDeliveryService.downloadSourcePackage`: tenant check + status + hash; no HTTP route found to invoke it anonymously.  
- Stale/mutated package: hash mismatch invalidates delivery (inspect).  

**STATUS:** NOT_REPRODUCED for unauthenticated/cross-tenant HTTP artifact theft.

---

## Other classifications

### NOT_REPRODUCED

- Unauthenticated operator API mutate/list (SYN-BUG-001 class)  
- Caller-supplied PayPal verify amount/capture/delivery unlock (SYN-BUG-002 class)  
- Refund/dispute leaving delivery downloadable / mutating historical capture in place (SYN-BUG-003 class)  
- Dual approval stores cross-authorizing production deploy  
- Notification-only payment or deploy  
- Completed workflow task deleted on replay  
- Operator token/password in browser HTML  
- Client URL invoking operator APIs  

### SPECULATIVE (not confirmed)

- Unscoped operator (`SYNAPSE_OPERATOR_ORGANIZATION_ID` unset) listing all tenants  
- Login `next` open-redirect (`startsWith("/")` allows `//host`) — not exercised  
- `paymentVerificationService` caller amounts if an HTTP wrapper is added later  
- Operator pages hardcoded `ORG-CASILI-01` displaying Casili data to an operator bound to another org (UI only; APIs 403 when bound)  
- Login brute-force (no rate limit) as a practical online attack  

### NOT_A_BUG

- Dual approval domains without a reproduced authz collision  
- Two billing stores without a reproduced inconsistent privileged action (the false *write* is SYN-FIN-001; the public *read* is SYN-FIN-006)  
- Stateless HMAC logout (cookie clear; no server revocation list)  
- `Secure` cookie false outside `NODE_ENV=production`  
- Public signed PayPal webhook  
- Test secret sentinels  
- `/api/ai/health` requiring operator auth (intentional after 001)  

### NOT_IMPLEMENTED

- **CLIENT_AUTH_NOT_IMPLEMENTED** — no client HTTP session, no `CLIENT_AUTHENTICATED` routes  
- Login rate limiting  
- Server-side session revocation / rotation store  
- Client identity on `/client/*` pages  

---

## Counts

| Metric | Count |
|---|---|
| **CONFIRMED_BUG_COUNT** | **6** |
| **CRITICAL_COUNT** | **0** |
| **HIGH_COUNT** | **3** (SYN-FIN-001, SYN-FIN-002, SYN-FIN-003) |
| **MEDIUM_COUNT** | **3** (SYN-FIN-004, SYN-FIN-005, SYN-FIN-006) |
| **LOW_COUNT** | **0** |
| **NOT_REPRODUCED_COUNT** | **8** (classes listed above) |
| **SPECULATIVE_COUNT** | **5** |
| **NOT_IMPLEMENTED_COUNT** | **4** |

### Prior IDs

| ID | Status |
|---|---|
| SYN-BUG-001 | **CLOSED** |
| SYN-BUG-002 | **CLOSED** |
| SYN-BUG-003 | **CLOSED** |

---

## V1 status

**V1_REMEDIATION_REQUIRED**

Not `V1_OPERATIONAL_BASELINE_RESTORED`.

Reasons:

1. Operational invoices can still be marked paid with a forged “PayPal API” note while emergency stop is on (SYN-FIN-001).  
2. DNS cutover and several other privileged mutations ignore emergency stop (SYN-FIN-002, SYN-FIN-005).  
3. Anonymous GET `/approvals` dumps the production-approval control store (SYN-FIN-003).  
4. Production-release approve still fabricates provider health (SYN-FIN-004).  
5. Client billing ledger is public (SYN-FIN-006).  
6. **CLIENT_AUTH_NOT_IMPLEMENTED** remains documented incomplete functionality — not a PASS.

The HTTP authentication boundary, PayPal verify authority, and refund/dispute delivery chain that were named SYN-BUG-001/002/003 are closed on evidence. That is necessary and not sufficient for an operational baseline.

---

## Finding index

| ID | Severity | Status |
|---|---|---|
| SYN-BUG-001 | (prior critical) | CLOSED |
| SYN-BUG-002 | (prior critical) | CLOSED |
| SYN-BUG-003 | (prior critical) | CLOSED |
| SYN-FIN-001 | HIGH | CONFIRMED |
| SYN-FIN-002 | HIGH | CONFIRMED |
| SYN-FIN-003 | HIGH | CONFIRMED |
| SYN-FIN-004 | MEDIUM | CONFIRMED |
| SYN-FIN-005 | MEDIUM | CONFIRMED |
| SYN-FIN-006 | MEDIUM | CONFIRMED |
| Dual approval stacks | — | NOT_A_BUG (no cross-authz exploit); see SYN-FIN-003/005 |
| Dual billing stores | — | NOT_A_BUG as duplication; writes/reads classified above |
| Workflow replay loss | — | NO_CONFIRMED_BUG_FOUND |
| CLIENT_AUTH_NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| Notification as authority | — | NOT_A_BUG |
| Secret leak in HTML | — | NOT_REPRODUCED |
