import { NextRequest, NextResponse } from "next/server";
import { opportunityIntelligenceService } from "@/lib/services/deals/opportunity-intelligence.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });
    }

    const opportunity = await opportunityIntelligenceService.createOrUpdateOpportunity(leadId);
    return NextResponse.json({ ok: true, opportunity });
  } catch (err: any) {
    console.error("[API /api/opportunities/create] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create opportunity." },
      { status: 500 }
    );
  }
}