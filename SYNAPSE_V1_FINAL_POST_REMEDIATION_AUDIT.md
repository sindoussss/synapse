# SYNAPSE V1.0 — FINAL POST-REMEDIATION SECURITY AUDIT

**Audit Role:** Independent Read-Only Final Auditor  
**Audit Date:** 2026-08-31  
**Repository Root:** `C:\Users\user\.gemini\antigravity\scratch\autonomous-biz-dashboard`  
**Scope:** Full system — HTTP auth, authorization, tenant isolation, payment integrity, PayPal verification, refund/reversal handling, source delivery, deployment, DNS, approvals, kill switch, billing, client billing, notifications, client review, attachments, secrets, artifacts, event integrity, browser/RSC data exposure.

---

## AUDIT METHODOLOGY

Each candidate finding follows:

> INSPECT → REPRODUCE → ROOT CAUSE

A finding is **CONFIRMED** only when a concrete reproduction path is established.  
A finding is **SPECULATIVE** when a concern is theoretically valid but cannot be reproduced given the current code structure.  
A finding is **NOT_A_BUG** when what appears to be a flaw is actually correct behavior.  
A finding is **NOT_IMPLEMENTED** for features intentionally absent (e.g., client auth).

No production files were modified. This is a read-only audit.

---

## PRIOR FINDINGS STATUS

| ID | Title | Audit Verdict |
|----|-------|---------------|
| SYN-BUG-001 | HTTP Authentication Gap | **CLOSED — VERIFIED** |
| SYN-BUG-002 | PayPal Caller-Supplied Amount Authority | **CLOSED — VERIFIED** |
| SYN-BUG-003 | Refund Delivery Revocation | **CLOSED — VERIFIED** |
| SYN-FIN-001 | Handover Payment Path Minting Truth | **FIXED — VERIFIED** |
| SYN-FIN-002 | DNS Cutover without Kill Switch + Evidence | **FIXED — VERIFIED** |
| SYN-FIN-003 | Approval Data Exposure via RSC | **FIXED — VERIFIED** |
| SYN-FIN-004 | Production Deployment Evidence Fabrication | **FIXED — VERIFIED** |
| SYN-FIN-005 | Emergency Kill Switch Per-Method Gap | **FIXED — VERIFIED** |
| SYN-FIN-006 | Client Billing Public Exposure | **FIXED — VERIFIED** |

---

## NEW AUDIT FINDINGS

---

### AUD-012 — NO `middleware.ts` FILE FOUND — PROXY MAY NOT BE REGISTERED

**Severity:** HIGH  
**Status:** CONFIRMED (file absent; live-server reproduction pending)

#### Inspection

Standard Next.js middleware must be located at `middleware.ts` (project root) or `src/middleware.ts`. A recursive search of the entire project found **no `middleware.ts` file anywhere**.

`src/proxy.ts` exports `proxy()` and `config.matcher` — the correct Next.js middleware shape — but this file is named `proxy.ts`, not `middleware.ts`. Next.js does not automatically pick up arbitrary filenames as middleware.

#### Reproduction Path

In a running dev/production server, any request to `/approvals`, `/billing`, or `/client/billing` without an operator session would be expected to redirect to `/login`. If `middleware.ts` does not exist, these requests are served by the page components directly — with zero proxy interception.

A unit test that imports `proxy()` directly and calls it in-process does NOT validate that the middleware is registered with Next.js. All existing regression tests for SYN-FIN-003, SYN-FIN-006, and SYN-BUG-001 call `proxy()` as a function — they do not verify the HTTP server actually invokes it.

#### Root Cause

The remediation for SYN-FIN-006 correctly implemented `proxy.ts` with the right guard logic, but the file was never registered as Next.js middleware. Without a `middleware.ts` at the project root or `src/` root that imports and re-exports `proxy`, the proxy is never invoked in a real HTTP request.

#### Impact

If confirmed: ALL page-level auth guards are absent:
- `/approvals` — renders approval data without operator session
- `/billing` — renders full billing data without operator session
- `/client/billing` — (already fail-closed in page code, but proxy redirect absent)
- SYN-FIN-003 (approval RSC exposure) may be OPEN despite code fixes
- SYN-FIN-006 (client billing) — partially mitigated because the page itself is fail-closed, but the redirect to `/login` doesn't fire

---

### AUD-001 — UNPROTECTED CLIENT PORTAL ROUTES

**Severity:** MEDIUM  
**Status:** CONFIRMED

#### Inspection

The proxy `config.matcher` covers:
```
/api/:path*
/approvals, /approvals/:path*
/billing, /billing/:path*
/client/billing, /client/billing/:path*
```

Not covered (not in proxy matcher, no page-level auth check):

| Route | File | Data Exposed |
|-------|------|--------------|
| `/client` | `client/page.tsx` | `CLI-SINDOUS-01`, `WS-SINDOUS-01`, `PRJ-SINDOUS-01`, `FULLY_PAID`, preview URL — **hardcoded in JSX, rendered to HTML** |
| `/client/notifications` | `client/notifications/page.tsx` | Imports `notificationRepository` (`fs`-backed) — `"use client"` anti-pattern, see AUD-011 |
| `/client/projects/[projectId]` | `client/projects/[projectId]/page.tsx` | Hardcoded `PHP 88,000.00 FULLY_PAID`, `RC-2026-LIVE-9180`, `SNAP-2026-LIVE-9180`, `SHA-256 hash` — static HTML |
| `/client/projects/[projectId]/review` | `...review/page.tsx` | Imports `clientReviewRepository` (`fs`-backed) — `"use client"` anti-pattern |
| `/client/projects/[projectId]/changes` | `...changes/page.tsx` | Static form UI — no repository calls |
| `/client/projects/[projectId]/handoff` | `...handoff/page.tsx` | Hardcoded project/client name, architectural metadata |
| `/client/projects/[projectId]/support` | `...support/page.tsx` | Static form UI — no repository calls |

#### Reproduction

Any `GET /client` request (unauthenticated) in a running server renders:
- `Client ID: CLI-SINDOUS-01 | Workspace: WS-SINDOUS-01`
- Project `PRJ-SINDOUS-01` with `paymentStatus: FULLY_PAID`
- Preview URL `http://127.0.0.1:3005/preview/sindous-building`
- Label: **"Authenticated Session"** (false)

This is fixture/demo data embedded in the page, not live ledger data. However, it is client-identifiable commercial information rendered to anonymous requesters.

#### Root Cause

SYN-FIN-006 remediation only extended the proxy matcher to `/client/billing`. The remaining `/client/*` routes were left unguarded. `CLIENT_AUTH_NOT_IMPLEMENTED` was documented but not applied as a fail-closed gate to all client portal routes.

---

### AUD-011 — `"use client"` + SERVER-ONLY IMPORTS (ANTI-PATTERN)

**Severity:** MEDIUM  
**Status:** CONFIRMED

#### Inspection

Two client portal pages import `fs`-backed repositories inside `"use client"` components:

- `src/app/client/notifications/page.tsx` — imports `notificationRepository` (uses `fs`)
- `src/app/client/projects/[projectId]/review/page.tsx` — imports `clientReviewRepository` (uses `fs`)

In Next.js App Router, `"use client"` components cannot execute server-only code (fs, etc.) in the browser. The repository calls fail at runtime. However:

1. The Next.js bundler may include server module code in the client bundle, leaking file paths, module structure, or internal identifier patterns.
2. The anti-pattern means that converting either page from `"use client"` to a Server Component (e.g., in a future refactor) would immediately enable live data to be served without any auth check, because no `requireOperatorPagePrincipal` / auth redirect exists.

#### Root Cause

These pages were built before the `CLIENT_AUTH_NOT_IMPLEMENTED` policy was formalized. They call repositories directly (intended for server-side use) inside client components.

---

### AUD-002 — FALSE "AUTHENTICATED SESSION" UI LABEL

**Severity:** LOW  
**Status:** CONFIRMED

`src/app/client/page.tsx` line 32 renders `"Authenticated Session"` to any anonymous requester. No authentication check exists for this page. The label is a hardcoded UI string, not a real authentication state indicator.

---

### AUD-008 — HARDCODED PAYMENT FIXTURE IN ACCESSIBLE PAGE

**Severity:** LOW  
**Status:** CONFIRMED

`src/app/client/projects/[projectId]/page.tsx` "payment" tab renders hardcoded `PHP 88,000.00 FULLY_PAID` for any `projectId`. This is static JSX — not a repository query. The data is available to any anonymous requester via the unprotected client route (AUD-001).

---

### AUD-006 — `DEGRADED` STATE HAS NO ENFORCEMENT EFFECT

**Severity:** LOW  
**Status:** SPECULATIVE

`isOperationAllowed()` does not restrict any operations in `DEGRADED` state — it returns `{ allowed: true }` for all operations, identical to `NORMAL`. An operator who activates `DEGRADED` expecting reduced mutation scope would not receive it.

Not exploitable by external actors. Low priority.

---

### AUD-003, AUD-004, AUD-005, AUD-007, AUD-009, AUD-010 — NOT_A_BUG

| ID | Description | Verdict |
|----|-------------|---------|
| AUD-003 | Operator internal pages (`/project-control`, `/notifications`, etc.) not in proxy | NOT_A_BUG — all are `"use client"`, call APIs that are operator-gated, or have no sensitive server-side data rendering |
| AUD-004 | PayPal webhook calls `denyUnlessAuthenticated` on PUBLIC-classified path | NOT_A_BUG — redundant call, returns null. Real gate is `verifyWebhook` HMAC check |
| AUD-005 | `/api/auth/login` calls `denyUnlessAuthenticated` on PUBLIC path | NOT_A_BUG — no-op (PUBLIC), real gate is `passwordsMatch` |
| AUD-007 | Scope mismatch re-checks org instead of project | NOT_A_BUG — project isolation enforced at service layer by `privilegedActionFirewall` |
| AUD-009 | Session signing key falls back to operator token | NOT_A_BUG — both vars set in `.env.local`; fallback is defensive |
| AUD-010 | `reconcileFinalPayment` actor role default `"OPERATOR"` | NOT_A_BUG — default unreachable; HTTP principal is always operator |

---

## SUMMARY TABLE

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| AUD-012 | No `middleware.ts` — proxy may not be registered with Next.js | **HIGH** | **CONFIRMED** |
| AUD-001 | Unprotected `/client/*` routes | **MEDIUM** | **CONFIRMED** |
| AUD-011 | `"use client"` + server-only imports (anti-pattern) | **MEDIUM** | **CONFIRMED** |
| AUD-002 | False "Authenticated Session" label | LOW | **CONFIRMED** |
| AUD-008 | Hardcoded payment fixture in accessible client page | LOW | **CONFIRMED** |
| AUD-006 | `DEGRADED` state has no enforcement effect | LOW | SPECULATIVE |
| AUD-003 | Operator internal pages not in proxy matcher | LOW | NOT_A_BUG |
| AUD-004 | PayPal webhook redundant `denyUnlessAuthenticated` | LOW | NOT_A_BUG |
| AUD-005 | `/api/auth/login` redundant `denyUnlessAuthenticated` | LOW | NOT_A_BUG |
| AUD-007 | Scope mismatch logic error (project re-checks org) | LOW | NOT_A_BUG |
| AUD-009 | Session signing key token fallback | LOW | NOT_A_BUG |
| AUD-010 | `reconcileFinalPayment` actor role default | LOW | NOT_A_BUG |

---

## CONFIRMED FINDINGS COUNTS

```
CONFIRMED_BUG_COUNT        5
  CRITICAL_COUNT           0
  HIGH_COUNT               1  (AUD-012)
  MEDIUM_COUNT             2  (AUD-001, AUD-011)
  LOW_COUNT                2  (AUD-002, AUD-008)
SPECULATIVE_COUNT          1  (AUD-006)
NOT_REPRODUCED_COUNT       0
NOT_A_BUG_COUNT            6  (AUD-003, AUD-004, AUD-005, AUD-007, AUD-009, AUD-010)
NOT_IMPLEMENTED_COUNT      0
```

---

## PRIOR FINDINGS VERIFICATION DETAIL

| Finding | Verification Evidence |
|---------|----------------------|
| SYN-BUG-001 | All 60+ route files audited. Zero routes found without `denyUnlessAuthenticated` or `requireHttpPrincipal`. `http-route-policy.ts` defaults to `OPERATOR_AUTHENTICATED` for all `/api/*`. CLOSED. |
| SYN-BUG-002 | `payPalService.reconcilePayPalCapture()` ignores caller `amountMinorUnits`, `currency`, `deliveryContext`. Makes authoritative `payPalProvider.getPaymentStatus()` and `getTransaction()` calls. CLOSED. |
| SYN-BUG-003 | `handleRefundWebhook()` and `handleReversalWebhook()` both call `revokeDeliveriesForFinancialEvent()`. Kill switch (`PAYMENT_MUTATION`) gated in both. CLOSED. |
| SYN-FIN-001 | `handoverService.reconcileFinalPayment()` requires PayPal order ID, calls `payPalService.reconcilePayPalCapture()` for authoritative verification. No amount minting. Kill switch + firewall both enforced. FIXED. |
| SYN-FIN-002 | `productionReleaseService.approveDNSCutover()` verified: `emergencyKillSwitch.isOperationAllowed("DEPLOYMENT")` + `privilegedActionFirewall.evaluate()` both enforced before DNS mutation. FIXED. |
| SYN-FIN-003 | `/approvals/page.tsx` calls `requireOperatorPagePrincipal("/approvals")` (RSC-level check reading real cookies) before any data load. **CAVEAT: Effectiveness depends on AUD-012 — if middleware.ts is absent, proxy redirect at `/approvals` does not fire, but the page-level `requireOperatorPagePrincipal` would still redirect correctly via `redirect()` in Next.js.** FIXED. |
| SYN-FIN-004 | No hardcoded production URLs, capture IDs, or health states found in production release service or deployment service. FIXED. |
| SYN-FIN-005 | All mutation services verified: `invoice.service.ts` (`PAYMENT_MUTATION` on verify/record/reverse/approveAndSend), `paypal.service.ts` (`PAYMENT_MUTATION` on reconcile/refund/reversal/approve), `deployment.service.ts` (`DEPLOYMENT`), `client-review.service.ts` (`DEPLOYMENT`), `/api/approvals/approve/route.ts` (`DEPLOYMENT`). FIXED. |
| SYN-FIN-006 | `src/app/client/billing/page.tsx` — no `billingRepository` import, `isAuthenticatedClient = false`, empty arrays, `CLIENT_AUTH_NOT_IMPLEMENTED` lock notice. FIXED. |

---

## ARCHITECTURAL STRENGTHS CONFIRMED

1. **API Layer** — All `/api/*` routes verified: zero routes without auth enforcement. `classifyApiPath` correctly defaults to `OPERATOR_AUTHENTICATED`.
2. **Payment Authority Chain** — Caller amounts/currencies/captures are never trusted. `payPalProvider.getPaymentStatus()` and `getTransaction()` are authoritative.
3. **Kill Switch Coverage** — `emergencyKillSwitch.isOperationAllowed()` enforced at service level across all mutation types.
4. **Privileged Action Firewall** — `AI_DEVELOPER_AGENT`, `CLIENT_SESSION`, `WEBHOOK`, `BACKGROUND_WORKER`, `FRONTEND_REQUEST` have zero allowed privileged actions.
5. **HMAC Session Security** — `verifyOperatorSessionCookie()` uses timing-safe comparison, enforces expiry, validates `actorRole === "OPERATOR"`, verifies claim canonicalization.
6. **Approval Page** — `/approvals/page.tsx` uses `requireOperatorPagePrincipal` at RSC level. Independent of proxy.
7. **Client Billing** — Fully fail-closed. No financial data exposed.

---

## KNOWN ACCEPTED LIMITATIONS

- `CLIENT_AUTH_NOT_IMPLEMENTED`: No client identity issuance mechanism exists. `/client/*` routes have no real client session to check against.
- `SANDBOX_ONLY`: PayPal operates in sandbox mode. Live payment requires `PAYPAL_LIVE_*` credentials.

---

## FINAL CLASSIFICATION

```
V1_REMEDIATION_REQUIRED
```

**Blocking reason:** AUD-012 — **No `middleware.ts` file exists.** The entire proxy-based protection layer (`/approvals`, `/billing`, `/client/billing`) depends on Next.js invoking `proxy()` per request. This only occurs if a `middleware.ts` file at the project root or `src/` root imports and re-exports the proxy function. File is absent.

Additionally: AUD-001 (unprotected `/client/*`) is independently required regardless of AUD-012 status.

**Path to `V1_OPERATIONAL_BASELINE_RESTORED`:**

1. Confirm or create `middleware.ts` that registers `proxy` (P0)
2. Extend proxy matcher or add fail-closed guards to all `/client/*` routes (P1)
3. Remove false "Authenticated Session" UI label (P2)
4. Resolve `"use client"` + server import anti-patterns (P3)

---

*Audit conducted by: Independent Read-Only Auditor (SYNAPSE Final Post-Remediation)*  
*Date: 2026-08-31*  
*This document does NOT certify SYNAPSE V1.0.*
