import { NextResponse } from "next/server";
import { proposalRepository } from "@/lib/repositories/proposal.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const proposals = await proposalRepository.getAll();
    return NextResponse.json({ ok: true, proposals });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list proposals." },
      { status: 500 }
    );
  }
}