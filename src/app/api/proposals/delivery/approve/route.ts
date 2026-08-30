import { NextRequest, NextResponse } from "next/server";
import { proposalDeliveryService } from "@/lib/services/proposals/proposal-delivery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deliveryId, action } = body;

    if (!deliveryId) {
      return NextResponse.json({ ok: false, error: "Missing deliveryId" }, { status: 400 });
    }

    if (action === "reject") {
      return NextResponse.json({ ok: true, status: "rejected" });
    } else {
      const result = await proposalDeliveryService.approveAndSendProposal(deliveryId);
      return NextResponse.json({ ok: true, delivery: result });
    }
  } catch (err: any) {
    console.error("[API /api/proposals/delivery/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process proposal delivery approval." },
      { status: 500 }
    );
  }
}