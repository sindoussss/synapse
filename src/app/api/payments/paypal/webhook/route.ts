import { NextResponse } from "next/server";
import { payPalProvider } from "@/lib/services/payments/paypal.provider";
import { payPalService } from "@/lib/services/payments/paypal.service";

export async function POST(req: Request) {
  try {
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
      const amountVal = parseFloat(resource?.amount?.value || "0");
      const amountMinorUnits = Math.round(amountVal * 100);
      const currency = resource?.amount?.currency_code || "PHP";

      if (orderId && captureId) {
        const recon = await payPalService.reconcilePayPalCapture({
          orderId,
          captureId,
          eventId: verifyResult.eventId,
          amountMinorUnits,
          currency,
          providerConfirmedAt: resource?.create_time,
          environment: verifyResult.environment,
        });
        return NextResponse.json({ ok: true, reconciled: true, invoice: recon.invoice, deliveryResponse: recon.deliveryResponse });
      }
    }

    // 2. Refund Event
    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = resource?.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop() || resource?.id;
      const refundId = resource?.id;
      const refundRes = await payPalService.handleRefundWebhook({
        captureId,
        refundId,
        projectId: resource?.custom_id,
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
        projectId: resource?.custom_id,
      });
      return NextResponse.json({ ok: true, ...revRes });
    }

    return NextResponse.json({ ok: true, eventType: verifyResult.eventType, processed: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
