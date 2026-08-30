import { NextResponse } from "next/server";
import { developerWorkspaceRepository } from "@/lib/repositories/developer-workspace.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const placeholders = await developerWorkspaceRepository.getPlaceholdersByProject(projectId);
    return NextResponse.json({ ok: true, placeholders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}