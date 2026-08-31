# SYN-BUG-001 RESOLUTION

**BUG ID:** SYN-BUG-001  
**SEVERITY:** CRITICAL  
**TITLE:** HTTP API surface had no caller-identity binding  
**DATE:** 31 August 2026  
**STATUS:** FIXED

---

## AUDIT CLAIM

All 133 handlers under `src/app/api/**/route.ts` accepted unauthenticated HTTP. No `middleware.ts` / `proxy.ts` existed. `clientAuthService`, `authorizationService`, and `projectIsolationService` existed but were unwired. Live probes on 31 August 2026 returned tenant contracts, invoices, PayPal order IDs, and client emails with no cookies or Authorization header. Privileged mutations returned 400 (validation) rather than 401.

Independent investigation **reproduced** the HTTP gap. The unused helper services were **not** treated as a production identity source.

---

## AFFECTED ROUTES

Every `src/app/api/**/route.ts` handler (133). Prioritized live probes:

| Route | Class | Reason |
|---|---|---|
| `GET/POST /api/ai/health` | OPERATOR_ONLY | Model registry, provider routing, inference/test actions |
| `/api/approvals/*` | OPERATOR_ONLY | Privileged state transition |
| `/api/payments/paypal/verify` and request/create/approve/list/delivery | OPERATOR_ONLY | Financial mutation and disclosure |
| `/api/payments/paypal/webhook` | PUBLIC | PayPal signature is the authenticator |
| `/api/agreements/signing/embed-url` | PUBLIC | Dropbox Sign `signatureId` capability for the signer embed |
| `/api/production-release/*` | OPERATOR_ONLY | Deploy / rollback / DNS / go-live |
| `/api/invoices/*` | OPERATOR_ONLY | Financial access and mutation |
| `/api/projects/*` | OPERATOR_ONLY | Tenant/project access |
| `/api/organizations/*` | OPERATOR_ONLY | Cross-tenant listing |
| `/api/handover/*` | OPERATOR_ONLY | Payment reconcile and close |
| `/api/client-review/*` | OPERATOR_ONLY | Review and deploy |
| `/api/deployment/*` | OPERATOR_ONLY | Deployment approve/request |
| `/api/developer/*` | OPERATOR_ONLY | Source mutation |
| HTML pages (`/`, `/finance`, `/client`, …) | PUBLIC | UI documents; not API |

There are no `/api/delivery`, `/api/billing`, `/api/crm`, `/api/work`, `/api/workers`, `/api/notifications`, `/api/review`, `/api/operations`, or `/api/client` route trees. Those surfaces are pages and/or other `/api/*` prefixes above.

Default for any unmatched `/api/*` path: **OPERATOR_ONLY** (fail closed).

`CLIENT_ONLY` and a user-session `AUTHENTICATED` class are **NOT_IMPLEMENTED** (no client HTTP identity exists).

---

## REPRODUCTION

**REPRODUCED: YES** (before the fix, and re-probed live after)

### Before (route source + prior audit live probe)

`GET /api/projects/list` had no auth call. Same for invoices, organizations, PayPal request list. `POST /api/production-release/approve` called `approveProductionDeployment(releaseId)` which defaults `actorRole = "OPERATOR"`.

Audit live results (31 August 2026, `localhost:3010`, no cookies):

- `GET /api/projects/list` → 200, contract value, paid/outstanding
- `GET /api/invoices/list` and `GET /api/invoices/get?id=INV-43-1309` → 200, client email
- `GET /api/organizations/list` → 200, multiple tenants
- `GET /api/payments/paypal/request/list` → 200, PayPal order IDs and amounts
- `POST /api/production-release/approve` with `{}` → 400 missing `releaseId`, not 401
- `GET /api/ai/health` → 200 with `modelRegistry`, `agentPolicies`, `allowedProviders`

### After (live HTTP, 31 August 2026, `localhost:3010`)

| Request | Result |
|---|---|
| `GET /api/ai/health` | **401** `UNAUTHENTICATED` |
| `GET /api/projects/list` | **401** `UNAUTHENTICATED` |
| `GET /api/invoices/list` | **401** `UNAUTHENTICATED` |
| `GET /api/organizations/list` | **401** `UNAUTHENTICATED` |
| `GET /api/payments/paypal/request/list` | **401** `UNAUTHENTICATED` |
| `POST /api/production-release/approve` with `actorRole: "OPERATOR"` and `x-actor-role: OPERATOR` | **401** `UNAUTHENTICATED` |
| `POST /api/payments/paypal/verify` | **401** `UNAUTHENTICATED` |
| `POST /api/approvals/approve` | **401** `UNAUTHENTICATED` |
| `GET` with `Authorization: Bearer forged-operator` | **401** `UNAUTHENTICATED` |
| `POST /api/payments/paypal/webhook` `{}` | **400** `UNSIGNED_WEBHOOK` (not 401) |
| `GET /api/agreements/signing/embed-url` | **400** `signatureId required` (not 401) |
| `GET /finance` (HTML page) | **200** page renders; AR fetch is empty because the page’s API call is now 401 |

Harness: `test_syn_bug_001_http_auth.ts` (12/12).

---

## EXPECTED HTTP BEHAVIOR

- Unauthenticated / forged-identity callers: **401** or **403**, fail closed
- Caller-supplied role, user id, organization id, or project id is **not** identity
- Authorized operator: reaches the production route
- PayPal webhook: remains callable without an operator token; signature verification stays authoritative
- HTML pages: remain public

---

## ACTUAL HTTP BEHAVIOR

**Before:** Unauthenticated callers were privilege-equivalent to an operator at the HTTP boundary.

**After:** Operator APIs require `Authorization: Bearer <SYNAPSE_OPERATOR_TOKEN>`. Forged role headers/body are ignored. Public webhook and signer embed-url skip the operator credential and still fail closed on their own capability checks.

---

## ROOT CAUSE

There was no HTTP identity layer. Security services that exist were never called from routes. Several privileged services default `actorRole = "OPERATOR"` when the HTTP caller omitted a role, so an unauthenticated request inherited operator privilege.

This is not the same bug as “firewall helpers exist.” Phase 49/64 “authentication bypass” tests call `privilegedActionFirewall.evaluate({ actorRole: "FRONTEND_REQUEST" })` in-process. They never issued HTTP. Those tests stayed green while the network was open.

---

## IDENTITY SOURCE

**Production HTTP identity is only:**

`Authorization: Bearer` compared (SHA-256 + `timingSafeEqual`) to `process.env.SYNAPSE_OPERATOR_TOKEN`.

| Not used as identity | Why |
|---|---|
| `x-actor-role`, `x-role`, body `actorRole` / `role` | Caller-controlled |
| Query/body `userId`, `organizationId`, `projectId`, `clientId` | Caller-controlled scope |
| Hardcoded `clientAuthService` tokens (`token-sindous-01`, …) | Stub fixtures, never a production IdP |
| `authorizationService.isAuthorized(actor, …)` | Trusts a caller-supplied actor enum |
| Supabase anon client | Persistence, `persistSession: false`, not user login |
| Cookies / NextAuth / Clerk | **NOT_IMPLEMENTED** (no login page, no next-auth package) |

If `SYNAPSE_OPERATOR_TOKEN` is unset or empty, **no** operator principal can exist. Fail closed.

Optional `SYNAPSE_OPERATOR_ORGANIZATION_ID` may bind the principal’s tenant. It is not a user directory.

---

## AUTHORIZATION SOURCE

1. `classifyApiPath` — PUBLIC vs OPERATOR_ONLY (default fail closed)
2. `denyUnlessAuthenticated` / `src/proxy.ts` matcher `/api/:path*`
3. Existing `privilegedActionFirewall` on production-release approve / confirm-live / rollback, now passed **`principal.actorRole`** from the HTTP principal instead of relying on the HTTP path hitting the `"OPERATOR"` default

In-process service defaults `actorRole = "OPERATOR"` remain for Phase fixtures that call services directly. That is a **test/service-path** default, not the HTTP path.

---

## TENANT / PROJECT SCOPING

Authentication now establishes an operator principal. It does **not** invent a per-user tenant map.

- Unauthenticated cross-tenant / cross-project HTTP is blocked (never reaches repositories)
- An authenticated operator credential is **process-wide** unless `SYNAPSE_OPERATOR_ORGANIZATION_ID` is set
- List endpoints still return all records the operator store holds
- Per-request `organizationId` / `projectId` from the client are **not** treated as the caller’s identity

`CLIENT_ONLY` HTTP and IdP-backed tenant claims: **NOT_IMPLEMENTED**.

---

## MINIMAL FIX

No new user-account system. No wiring of hardcoded client tokens. No `NEXT_PUBLIC_` operator secret.

| File | Change |
|---|---|
| `src/lib/http/http-identity.ts` | Bearer vs env token only |
| `src/lib/http/http-route-policy.ts` | Path classification |
| `src/lib/http/enforce-http-auth.ts` | Shared fail-closed gate |
| `src/proxy.ts` | Next.js 16 HTTP boundary (`/api/:path*`) |
| All 133 `src/app/api/**/route.ts` | Call `denyUnlessAuthenticated(req)` (PUBLIC paths no-op) |
| `src/app/api/production-release/{approve,rollback,confirm-live}/route.ts` | Pass authenticated `actorRole` into the existing firewall |
| `.env.example` | Documents `SYNAPSE_OPERATOR_TOKEN` (empty) |

Responses: `{ ok: false, error: "UNAUTHENTICATED" | "FORBIDDEN" }`. No provider secrets, policy matrices, or tenant payloads on denial.

---

## REGRESSION TESTS

`test_syn_bug_001_http_auth.ts`

| Case | Before | After |
|---|---|---|
| A. Unauthenticated sensitive GET/POST | 200 + data | 401, no registry/tenant payload |
| B. Forged operator header/body | would succeed | 401; `resolveHttpIdentity` is null |
| C. Forged client token `token-sindous-01` | would succeed | 401 (stub tokens not wired) |
| D–G. Forged project/org IDs | 200 listing | 401 before list |
| H–J. Client / worker / external on deploy/approve | 400/200 | 401 |
| `/api/ai/health` unauth GET/POST | registry + inference | 401 |
| `proxy.ts` forged bearer | n/a | 401 |
| Public webhook / embed-url | reachable | still reachable; 400 on missing capability |
| Authorized operator bearer | n/a | 200 on lists/health; privileged route reaches `releaseId is required` |
| Wrong bearer / unset env token | n/a | 401 |

---

## BEFORE/AFTER RESULT

**BEFORE:** `UNAUTHORIZED REQUEST SUCCEEDS`  
**AFTER:** `UNAUTHORIZED REQUEST BLOCKED` (401)  
**AUTHORIZED REQUEST:** `ALLOWED` when `SYNAPSE_OPERATOR_TOKEN` is configured and the matching Bearer is sent.

---

## FULL REGRESSION

| Suite | Result |
|---|---|
| SYN-BUG-001 targeted | 12/12 PASS |
| SYN-BUG-002 | 3/3 PASS |
| SYN-BUG-003 | 5/5 PASS |
| Phase 47 | 40/40 |
| Phase 48 | 20/20 |
| Phase 49 | 39/40 (test 27 only; see below) |
| Phase 60 | 40/40 |
| Phase 61 | 40/40 |
| Phase 62 | 40/40 |
| Phase 63 | 40/40 |
| Phase 64 | 40/40 |
| `npx tsc --noEmit` | PASS |
| `npx next build` | PASS (pre-existing turbopack fs-tracing warnings) |
| `npm run lint` | FAIL — pre-existing `any` / generated-site issues; new http modules clean |

Live HTTP on `localhost:3010` confirmed 401 on the audit’s original unauthenticated probes.

---

## PHASE 49 TEST 27

Unchanged by SYN-BUG-001. Classification remains **TEST_FIXTURE_FALSE_POSITIVE**: `auditSecretExposure` looks for the live `GMAIL_APP_PASSWORD` value inside a hardcoded fake string. Not a leak. Not remediated here.

---

## REMAINING LIMITATIONS

- **Login / SSO / session cookies:** NOT_IMPLEMENTED. Browser `fetch("/api/...")` from the operator UI does not send the server-only token, so dashboard API widgets now fail closed (e.g. `/finance` shows empty AR). That is expected until a real session exists. Do not put the token in `NEXT_PUBLIC_*`.
- **CLIENT_ONLY HTTP:** NOT_IMPLEMENTED. `clientAuthService` hardcoded tokens were not wired (would be fake auth).
- **Authenticated operator tenant scoping:** process-wide credential, not an IdP claim. Cross-tenant listing after a valid operator token is still possible.
- **Service-layer `actorRole = "OPERATOR"` defaults** remain for in-process callers (Phase fixtures). HTTP no longer hits those defaults without a principal.
- **SYN-BUG-005** (body `role` selects operator countersignature) is still present *after* authentication. Unauthenticated callers can no longer reach that route.
- **SYN-BUG-004 / 006 / 007** (firewall coverage, handover PayPal, fabricated deploy evidence) are separate and were not changed.
- HTML `/client/*` pages remain publicly renderable (no page-level login).

---

## STATUS

**FIXED**

Unauthenticated and forged-identity HTTP is blocked at `proxy.ts` and at each production route handler. Authorized HTTP is allowed only through the process-configured operator credential.

No V1 certification is claimed.
