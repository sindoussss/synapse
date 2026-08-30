import { NextResponse } from "next/server";
import { pilotService } from "@/lib/services/pilot/pilot.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await pilotService.sendOutreachMessage(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}