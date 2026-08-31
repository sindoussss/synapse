import { NextRequest, NextResponse } from "next/server";
import { opportunityRepository, OpportunityStage } from "@/lib/repositories/opportunity.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { opportunityId, stage, actor, notes } = body;

    if (!opportunityId || !stage) {
      return NextResponse.json({ ok: false, error: "Missing opportunityId or stage" }, { status: 400 });
    }

    const opportunity = await opportunityRepository.updateStage(
      opportunityId,
      stage as OpportunityStage,
      actor || "Human Operator",
      notes
    );
    return NextResponse.json({ ok: true, opportunity });
  } catch (err: any) {
    console.error("[API /api/opportunities/update-stage] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to update stage." },
      { status: 500 }
    );
  }
}