import { NextResponse } from "next/server";
import { projectService } from "@/lib/services/production/project.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const project = await projectService.approveProductionPlan(projectId);
    return NextResponse.json({ ok: true, project });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}