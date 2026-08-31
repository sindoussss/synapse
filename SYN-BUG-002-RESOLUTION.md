# SYN-BUG-002 RESOLUTION

**Bug ID:** SYN-BUG-002  
**Title:** PayPal capture reconciliation trusted caller-supplied capture/amount/deliveryContext  
**Severity:** CRITICAL  
**Status:** FIXED  
**Date:** 31 August 2026

---

## 1. Affected files

| File | Role |
|---|---|
| `src/lib/services/payments/paypal.service.ts` | Authoritative reconcile |
| `src/lib/services/payments/paypal.provider.ts` | Existing `getPaymentStatus` / `getTransaction` (unchanged; now actually called) |
| `src/app/api/payments/paypal/verify/route.ts` | HTTP verify — no longer forwards body |
| `src/app/api/payments/paypal/webhook/route.ts` | Signed webhook — no longer forwards parsed amount/currency |
| `src/lib/services/delivery/source-delivery.service.ts` | Unchanged. Delivery remains a separate, gated service. |
| `src/lib/services/delivery/payment-verification.service.ts` | Unchanged. Does not treat `clientProvidedState` as paid. |

---

## 2. Exact request / data flow (before)

```
POST /api/payments/paypal/verify
  body: { orderId, captureId, amountMinorUnits, currency, deliveryContext }
    → payPalService.reconcilePayPalCapture(body)
      → lookup payment request by orderId (local store)
      → lookup invoice
      → NO PayPal API call
      → credit invoice with caller amount
      → if caller deliveryContext.approvals === true, authorize source delivery
```

Webhook path after signature verification still passed `amountMinorUnits` / `currency` parsed from the event JSON into the same reconcile function. Those values were trusted as financial evidence.

`payPalProvider.getPaymentStatus` and `getTransaction` existed and were unused.

---

## 3. Reproduction

**REPRODUCED: YES** (deterministic, before the fix)

Harness: `test_syn_bug_002_paypal_authoritative_reconcile.ts`

Seeded a local unpaid invoice + active payment request whose `providerRequestId` exists only in the local store (not a PayPal capture). Then called `reconcilePayPalCapture` with a forged capture.

| Case | Before fix |
|---|---|
| Forged capture ID + matching amount + `deliveryContext` with both approval flags true | Invoice `paid`, succeeded transaction written, delivery `DELIVERY_AUTHORIZED` |
| Forged amount `1` | Invoice `partially_paid`, `amountPaid=1` |
| Capture ID set to the local order ID | Invoice `paid` |

Prior live probe (audit): `POST /api/payments/paypal/verify` with `captureId=FAKE-AUDIT-CAP` against a real sandbox order returned HTTP 200 and ran reconcile without contacting PayPal (blocked only by overpayment on an already-paid invoice).

---

## 4. Root cause

`reconcilePayPalCapture` treated the HTTP/webhook payload as PayPal evidence. Financial mutation and optional delivery unlock did not depend on `getPaymentStatus` or `getTransaction`.

---

## 5. Minimal fix

No new payment subsystem. Existing PayPal provider is now the required evidence source.

1. **`reconcilePayPalCapture`**
   - Requires `orderId` bound to a stored payment request.
   - Calls `payPalProvider.getPaymentStatus(orderId, requestEnvironment)`.
   - Requires order `COMPLETED` or `CAPTURED` with a capture ID.
   - If the caller sent a `captureId`, it must match PayPal’s capture ID.
   - Calls `payPalProvider.getTransaction(captureId)` and requires capture `COMPLETED`.
   - Uses **only** provider amount, currency, capture ID, and timestamps.
   - Fail-closed on provider errors (`PAYMENT_UNVERIFIED`).
   - Overpayment / currency-mismatch gates unchanged, now keyed off provider amounts.
   - **Does not** call `sourceDeliveryService` from caller `deliveryContext`. Delivery stays on `sourceDeliveryService.processPaymentAndAuthorizeDelivery` with its existing payment/approval/snapshot gates.

2. **`POST /api/payments/paypal/verify`**
   - Forwards only `orderId`, optional `captureId`, optional `eventId`.
   - Does not forward amount, currency, environment, or `deliveryContext`.

3. **Webhook capture path**
   - After signature verification, forwards only `orderId`, `captureId`, `eventId`, `environment`.
   - Does not forward parsed webhook amounts.

Caller-supplied amount/currency/deliveryContext parameters remain on the TypeScript signature so existing internal callers still compile; they are ignored.

---

## 6. Regression

| Suite | Result |
|---|---|
| `test_syn_bug_002_paypal_authoritative_reconcile.ts` (before fix) | 0/3 PASS — reproduction |
| `test_syn_bug_002_paypal_authoritative_reconcile.ts` (after fix) | **3/3 PASS** |
| Phase 48 independent verification | **20/20 PASS** |
| Phase 49 final certification | 39/40 PASS — test 27 “Secret package leakage” fails because `auditSecretExposure` looks for the live `GMAIL_APP_PASSWORD` value inside a fixture string; **not caused by this change** |
| Phase 50 launch rehearsal (delivery) | **30/30 PASS** |
| Phase 63 billing | **40/40 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |

Phase 40–43 have no dedicated `test_phase40–43.ts` files in this tree. Delivery coverage used Phases 48–50.

---

## 7. What was not done

- Did not add a mock PayPal success path in production code.
- Did not merge billing ledgers (SYN-BUG-009).
- Did not add HTTP authentication (SYN-BUG-001).
- Did not change refund/dispute mapping (SYN-BUG-003).
- Did not fabricate a completed PayPal capture in tests; forged orders fail closed when PayPal lookup fails.

---

## 8. Status

**FIXED**
