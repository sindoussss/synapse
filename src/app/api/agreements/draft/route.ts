import { NextRequest, NextResponse } from "next/server";
import { agreementBuilderService } from "@/lib/services/agreements/agreement-builder.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, baselineInput, templateId } = body;

    if (!opportunityId || !baselineInput) {
      return NextResponse.json({ ok: false, error: "Missing opportunityId or baselineInput" }, { status: 400 });
    }

    const agreement = await agreementBuilderService.draftAgreement(opportunityId, baselineInput, templateId);
    return NextResponse.json({ ok: true, agreement });
  } catch (err: any) {
    console.error("[API /api/agreements/draft] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to draft agreement." },
      { status: 500 }
    );
  }
}