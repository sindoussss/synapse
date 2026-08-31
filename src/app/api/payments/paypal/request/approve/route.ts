import { NextResponse } from "next/server";
import { payPalService } from "@/lib/services/payments/paypal.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required" }, { status: 400 });
    const request = await payPalService.approveAndCreatePayPalOrder(requestId);
    return NextResponse.json({ ok: true, request });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}