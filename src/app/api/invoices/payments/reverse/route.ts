import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";

export async function POST(req: Request) {
  try {
    const { paymentId, reason } = await req.json();
    if (!paymentId || !reason) return NextResponse.json({ ok: false, error: "paymentId and reason are required" }, { status: 400 });
    const result = await invoiceService.reversePayment(paymentId, reason);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}