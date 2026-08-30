import { NextResponse } from "next/server";
import { developerAgentService } from "@/lib/services/developer/developer-agent.service";
import { developerIterativeEngineService } from "@/lib/services/developer/developer-iterative-engine.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.mode === "iterative" || body.iterative) {
      const report = await developerIterativeEngineService.runIterativeEngineeringPipeline(body);
      return NextResponse.json({ ok: true, report });
    }
    const result = await developerAgentService.executeTask(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}