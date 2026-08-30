import { NextRequest, NextResponse } from "next/server";
import { proposalDeliveryService } from "@/lib/services/proposals/proposal-delivery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, recipientOverride } = body;

    if (!documentId) {
      return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 });
    }

    const result = await proposalDeliveryService.requestProposalDelivery(documentId, recipientOverride);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("[API /api/proposals/delivery/request] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to request proposal delivery." },
      { status: 500 }
    );
  }
}