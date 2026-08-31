import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { sessionId, reason } = body;
    if (!sessionId) return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });

    const session = await agreementDeliveryService.declineSigningSession(sessionId, reason);
    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to decline signing" }, { status: 500 });
  }
}