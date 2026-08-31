import { NextResponse } from "next/server";
import { qaRepository } from "@/lib/repositories/qa.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
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