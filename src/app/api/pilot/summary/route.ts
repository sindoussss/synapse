import { NextResponse } from "next/server";
import { pilotRepository } from "@/lib/repositories/pilot.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const pilots = await pilotRepository.getAllPilots();
    const dnc = await pilotRepository.getAllDnc();
    return NextResponse.json({ ok: true, pilots, dncCount: dnc.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}