import { NextResponse } from "next/server";
import { agreementRepository } from "@/lib/repositories/agreement.repository";

export async function GET() {
  try {
    const agreements = await agreementRepository.getAll();
    return NextResponse.json({ ok: true, agreements });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list agreements." },
      { status: 500 }
    );
  }
}