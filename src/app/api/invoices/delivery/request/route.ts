import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const delivery = await invoiceService.requestInvoiceDelivery(body);
    return NextResponse.json({ ok: true, delivery });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}