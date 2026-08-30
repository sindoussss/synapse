import { NextRequest, NextResponse } from "next/server";
import { agreementBuilderService } from "@/lib/services/agreements/agreement-builder.service";
import { agreementRepository } from "@/lib/repositories/agreement.repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agreementId, action } = body;

    if (!agreementId) {
      return NextResponse.json({ ok: false, error: "Missing agreementId" }, { status: 400 });
    }

    if (action === "reject") {
      const updated = await agreementRepository.updateStatus(agreementId, "rejected");
      return NextResponse.json({ ok: true, agreement: updated });
    } else {
      const updated = await agreementBuilderService.approveAgreementForDelivery(agreementId);
      return NextResponse.json({ ok: true, agreement: updated });
    }
  } catch (err: any) {
    console.error("[API /api/agreements/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process agreement approval." },
      { status: 500 }
    );
  }
}