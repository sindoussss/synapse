import { NextResponse } from "next/server";
import { developerAgentService } from "@/lib/services/developer/developer-agent.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { snapshotId } = await req.json();
    if (!snapshotId) return NextResponse.json({ ok: false, error: "snapshotId is required" }, { status: 400 });
    const result = await developerAgentService.rollbackWorkspace(snapshotId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}