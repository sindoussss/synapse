# SYN-BUG-003 RESOLUTION

**Bug ID:** SYN-BUG-003  
**Title:** Refund / dispute / reversal did not revoke source delivery or preserve historical payment state  
**Severity:** CRITICAL  
**Status:** FIXED  
**Date:** 31 August 2026

---

## Reproduction

**REPRODUCED: YES**

Harness: `test_syn_bug_003_refund_delivery_revocation.ts`

Seeded a paid invoice, a `succeeded` PayPal capture transaction, and a `DELIVERY_AUTHORIZED` package. Then invoked the handlers **the way the webhook actually mapped PayPal `custom_id`**: `projectId = paymentRequestId` (`PAY-REQ-…`), not the real project ID.

| Case | Before fix |
|---|---|
| `PAYMENT.CAPTURE.REFUNDED` | `deliveryRevoked=false`, invoice still `paid`, download succeeded, original capture overwritten to `refunded`, no compensating row |
| `CUSTOMER.DISPUTE.CREATED` | Delivery still `DELIVERY_AUTHORIZED`, download succeeded, original capture overwritten to `disputed` |
| `PAYMENT.CAPTURE.REVERSED` | Same as dispute; invoice still `paid` |
| Capture ID only (no projectId) | Delivery unchanged |

Phase 49 tests 21–22 stayed green because they pass `projectId: PRJ-SINDOUS-01` directly, which is not what the webhook does.

Unsigned webhooks remain rejected (`verifyWebhook` fail-closed). This bug is **post-authentication mapping**, not a signature bypass.

---

## Exact root cause

1. Order creation sets PayPal `custom_id` to the **payment request ID** (`paypal.service.ts` `customId: req.id`).
2. The webhook passed `resource.custom_id` as `projectId`.
3. `handleRefundWebhook` / `handleReversalWebhook` revoked delivery only via `getDeliveryByProject(projectId)`.
4. `getDeliveryByProject("PAY-REQ-…")` misses `PRJ-…` deliveries → `deliveryRevoked: false`.
5. Invoice `amountPaid` / `status` were never unwound.
6. The original `succeeded` transaction object was mutated in place and re-inserted, destroying historical paid evidence.

---

## Affected files

| File | Change |
|---|---|
| `src/app/api/payments/paypal/webhook/route.ts` | Pass `custom_id` as `paymentRequestId`; classify REVERSAL vs DISPUTE |
| `src/lib/services/payments/paypal.service.ts` | Resolve capture → invoice → deliveries; append compensating events; unwind invoice on refund/reversal |
| `src/lib/repositories/source-delivery.repository.ts` | `listDeliveriesByInvoice` |
| `test_syn_bug_003_refund_delivery_revocation.ts` | Regression harness |

Unchanged (still authoritative): `sourceDeliveryService.downloadSourcePackage` (blocks unless `DELIVERY_AUTHORIZED` / `DOWNLOADED`), `payPalProvider.verifyWebhook`.

---

## Minimal fix

No new payment, delivery, or ledger subsystem.

1. Resolve the original **succeeded** capture by `captureId`, then `paymentRequestId`.
2. **Do not mutate** that row. Append a compensating transaction (`metadata.role = "COMPENSATING"`, `refundId` / `disputeId`).
3. **Refund** and **REVERSAL**: reduce invoice `amountPaid`, restore `balanceDue`, set `sent` / `partially_paid`.
4. **DISPUTE**: do not unwind money (funds not returned yet); invalidate delivery only.
5. Revoke/invalidate deliveries by **invoice ID** (and optional legacy `projectId` for Phase 49).
6. Duplicate `refundId` / `disputeId` is idempotent (no second compensating row).
7. Webhook no longer treats `custom_id` as a project ID.

---

## Before vs after

| Question | Before | After |
|---|---|---|
| Does PayPal evidence authenticate? | Signature still required | Unchanged (fail-closed) |
| Financial state change? | Original tx overwritten; invoice stayed paid | Compensating event; invoice unwound on refund/reversal |
| Ledger compensating event? | No (in-place mutate) | Yes, append-only on the operational payment-transaction store |
| Invoice update? | No | Yes for refund/reversal; dispute leaves paid amount |
| Delivery revoked? | No, when `custom_id` ≠ project ID | Yes, via invoice binding |
| Subsequent download blocked? | No | Yes (`DOWNLOAD_BLOCKED`) |
| Original payment preserved? | No | Yes (`succeeded` remains) |
| Duplicate webhooks idempotent? | Duplicate mutated rows | Same `refundId`/`disputeId` does not double-credit |

---

## Regression test

`npx tsx test_syn_bug_003_refund_delivery_revocation.ts`

- Before fix: 1/5 (only test-27 classification)  
- After fix: **5/5 PASS**

---

## Full regression results

| Suite | Result |
|---|---|
| SYN-BUG-002 targeted | 3/3 PASS |
| SYN-BUG-003 targeted | 5/5 PASS |
| Phase 48 | 20/20 PASS |
| Phase 49 | 39/40 PASS (test 27 only) |
| Phase 50 | 30/30 PASS |
| Phase 63 | 40/40 PASS |
| `npx tsc --noEmit` | PASS |
| `npx next build` | PASS |

---

## Phase 49 test 27 — secret exposure

**Classification: TEST_FIXTURE_FALSE_POSITIVE**

`auditSecretExposure` returns CRITICAL only if `content.includes(process.env.GMAIL_APP_PASSWORD)` (and the value length > 6).

The test passes a hardcoded string:

`Included GMAIL_APP_PASSWORD=fake_app_password_xxxxxxxx in package bundle`

It does **not** contain the live `GMAIL_APP_PASSWORD` from `.env.local`. The scanner correctly returns `null`. The test then records FAIL (“Secret leakage allowed”).

No live secret was present in the fixture. Not caused by SYN-BUG-002 or SYN-BUG-003. Not remediated here.

---

## Remaining limitations

- Operational PayPal transactions and the Phase 63 `billing.repository` ledger remain separate stores (SYN-BUG-009). This fix does not dual-write the Phase 63 ledger.
- Refund/dispute does not append a workflow `PAYMENT_REFUNDED` event (that path was not wired before; not added).
- No outbound notification is sent on revoke (`notificationService` only drafts on authorize).
- Dispute does not change invoice paid amounts (money not returned). Download is still blocked.
- Unsigned webhooks never reach these handlers.

---

## Status

**FIXED**
