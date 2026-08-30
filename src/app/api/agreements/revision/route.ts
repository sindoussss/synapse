import { NextRequest, NextResponse } from "next/server";
import { agreementBuilderService } from "@/lib/services/agreements/agreement-builder.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agreementId, updates } = body;

    if (!agreementId || !updates) {
      return NextResponse.json({ ok: false, error: "Missing agreementId or updates" }, { status: 400 });
    }

    const revision = await agreementBuilderService.createRevision(agreementId, updates);
    return NextResponse.json({ ok: true, agreement: revision });
  } catch (err: any) {
    console.error("[API /api/agreements/revision] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create agreement revision." },
      { status: 500 }
    );
  }
}