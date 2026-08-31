# SYN-FIN-004 RESOLUTION

**Bug ID:** SYN-FIN-004  
**Title:** Production approve path records fabricated deployment URL / HTTP 200 health without provider evidence  
**Severity:** MEDIUM  
**Status:** FIXED  
**Date:** 31 August 2026

This is a new, real-world bug. It is not a reopening of SYN-FIN-002 (DNS cutover). SYNAPSE V1 is **not** certified by this fix. SYN-FIN-005 was not started.

---

## AUDIT CLAIM

`productionReleaseService.approveProductionDeployment` (HTTP `POST /api/production-release/approve`) can persist `https://apex-logistics-prod.vercel.app`, a generated `dpl_prod_*` id, HTTP 200, TLS `VALID`, and viewport `PASS` without calling the Vercel deployment provider or performing a health probe.

---

## REPRODUCTION

**REPRODUCED: YES**

Pre-fix in-process call, seeded release `waiting_release_approval`, kill switch `NORMAL`, **no Vercel API call**:

```ts
await productionReleaseService.approveProductionDeployment(releaseId, "OPERATOR");
```

Observed:

| Field | Result |
|---|---|
| `status` | `waiting_dns_approval` |
| `productionUrl` | `https://apex-logistics-prod.vercel.app` |
| `providerDeploymentId` | `dpl_prod_58918963` (timestamp-derived) |
| `deployedAt` | set |
| `healthEvidence.httpStatus` | `200` |
| `healthEvidence.tlsStatus` | `VALID` |
| `healthEvidence.homepageRender` | `SUCCESS` |
| `dnsPlan` | invented apex.casili.dev CNAME + MX/TXT “preserved” records |
| provider call | none |

Approval and deployment were collapsed into one fabricated success record.

---

## ROOT CAUSE

`approveProductionDeployment` already enforced kill switch and `privilegedActionFirewall`. After those gates it **did not call** `vercelDeploymentProvider`. It assigned literals:

- URL `https://apex-logistics-prod.vercel.app`
- id `dpl_prod_${Date.now().slice(-8)}`
- HTTP 200 / TLS VALID / viewport PASS
- DNS plan for Apex Logistics

`productionHealthService.evaluateHealth` only maps an already-supplied verification object; it did not probe HTTP. `VercelDeploymentAdapter.deploy` (a separate adapter) can invent `https://${projectId}.vercel.app` when a token exists — that path was **not** used here and was not turned into a production success path.

Existing `vercelDeploymentProvider.deployPreview` already talks to the Vercel API and fail-closes without `VERCEL_TOKEN`. The production-release approve path simply never used it.

---

## AFFECTED FILES

| File | Change |
|---|---|
| `src/lib/services/production-release/production-release.service.ts` | Approve ≠ deploy; provider-backed persist; honest health |
| `src/lib/deployment/providers/vercel.provider.ts` | `deployProduction`; timeout; production target |
| `src/lib/deployment/types.ts` | Optional `target` on deploy metadata |
| `src/lib/services/deployment/production-health.service.ts` | Real `probeHttp` (no invented 200) |
| `src/app/api/production-release/approve/route.ts` | Unchanged (already forwards `releaseId` + principal role only) |
| `test_syn_fin_004_production_deployment_evidence.ts` | Targeted regression (15 cases) |

---

## FIX

Reuse the existing Vercel provider, production-release service, health service, kill switch, and firewall. No new deployment system. No fake provider.

### Gate and persist order

1. `emergencyKillSwitch` `DEPLOYMENT` → `EMERGENCY_STOP_BLOCKED` (no mutation)
2. `privilegedActionFirewall` `PRODUCTION_DEPLOYMENT`
3. Load stored release
4. Persist **APPROVED** (`approvedBy` / `approvedAt`, health `NOT_VERIFIED`) — authorization only
5. `vercelDeploymentProvider.deployProduction` (existing Vercel API, `target: production`, 20s timeout)
6. If unconfigured → remain **APPROVED**, `NO_PROVIDER_DEPLOYMENT_ID`, URL `NOT_VERIFIED`, throw `DEPLOYMENT_BLOCKED: NOT_SUPPORTED`
7. If provider 500 / timeout / invalid credentials → **FAILED**, no fake URL/id/health, throw `DEPLOYMENT_BLOCKED`
8. If provider `ok` → **DEPLOYED** with **provider** id and URL
9. Health: `NOT_VERIFIED` unless `probeHttp` actually ran. CONTROLLED_TEST stubs skip live fetch. TLS remains `NOT_VERIFIED` (no certificate probe).

Caller-supplied URL / HTTP 200 / HEALTHY / `dpl_prod_*` arguments are not part of the method contract and are ignored.

DNS plan is no longer invented on this path.

---

## BEFORE / AFTER

| Case | Before | After |
|---|---|---|
| Unconfigured Vercel | apex URL, HTTP 200, `dpl_prod_*` | `DEPLOYMENT_BLOCKED: NOT_SUPPORTED`; status `approved`; no fake evidence |
| Provider 500 / timeout | same fabricated success | status `failed`; URL `NOT_VERIFIED` |
| Caller fake URL/200/HEALTHY/id | N/A (already hardcoded) | ignored; provider result only |
| `EMERGENCY_STOP` | already blocked | still blocked; **no** approval persist |
| Authorized CONTROLLED_TEST stub | N/A | status `deployed`; stub URL/id; health `NOT_VERIFIED`; not `LIVE_REAL` |
| LIVE deploy + probe 200 | invented 200 | HTTP 200 only if `probeHttp` observed it |
| Approval vs deploy | collapsed into `waiting_dns_approval` + fake live health | `approved` without deploy; `deployed` without claiming `live` |

---

## EVIDENCE SOURCE

| Field | Source | Verified? | Evidence class |
|---|---|---|---|
| `approvedAt` / `approvedBy` | operator firewall + kill switch | YES (authorization) | n/a |
| `status: approved` | same, no provider | n/a | n/a |
| `providerDeploymentId` | Vercel API `id` | YES if `ok` | `LIVE` or `CONTROLLED_TEST` |
| `providerDeploymentId` if none | sentinel | NO | `NO_PROVIDER_DEPLOYMENT_ID` |
| `productionUrl` | Vercel API `url` | YES if HTTP(S) URL returned | `LIVE` or `CONTROLLED_TEST` |
| `productionUrl` if none | sentinel | NO | `NOT_VERIFIED` |
| `status: deployed` | provider `ok: true` | YES (deploy, not live traffic) | same as provider |
| `status: failed` | provider error | YES (failure) | n/a |
| `healthEvidence.httpStatus` | `productionHealthService.probeHttp` GET | YES only if probe ran | `LIVE` or `CONTROLLED_TEST` |
| `healthEvidence.httpStatus` otherwise | none | NO | `NOT_VERIFIED` |
| `healthEvidence.tlsStatus` | none (no TLS probe) | NO | `NOT_VERIFIED` |
| `healthEvidence.homepageRender` | none | NO | `NOT_VERIFIED` |
| DNS records | not written on this path | NO | n/a |

`LIVE` means the live Vercel API (or live HTTP probe) was used. It does **not** mean the site is `LIVE` traffic. Release `status` stays `deployed` until the existing confirm-live path.

---

## CONTROLLED_TEST VS LIVE_REAL

Production `deployProduction` never returns mock success. Tests stub `deployProduction` / `probeHttp` in **`test_syn_fin_004_production_deployment_evidence.ts` only**, labeled `CONTROLLED_TEST`. Production code does not write `LIVE_REAL`.

---

## REGRESSION

Harness: `test_syn_fin_004_production_deployment_evidence.ts`

| # | Case | Result |
|---|---|---|
| 1 | Unconfigured provider | PASS |
| 2 | Provider failure | PASS |
| 3 | Provider timeout | PASS |
| 4 | Fake provider response | PASS |
| 5 | Hardcoded URL attempt | PASS |
| 6 | Hardcoded HTTP 200 attempt | PASS |
| 7 | Hardcoded HEALTHY attempt | PASS |
| 8 | Fake deployment ID attempt | PASS |
| 9 | Emergency stop | PASS |
| 10 | Authorized controlled deployment | PASS |
| 11 | Actual provider URL propagation | PASS |
| 12 | Actual health verification (CONTROLLED_TEST probe) | PASS |
| 13 | Approval without deployment | PASS |
| 14 | Deployment without verification | PASS |
| 15 | Correct failed state | PASS |

**15/15 PASS**

| Suite | Result |
|---|---|
| SYN-BUG-001 HTTP | **12/12** |
| SYN-BUG-002 | **3/3** |
| SYN-BUG-003 | **5/5** |
| SYN-FIN-001 | **10/10** |
| SYN-FIN-002 | **10/10** |
| SYN-FIN-003 | **12/12** |
| Phase 47 | **40/40** |
| Phase 48 | **20/20** |
| Phase 49 | **40/40** |
| Phase 50 | **30/30** |
| Phase 60 | **40/40** |
| Phase 61 | **40/40** |
| Phase 62 | **40/40** |
| Phase 63 | **40/40** |
| Phase 64 | **40/40** |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |

---

## LIMITATIONS

- `confirmProductionLive` can still mark a release `live` without a new provider check (out of scope).
- `VercelDeploymentAdapter.deploy` still invents a `*.vercel.app` URL when a token is present. That adapter is not on this approve path.
- TLS / browser / viewport health are not probed. They stay `NOT_VERIFIED`.
- `deployProduction` reuses the existing Vercel deployments API (`deployPreview` internals) with `target: production`. It does not upload a full monorepo; missing workspace files fail closed.
- Preview `deployment.service.approveDeployment` is unchanged.
- This fix does not certify SYNAPSE V1.
