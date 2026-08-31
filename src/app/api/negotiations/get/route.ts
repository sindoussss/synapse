import { NextRequest, NextResponse } from "next/server";
import { negotiationRepository } from "@/lib/repositories/negotiation.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunityId");
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const session = await negotiationRepository.getSessionById(sessionId);
      return NextResponse.json({ ok: true, session });
    }

    if (opportunityId) {
      const session = await negotiationRepository.getSessionByOpportunityId(opportunityId);
      return NextResponse.json({ ok: true, session });
    }

    return NextResponse.json({ ok: false, error: "Missing opportunityId or sessionId" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to retrieve negotiation session." },
      { status: 500 }
    );
  }
}