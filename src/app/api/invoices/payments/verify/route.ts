import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ ok: false, error: "paymentId is required" }, { status: 400 });
    const result = await invoiceService.verifyPayment(paymentId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}