import { NextRequest, NextResponse } from "next/server";
import { opportunityIntelligenceService } from "@/lib/services/deals/opportunity-intelligence.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });
    }

    const analysis = await opportunityIntelligenceService.analyzeLeadOpportunity(leadId);
    return NextResponse.json({ ok: true, analysis });
  } catch (err: any) {
    console.error("[API /api/opportunities/analyze] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to analyze opportunity." },
      { status: 500 }
    );
  }
}