import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const invoice = await invoiceService.createInvoiceDraft(body);
    return NextResponse.json({ ok: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}