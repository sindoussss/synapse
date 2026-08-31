# SYNAPSE V1.0 INDEPENDENT BUG AUDIT REPORT

**Auditor:** Independent V1.0 SYNAPSE Bug Auditor  
**Scope:** Read-only inspection of the evaluated repository at `C:\Users\user\.gemini\antigravity\scratch\autonomous-biz-dashboard`  
**Date:** 31 August 2026  
**Method:** INVESTIGATE → REPRODUCE → ROOT CAUSE → REPORT  
**Constraint:** No product code was modified. No fixes were implemented. No certification is issued.

Live HTTP reproduction used the already-running local instance at `http://localhost:3010`. No PayPal capture was completed, no invoice was marked paid, and no production release was approved during this audit. One unauthenticated `POST /api/payments/paypal/verify` probe with a fake capture ID was issued against an already-paid invoice; the overpayment gate returned `requiresReview: true` and did not persist a transaction.

This report does not certify SYNAPSE as secure. Absence of a finding in a subsystem means no confirmed defect was proven there, not that the subsystem is safe.

---

## EXECUTIVE SUMMARY

SYNAPSE V1.0 contains working service-layer gates (PayPal webhook signature verification, overpayment block, currency mismatch block, capture-id dedup, kill-switch checks on some privileged methods, source-delivery tenant check on download). Those gates are not sufficient, because the HTTP boundary does not authenticate callers, several privileged services default the actor to `OPERATOR`, and some claimed remediations are not actually invoked.

Three independent critical defects were confirmed:

1. **The entire `/api/*` tree is callable without credentials.** Live GETs returned tenant projects, invoices, PayPal order IDs, and organization records with HTTP 200. POST mutations return HTTP 400 on missing fields, not 401.
2. **`POST /api/payments/paypal/verify` reconciles payment from the caller body and never asks PayPal.** `getPaymentStatus()` / `getTransaction()` exist and are unused. Combined with caller-supplied `deliveryContext` approval flags, this can mark an invoice paid and authorize source delivery without PayPal evidence.
3. **Refund and dispute webhooks cannot revoke source delivery in the production path.** PayPal `custom_id` is the payment-request ID. The webhook passes that value as `projectId`. Delivery lookup misses. Invoice `amountPaid` / `status` are not unwound.

Additional high-severity defects: operator-signature spoofing via `role` in the request body; production-release records fabricated Vercel/DNS/health evidence for the wrong tenant; client portal pages are hardcoded fixtures wrapped in the operator shell; two billing ledgers do not share a source of truth; kill switch and privileged-action firewall are absent from several mutation paths that the research catalog claims they cover.

This audit did not manufacture findings to fill sections. Several requested attack areas produced `NO_CONFIRMED_BUG_FOUND`.

---

## CONFIRMED BUGS

### SYN-BUG-001

**TITLE:** HTTP API surface has no authentication or caller-identity binding  
**SEVERITY:** CRITICAL

**AFFECTED FILES:**
- All 133 handlers under `src/app/api/**/route.ts` (none read a session, cookie, bearer token, or org claim)
- No `middleware.ts` or `proxy.ts` exists
- `src/lib/services/client/client-auth.service.ts` (hardcoded tokens; never imported elsewhere)
- `src/lib/services/operations/authorization.service.ts` (never imported elsewhere)
- `src/lib/services/security/project-isolation.service.ts` (runtime usage is test-only)
- `src/app/layout.tsx` (no auth gate)
- Representative: `src/app/api/projects/list/route.ts`, `src/app/api/invoices/list/route.ts`, `src/app/api/invoices/get/route.ts`, `src/app/api/organizations/list/route.ts`, `src/app/api/payments/paypal/request/list/route.ts`, `src/app/api/agreements/get/route.ts`

**AFFECTED WORKFLOW:** Authentication, authorization, tenant isolation, project isolation, every operator and client API.

**PRECONDITIONS:** The Next.js app is reachable on the network (confirmed on `localhost:3010`).

**REPRODUCTION STEPS:**
1. From a client with no cookies or Authorization header, request `GET /api/projects/list`.
2. Request `GET /api/invoices/list`.
3. Request `GET /api/invoices/get?id=INV-43-1309`.
4. Request `GET /api/organizations/list`.
5. Request `GET /api/payments/paypal/request/list`.
6. Request `POST /api/production-release/approve` with `{}`.

**EXPECTED BEHAVIOR:** Unauthenticated callers receive 401/403. Authenticated callers are scoped to their tenant. Isolation services are enforced at the HTTP boundary.

**ACTUAL BEHAVIOR (live, 31 August 2026, `localhost:3010`):**
- `GET /api/projects/list` → 200, project `PRJ-3052` / Apex Logistics contract value PHP 88,000.00, paid/outstanding minor units, agreement document hash.
- `GET /api/invoices/list` and `GET /api/invoices/get?id=INV-43-1309` → 200, Sindous invoice, client email `sindousbuilding@gmail.com`, amounts.
- `GET /api/organizations/list` → 200, multiple tenant orgs (Pacific Crest Energy, AeroFreight Logistics, Starlight Health Systems, …).
- `GET /api/payments/paypal/request/list` → 200, PayPal sandbox order `6KJ75889LX4599259`, checkout URL, invoice binding, `amountMinorUnits: 8800000`.
- `POST /api/production-release/approve` with `{}` → 400 (missing `releaseId`), not 401.

**ROOT CAUSE:** There is no HTTP authentication layer. Security services that exist (`clientAuthService`, `authorizationService`, `projectIsolationService`) are not wired to routes. Repository `callerOrgId` filters are optional and APIs never pass them.

**SECURITY IMPACT:** Any network client is privilege-equivalent to an operator for every exposed route. Cross-tenant IDOR is the default, because there is no caller tenant.

**BUSINESS IMPACT:** Disclosure of contracts, invoices, PayPal order IDs, client emails, and the ability to invoke privileged mutations (see SYN-BUG-002, SYN-BUG-004, SYN-BUG-005).

**REGRESSION RISK:** High. Adding middleware later without binding `actorRole` into services will not close SYN-BUG-004.

**RECOMMENDED FIX:** Do not implement in this audit. Introduce a real session at the HTTP boundary; reject unauthenticated requests; derive tenant/role from the session only; pass `callerOrgId` and `actorRole` into every privileged service; fail closed when identity is missing. Delete or rotate the hardcoded `token-sindous-01` / `token-aura-01` values.

---

### SYN-BUG-002

**TITLE:** PayPal capture reconciliation trusts caller-supplied amounts and can authorize source delivery without PayPal evidence  
**SEVERITY:** CRITICAL

**AFFECTED FILES:**
- `src/app/api/payments/paypal/verify/route.ts` (forwards entire JSON body)
- `src/lib/services/payments/paypal.service.ts` (`reconcilePayPalCapture`, lines 126–292)
- `src/lib/services/payments/paypal.provider.ts` (`getPaymentStatus`, `getTransaction` defined and unused by reconciliation)
- `src/lib/services/delivery/source-delivery.service.ts` (`processPaymentAndAuthorizeDelivery` trusts `clientApprovalExists` / `operatorApprovalExists` booleans)

**AFFECTED WORKFLOW:** Payment, invoice paid-state, source delivery unlock.

**PRECONDITIONS:** A payment request exists with a PayPal `providerRequestId` (order ID). Order IDs are listable via SYN-BUG-001 (`GET /api/payments/paypal/request/list`). Invoice must have remaining `balanceDue` for a full paid transition.

**REPRODUCTION STEPS:**
1. `GET /api/payments/paypal/request/list` (no auth) and copy `providerRequestId`.
2. `POST /api/payments/paypal/verify` with no PayPal signature:
   ```json
   {
     "orderId": "<providerRequestId>",
     "captureId": "FAKE-AUDIT-CAP",
     "amountMinorUnits": <invoice.balanceDue>,
     "currency": "PHP",
     "deliveryContext": {
       "projectId": "...",
       "organizationId": "...",
       "workspaceId": "...",
       "clientId": "...",
       "releaseCandidateId": "...",
       "snapshotId": "...",
       "sourceHash": "...",
       "manifestHash": "...",
       "files": { "app/page.tsx": "..." },
       "clientApprovalExists": true,
       "operatorApprovalExists": true
     }
   }
   ```
3. Observe invoice `status: paid` and `deliveryResponse.status: DELIVERY_AUTHORIZED` when balance is covered.

**Live probe (already-paid invoice, so unlock was correctly blocked by overpayment):**  
`POST /api/payments/paypal/verify` with `orderId=6KJ75889LX4599259`, `captureId=FAKE-AUDIT-CAP`, `amountMinorUnits=1`, `currency=PHP` returned HTTP 200:

- `requiresReview: true`
- `reviewReason: PAYMENT_AMOUNT_REVIEW_REQUIRED: Captured amount (1) exceeds remaining balance (0)`
- Full invoice body including client email returned to the unauthenticated caller

PayPal was never contacted. The fake capture ID was accepted far enough to run reconciliation logic.

**EXPECTED BEHAVIOR:** Manual verify, if it exists at all, must be operator-authenticated and must re-fetch the capture from PayPal (`getTransaction(captureId)`) and match order, amount, currency, environment, and invoice binding. Approval flags must be read from the approval store, not the request body. Delivery must not unlock from a forged capture.

**ACTUAL BEHAVIOR:** `reconcilePayPalCapture` never calls `payPalProvider.getPaymentStatus` or `getTransaction`. Amount, currency, capture ID, and `deliveryContext` (including approval booleans and file map) are caller-supplied. Webhook path does not pass `deliveryContext`; the verify route does.

**ROOT CAUSE:** Verify is a public alias of reconcile. Reconcile treats the HTTP body as PayPal evidence. Delivery authorization is gated on those caller booleans, not on stored approvals.

**SECURITY IMPACT:** Forged payment + forged approvals → source package authorization and invoice `paid` without settlement.

**BUSINESS IMPACT:** Source delivery of client work without payment; corrupted AR; false paid receipts.

**REGRESSION RISK:** High. Capture-id dedup (`paypal.service.ts` 172–177) will treat a forged capture ID as authoritative if it lands first, then ignore a later real PayPal capture with a different ID.

**RECOMMENDED FIX:** Remove or operator-gate `/api/payments/paypal/verify`. Require a live PayPal capture fetch before any invoice mutation. Bind delivery to invoice.project/client and to stored approval records for the current snapshot. Do not accept `clientApprovalExists` from the client.

---

### SYN-BUG-003

**TITLE:** Refund, reversal, and dispute webhooks do not revoke source delivery or unwind invoice balances  
**SEVERITY:** CRITICAL

**AFFECTED FILES:**
- `src/app/api/payments/paypal/webhook/route.ts` (lines 43–64)
- `src/lib/services/payments/paypal.service.ts` (`handleRefundWebhook`, `handleReversalWebhook`, lines 294–358)
- `src/lib/services/payments/paypal.provider.ts` (order `custom_id` set from `params.customId`)
- `src/lib/services/payments/paypal.service.ts` line 101 (`customId: req.id`)
- `src/lib/services/invoices/invoice.service.ts` (`reversePayment` updates invoice, never touches delivery)

**AFFECTED WORKFLOW:** Refund, reversal, dispute, source delivery revocation, invoice AR.

**PRECONDITIONS:** A PayPal capture was reconciled, invoice is `paid`, and a source delivery record exists keyed by `projectId` (e.g. `PRJ-SINDOUS-01`).

**REPRODUCTION STEPS:**
1. Confirm order creation sets `custom_id` to the payment request ID (`PAY-REQ-…`), not the project ID (`paypal.service.ts:101`, `paypal.provider.ts:151–152`).
2. On `PAYMENT.CAPTURE.REFUNDED`, webhook calls `handleRefundWebhook({ projectId: resource?.custom_id })`.
3. `sourceDeliveryRepository.getDeliveryByProject("PAY-REQ-1313")` returns null.
4. Handler returns `{ status: "REFUNDED", deliveryRevoked: false }`.
5. Invoice `amountPaid` / `balanceDue` / `status` are never updated.
6. `createPaymentTransaction(tx)` is called on a mutated existing transaction object, appending a duplicate row instead of updating.

**EXPECTED BEHAVIOR:** A verified refund/reversal/dispute looks up the capture → payment request → invoice → project, sets invoice unpaid/partial, and revokes delivery by project/invoice/payment id. Subsequent download is blocked.

**ACTUAL BEHAVIOR:** Delivery remains `DELIVERY_AUTHORIZED` / `DOWNLOADED`. Invoice remains `paid`. Client portal fixture also continues to claim `FULLY_PAID` (SYN-BUG-008) independently of server state.

**ROOT CAUSE:** `custom_id` is used as a project identifier even though it stores `req.id`. Refund handling never walks the invoice relation. Research catalog Phase 40 note claims delivery revocation on refund/dispute; the webhook path does not implement that binding.

**SECURITY IMPACT:** Paid-access artifacts remain downloadable after money movement is reversed.

**BUSINESS IMPACT:** Unrecovered source after chargeback; AR overstated; false “paid” operational state.

**REGRESSION RISK:** High. Tests that pass `projectId: PRJ_A` directly into `handleRefundWebhook` will not catch this webhook mapping bug.

**RECOMMENDED FIX:** Resolve project from capture → transaction → invoice metadata. Revoke delivery by `invoiceId`/`paymentId`. Unwind invoice balances. Update the existing transaction in place; do not append a duplicate.

---

### SYN-BUG-004

**TITLE:** Privileged-action firewall and emergency kill switch are bypassed on multiple mutation paths; services default `actorRole` to `OPERATOR`  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/lib/services/production-release/production-release.service.ts` (`approveProductionDeployment`, `confirmProductionLive`, `rollbackRelease` default `actorRole = "OPERATOR"`; `approveDNSCutover` has neither firewall nor kill switch)
- `src/app/api/production-release/approve/route.ts`, `confirm-live/route.ts`, `rollback/route.ts`, `dns/cutover/route.ts`
- `src/lib/services/payments/paypal.service.ts` (imports `privilegedActionFirewall`, never calls `.evaluate()`)
- `src/lib/services/delivery/source-delivery.service.ts` (same dead import)
- `src/lib/services/developer/developer-agent.service.ts` (same dead import)
- `src/lib/services/invoices/invoice.service.ts` (`recordPayment` / `verifyPayment` / `reversePayment` — no kill switch, no firewall)
- `src/lib/services/handover/handover.service.ts` (`reconcileFinalPayment`)
- `src/lib/services/orchestration/work-orchestrator.service.ts` (`handleAutoRepair`)
- `src/lib/services/worker/worker-runtime.service.ts` (`executeWorkCycle`)
- `src/lib/research/catalog.ts` DEF-03 (claims firewall was embedded on PayPal approve and source delivery)

**AFFECTED WORKFLOW:** Deployment, DNS cutover, payment mutation, delivery, autonomous repair, kill switch.

**PRECONDITIONS:** Attacker can call HTTP (SYN-BUG-001) or any in-process caller can invoke the service.

**REPRODUCTION STEPS:**
1. `POST /api/production-release/approve` with `{ "releaseId": "<id>" }` — route does not pass `actorRole`; service defaults `"OPERATOR"`; firewall allows OPERATOR production deploy (`privileged-action-firewall.service.ts` 52–63, 195–199).
2. `POST /api/production-release/dns/cutover` — `approveDNSCutover` performs no `isOperationAllowed` and no `evaluate`.
3. `POST /api/invoices/payments/verify` during `EMERGENCY_STOP` — `verifyPayment` does not consult the kill switch.
4. Grep `privilegedActionFirewall.evaluate`: only production-release (3 methods) and the worker task adapter (DEPLOYMENT items). Not PayPal, not delivery, contradicting catalog DEF-03.

**EXPECTED BEHAVIOR:** Every privileged mutation fails closed unless the caller is a verified operator and the kill switch allows the operation type. Missing `actorRole` is denial, not OPERATOR.

**ACTUAL BEHAVIOR:** Unauthenticated HTTP inherits OPERATOR. DNS cutover, invoice verify, handover payment reconcile, auto-repair, and worker cycles do not honor `EMERGENCY_STOP`. Claimed firewall embedding on payment/delivery is a dead import.

**ROOT CAUSE:** Firewall/kill-switch were added at a subset of entry points. Default parameter `actorRole = "OPERATOR"` inverts fail-closed. HTTP never supplies identity.

**SECURITY IMPACT:** Kill switch can be bypassed through invoice, handover, DNS, and worker/orchestrator paths. AI/frontend callers are indistinguishable from operators at the HTTP boundary.

**BUSINESS IMPACT:** Emergency stop does not stop the business. Unauthorized production and payment mutations remain possible during incident response.

**REGRESSION RISK:** High. Phase 48/49 tests that pass `actorRole: "OPERATOR"` explicitly will stay green.

**RECOMMENDED FIX:** Remove OPERATOR defaults. Require `actorRole` from authenticated identity. Call firewall + kill switch at every privileged service entry (including DNS cutover, invoice verify/reverse, handover reconcile, auto-repair, worker cycle). Treat omitted contextual flags as fail (see SYN-BUG-015).

---

### SYN-BUG-005

**TITLE:** Agreement operator countersignature is selected by caller-supplied `role`  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/app/api/agreements/signing/sign/route.ts` (lines 7–17)

**AFFECTED WORKFLOW:** Agreement e-sign / operator countersignature.

**PRECONDITIONS:** A signing session exists in a state that accepts operator countersignature.

**REPRODUCTION STEPS:**
```
POST /api/agreements/signing/sign
{ "sessionId": "<valid-session>", "role": "operator" }
```
Any `role` other than `"client"` takes the operator branch. Live empty-body probe returned HTTP 400 `"Missing sessionId or role"`, not 401.

**EXPECTED BEHAVIOR:** Operator countersignature is bound to an authenticated operator session. Clients cannot set `role`.

**ACTUAL BEHAVIOR:** `role` is a JSON field. No identity check.

**ROOT CAUSE:** Route-level dispatch on an untrusted string.

**SECURITY IMPACT:** Forged operator signature on a commercial agreement.

**BUSINESS IMPACT:** Unenforceable or fraudulently “fully executed” contracts.

**REGRESSION RISK:** Medium. State-machine tests that call service methods with the correct role will not catch the HTTP spoof.

**RECOMMENDED FIX:** Derive signer side from the authenticated principal. Ignore body `role`.

---

### SYN-BUG-006

**TITLE:** Handover final-payment reconcile marks invoices verified without PayPal and uses a hardcoded contract total  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/app/api/handover/payment/reconcile/route.ts`
- `src/lib/services/handover/handover.service.ts` (`reconcileFinalPayment`, lines 289–354)

**AFFECTED WORKFLOW:** Handover, final invoice, payment verification.

**PRECONDITIONS:** An invoice ID is known (listable via SYN-BUG-001).

**REPRODUCTION STEPS:**
```
POST /api/handover/payment/reconcile
{ "invoiceId": "<id>", "amountPaidMinor": 8800000, "providerTransactionId": "FORGED-TXN" }
```
Service writes `status: "verified"`, `verifiedBy: "operator"`, notes `"Authenticated final milestone settlement via PayPal API."` with no PayPal HTTP call. Remaining receivable is computed against literal `8800000`.

**EXPECTED BEHAVIOR:** Final reconcile re-fetches PayPal (or another verified provider), matches invoice amount/currency, and does not hardcode a single contract.

**ACTUAL BEHAVIOR:** Caller-supplied amount and provider ID are treated as authenticated PayPal settlement. Notes assert a PayPal API call that does not occur.

**ROOT CAUSE:** Handover payment path is a separate, weaker stack from `paypal.service` reconcile.

**SECURITY IMPACT:** Unauthenticated elevation of invoice to paid (with SYN-BUG-001). False audit evidence.

**BUSINESS IMPACT:** Wrong remaining receivable for any contract that is not PHP 88,000.00. False “fully settled” handover.

**REGRESSION RISK:** Medium. Phase handover tests that seed 8,800,000 will pass.

**RECOMMENDED FIX:** Delete the fake PayPal note. Route final settlement through the same PayPal-verified reconcile as SYN-BUG-002’s intended design. Derive remaining receivable from actual invoices.

---

### SYN-BUG-007

**TITLE:** Production release records fabricated provider evidence, skips state checks, and hardcodes another tenant’s domain  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/lib/services/production-release/production-release.service.ts` (`approveProductionDeployment` lines 207–238, `approveDNSCutover` 253–308, `confirmProductionLive` 311–357)
- `src/app/api/production-release/approve/route.ts`
- `src/app/api/production-release/dns/cutover/route.ts`
- `src/app/api/production-release/confirm-live/route.ts`

**AFFECTED WORKFLOW:** Production deployment, DNS cutover, go-live confirmation, rollback eligibility.

**PRECONDITIONS:** A `releaseId` exists (listable via unauthenticated `GET /api/production-release/list`).

**REPRODUCTION STEPS:**
1. Call `approveProductionDeployment(releaseId)` with no prior status check.
2. Observe persisted `productionUrl: https://apex-logistics-prod.vercel.app`, fabricated `healthEvidence.httpStatus: 200`, `approvedBy: "operator"`, activity text “Deployed production candidate to Vercel”.
3. Grep `production-release` for `vercel.provider` — no import. No Vercel API call occurs.
4. Call `approveDNSCutover` / `confirmProductionLive` in any order; neither checks `release.status`. DNS `ownershipStatus: "verified"` is written without a lookup.
5. `confirmProductionLive` can run without DNS cutover.

**EXPECTED BEHAVIOR:** Deployment talks to the real provider, records real URLs and health checks, and only advances legal transitions. Project identity must match the release, not a hardcoded Apex Logistics host.

**ACTUAL BEHAVIOR:** Mock success is persisted as operational truth. State machine can skip `waiting_release_approval` → `waiting_dns_approval` → `verifying` → `live`. Kill switch is absent on DNS cutover (SYN-BUG-004).

**ROOT CAUSE:** Provider integration was stubbed; activity logs and health objects were written as if live. No transition table.

**SECURITY IMPACT:** Operators (or unauthenticated callers) can mark a project production-live with false TLS/HTTP evidence. Wrong-tenant URL can be attached to a Sindous (or any) release.

**BUSINESS IMPACT:** False go-live; DNS cutover “verified” without touching DNS; client/operator trust in production status is not evidence-backed.

**REGRESSION RISK:** High. Acceptance tests that assert `productionUrl` / HTTP 200 health without mocking Vercel will keep passing.

**RECOMMENDED FIX:** Call the Vercel provider (already fail-closed when unconfigured). Persist only returned URLs. Enforce a transition table. Bind domain/health to the release’s project.

---

### SYN-BUG-008

**TITLE:** Client portal is a hardcoded fixture that claims authenticated, paid, and delivered state; it is wrapped in the operator shell  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/app/client/page.tsx` (hardcoded Sindous, `FULLY_PAID`, `READY_FOR_DOWNLOAD`, “Authenticated Session”)
- `src/app/client/projects/[projectId]/page.tsx` (hardcoded hashes, PHP 88,000 paid, download button only sets React state)
- `src/app/client/projects/[projectId]/changes/page.tsx` (submit sets local `submitted`; no API)
- `src/app/client/projects/[projectId]/handoff/page.tsx` (hardcoded Sindous handoff)
- `src/components/layout/RootChrome.tsx` (only `/research` skips `AppShell`)
- `src/components/layout/AppShell.tsx` / `Sidebar.tsx` / `Header.tsx` / `src/context/TaskContext.tsx`

**AFFECTED WORKFLOW:** Client login, dashboard, review, billing, delivery, change requests, handoff.

**PRECONDITIONS:** Open `/client` or `/client/projects/ANY-ID` in a browser with no session.

**REPRODUCTION STEPS:**
1. Open `/client`. Page shows “Authenticated Session”, Client ID `CLI-SINDOUS-01`, payment `FULLY_PAID`, source “Verified & Ready” with no auth.
2. Open `/client/projects/PRJ-OTHER-TENANT`. Same Sindous fixture renders; `params.projectId` is only interpolated in breadcrumbs.
3. Click “Download Source Package”. Success copy appears; `downloadSourcePackage` is never called.
4. Submit a change request. Success copy “Status: SUBMITTED” appears; no repository write.
5. Observe operator sidebar (Overview, Agents, Tasks, Leads, Approvals) and operator TaskContext on the same chrome.

**EXPECTED BEHAVIOR:** Client portal authenticates, loads that client’s projects from the server, shows payment/delivery from authoritative records, and does not expose operator navigation or operator queues.

**ACTUAL BEHAVIOR:** Fixture UI contradicts server state. Dead buttons report success. Operator-only surfaces are visible on `/client`. `clientAuthService.isOperatorSurfaceAllowed` would return false, but it is never called.

**ROOT CAUSE:** Client routes were built as demonstration pages, then presented as the client portal. Root chrome does not split operator vs client.

**SECURITY IMPACT:** Misleading payment and delivery status. Operator queue counts and environment filter are visible on client URLs. No actual client isolation at the UI.

**BUSINESS IMPACT:** Clients cannot actually download source, pay, or file change requests through this UI. Operators may believe client workflows are live.

**REGRESSION RISK:** Medium. Visual QA of `/client` will look “complete.”

**RECOMMENDED FIX:** Split chrome by role. Bind client pages to authenticated session + server reads. Wire download/change-request/payment to the real services. Remove fixture paid/delivery claims.

---

### SYN-BUG-009

**TITLE:** Operational PayPal invoices and the Phase 63 billing ledger are unsynchronized sources of truth  
**SEVERITY:** HIGH

**AFFECTED FILES:**
- `src/lib/repositories/invoice.repository.ts` + `src/lib/services/payments/paypal.service.ts` (PayPal writes here)
- `src/lib/repositories/billing.repository.ts` + `src/lib/services/billing/payment-reconciliation.service.ts` (ledger, receipts, client billing UI)
- `src/app/client/billing/page.tsx` (reads `billingRepository` only)
- `src/app/api/invoices/list/route.ts` (reads `invoiceRepository` only)

**AFFECTED WORKFLOW:** Billing, receipts, client billing portal, PayPal capture, refund.

**PRECONDITIONS:** A PayPal capture is reconciled via `payPalService`.

**REPRODUCTION STEPS:**
1. Confirm `paypal.service.ts` never imports `billingRepository`.
2. Reconcile a PayPal capture → `invoice.repository` shows `paid`.
3. Open `/client/billing` → `billingRepository.listInvoices` is a different store; PayPal capture is absent from that ledger.
4. Process a billing-ledger refund via `payment-reconciliation.service` → source delivery is not revoked (no delivery integration).
5. Process a PayPal refund webhook → billing ledger is not updated (SYN-BUG-003).

**EXPECTED BEHAVIOR:** One authoritative ledger. PayPal, refunds, receipts, and client billing read the same records.

**ACTUAL BEHAVIOR:** Two stacks. Client billing can disagree with operator invoices and with PayPal.

**ROOT CAUSE:** Phase 63 ledger was added beside, not onto, the operational invoice store.

**SECURITY IMPACT:** Refund in one stack does not revoke access gated by the other.

**BUSINESS IMPACT:** Receipts, outstanding balances, and “fully paid” disagree across operator finance vs client billing.

**REGRESSION RISK:** High. Each stack’s tests pass in isolation.

**RECOMMENDED FIX:** Make one store authoritative. Dual-write is not enough unless both refund and delivery are wired through the same transaction.

---

### SYN-BUG-010

**TITLE:** Internal e-sign sandbox is the default production provider when Dropbox Sign / DocuSign env vars are absent  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/services/agreements/esignature.provider.ts` (`InternalEsignProvider.isConfigured()` always `true`; `getActiveESignatureProvider` falls through to it; exported `esignatureProvider` is always Internal)
- `src/lib/services/agreements/agreement-delivery.service.ts` (uses `getActiveESignatureProvider()`)

**AFFECTED WORKFLOW:** Agreement signing.

**PRECONDITIONS:** `DROPBOX_SIGN_API_KEY` / `HELLOSIGN_API_KEY` / `DOCUSIGN_ACCOUNT_ID` unset (typical unless explicitly configured).

**REPRODUCTION STEPS:** Call `getActiveESignatureProvider()` without those env vars. Receive `Internal E-Sign (Development Sandbox)` and URLs like `https://synapseops.internal/esign/session/...`. `getSigningStatus` always returns `pending`.

**EXPECTED BEHAVIOR:** Missing real provider credentials fail closed. Sandbox cannot satisfy a production “signed” agreement.

**ACTUAL BEHAVIOR:** Sandbox always “configured.” Mock URLs are treated as a sent signing request.

**ROOT CAUSE:** Development fallback is unconditional.

**SECURITY IMPACT:** Agreements can be marked sent/signable without a legally authoritative provider. Combined with SYN-BUG-005, operator/client “signatures” are entirely internal.

**BUSINESS IMPACT:** Unenforceable contracts if this path is used in a real engagement.

**REGRESSION RISK:** Medium.

**RECOMMENDED FIX:** Fail closed without a real provider in non-dev. Never export a singleton Internal provider as `esignatureProvider`.

---

### SYN-BUG-011

**TITLE:** Approval decisions do not require current snapshot/hash and can be recorded on `EXPIRED` requests  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/services/approval/approval-control.service.ts` (lines 75–87, 90–101)
- `src/lib/repositories/approval-control.repository.ts` (lines 197–200)

**AFFECTED WORKFLOW:** Human approval of privileged actions bound to a snapshot.

**PRECONDITIONS:** An approval request exists with `snapshotId` / `sourceHash` / `status: EXPIRED`.

**REPRODUCTION STEPS:**
1. `processDecision({ …, decision: "APPROVED" })` omitting `snapshotId` and `sourceHash` — mismatch checks are skipped because they require both sides truthy.
2. `manifestHash` is never compared to `params.manifestHash`.
3. `recordDecision` rejects only `APPROVED | REJECTED | REQUESTED_CHANGES`. `EXPIRED` is accepted.

**EXPECTED BEHAVIOR:** Approve only if the live snapshot/source/manifest still match the request, the request is pending, and `expiresAt` is in the future.

**ACTUAL BEHAVIOR:** Approval for a stale or expired request succeeds. Decision stores request-time hashes even if the workspace moved.

**ROOT CAUSE:** Optional binding; incomplete terminal-state guard.

**SECURITY IMPACT:** Privileged approval can attach to the wrong current snapshot.

**BUSINESS IMPACT:** Deploy/delivery authorized against superseded code.

**REGRESSION RISK:** Medium (`test_phase60_human_approval.ts` TEST 13 approves without `snapshotId`).

**RECOMMENDED FIX:** Require live hashes on APPROVE. Reject EXPIRED/past `expiresAt`. Compare `manifestHash`.

---

### SYN-BUG-012

**TITLE:** Worker fencing tokens are process-local and are checked after task execution; worker runtime ignores the kill switch  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/services/worker/worker-runtime.service.ts` (Map `activeTokens`, lines 26–36, 96–121; no kill-switch import)
- `src/lib/services/worker/task-execution-adapter.ts` (uses caller `actorRole`; DEPLOYMENT firewall omits `approvalPresent`)
- `src/lib/services/orchestration/work-orchestrator.service.ts` (`handleAutoRepair` does not call `isOperationAllowed("AUTONOMOUS_REPAIR")`)

**AFFECTED WORKFLOW:** Worker lease, fencing, emergency stop, duplicate execution.

**PRECONDITIONS:** Worker runtime is invoked (currently from tests / in-process callers; no HTTP route calls `executeWorkCycle` today).

**REPRODUCTION STEPS:**
1. `emergencyKillSwitch.transition("EMERGENCY_STOP", …)` then `executeWorkCycle` — work still claimed and saved as `"OPERATOR"`.
2. Restart process: `getFencingToken` defaults to `1`; a stale worker holding token `1` after a prior increment can match again.
3. `executeTask` runs at line 107; fencing compare is at 115–121. Side effects inside the adapter are not fenced first. The current adapter is a stub (always SUCCESS except DEPLOYMENT firewall), so duplicate *external* effects are not live today.

**EXPECTED BEHAVIOR:** Kill switch blocks claim/execute. Fencing token is durable and checked before side effects. `actorRole` is derived from worker type, not the caller.

**ACTUAL BEHAVIOR:** Kill switch hole; ephemeral fencing; spoofable `actorRole: "OPERATOR"` for `WRK-DEV-01`.

**ROOT CAUSE:** In-memory token map; check ordering; no kill-switch at this entry.

**SECURITY IMPACT:** Limited while the adapter is a stub. Becomes critical if the adapter gains real deploy/payment effects. Kill switch already fails for work-item mutation.

**BUSINESS IMPACT:** Work items can complete during emergency stop. After restart, late workers can persist results.

**REGRESSION RISK:** Medium. Phase 58 tests pass `actorRole: "OPERATOR"` for developer workers.

**RECOMMENDED FIX:** Persist fencing with the lease. Check before execute. Map worker type → role. Consult kill switch on claim.

---

### SYN-BUG-013

**TITLE:** `CHECKOUT.ORDER.COMPLETED` webhook can complete a payment request using the order ID as `captureId` and a parsed amount of 0  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/app/api/payments/paypal/webhook/route.ts` (lines 21–40)

**AFFECTED WORKFLOW:** PayPal capture reconcile.

**PRECONDITIONS:** PayPal sends `CHECKOUT.ORDER.COMPLETED` (resource.id is the order). Top-level `resource.amount` may be absent.

**REPRODUCTION STEPS:**
1. Handler sets `orderId = resource.supplementary_data.related_ids.order_id || resource.id` and `captureId = resource.id`.
2. `amountMinorUnits = Math.round(parseFloat(resource?.amount?.value || "0") * 100)` → 0 if amount missing.
3. `reconcilePayPalCapture` with amount 0 does not trip overpayment (`0 > balanceDue` is false unless balance is negative).
4. Payment request is marked `completed` (`paypal.service.ts` 241–244) even when invoice is not fully paid.
5. A later real `PAYMENT.CAPTURE.COMPLETED` uses a different capture ID, so capture-id dedup does not collapse the pair.

**EXPECTED BEHAVIOR:** Only capture-completed events with a verified capture ID and amount mutate invoices. Order-completed without capture should be ignored or used only to look up the order.

**ACTUAL BEHAVIOR:** Order id stored as capture id; zero-amount succeeded transaction; request closed.

**ROOT CAUSE:** Two event types share one extractor.

**SECURITY IMPACT:** Ledger pollution; possible blocking of a later legitimate capture path if request `completed` is later treated as terminal elsewhere.

**BUSINESS IMPACT:** Operator sees a completed PayPal request without money movement.

**REGRESSION RISK:** Medium.

**RECOMMENDED FIX:** Handle `PAYMENT.CAPTURE.COMPLETED` only for money movement. Ignore or separately ack `CHECKOUT.ORDER.COMPLETED`. Always re-fetch capture from PayPal (SYN-BUG-002).

---

### SYN-BUG-014

**TITLE:** Client components import filesystem repositories while the bundler stubs `fs` / `path` / `crypto` to `empty.ts`  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `next.config.ts` (`turbopack.resolveAlias` maps `fs`, `path`, `crypto` to `./empty.ts`)
- `empty.ts` (exports `{}`)
- `src/app/client/billing/page.tsx`
- `src/app/client/notifications/page.tsx`
- `src/app/client/projects/[projectId]/review/page.tsx`
- `src/app/project-control/page.tsx`
- `src/context/TaskContext.tsx` (client `useEffect` calls repositories directly)

**AFFECTED WORKFLOW:** Client billing, notifications, review, project control, operator overview data load in local (non-Supabase) mode.

**PRECONDITIONS:** Browser navigation to those pages. Local file-backed mode (Supabase unset).

**REPRODUCTION STEPS:**
1. `'use client'` pages call `billingRepository.listInvoices(...)` / `notificationRepository.listNotifications(...)` during render.
2. In the browser bundle, `fs.existsSync` is undefined (`empty.ts`). Repository `loadState` swallows the exception and yields empty arrays after hydrate.
3. Operator `TaskContext.loadData` runs only in `useEffect` (client). Without Supabase, file-backed task/lead/approval lists are empty in the browser even if `.json` caches exist on disk.

**EXPECTED BEHAVIOR:** Browser talks to authenticated API routes. Node `fs` stays on the server.

**ACTUAL BEHAVIOR:** Client bundle pretends to be the database. Alias exists specifically because those imports would otherwise fail to compile.

**ROOT CAUSE:** Repositories were imported into client pages; the bundler was stubbed instead of introducing a data API.

**SECURITY IMPACT:** Client billing/notifications cannot enforce server authorization (they also hardcode `ORG-CASILI-01`). Hydration mismatch between SSR (real fs) and client (stub).

**BUSINESS IMPACT:** Empty or stale billing/notifications after hydrate. Operator dashboard empty in local mode unless Supabase is configured.

**REGRESSION RISK:** Medium.

**RECOMMENDED FIX:** Server Components or route handlers for reads. Remove `fs` aliases as a product requirement, not as a workaround.

---

### SYN-BUG-015

**TITLE:** Privileged-action firewall treats omitted `approvalPresent` / `paymentVerified` as pass  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/services/security/privileged-action-firewall.service.ts` (lines 116–150)
- `src/lib/services/production-release/production-release.service.ts` (evaluate calls omit those flags)
- `src/lib/services/worker/task-execution-adapter.ts` (same)

**AFFECTED WORKFLOW:** Production deployment authorization.

**PRECONDITIONS:** Caller has `actorRole: "OPERATOR"` (default; SYN-BUG-004).

**REPRODUCTION STEPS:**
```ts
privilegedActionFirewall.evaluate({
  action: "PRODUCTION_DEPLOYMENT",
  actor: "operator",
  actorRole: "OPERATOR",
});
// allowed: true — approvalPresent is undefined, not === false
```

**EXPECTED BEHAVIOR:** Privileged actions require explicit `approvalPresent: true` (and payment where relevant). Missing evidence is denial.

**ACTUAL BEHAVIOR:** Only the boolean `false` denies. Omission passes.

**ROOT CAUSE:** Strict-equals-false checks instead of fail-closed required flags.

**SECURITY IMPACT:** Firewall does not enforce approval when callers forget (or refuse) to pass the flag. Production-release is such a caller.

**BUSINESS IMPACT:** “Firewall allowed” in logs does not mean approval existed.

**REGRESSION RISK:** High. Adding `approvalPresent: true` in tests without a store lookup will stay green.

**RECOMMENDED FIX:** Deny unless flags are explicitly true. Load flags from the approval store inside the service, not from the caller.

---

### SYN-BUG-016

**TITLE:** Source-delivery notification draft is hardcoded to one client identity  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/services/delivery/source-delivery.service.ts` (lines 163–169)

**AFFECTED WORKFLOW:** Notifications after delivery authorization.

**PRECONDITIONS:** `processPaymentAndAuthorizeDelivery` succeeds for any `clientId`.

**REPRODUCTION STEPS:** Authorize delivery for a non-Sindous client. Draft is still:
- recipient `sindousbuilding@gmail.com`
- subject `Sindous Building Supplies — Your Approved Source Code Package is Ready`

`notificationService.draftNotification` does not persist (returns an in-memory object). Combined with SYN-BUG-008, the client UI also does not show this draft.

**EXPECTED BEHAVIOR:** Recipient and branding come from the delivery’s client record. Notification is persisted only after authoritative authorization (which this path does have).

**ACTUAL BEHAVIOR:** Wrong client would be named; wrong inbox if later auto-sent. Draft is not stored.

**ROOT CAUSE:** Fixture email left in the service.

**SECURITY IMPACT:** Cross-client notification content if send is later wired. Currently the draft is not sent (`WAITING_HUMAN_APPROVAL` in-memory only).

**BUSINESS IMPACT:** Wrong-client communication; notification claims HANDOFF_READY for Sindous regardless of project.

**REGRESSION RISK:** Low until send is connected.

**RECOMMENDED FIX:** Use `params.clientId` contact from CRM/billing. Persist drafts in `notification.repository`.

---

### SYN-BUG-017

**TITLE:** Workflow event integrity hash omits payload and correlation fields  
**SEVERITY:** MEDIUM

**AFFECTED FILES:**
- `src/lib/repositories/workflow-event.repository.ts` (`computeEventHash`, lines 128–145)

**AFFECTED WORKFLOW:** Event history, replay, snapshot comparison.

**PRECONDITIONS:** Events stored in `.data/workflow-events.json` (or equivalent).

**REPRODUCTION STEPS:**
1. Append an event; record `eventHash`.
2. Modify stored `payloadReference`, `evidenceIds`, `workItemId`, `correlationId`, `causationId`, `environment`, or `executionId`.
3. `verifyChainIntegrity` still passes if hashed fields are unchanged.

**EXPECTED BEHAVIOR:** Hash covers the full canonical event (or a documented, complete subset that includes evidence and payload refs). Tampering of evidence pointers is detected.

**ACTUAL BEHAVIOR:** Evidence/payload pointers can change under a still-valid hash chain.

**ROOT CAUSE:** Incomplete canonicalization.

**SECURITY IMPACT:** Integrity verification can report a valid chain for a mutated history. Requires write access to the event store (same as any JSON ledger).

**BUSINESS IMPACT:** Replay/audit can disagree with what operators believe was hashed.

**REGRESSION RISK:** Medium. Changing the hash set is a breaking change for existing chains.

**RECOMMENDED FIX:** Include omitted fields; version the hash; re-seal or freeze v1 chains explicitly.

---

### SYN-BUG-018

**TITLE:** Manual `recordPayment` infers minor vs major units with a `> 100000` heuristic  
**SEVERITY:** LOW

**AFFECTED FILES:**
- `src/lib/services/invoices/invoice.service.ts` (line 494)
- `src/app/api/invoices/payments/record/route.ts`

**AFFECTED WORKFLOW:** Manual payment recording.

**REPRODUCTION STEPS:** `recordPayment({ amount: 88000 })` becomes 8,800,000 minor units (PHP 88,000.00). `recordPayment({ amount: 100001 })` is treated as already-minor. Amounts near the threshold are ambiguous.

**EXPECTED BEHAVIOR:** Explicit minor-unit field only.

**ACTUAL BEHAVIOR:** Heuristic.

**ROOT CAUSE:** Dual-unit API.

**SECURITY IMPACT:** Low (wrong amount, not auth). Combined with SYN-BUG-001, still an unauthenticated write.

**BUSINESS IMPACT:** 100× / 0.01× AR errors.

**REGRESSION RISK:** Low.

**RECOMMENDED FIX:** Accept `amountMinor` only. Reject major units.

---

### SYN-BUG-019

**TITLE:** PayPal `cancelPaymentRequest` is a success stub  
**SEVERITY:** LOW

**AFFECTED FILES:**
- `src/lib/services/payments/paypal.provider.ts` (lines 384–386)

**AFFECTED WORKFLOW:** Payment request cancellation.

**REPRODUCTION STEPS:** Call `cancelPaymentRequest(orderId)` — always `true`; no PayPal void/cancel.

**EXPECTED BEHAVIOR:** Call PayPal to void the order, or fail closed if unsupported.

**ACTUAL BEHAVIOR:** Local callers can believe the checkout URL is dead while it remains payable.

**ROOT CAUSE:** Unimplemented provider method.

**SECURITY IMPACT:** Low. A still-open PayPal order can still pay; reconcile would still run.

**BUSINESS IMPACT:** Operator cancellation is not a real cancel.

**REGRESSION RISK:** Low.

**RECOMMENDED FIX:** Implement PayPal void, or do not expose cancel as success.

---

### SYN-BUG-020

**TITLE:** Several client dynamic routes read `params.projectId` without unwrapping the Next.js 16 params Promise  
**SEVERITY:** LOW

**AFFECTED FILES:**
- `src/app/client/projects/[projectId]/page.tsx`
- `src/app/client/projects/[projectId]/changes/page.tsx`
- `src/app/client/projects/[projectId]/handoff/page.tsx`
- Contrast: `src/app/client/projects/[projectId]/review/page.tsx` correctly uses `use(params)`

**AFFECTED WORKFLOW:** Client project, changes, handoff navigation.

**PRECONDITIONS:** Next.js 16.3.2 (`package.json`). Client component `params` is a Promise.

**REPRODUCTION STEPS:** Open `/client/projects/PRJ-X/changes`. `params?.projectId` is undefined; fallback `PRJ-SINDOUS-01` is used for links and copy. Review page is the exception.

**EXPECTED BEHAVIOR:** `use(params)` or `useParams()`. Fail if project is not the authenticated client’s.

**ACTUAL BEHAVIOR:** Wrong/default project id. Combined with SYN-BUG-008 fixtures, every ID looks like Sindous.

**ROOT CAUSE:** Next.js 16 params API not applied consistently.

**SECURITY IMPACT:** Low by itself (fixture data anyway). Would become IDOR if fixtures were replaced without unwrapping.

**BUSINESS IMPACT:** Broken deep links.

**REGRESSION RISK:** Low.

**RECOMMENDED FIX:** Same params handling as the review page; then bind to session.

---

### SYN-BUG-021

**TITLE:** Payment-verification duplicate guard is in-process memory only  
**SEVERITY:** LOW

**AFFECTED FILES:**
- `src/lib/services/delivery/payment-verification.service.ts` (`consumedPaymentIds`, lines 28, 134–137)

**AFFECTED WORKFLOW:** Source delivery duplicate payment consumption.

**REPRODUCTION STEPS:** Authorize delivery (marks payment consumed). Restart process. Same `paymentId` is not in the array; duplicate authorization is not blocked by this guard (other DB unique keys may still help).

**EXPECTED BEHAVIOR:** Durable consumption record.

**ACTUAL BEHAVIOR:** Lost on restart. Currency argument is accepted and never validated in this service.

**ROOT CAUSE:** In-memory set.

**SECURITY IMPACT:** Low–medium if combined with SYN-BUG-002 after restart. Dedup in `paypal.service` by capture ID is file-backed and is the stronger control.

**BUSINESS IMPACT:** Duplicate delivery authorization attempts after restart.

**REGRESSION RISK:** Low.

**RECOMMENDED FIX:** Persist consumed payment IDs with the delivery/ledger row.

---

## SPECULATIVE FINDINGS

These were not confirmed as exploitable end-to-end. They are not counted as bugs.

| ID | Topic | Why speculative |
|---|---|---|
| SPEC-01 | Supabase RLS may or may not constrain tables if the Data API is enabled | Repository code uses service-side queries when configured; RLS policies were not executed in this audit |
| SPEC-02 | `clientAuthService` hardcoded tokens `token-sindous-01` / `token-aura-01` | Dead code today; becomes critical if a future route reads `Authorization` and calls `authenticateSession` |
| SPEC-03 | Concurrent `executeWorkCycle` TOCTOU on READY pick vs claim | `claimWorkItem` rejects duplicate active leases; race would need overlapping expiry/reclaim |
| SPEC-04 | Workflow resume ignores leases; Phase 59 tests stub `leaseValid = true` | Resume is advisory; no HTTP dispatcher found |
| SPEC-05 | Outbox records accumulate with no dispatcher | Loss of side effects, not duplication; no confirmed wrong send |
| SPEC-06 | JSON caches (`.source_deliveries_cache.json`, etc.) are rewrite-in-place files | Anyone with filesystem access can edit “append-only” data; that is an operational trust boundary, not a demonstrated HTTP bug |
| SPEC-07 | `Math.round(parseFloat(value) * 100)` float rounding | No concrete mismatched centavo case was reproduced |
| SPEC-08 | `getArtifact` returns a mutable in-memory reference | No caller was shown to mutate finalized artifacts through that reference |
| SPEC-09 | Kill-switch `DEGRADED` state is a no-op | Documented type without behavior; not a bypass of `EMERGENCY_STOP` |

---

## NOT_A_BUG FINDINGS

| Item | Evidence |
|---|---|
| PayPal webhook signature fail-closed | `paypal.provider.ts` 336–345, 368–369. Missing headers or unconfigured webhook ID → `isValid: false`. Route returns 400. Catalog DEF-02 remediation is present. |
| Overpayment does not silently unlock delivery | `paypal.service.ts` 196–214. Live probe with fake capture against a paid invoice returned `requiresReview: true` and did not persist a paid mutation. |
| Currency mismatch blocks reconcile | `paypal.service.ts` 188–193 |
| Capture ID and event ID idempotency | `paypal.service.ts` 172–185 |
| Environment mismatch check | `paypal.service.ts` 165–169 |
| Vercel deploy fails without token | `src/lib/deployment/providers/vercel.provider.ts` (not used by production-release, which is SYN-BUG-007; the provider itself does not fake success) |
| Developer path-escape sandbox | `developer-agent.service.ts` `validatePathSafety` throws on workspace escape |
| `FRAMEWORK_UNKNOWN` is not treated as supported | `build-strategy.service.ts` / `universal-build.service.ts` — unknown framework is not executable |
| Universal build does not `spawn`/`exec` | Simulated log lines only; no confirmed unauthorized command execution |
| Source download tenant check | `source-delivery.service.ts` 207–214 — when `downloadSourcePackage` is called with mismatched client/org, it blocks. No public download route was found. |
| Billing ledger rejects `AI_AGENT` amount edits | `billing.repository.ts` 334–336 |
| Issued-invoice amount immutability in the Phase 63 ledger | `billing.repository.ts` 342–348 |
| Duplicate work-item claim while lease unexpired | `work-orchestration.repository.ts` `DUPLICATE_CLAIM_BLOCKED` |
| Event repository has no update/delete API | Append-only at the method level (hash completeness is SYN-BUG-017) |
| Requirement UNKNOWN path | `requirement-intelligence.service.ts` stores unstated audience as `UNKNOWN` / `UNVERIFIED` with a separate assumption record; no conversion of UNKNOWN → VERIFIED without a matching prompt token was found |

---

## SECURITY FINDINGS

Confirmed security defects are SYN-BUG-001, 002, 003, 004, 005, 007 (false production evidence), 008 (operator chrome on client URLs), 010, 011, 015.

`clientAuthService`, `authorizationService`, and `projectIsolationService` exist as designs. They are not the runtime boundary.

`privilegedActionFirewall` matrix correctly denies `AI_DEVELOPER_AGENT`, `CLIENT_SESSION`, `WEBHOOK`, `BACKGROUND_WORKER`, and `FRONTEND_REQUEST`. The HTTP layer never passes those roles, so the matrix is not what the network enforces.

Secrets: no confirmed secret-in-prompt/artifact/notification path beyond env-based Gmail use in server senders. `GMAIL_APP_PASSWORD` is read as an env var for nodemailer, not interpolated into model prompts in the inspected senders. Catalog Phase 47 secret filtering in developer QA is present as pattern scans; this audit did not prove a secret leak through those scanners.

Kill switch: enforced on production approve/confirm/rollback, PayPal mutate/refund handlers, source delivery authorize, developer rollback, and approval-control APPROVE. Bypassed on DNS cutover, invoice verify/record/reverse, handover reconcile, worker cycle, auto-repair (SYN-BUG-004 / 012).

Test fixtures: `test_phase*.ts` are not HTTP routes. Client portal pages *are* HTTP routes serving fixture state (SYN-BUG-008). `/api/ai/health` exposes model registry, provider policy, and unauthenticated inference/test actions (information disclosure / compute abuse; folded into SYN-BUG-001 rather than a separate ID).

---

## FINANCIAL FINDINGS

| ID | Severity | Summary |
|---|---|---|
| SYN-BUG-002 | CRITICAL | Caller-supplied capture/amount/deliveryContext without PayPal fetch |
| SYN-BUG-003 | CRITICAL | Refund/dispute does not revoke delivery or unwind invoice |
| SYN-BUG-006 | HIGH | Handover reconcile + hardcoded 8,800,000 |
| SYN-BUG-009 | HIGH | Dual ledger |
| SYN-BUG-013 | MEDIUM | ORDER.COMPLETED zero-amount complete |
| SYN-BUG-018 | LOW | Minor/major heuristic |
| SYN-BUG-019 | LOW | Cancel stub |
| SYN-BUG-021 | LOW | In-memory consumption set |

`payment-reconciliation.service.ts` (Phase 63) does bind project/client/currency and rejects duplicate provider transaction IDs **on that ledger**. PayPal does not write that ledger. Integer minor units are used consistently in the PayPal service except the webhook `parseFloat` conversion.

No confirmed integer overflow. No confirmed currency silent convert (mismatch throws). Duplicate PayPal capture IDs are blocked on the operational stack.

---

## WORKFLOW FINDINGS

| ID | Summary |
|---|---|
| SYN-BUG-007 | Production states skippable; fake live |
| SYN-BUG-011 | Expired/stale approval still decidable |
| SYN-BUG-012 | Worker vs kill switch / fencing |
| SYN-BUG-003 | Delivery terminal `DELIVERY_AUTHORIZED` not moved on refund |
| SYN-BUG-013 | Payment request `completed` without full invoice payment |

Worker completion does not append workflow events (`WORK_COMPLETED`). Event log and work-orchestration JSON can diverge. Replay reducer compares `currentState` only. Not separately filed; treated as architecture gap under SPEC-04 unless a concrete mismatched replay was produced (it was not).

`approvalControlService.processDecision` is not called by `src/app/api/approvals/approve/route.ts`. That route updates a different `approvalRepository` and may send pilot email. Two approval stacks exist. The HTTP approvals board (`/approvals`) uses `approval-control` for display; the `/api/approvals/approve` button path uses the older repository. Confirming a full “approve the wrong snapshot” through the visible board would require a write path from that UI into `processDecision`. The board is a server-rendered list; a dedicated control-plane approve API for `approvalControlService` was not found. Stale-snapshot approval is still confirmed at the service (`SYN-BUG-011`).

---

## UX FINDINGS

| ID | Summary |
|---|---|
| SYN-BUG-008 | Fixture client portal; dead download and change-request; operator chrome |
| SYN-BUG-014 | Client billing/notifications/review empty or hydration-mismatched in browser |
| SYN-BUG-020 | params Promise not unwrapped |
| SYN-BUG-016 | Wrong-client copy in delivery draft |
| SYN-BUG-007 | Operator activity claims Vercel deploy that did not happen |

Client review “+ Click Anywhere on Preview to Leave Note” is a non-functional button (no handler). Classified as part of SYN-BUG-008 fixture UI, not a separate ID.

`/api/ai/health` GET is an operator debug surface on the public tree (SYN-BUG-001).

---

## REGRESSION RISKS

1. Phase tests call services with `actorRole: "OPERATOR"` and explicit `projectId` on refund helpers — they will not catch SYN-BUG-001, 002 (verify route), or 003 (webhook `custom_id`).
2. Catalog DEF-03 claims firewall embedding on PayPal and source delivery; current code has dead imports. Re-running Phase 48 tests that only hit production-release methods will stay green.
3. Dual billing (SYN-BUG-009) allows each suite to pass against its own store.
4. Client portal screenshots will continue to look complete (SYN-BUG-008).
5. Changing event hash fields (SYN-BUG-017) breaks existing chain verification unless versioned.
6. Adding HTTP auth without removing `actorRole = "OPERATOR"` defaults leaves SYN-BUG-004 open.

---

## NO-FINDING AREAS

If a subsystem is listed here, the finding is `NO_CONFIRMED_BUG_FOUND` for an independent defect beyond SYN-BUG-001 (unauthenticated HTTP), unless another ID is cited.

| Subsystem | Result |
|---|---|
| Authentication (HTTP) | SYN-BUG-001 (confirmed missing) |
| Authorization / firewall design matrix | Logic sound when invoked; runtime bypass SYN-BUG-004 / 015 |
| Tenant isolation service | `NO_CONFIRMED_BUG_FOUND` in `validateIsolation` logic; **not called** from APIs |
| Project isolation | Same |
| Environment isolation (PayPal sandbox vs live flag) | Mismatch check present; default sandbox is SPECULATIVE/ops, not a confirmed money-movement bug |
| Payment / PayPal provider HTTP | No mock PayPal success path; real API used for create-order. Defects are reconcile/verify/refund mapping |
| Source delivery download tenant/hash checks | `NO_CONFIRMED_BUG_FOUND` in `downloadSourcePackage` itself; unlock/revoke are SYN-BUG-002 / 003 |
| Artifact cross-tenant get when scoped | `getArtifact(id, projectId, orgId)` nulls on mismatch; unscoped HTTP artifact route not found |
| Build command execution | `NO_CONFIRMED_BUG_FOUND` (simulated; allowlist unused for real exec) |
| Unsupported framework reported as supported | `NO_CONFIRMED_BUG_FOUND` |
| Design library | `NO_CONFIRMED_BUG_FOUND` |
| Design learning / anti-template | `NO_CONFIRMED_BUG_FOUND` |
| CRM pipeline / copilot internals | `NO_CONFIRMED_BUG_FOUND` beyond unauthenticated CRM API routes (SYN-BUG-001) |
| Client review comment persistence (repository) | Repository exists; the `/client/.../review` page does not write comments through it in the inspected UI |
| Observability / cost UNKNOWN handling | `NO_CONFIRMED_BUG_FOUND` for UNKNOWN→VERIFIED promotion |
| Requirement intelligence UNKNOWN preservation | `NO_CONFIRMED_BUG_FOUND` |
| Visual / Gemini review authorizing deploy | Review is not wired as a deploy authorizer in production-release |
| Event append API mutability | `NO_CONFIRMED_BUG_FOUND` (no update method); hash coverage is SYN-BUG-017 |
| Outbox insert idempotency | `NO_CONFIRMED_BUG_FOUND` |
| Emergency stop on the methods that actually call it | Those methods fail closed; other paths are SYN-BUG-004 |
| Test_phase scripts as HTTP fixtures | `NO_CONFIRMED_BUG_FOUND` (not routed) |

---

## COUNTS

CONFIRMED_BUG_COUNT: 21  
CRITICAL_COUNT: 3  
HIGH_COUNT: 6  
MEDIUM_COUNT: 8  
LOW_COUNT: 4  
SPECULATIVE_COUNT: 9  

This audit does not approve or certify SYNAPSE V1.0.
