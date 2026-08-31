import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { invoiceId } = await req.json();
    if (!invoiceId) return NextResponse.json({ ok: false, error: "invoiceId is required" }, { status: 400 });
    const document = await invoiceService.generateInvoiceDocument(invoiceId);
    return NextResponse.json({ ok: true, document });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}