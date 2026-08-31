# SYN-FIN-001 RESOLUTION

**Bug ID:** SYN-FIN-001  
**Title:** Handover payment reconcile trusted caller-supplied amount/capture without PayPal evidence  
**Severity:** HIGH  
**Status:** FIXED  
**Date:** 31 August 2026

This is a new, real-world bug. It is not a reopening of SYN-BUG-002 (that verify path remains closed). SYNAPSE V1 is **not** certified by this fix.

---

## AUDIT CLAIM

`POST /api/handover/payment/reconcile` can mark an operational invoice `paid` and a payment `verified` using caller-supplied `amountPaidMinor` and a forged capture id, including while `EMERGENCY_STOP` is active. Evidence text claimed “Authenticated final milestone settlement via PayPal API.” without a PayPal call. Delivery unlock from this path was also alleged.

---

## REPRODUCTION

**REPRODUCED: YES** (financial mutation). Delivery unlock: **NOT_REPRODUCED** on this path.

Pre-fix in-process call, unpaid invoice, kill switch = `EMERGENCY_STOP`:

```ts
await handoverService.reconcileFinalPayment({
  invoiceId,
  amountPaidMinor: 1,
  providerTransactionId: "FORGED-CAPTURE-NOT-FROM-PAYPAL",
});
```

Observed before the fix:

| Field | Result |
|---|---|
| threw | false |
| invoice.status | `paid` |
| amountPaid | `1` |
| payment.status | `verified` |
| payment.notes | `Authenticated final milestone settlement via PayPal API.` |
| paymentRef | `FORGED-CAPTURE-NOT-FROM-PAYPAL` |
| newlyReconciled | true |
| delivery | none (`null`) |

Fail-closed was required. The current code did the opposite for money; it did **not** authorize source delivery from handover reconcile.

---

## ROOT CAUSE

`handoverService.reconcileFinalPayment` was a second payment writer.

Caller-controlled inputs that became financial evidence:

| Input | Used as |
|---|---|
| `invoiceId` | lookup (legitimate) **and** target of mutation |
| `amountPaidMinor` | invoice `amountPaid` and payment amount |
| `providerTransactionId` | payment reference / “PayPal capture” |
| (none) | fabricated PayPal evidence sentence |

Not consulted:

- `payPalProvider.getPaymentStatus` / `getTransaction`
- `payPalService.reconcilePayPalCapture`
- `emergencyKillSwitch`
- `privilegedActionFirewall`
- stored project/client bindings
- payment-request environment

Remaining receivable was hardcoded `8800000`.

`POST /api/handover/payment/reconcile` forwarded the raw body after HTTP auth only.

Delivery was already a separate service; handover did not call `sourceDeliveryService`. That part of the audit claim was false on inspect+reproduce.

---

## FIX

One authoritative PayPal verification path: existing `payPalService.reconcilePayPalCapture` (which already uses `paypal.provider.ts`). No new verifier.

### HTTP route

Forwards only:

- `orderId`
- optional `captureId` / `providerTransactionId` (binding/mismatch check only)
- optional `invoiceId`, `projectId`, `clientId` (stored-record binding only)
- optional `environment` (`sandbox` \| `live`) for mismatch against the **stored** payment request
- authenticated `actorRole`

Does **not** forward amount, currency, paid/verified flags, or `deliveryContext`.

### `reconcileFinalPayment`

1. `emergencyKillSwitch` `PAYMENT_MUTATION` — first, before mutation.
2. `privilegedActionFirewall` `PAYMENT_MUTATION`.
3. Resolve PayPal **order** from `orderId` or from the stored payment request for `invoiceId`.
4. Bind caller invoice/project/client to stored invoice / project / `leadId`.
5. Delegate financial mutation to `payPalService.reconcilePayPalCapture({ orderId, captureId, environment })`.
6. If a Phase 63 billing invoice exists for the same id, append ledger via `paymentReconciliationService.reconcilePayment` using **provider** amount, currency, and capture id only.
7. Remaining receivable is derived from operational invoice totals, not `8800000`.
8. Never calls `sourceDeliveryService`.

Fabricated note `"Authenticated final milestone settlement via PayPal API."` is removed from this path. PayPal activity text is emitted only by `reconcilePayPalCapture` after a real provider query.

---

## BEFORE / AFTER

| Case | Before | After |
|---|---|---|
| Forged capture + amount `1` during `EMERGENCY_STOP` | invoice `paid`, payment `verified` | `EMERGENCY_STOP_BLOCKED`, no mutation |
| Forged capture, normal state | invoice `paid` | `PAYMENT_UNVERIFIED`, no mutation |
| Caller amount `1` | credited `1` | ignored; provider lookup required |
| Wrong project / client | ignored | `PROJECT_CLIENT_MISMATCH` |
| Caller `environment: live` vs sandbox request | ignored | `PAYMENT_ENVIRONMENT_MISMATCH` |
| Provider-completed capture (test stub) | N/A (never queried) | invoice + payment tx + billing ledger = provider amount/capture |
| `deliveryContext` with approvals | not unlocked (already) | still not unlocked |
| Evidence sentence claiming PayPal without a call | written | not written |

---

## REGRESSION

Harness: `test_syn_fin_001_handover_payment_reconcile.ts`

| # | Case | Result |
|---|---|---|
| 1 | Fake capture | PASS |
| 2 | Fake amount | PASS |
| 3 | Fake currency | PASS |
| 4 | Fake invoice | PASS |
| 5 | Wrong project | PASS |
| 6 | Wrong client | PASS |
| 7 | Sandbox/live mismatch | PASS |
| 8 | Emergency stop | PASS |
| 9 | Legitimate verified payment (provider stub; caller amount 1 ignored) | PASS |
| 10 | No delivery unlock without existing gates | PASS |

**10/10 PASS**

| Suite | Result |
|---|---|
| SYN-BUG-002 | **3/3** |
| SYN-BUG-003 | **5/5** |
| Phase 48 | **20/20** |
| Phase 49 | **40/40** |
| Phase 50 | **30/30** |
| Phase 60 | **40/40** |
| Phase 63 | **40/40** |
| Phase 64 | **40/40** |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |

Legitimate payment in test 9 stubs `payPalProvider.getPaymentStatus` / `getTransaction` in the test file only. Production code has no mock success path.

---

## LIMITATIONS

- HTTP authentication (SYN-BUG-001) is unchanged and still required. This bug was behind a valid operator session/token.
- Phase 63 billing ledger is updated only when a billing invoice already exists for the operational invoice id. Missing billing rows are not invented.
- Manual invoice `verifyPayment` / `recordPayment` paths are out of scope (SYN-FIN-005).
- DNS cutover kill-switch gap is out of scope (SYN-FIN-002).
- `CLIENT_AUTH_NOT_IMPLEMENTED` is unchanged.
- This fix does not certify SYNAPSE V1.

---

## Affected files

| File | Change |
|---|---|
| `src/lib/services/handover/handover.service.ts` | Delegate to PayPal reconcile; kill switch; firewall; binding checks |
| `src/app/api/handover/payment/reconcile/route.ts` | Forward identifiers only |
| `test_syn_fin_001_handover_payment_reconcile.ts` | Targeted regression (10 cases) |
