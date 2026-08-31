import { NextRequest, NextResponse } from "next/server";
import { proposalDocumentRepository } from "@/lib/repositories/proposal-document.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { documentId, action } = body;

    if (!documentId) {
      return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 });
    }

    if (action === "reject") {
      const updated = await proposalDocumentRepository.updateStatus(documentId, "superseded");
      return NextResponse.json({ ok: true, document: updated });
    } else {
      const updated = await proposalDocumentRepository.updateStatus(documentId, "approved");
      return NextResponse.json({ ok: true, document: updated });
    }
  } catch (err: any) {
    console.error("[API /api/proposals/document/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to approve document." },
      { status: 500 }
    );
  }
}