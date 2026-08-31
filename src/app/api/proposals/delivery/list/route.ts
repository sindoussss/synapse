import { NextResponse } from "next/server";
import { proposalDeliveryRepository } from "@/lib/repositories/proposal-delivery.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const deliveries = await proposalDeliveryRepository.getAll();
    return NextResponse.json({ ok: true, deliveries });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list proposal deliveries." },
      { status: 500 }
    );
  }
}