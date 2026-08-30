import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";

export async function GET() {
  try {
    const summary = await invoiceService.getAccountsReceivableSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}