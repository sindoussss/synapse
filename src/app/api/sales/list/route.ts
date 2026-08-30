import { NextResponse } from "next/server";
import { outreachRepository } from "@/lib/repositories/outreach.repository";

export async function GET() {
  try {
    const drafts = await outreachRepository.getAll();
    return NextResponse.json({
      ok: true,
      drafts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list outreach drafts." },
      { status: 500 }
    );
  }
}