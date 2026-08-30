import { NextResponse } from "next/server";
import { intelligenceService } from "@/lib/services/intelligence/intelligence.service";

export async function GET() {
  try {
    const data = await intelligenceService.getRecommendations();
    return NextResponse.json({ ok: true, recommendations: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}