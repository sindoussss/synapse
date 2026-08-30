import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryRepository } from "@/lib/repositories/agreement-delivery.repository";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agreementId = searchParams.get("agreementId");
    if (!agreementId) return NextResponse.json({ ok: false, error: "Missing agreementId" }, { status: 400 });

    const documents = await agreementDeliveryRepository.getDocumentsByAgreementId(agreementId);
    return NextResponse.json({ ok: true, documents });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to list documents" }, { status: 500 });
  }
}