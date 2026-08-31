import { NextResponse } from "next/server";
import { payPalProvider } from "@/lib/services/payments/paypal.provider";
import { payPalService } from "@/lib/services/payments/paypal.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const verifyResult = await payPalProvider.verifyWebhook(headers, rawBody);
    if (!verifyResult.isValid) {
      return NextResponse.json({ ok: false, error: verifyResult.error || "Invalid webhook signature" }, { status: 400 });
    }

    const eventType = verifyResult.eventType;
    const resource = verifyResult.resource;

    // 1. Capture Completed or Order Completed
    if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.COMPLETED") {
      const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;
      const captureId = resource?.id;

      if (orderId && captureId) {
        const recon = await payPalService.reconcilePayPalCapture({
          orderId,
          captureId,
          eventId: verifyResult.eventId,
          environment: verifyResult.environment,
        });
        return NextResponse.json({ ok: true, reconciled: true, invoice: recon.invoice, deliveryResponse: recon.deliveryResponse });
      }
    }

    // 2. Refund Event
    // custom_id on the PayPal order is the payment-request ID, not a project ID.
    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = resource?.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop() || resource?.id;
      const refundId = resource?.id;
      const refundRes = await payPalService.handleRefundWebhook({
        captureId,
        refundId,
        paymentRequestId: resource?.custom_id,
      });
      return NextResponse.json({ ok: true, ...refundRes });
    }

    // 3. Dispute / Reversal Event
    if (eventType === "CUSTOMER.DISPUTE.CREATED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
      const captureId = resource?.disputed_transactions?.[0]?.buyer_transaction_id || resource?.id;
      const disputeId = resource?.dispute_id || resource?.id;
      const revRes = await payPalService.handleReversalWebhook({
        captureId,
        disputeId,
        paymentRequestId: resource?.custom_id,
        eventKind: eventType === "PAYMENT.CAPTURE.REVERSED" ? "REVERSAL" : "DISPUTE",
      });
      return NextResponse.json({ ok: true, ...revRes });
    }

    return NextResponse.json({ ok: true, eventType: verifyResult.eventType, processed: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
