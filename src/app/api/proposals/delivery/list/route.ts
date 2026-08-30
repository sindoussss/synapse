import { NextResponse } from "next/server";
import { proposalDeliveryRepository } from "@/lib/repositories/proposal-delivery.repository";

export async function GET() {
  try {
    const deliveries = await proposalDeliveryRepository.getAll();
    return NextResponse.json({ ok: true, deliveries });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list proposal deliveries." },
      { status: 500 }
    );
  }
}