import { NextRequest, NextResponse } from "next/server";
import { proposalBuilderService } from "@/lib/services/proposals/proposal-builder.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, operatorPricing, operatorTimeline, notes } = body;

    if (!opportunityId) {
      return NextResponse.json({ ok: false, error: "Missing opportunityId" }, { status: 400 });
    }

    const proposal = await proposalBuilderService.generateProposal(
      opportunityId,
      operatorPricing,
      operatorTimeline,
      notes
    );
    return NextResponse.json({ ok: true, proposal });
  } catch (err: any) {
    console.error("[API /api/proposals/generate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to generate proposal." },
      { status: 500 }
    );
  }
}