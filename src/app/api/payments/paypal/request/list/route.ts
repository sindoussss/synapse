import { NextResponse } from "next/server";
import { paymentRequestRepository } from "@/lib/repositories/payment-request.repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    let requests = [];
    if (invoiceId) {
      requests = await paymentRequestRepository.getPaymentRequestsByInvoice(invoiceId);
    } else {
      requests = await paymentRequestRepository.getAllPaymentRequests();
    }

    const transactions = await paymentRequestRepository.getAllTransactions();
    return NextResponse.json({ ok: true, requests, transactions });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}