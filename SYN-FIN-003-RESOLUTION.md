# SYN-FIN-003 RESOLUTION

**Bug ID:** SYN-FIN-003  
**Title:** Anonymous approval pages leak production approval records through the HTTP/RSC response  
**Severity:** HIGH  
**Status:** FIXED  
**Date:** 31 August 2026

This is a new, real-world bug. It is not a reopening of SYN-BUG-001 (API auth still holds). SYNAPSE V1 is **not** certified by this fix. SYN-FIN-004 was not started.

---

## AUDIT CLAIM

Unauthenticated `GET /approvals` and `GET /approvals/[approvalRequestId]` include approval-control records in the React Server Component payload even when the visible UI shows only “Checking operator session…”.

---

## REPRODUCTION

**REPRODUCED: YES** (data exposure). UI hiding: present and insufficient.

Pre-fix production server (`next start`), no cookies:

```
GET http://127.0.0.1:3023/approvals
```

| Observation | Result |
|---|---|
| HTTP status | **200** |
| `x-nextjs-prerender` | **1** (static) |
| `Cache-Control` | `s-maxage=31536000` |
| Visible HTML | `Checking operator session…` |
| Body length | 67426 bytes |

```
GET http://127.0.0.1:3023/approvals/APPR-DEPLOY-001
```

| Observation | Result |
|---|---|
| HTTP status | **200** |
| Visible HTML | session spinner |
| Body length | 11349 bytes |

A 200 with a spinner is **not** protection. The same documents contained `self.__next_f` flight data.

---

## EXACT DATA EXPOSED

Serialized into anonymous HTML/RSC (`ApprovalsBoard` props `requests:[...]`):

| Field | Example from `GET /approvals` |
|---|---|
| `approvalRequestId` | `APPR-DEPLOY-001` plus runtime `APPR-*` rows |
| `organizationId` | `ORG-CASILI-01` |
| `projectId` | `PRJ-SINDOUS-01` |
| `workspaceId` | `WS-SINDOUS-01` |
| `requestType` | `PRODUCTION_DEPLOYMENT` |
| `status` / `riskLevel` | `APPROVED` / `HIGH` (and other states) |
| `proposedAction` | `Promote verified build artifact to live production domain https://sindous.ph` |
| `snapshotId` | `SNAP-SINDOUS-FINAL` |
| `releaseCandidateId` | `RC-FINAL-P49-SINDOUS` |
| `sourceHash` | `a9406accb7cc98e2...` |
| `manifestHash` | `manifest_99a8b...` |
| `consequences` | `Website goes live to public traffic.` |
| `responsibleRole` | `OPERATOR` |
| plus | workflow/work-item ids, evidence ids, timestamps |

Detail HTML also rendered project, domain, snapshot, and hashes in the document body.

`OperatorSessionGate` only replaced **chrome** after a client `/api/auth/session` check. Children were already serialized.

---

## ROOT CAUSE

Exact path:

1. `src/proxy.ts` matcher was `/api/:path*` only. Page routes were not gated.
2. `src/app/layout.tsx` wraps pages in client `OperatorSessionGate` (UI hide / client redirect).
3. `src/app/approvals/page.tsx` was a **Server Component** that queried `approvalControlRepository.listRequests({ organizationId: "ORG-CASILI-01" })` with a hardcoded tenant, **before any auth**.
4. The full `ApprovalRequestRecord[]` was passed into client `ApprovalsBoard`, so Next.js put it in the RSC payload.
5. `/approvals` was **statically prerendered** (`○`). `next start` served cached HTML (`x-nextjs-prerender: 1`) containing the store to anyone.
6. `src/app/approvals/[approvalRequestId]/page.tsx` loaded `getApprovalPreview(id, "ORG-CASILI-01")` the same way.

This is **auth too late + fetch-then-hide + static serialization of an unscoped read model**. `/api/approvals/approve` already required operator HTTP auth (different approval stack). The page never used that API for the list/detail read.

---

## FIX

Server-side boundary, before any approval query:

**HTTP request → identity (cookie or bearer) → operator authorization → tenant/project scope → query → render**

1. `proxy.ts` matches `/approvals` and `/approvals/:path*`. Unauthenticated or non-operator callers get `307 /login?next=...` **before** the page renders. API still JSON 401.
2. Both pages call `requireOperatorPagePrincipal` (`headers()` + existing `resolveHttpIdentity`) **then** load data. `export const dynamic = "force-dynamic"` so the list is no longer prerendered.
3. `approvalControlService.listVisibleForPrincipal` / `getVisiblePreview` reuse `privilegedActionFirewall` action `OPERATOR_APPROVAL` (no second matrix). Org comes from the principal, not `ORG-CASILI-01`. Optional workspace and `projectId` claim must match the stored record.
4. List RSC props are a slim board item (id, project, type, status, risk, proposed action). Hashes and tenant internals are not passed to the client table.

Unauthenticated callers never enter the repository.

---

## BEFORE / AFTER HTTP BEHAVIOR

| Request | Before | After |
|---|---|---|
| Anonymous `GET /approvals` | 200, prerendered, 67k, full store in `__next_f` | **307** `/login?next=%2Fapprovals`, body 24 bytes, **no record fields** |
| Anonymous `GET /approvals/APPR-DEPLOY-001` | 200, spinner + snapshot/domain/hashes | **307** `/login?...`, body 42 bytes, **no record fields** |
| Anonymous RSC (`RSC: 1`) | (flight data in HTML document) | **307**, no record fields |
| Forged bearer / forged cookie | 200 + leak | **307**, no record fields |
| Valid operator session | N/A (data was public) | **200**, list contains `APPR-DEPLOY-001`; detail contains snapshot |
| Operator + `?projectId=PRJ-FOREIGN` | ignored | 200 not-found, no `sindous.ph` / hashes |
| Operator cookie org `ORG-FIN003-B` | hardcoded `ORG-CASILI-01` dump | no record fields |
| `CLIENT_SESSION` | N/A (no client identity) | firewall `INVALID_ROLE`, empty list / null preview |
| Build output `/approvals` | `○` static | `ƒ` dynamic |

A 307 is accepted **only** because the response body was inspected and contained no approval records.

---

## RSC RESPONSE TEST

Anonymous `GET /approvals` with `RSC: 1`:

- status **307**
- location `/login?next=%2Fapprovals`
- body length **24**
- needles `APPR-DEPLOY-001`, `sindous.ph`, `SNAP-SINDOUS-FINAL`, hashes: **absent**

Authorized operator HTML/RSC:

- list **200** includes `APPR-DEPLOY-001`
- list does **not** include `sourceHash` / `a9406accb7cc98e2` / `manifest_99a8b`
- detail **200** includes `SNAP-SINDOUS-FINAL`

---

## AUTHORIZATION TESTS

| Actor | Result |
|---|---|
| Anonymous | 307 login, no records |
| Forged bearer | 307 login, no records |
| Forged HMAC cookie | 307 login, no records |
| `CLIENT_SESSION` (service) | `INVALID_ROLE`, no records |
| Valid `OPERATOR` session | 200, scoped records render |

---

## TENANT / PROJECT TESTS

| Attempt | Result |
|---|---|
| `ORG-FIN003-B` → `APPR-DEPLOY-001` | no preview; HTTP body has no record fields |
| `projectId=PRJ-FOREIGN` → same id | no preview; HTTP body has no record fields |
| Guess `APPR-DEPLOY-001` without auth | 307, no store dump |
| Operator `ORG-CASILI-01` | allowed for that tenant’s records |

---

## REGRESSION

Harness: `test_syn_fin_003_approval_data_exposure.ts` (inspects real `next start` HTTP bodies; does not treat status alone as proof).

| # | Case | Result |
|---|---|---|
| 1 | Anonymous `/approvals` | PASS |
| 2 | Anonymous approval detail | PASS |
| 3 | Forged bearer | PASS |
| 4 | Forged cookie | PASS |
| 5 | Wrong project (service + HTTP) | PASS |
| 6 | Wrong tenant (service + HTTP) | PASS |
| 7 | Client against operator approval | PASS |
| 8 | Valid operator | PASS |
| 9 | No sensitive RSC payload for anonymous | PASS |
| 10 | No approval record leaked via HTML | PASS |
| 11 | No approval record leaked via RSC | PASS |
| 12 | Authorized operator data still renders | PASS |

**12/12 PASS**

| Suite | Result |
|---|---|
| SYN-BUG-001 HTTP | **12/12** |
| SYN-BUG-002 | **3/3** |
| SYN-BUG-003 | **5/5** |
| SYN-FIN-001 | **10/10** |
| SYN-FIN-002 | **10/10** |
| Phase 47 | **40/40** |
| Phase 48 | **20/20** |
| Phase 49 | **40/40** |
| Phase 60 | **40/40** |
| Phase 61 | **40/40** |
| Phase 62 | **40/40** |
| Phase 63 | **40/40** |
| Phase 64 | **40/40** |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** (`/approvals` is dynamic) |

---

## LIMITATIONS

- Other operator HTML routes (`/finance`, `/project-control`, …) remain outside this finding. They may still prerender or hide-only via `OperatorSessionGate`. This fix is scoped to `/approvals`.
- HTTP identity is still operator bearer or HMAC session only. `CLIENT_AUTH_NOT_IMPLEMENTED` is unchanged; client cannot mint a valid operator cookie.
- Operators without `organizationId` on the principal see an empty board (fail closed). Data is not dumped across tenants.
- `/api/approvals/approve` is a different approval store (`approval.repository`). Out of scope except that it was already operator-gated.
- This fix does not certify SYNAPSE V1.

---

## Affected files

| File | Change |
|---|---|
| `src/proxy.ts` | Gate `/approvals` with login redirect before render |
| `src/lib/http/require-operator-page.ts` | Page identity from cookie/bearer; redirect if missing |
| `src/app/approvals/page.tsx` | Auth then scoped list; force-dynamic |
| `src/app/approvals/[approvalRequestId]/page.tsx` | Auth then scoped preview |
| `src/app/approvals/ApprovalsBoard.tsx` | Slim board item type |
| `src/lib/services/approval/approval-control.service.ts` | `listVisibleForPrincipal` / `getVisiblePreview` |
| `src/lib/repositories/approval-control.repository.ts` | Optional `workspaceId` list filter |
| `test_syn_fin_003_approval_data_exposure.ts` | HTTP/RSC regression (12 cases) |
