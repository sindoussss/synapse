import { NextResponse } from "next/server";
import { projectRepository } from "@/lib/repositories/project.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const projects = await projectRepository.getAllProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}