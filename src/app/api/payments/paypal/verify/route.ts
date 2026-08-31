import { NextResponse } from "next/server";
import { payPalService } from "@/lib/services/payments/paypal.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    const captureId = typeof body?.captureId === "string" ? body.captureId : undefined;
    const eventId = typeof body?.eventId === "string" ? body.eventId : undefined;
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
    }
    // Amount, currency, environment, and deliveryContext from the body are not forwarded.
    const result = await payPalService.reconcilePayPalCapture({ orderId, captureId, eventId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}