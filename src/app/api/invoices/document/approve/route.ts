import { NextResponse } from "next/server";
import { invoiceService } from "@/lib/services/invoices/invoice.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ ok: false, error: "documentId is required" }, { status: 400 });
    const document = await invoiceService.approveInvoiceDocument(documentId);
    return NextResponse.json({ ok: true, document });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}