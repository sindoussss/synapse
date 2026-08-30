import { NextResponse } from "next/server";
import { projectRepository } from "@/lib/repositories/project.repository";

export async function GET() {
  try {
    const projects = await projectRepository.getAllProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}