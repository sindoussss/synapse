import { NextResponse } from "next/server";
import { qaAgentService } from "@/lib/services/qa/qa-agent.service";

export async function POST(req: Request) {
  try {
    const { runId } = await req.json();
    if (!runId) return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    const run = await qaAgentService.approveQARun(runId);
    return NextResponse.json({ ok: true, run });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}