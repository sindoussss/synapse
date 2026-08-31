import { NextResponse } from "next/server";
import { opportunityRepository } from "@/lib/repositories/opportunity.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const opportunities = await opportunityRepository.getAll();
    return NextResponse.json({ ok: true, opportunities });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list opportunities." },
      { status: 500 }
    );
  }
}