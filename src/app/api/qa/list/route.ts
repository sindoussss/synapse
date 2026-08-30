import { NextResponse } from "next/server";
import { qaRepository } from "@/lib/repositories/qa.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const runs = await qaRepository.getRunsByProject(projectId);
    const defects = await qaRepository.getDefectsByProject(projectId);
    return NextResponse.json({ ok: true, runs, defects });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}