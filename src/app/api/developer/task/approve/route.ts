import { NextResponse } from "next/server";
import { developerAgentService } from "@/lib/services/developer/developer-agent.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { taskId } = await req.json();
    if (!taskId) return NextResponse.json({ ok: false, error: "taskId is required" }, { status: 400 });
    const result = await developerAgentService.approveTask(taskId);
    return NextResponse.json({ ok: true, task: result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}