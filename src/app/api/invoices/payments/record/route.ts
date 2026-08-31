import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const payment = await invoiceService.recordPayment(body);
    return NextResponse.json({ ok: true, payment });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}