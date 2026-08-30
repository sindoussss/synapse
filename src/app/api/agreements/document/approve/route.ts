import { NextRequest, NextResponse } from "next/server";
import { agreementDeliveryService } from "@/lib/services/agreements/agreement-delivery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId } = body;
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 });

    const document = await agreementDeliveryService.approveAgreementDocument(documentId);
    return NextResponse.json({ ok: true, document });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to approve document" }, { status: 500 });
  }
}