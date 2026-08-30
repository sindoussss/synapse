import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, recipient, subject, message } = body;
    if (!documentId || !recipient) {
      return NextResponse.json({ ok: false, error: "Missing documentId or recipient" }, { status: 400 });
    }

    const delivery = await agreementDeliveryService.requestAgreementDelivery(documentId, recipient, subject, message);
    return NextResponse.json({ ok: true, delivery });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to request delivery" }, { status: 500 });
  }
}