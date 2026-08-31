import { NextResponse } from "next/server";
import { proposalDocumentRepository } from "@/lib/repositories/proposal-document.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const documents = await proposalDocumentRepository.getAll();
    return NextResponse.json({ ok: true, documents });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list documents." },
      { status: 500 }
    );
  }
}