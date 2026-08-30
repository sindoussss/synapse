import { NextResponse } from "next/server";
import { pilotRepository } from "@/lib/repositories/pilot.repository";

export async function GET() {
  try {
    const pilots = await pilotRepository.getAllPilots();
    const dnc = await pilotRepository.getAllDnc();
    return NextResponse.json({ ok: true, pilots, dncCount: dnc.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}