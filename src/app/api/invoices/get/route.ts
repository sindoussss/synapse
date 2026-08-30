import { NextResponse } from "next/server";
import { invoiceRepository } from "@/lib/repositories/invoice.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

    const invoice = await invoiceRepository.getInvoiceById(id);
    if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

    const documents = await invoiceRepository.getDocumentsByInvoice(id);
    const deliveries = await invoiceRepository.getDeliveriesByInvoice(id);
    const payments = await invoiceRepository.getPaymentsByInvoice(id);

    return NextResponse.json({ ok: true, invoice, documents, deliveries, payments });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}