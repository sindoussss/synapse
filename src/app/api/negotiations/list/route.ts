import { NextResponse } from "next/server";
import { negotiationRepository } from "@/lib/repositories/negotiation.repository";

export async function GET() {
  try {
    const sessions = await negotiationRepository.getAllSessions();
    return NextResponse.json({ ok: true, sessions });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list negotiation sessions." },
      { status: 500 }
    );
  }
}