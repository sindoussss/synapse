import { NextRequest, NextResponse } from "next/server";
import { negotiationIntelligenceService } from "@/lib/services/negotiation/negotiation-intelligence.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { sessionId, changeId, decision, notes } = body;

    if (!sessionId || !changeId || !decision) {
      return NextResponse.json({ ok: false, error: "Missing sessionId, changeId, or decision" }, { status: 400 });
    }

    const session = await negotiationIntelligenceService.recordOperatorDecision(sessionId, changeId, decision, notes);
    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    console.error("[API /api/negotiations/decision] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to record operator decision." },
      { status: 500 }
    );
  }
}