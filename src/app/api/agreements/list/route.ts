import { NextResponse } from "next/server";
import { agreementRepository } from "@/lib/repositories/agreement.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const agreements = await agreementRepository.getAll();
    return NextResponse.json({ ok: true, agreements });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list agreements." },
      { status: 500 }
    );
  }
}