import { NextResponse } from "next/server";
import { outreachRepository } from "@/lib/repositories/outreach.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
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