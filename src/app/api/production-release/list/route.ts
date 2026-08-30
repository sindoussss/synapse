import { NextResponse } from "next/server";
import { productionReleaseRepository } from "@/lib/repositories/production-release.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const releases = await productionReleaseRepository.getReleasesByProject(projectId);
    return NextResponse.json({ ok: true, releases });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}