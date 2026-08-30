import { NextResponse } from "next/server";
import { invoiceRepository } from "@/lib/repositories/invoice.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunityId");
    const agreementId = searchParams.get("agreementId");

    let invoices = [];
    if (agreementId) {
      invoices = await invoiceRepository.getInvoicesByAgreement(agreementId);
    } else if (opportunityId) {
      invoices = await invoiceRepository.getInvoicesByOpportunity(opportunityId);
    } else {
      invoices = await invoiceRepository.getAllInvoices();
    }

    return NextResponse.json({ ok: true, invoices });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}