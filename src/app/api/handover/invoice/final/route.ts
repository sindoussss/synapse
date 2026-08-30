import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const invoice = await handoverService.generateFinalInvoice(body);
    return NextResponse.json({ ok: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}