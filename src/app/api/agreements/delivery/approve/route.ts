import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deliveryId } = body;
    if (!deliveryId) return NextResponse.json({ ok: false, error: "Missing deliveryId" }, { status: 400 });

    const result = await agreementDeliveryService.approveAndSendAgreementDelivery(deliveryId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to approve and send delivery" }, { status: 500 });
  }
}