import { NextResponse } from "next/server";
import { developerAgentService } from "@/lib/services/developer/developer-agent.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { projectId, taskId, snapshotType } = await req.json();
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const snapshot = await developerAgentService.createWorkspaceSnapshot(projectId, taskId, snapshotType);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}