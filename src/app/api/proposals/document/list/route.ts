import { NextResponse } from "next/server";
import { proposalDocumentRepository } from "@/lib/repositories/proposal-document.repository";

export async function GET() {
  try {
    const documents = await proposalDocumentRepository.getAll();
    return NextResponse.json({ ok: true, documents });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list documents." },
      { status: 500 }
    );
  }
}