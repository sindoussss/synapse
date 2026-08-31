import { NextResponse } from "next/server";
import { intelligenceService } from "@/lib/services/intelligence/intelligence.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "CONTROLLED_TEST";
    const data = await intelligenceService.getFunnelMetrics(source);
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}