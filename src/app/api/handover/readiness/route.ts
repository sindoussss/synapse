import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const result = await handoverService.evaluateCompletionReadiness(projectId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}