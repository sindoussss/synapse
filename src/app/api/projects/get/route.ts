import { NextResponse } from "next/server";
import { projectRepository } from "@/lib/repositories/project.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const project = await projectRepository.getProjectById(id);
    if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    const milestones = await projectRepository.getMilestonesByProject(id);
    const changeRequests = await projectRepository.getChangeRequestsByProject(id);
    return NextResponse.json({ ok: true, project, milestones, changeRequests });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}