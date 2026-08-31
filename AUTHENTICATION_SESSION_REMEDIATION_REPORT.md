# AUTHENTICATION SESSION REMEDIATION REPORT

**Date:** 31 August 2026  
**Scope:** Operator browser session after SYN-BUG-001 HTTP fail-closed  
**V1 certification:** not claimed

---

## CURRENT AUTH MODEL

| Mechanism | Status |
|---|---|
| `Authorization: Bearer SYNAPSE_OPERATOR_TOKEN` | **IMPLEMENTED** / **VERIFIED** — machine / INTERNAL callers |
| HMAC-signed httpOnly operator session cookie | **IMPLEMENTED** / **VERIFIED** — browser after `/login` |
| Caller `actorRole` / `role` / `userId` / org / project as identity | **Rejected** (unchanged from SYN-BUG-001) |
| Clerk / Auth.js / NextAuth / SSO | **NOT_IMPLEMENTED** (not installed; not added) |
| Client HTTP session | **NOT_IMPLEMENTED** — `CLIENT_AUTH_NOT_IMPLEMENTED` |
| Hardcoded `clientAuthService` tokens | **Not wired** (would be fake auth) |

Identity is established only on the server:

1. Bearer compared to `SYNAPSE_OPERATOR_TOKEN`, or
2. Cookie `synapse_operator_session` verified with HMAC-SHA256

Session claims (`principalId`, `actorRole`, `organizationId`, `workspaceId`) are written by the server at login from process env. They are never taken from the request body, query string, arbitrary headers, or client JavaScript.

---

## OPERATOR SESSION

**IMPLEMENTED** / **VERIFIED**

Flow:

```
Browser
  → GET /login
  → POST /api/auth/login { password }   (PUBLIC; password compared server-side)
  → Set-Cookie: synapse_operator_session (HttpOnly, SameSite=Lax, Path=/)
  → subsequent fetch("/api/…") sends the cookie automatically
  → resolveHttpIdentity → principal
  → privilegedActionFirewall (existing) on privileged routes
```

The raw `SYNAPSE_OPERATOR_TOKEN` is **not** returned, not placed in HTML/JS, and not stored in `localStorage`. Login accepts `SYNAPSE_OPERATOR_PASSWORD` if set, otherwise the operator token as the password (same pattern as a server secret typed once). HMAC key is `SYNAPSE_SESSION_SECRET` or a derived key from the operator token.

TTL: 12 hours. Expired / tampered / garbage cookies → **401**.

Operator chrome (`OperatorSessionGate`) redirects unauthenticated visits of `/finance` and other operator pages to `/login?next=…`. **VERIFIED** live: `GET /finance` → `/login?next=%2Ffinance`.

---

## CLIENT AUTH STATUS

**CLIENT_AUTH_NOT_IMPLEMENTED**

`/client`, `/client/projects/[projectId]`, `/client/billing`, `/client/notifications` are **fixture-driven** client components (`CLI-SINDOUS-01`, `ORG-CASILI-01`, hardcoded project cards). They do not establish server-side `clientId` / `organizationId` / authorized project IDs.

No client session cookie is issued. Forged client headers/tokens still receive **401** on operator APIs.

Phase 50 “client authentication” remains an in-process fixture check, not HTTP identity.

---

## ROUTE CLASSIFICATION

| Class | Paths |
|---|---|
| **PUBLIC** | `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`, `/api/agreements/signing/embed-url`, HTML pages (`/login`, `/research`, `/esign`, `/client/*`) |
| **WEBHOOK_PUBLIC_BUT_SIGNED** | `/api/payments/paypal/webhook` |
| **OPERATOR_AUTHENTICATED** | All other `/api/*` (default fail-closed) |
| **CLIENT_AUTHENTICATED** | None issued |
| **INTERNAL_ONLY** | Bearer machine use of operator APIs (same gate; token source) |

Default for unknown `/api/*`: **OPERATOR_AUTHENTICATED**.

---

## BROWSER AUTH FLOW

Same-origin `fetch()` already sends cookies. No `NEXT_PUBLIC_` secret and no per-call token plumbing.

| Surface | Data path | Session effect |
|---|---|---|
| `/finance` | `fetch("/api/invoices/ar/summary")` | Cookie required; **VERIFIED** 200 with session |
| `/leads`, task/lead modals | `fetch("/api/…")` | Same cookie |
| `/project-control`, `/work-queue`, `/workers`, `/approvals`, `/billing`, `/notifications`, `/operations/workflows` | Mostly in-process repository imports in client components | Gate requires session to render chrome; they do not use the operator token |
| `/client/*` | Fixtures | No operator gate; **not** production client auth |

---

## SECURITY FINDINGS

| # | Case | Result |
|---|---|---|
| 1 | No session | **401 VERIFIED** |
| 2 | Invalid session | **401 VERIFIED** |
| 3 | Expired session | **401 VERIFIED** |
| 4 | Forged session (bad HMAC) | **401 VERIFIED** |
| 5 | Forged role header/body | **Ignored**; session stays OPERATOR **VERIFIED** |
| 6 | Forged projectId + foreign org | **403 VERIFIED** |
| 7 | Forged organizationId | **403 VERIFIED** |
| 8 | Operator list other tenants | Scoped list filtered **VERIFIED** when `SYNAPSE_OPERATOR_ORGANIZATION_ID` is set |
| 9 | Client / forged client cookie on operator API | **401 VERIFIED** |
| 10 | Client cannot access another project | **NOT_IMPLEMENTED** (no client HTTP identity; operator APIs remain operator-only) |
| 11 | Dashboard API with valid session | **200 VERIFIED** (`/api/invoices/ar/summary`) |
| 12 | Privileged action with session | Reaches existing firewall / validation **VERIFIED** |
| 13–14 | PayPal webhook | Unsigned **400**; no operator session required **VERIFIED** |
| 15 | Operator token in login/gate/session JSON | **Absent VERIFIED** |

Unauthenticated operator APIs remain **401**. Sensitive APIs were not made public.

---

## TEST FIXTURE REPAIR (Phase 49 test 27)

**Intended property:** real secret values and `.env`-style secret assignments must not appear in scanned production artifacts.

**Before:** fixture `GMAIL_APP_PASSWORD=fake_app_password_xxxxxxxx` did not contain the live env value, so `auditSecretExposure` returned null (**TEST_FIXTURE_FALSE_POSITIVE**).

**After (scanner strengthened, not weakened):**

- Live env values still flagged
- Assignment patterns (`GMAIL_APP_PASSWORD=…`, `SYNAPSE_OPERATOR_TOKEN=…`, etc.) also flagged
- Fixture uses sentinel `SYN-TEST-SENTINEL-NOT-A-REAL-SECRET`
- Clean artifact string is not flagged
- Live env value, when present and not the sentinel, is still caught

Phase 49 test 27: **PASS**. Suite **40/40**.

---

## REGRESSION RESULTS

| Suite | Result |
|---|---|
| Operator session HTTP | 16/16 PASS |
| SYN-BUG-001 | 12/12 PASS |
| SYN-BUG-002 | 3/3 PASS |
| SYN-BUG-003 | 5/5 PASS |
| Phase 47 | 40/40 |
| Phase 48 | 20/20 |
| Phase 49 | **40/40** |
| Phase 50 | 30/30 |
| Phase 60 | 40/40 |
| Phase 61 | 40/40 |
| Phase 62 | 40/40 |
| Phase 63 | 40/40 |
| Phase 64 | 40/40 |
| `npx tsc --noEmit` | PASS |
| `npx next build` | PASS (pre-existing turbopack fs-tracing warnings) |

---

## KNOWN LIMITATIONS

- **CLIENT_AUTH_NOT_IMPLEMENTED.** Do not treat `/client` as a production authenticated portal.
- **No SSO / user directory.** Single operator password/token; no per-user accounts.
- **Login POST** is public (necessary). No rate-limit / lockout: **NOT_IMPLEMENTED**.
- **Tenant binding** applies when `SYNAPSE_OPERATOR_ORGANIZATION_ID` is set. Unscoped operator (env unset) can still list all organizations.
- **POST body org/project** is not parsed by the central gate (body can be read once). Query `organizationId` mismatches are enforced.
- Several operator pages import repositories in client components (fixture / in-memory). That is a separate data-plane issue, not HTTP auth.
- Browser login on a process with no `SYNAPSE_OPERATOR_TOKEN` / `SYNAPSE_OPERATOR_PASSWORD` fails closed (cannot mint a session).

---

## SUCCESS CONDITION

```
SERVER SECRET        → never exposed to browser          IMPLEMENTED / VERIFIED
BROWSER              → authenticated session             IMPLEMENTED / VERIFIED
SESSION              → server-established identity       IMPLEMENTED / VERIFIED
IDENTITY             → tenant/project authorization      IMPLEMENTED (when org bound) / VERIFIED
AUTHORIZATION        → existing privileged firewall      IMPLEMENTED / VERIFIED
CLIENT HTTP AUTH     →                                   NOT_IMPLEMENTED
```

No V1 certification is claimed.
