import { NextResponse } from "next/server";
import { projectService } from "@/lib/services/production/project.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await projectService.markOpportunityWon(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}