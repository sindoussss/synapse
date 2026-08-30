import { NextResponse } from "next/server";
import { intelligenceService } from "@/lib/services/intelligence/intelligence.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "CONTROLLED_TEST";
    const data = await intelligenceService.getFunnelMetrics(source);
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}