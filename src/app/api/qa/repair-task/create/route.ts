import { NextResponse } from "next/server";
import { qaAgentService } from "@/lib/services/qa/qa-agent.service";

export async function POST(req: Request) {
  try {
    const { defectId } = await req.json();
    if (!defectId) return NextResponse.json({ ok: false, error: "defectId is required" }, { status: 400 });
    const result = await qaAgentService.createRepairTask(defectId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}