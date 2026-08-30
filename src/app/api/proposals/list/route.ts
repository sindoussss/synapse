import { NextResponse } from "next/server";
import { proposalRepository } from "@/lib/repositories/proposal.repository";

export async function GET() {
  try {
    const proposals = await proposalRepository.getAll();
    return NextResponse.json({ ok: true, proposals });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list proposals." },
      { status: 500 }
    );
  }
}