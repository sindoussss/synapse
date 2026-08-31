import { NextRequest, NextResponse } from "next/server";
import { agreementRepository } from "@/lib/repositories/agreement.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const opportunityId = searchParams.get("opportunityId");

    if (id) {
      const agreement = await agreementRepository.getById(id);
      return NextResponse.json({ ok: true, agreement });
    }

    if (opportunityId) {
      const agreements = await agreementRepository.getByOpportunityId(opportunityId);
      return NextResponse.json({ ok: true, agreements });
    }

    return NextResponse.json({ ok: false, error: "Missing id or opportunityId" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to retrieve agreement." },
      { status: 500 }
    );
  }
}