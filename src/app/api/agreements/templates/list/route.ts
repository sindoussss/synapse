import { NextResponse } from "next/server";
import { agreementRepository } from "@/lib/repositories/agreement.repository";

export async function GET() {
  try {
    const templates = await agreementRepository.getTemplates();
    return NextResponse.json({ ok: true, templates });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list templates." },
      { status: 500 }
    );
  }
}