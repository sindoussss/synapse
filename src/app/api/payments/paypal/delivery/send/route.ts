import { NextResponse } from "next/server";
import { payPalService } from "@/lib/services/payments/paypal.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await payPalService.sendPaymentLinkEmail(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}