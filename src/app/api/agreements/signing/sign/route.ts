import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { sessionId, role, signerEmail } = body;
    if (!sessionId || !role) {
      return NextResponse.json({ ok: false, error: "Missing sessionId or role" }, { status: 400 });
    }

    let session;
    if (role === "client") {
      session = await agreementDeliveryService.recordClientSignature(sessionId, signerEmail || "client@verified.org");
    } else {
      session = await agreementDeliveryService.recordOperatorCountersignature(sessionId);
    }
    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to record signature" }, { status: 500 });
  }
}