import { NextResponse } from "next/server";
import { projectService } from "@/lib/services/production/project.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const oppId = searchParams.get("opportunityId");
    if (!oppId) return NextResponse.json({ ok: false, error: "opportunityId is required" }, { status: 400 });
    const result = await projectService.evaluateDealCloseEligibility(oppId);
    return NextResponse.json({ ok: true, eligibility: result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}