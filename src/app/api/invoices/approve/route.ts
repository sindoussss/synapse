import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";

export async function POST(req: Request) {
  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) return NextResponse.json({ ok: false, error: "invoiceId is required" }, { status: 400 });
    const invoice = await invoiceService.approveInvoice(invoiceId);
    return NextResponse.json({ ok: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}