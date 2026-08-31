import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { agreementId } = body;
    if (!agreementId) return NextResponse.json({ ok: false, error: "Missing agreementId" }, { status: 400 });

    const document = await agreementDeliveryService.generateAgreementDocument(agreementId);
    return NextResponse.json({ ok: true, document });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to generate document" }, { status: 500 });
  }
}