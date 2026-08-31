# SYN-FIN-002 RESOLUTION

**Bug ID:** SYN-FIN-002  
**Title:** DNS cutover bypasses kill switch and privileged firewall; persists fabricated DNS/TLS/health evidence  
**Severity:** HIGH  
**Status:** FIXED  
**Date:** 31 August 2026

This is a new, real-world bug. It is not a reopening of SYN-BUG-001/002/003. SYNAPSE V1 is **not** certified by this fix. SYN-FIN-003 was not started.

---

## AUDIT CLAIM

`productionReleaseService.approveDNSCutover` (HTTP `POST /api/production-release/dns/cutover`) can execute while `EMERGENCY_STOP` is active, without `privilegedActionFirewall`, and can persist fabricated DNS ownership, TLS, HTTP, and browser-health success without calling a DNS/TLS provider.

---

## REPRODUCTION

**REPRODUCED: YES**

Pre-fix in-process call, seeded release in `waiting_dns_approval`, kill switch = `EMERGENCY_STOP`:

```ts
await productionReleaseService.approveDNSCutover({
  releaseId,
  domainName: "repro.example.com",
});
```

Observed before the fix:

| Field | Result |
|---|---|
| threw | false (should have been `EMERGENCY_STOP_BLOCKED`) |
| release.status | `verifying` |
| release.verifiedAt / cutoverAt | set |
| customDomainTls | `VALID (Let's Encrypt / Vercel TLS Certificate)` |
| customDomainHttp | `200` |
| postCutoverBrowserHealth | `PASS` |
| domain.ownershipStatus | `verified` |
| domain.verificationStatus | `verified` |
| domain.status | `active` |
| provider call | none |

No DNS, TLS, or health provider was consulted. Evidence was hardcoded.

---

## ROOT CAUSE

`approveDNSCutover` was a local persistence writer, not a gated provider request.

Sibling methods `approveProductionDeployment`, `confirmProductionLive`, and `rollbackRelease` already called `emergencyKillSwitch` (`DEPLOYMENT`) and `privilegedActionFirewall` (`PRODUCTION_DEPLOYMENT`). DNS cutover did not.

Caller-controlled / invented fields that became “verified” evidence:

| Source | Used as |
|---|---|
| (none — hardcoded) | `ownershipStatus: "verified"` |
| (none — hardcoded) | `verificationStatus: "verified"` |
| (none — hardcoded) | `status: "active"`, `verifiedAt`, `cutoverAt` |
| (none — hardcoded) | TLS `VALID (Let's Encrypt / Vercel TLS Certificate)` |
| (none — hardcoded) | HTTP `200`, health `PASS`, contact-form `SUCCESS` |
| invented MX/TXT snapshot | “preserved records” proof |
| `POST` body forwarded wholesale | any extra caller flags ignored only because the method already invented success |

Not consulted:

- `emergencyKillSwitch`
- `privilegedActionFirewall`
- `vercelDeploymentProvider` (existing provider; preview deploy only — no DNS API until this fix)
- stored `organizationId` / `workspaceId` / `projectId` vs caller identity

The HTTP route forwarded the raw body after no service-level gates (HTTP auth from SYN-BUG-001 still applied at `proxy.ts`, but did not enforce kill switch, firewall, or evidence honesty).

There was no separate DNS provider. Adding a fake one would have continued the same class of lie.

---

## FIX

Reuse the existing production-release service, kill switch, privileged firewall, and Vercel deployment provider. No second authorization matrix. No fake provider. No new deployment system.

### Gate order (authoritative mutation method)

1. `emergencyKillSwitch.isOperationAllowed("DEPLOYMENT")` — fail closed: `EMERGENCY_STOP_BLOCKED`
2. Load release; derive `projectId` from the **stored** release (not caller body as resource id)
3. Derive `targetOrgId` / `workspaceId` from `productionProjectRepository` (fallback: `project.metadata.organizationId`)
4. Workspace mismatch → `TENANT_BOUNDARY_VIOLATION`
5. `privilegedActionFirewall.evaluate({ action: "PRODUCTION_DEPLOYMENT", ... })`  
   - missing `actorRole` defaults to `FRONTEND_REQUEST` (denied)  
   - org mismatch → `TENANT_BOUNDARY_VIOLATION`  
   - caller project claim vs release project → `PROJECT_BOUNDARY_VIOLATION`
6. Idempotent return if the same project already has the same domain (after gates)
7. `vercelDeploymentProvider.requestCustomDomain({ domain })`
8. Persist **only** if the provider returns `ok: true`
9. Persist provider-reported fields only; TLS/HTTP/health remain `NOT_VERIFIED` (this method does not probe)

### Provider

Existing `vercel.provider.ts`:

- Missing `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` → `ok: false`, `NOT_SUPPORTED`, `DNS_PROVIDER_NOT_CONFIGURED`. **No persist.**
- Configured: `POST https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/domains`
- `ownershipStatus: "verified"` only if the API returns `verified === true`
- `verificationStatus`, `tlsStatus`, `httpStatus`, `healthStatus` always `NOT_VERIFIED` on this path
- `evidenceClass: "LIVE"` means the live Vercel API was queried, **not** that the site is live
- Tests may stub `CONTROLLED_TEST`. Production never writes `LIVE_REAL`.

### HTTP route

Forwards only:

- `releaseId`, `domainName`
- `actorRole`, `callerOrgId`, `callerWorkspaceId` from `requireHttpPrincipal` (server identity)
- optional `body.projectId` as a **claim** checked against the stored release project

Does **not** forward TLS, HTTP, health, ownership, verification, or provider-success flags.

---

## BEFORE / AFTER

| Case | Before | After |
|---|---|---|
| Cutover during `EMERGENCY_STOP` | release `verifying`, domain `active` / `verified` | `EMERGENCY_STOP_BLOCKED`; no DNS/release mutation |
| `CLIENT_SESSION` | succeeded (no firewall) | `UNAUTHORIZED_OPERATION` / `INVALID_ROLE`; no mutation |
| Project A actor → Project B release | ignored | `PROJECT_BOUNDARY_VIOLATION` |
| Tenant A → Tenant B | ignored | `TENANT_BOUNDARY_VIOLATION` |
| No `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` | invented verified/active domain | `DNS_PROVIDER_NOT_CONFIGURED` / `NOT_SUPPORTED`; no persist |
| Caller `healthEvidence` VALID/200/PASS | persisted as success | ignored; no mutation without provider `ok` |
| Authorized operator + provider `ok` | hardcoded VALID/PASS/active | persist request as `dns_updating` / `waiting_approval` / `NOT_VERIFIED` |
| Duplicate same domain | second fabricated record | idempotent; `newlyApplied: false` |
| TLS/HTTP/browser health | invented VALID / 200 / PASS | `NOT_VERIFIED` (no probe exists) |

---

## EVIDENCE MODEL

A persisted record on this path must never claim `VERIFIED` / `SUCCESS` / `LIVE` / `HEALTHY` unless the underlying operation occurred **and** was verified.

| Field | After successful request | After fail-closed |
|---|---|---|
| `domain.ownershipStatus` | provider: `verified` only if Vercel `verified === true`; else `NOT_VERIFIED` | not written |
| `domain.verificationStatus` | `NOT_VERIFIED` (API add is not DNS/TLS verification) | not written |
| `domain.status` | `waiting_approval` (not `active`) | not written |
| `domain.verifiedAt` / `cutoverAt` | not set | not written |
| `release.status` | `dns_updating` (not `verifying` / `live`) | unchanged |
| `release.verifiedAt` / `cutoverAt` | not set | unchanged |
| `healthEvidence.customDomainTls` | `NOT_VERIFIED` | unchanged |
| `healthEvidence.customDomainHttp` | `NOT_VERIFIED` | unchanged |
| `healthEvidence.postCutoverBrowserHealth` | `NOT_VERIFIED` | unchanged |
| `healthEvidence.evidenceClass` | `LIVE` (live API queried) or `CONTROLLED_TEST` (test stub only) | not written |
| Unconfigured provider | n/a | throw `NOT_SUPPORTED`; no domain row |

`CONTROLLED_TEST` is a test-harness label only. It is never `LIVE_REAL`.

---

## REGRESSION

Harness: `test_syn_fin_002_dns_cutover.ts`

| # | Case | Result |
|---|---|---|
| 1 | Emergency stop active | PASS |
| 2 | Unauthorized actor (`CLIENT_SESSION`) | PASS |
| 3 | Cross-project attempt | PASS |
| 4 | Cross-tenant attempt | PASS |
| 5 | Missing provider credentials | PASS |
| 6 | Fake provider success (caller payload) | PASS |
| 7 | Fabricated TLS evidence | PASS |
| 8 | Fabricated health evidence | PASS |
| 9 | Authorized controlled operation (`CONTROLLED_TEST`) | PASS |
| 10 | Duplicate / idempotent operation | PASS |

**10/10 PASS**

Cases 9–10 stub `requestCustomDomain` in the **test file only**. Production has no mock success path.

| Suite | Result |
|---|---|
| SYN-BUG-001 HTTP | **12/12** |
| SYN-BUG-002 | **3/3** |
| SYN-BUG-003 | **5/5** |
| SYN-FIN-001 | **10/10** |
| Phase 47 | **40/40** |
| Phase 48 | **20/20** |
| Phase 49 | **40/40** |
| Phase 60 | **40/40** |
| Phase 63 | **40/40** |
| Phase 64 | **40/40** |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |

---

## LIMITATIONS

- HTTP authentication (SYN-BUG-001) is unchanged and still required. This bug was reachable behind a valid operator session/token **and** via in-process service call with no HTTP at all.
- This path requests a Vercel custom domain. It does **not** probe public DNS, TLS certificates, or browser health. Those stay `NOT_VERIFIED`.
- `ownershipStatus: "verified"` is Vercel’s domain-ownership flag only, and only when the API reports `verified === true`.
- `evidenceClass: "LIVE"` means the live Vercel API was called, not that production traffic or TLS is live.
- Operator HTTP identity has no `projectId`. Optional `body.projectId` is a claim checked against the stored release; omitting it skips the project-claim check. The mutated project is always the release’s stored `projectId`.
- Tenant check requires both caller org (principal / `callerOrgId`) and target org on the production project. If either is absent, org mismatch cannot be proven and is not invented.
- `approveProductionDeployment` still writes hardcoded production URL / health (SYN-FIN-004). Out of scope.
- Kill-switch gaps on invoice verify/record/reverse and related approval routes (SYN-FIN-005) are out of scope.
- `CLIENT_AUTH_NOT_IMPLEMENTED` is unchanged.
- This fix does not certify SYNAPSE V1.

---

## Affected files

| File | Change |
|---|---|
| `src/lib/services/production-release/production-release.service.ts` | Kill switch, firewall, scope, provider-backed persist, honest evidence |
| `src/app/api/production-release/dns/cutover/route.ts` | Authenticated principal; identifiers only |
| `src/lib/deployment/providers/vercel.provider.ts` | `requestCustomDomain`; fail closed if unconfigured |
| `src/lib/services/security/privileged-action-firewall.service.ts` | Optional `callerProjectId` → `PROJECT_BOUNDARY_VIOLATION` |
| `test_syn_fin_002_dns_cutover.ts` | Targeted regression (10 cases) |
