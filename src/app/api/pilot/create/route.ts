import { NextResponse } from "next/server";
import { pilotService } from "@/lib/services/pilot/pilot.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pilot = await pilotService.createPilot(body);
    return NextResponse.json({ ok: true, pilot });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}