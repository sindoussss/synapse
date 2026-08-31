import { NextResponse } from "next/server";
import { pilotService } from "@/lib/services/pilot/pilot.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const pilot = await pilotService.approvePilot(body.id, body.operatorId || "operator");
    return NextResponse.json({ ok: true, pilot });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}