import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryRepository } from "@/lib/repositories/agreement-delivery.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const agreementId = searchParams.get("agreementId");

    if (sessionId) {
      const session = await agreementDeliveryRepository.getSigningSessionById(sessionId);
      const events = await agreementDeliveryRepository.getSignatureEvents(sessionId);
      return NextResponse.json({ ok: true, session, events });
    }

    if (agreementId) {
      const sessions = await agreementDeliveryRepository.getSigningSessionsByAgreementId(agreementId);
      return NextResponse.json({ ok: true, sessions });
    }

    return NextResponse.json({ ok: false, error: "Missing sessionId or agreementId" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to get signing session" }, { status: 500 });
  }
}