import { NextResponse } from "next/server";
import { intelligenceService } from "@/lib/services/intelligence/intelligence.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "LIVE_REAL";
    const useFx = searchParams.get("useFx") === "true";
    const projectId = searchParams.get("projectId") || undefined;
    const data = await intelligenceService.getFinancialEconomics({
      sourceClassification: source,
      useFxSnapshot: useFx,
      projectId
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}