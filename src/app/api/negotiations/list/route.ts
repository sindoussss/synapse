import { NextResponse } from "next/server";
import { negotiationRepository } from "@/lib/repositories/negotiation.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const sessions = await negotiationRepository.getAllSessions();
    return NextResponse.json({ ok: true, sessions });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list negotiation sessions." },
      { status: 500 }
    );
  }
}