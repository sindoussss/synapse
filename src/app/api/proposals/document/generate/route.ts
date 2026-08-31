import { NextRequest, NextResponse } from "next/server";
import { proposalRendererService } from "@/lib/services/proposals/proposal-renderer.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json({ ok: false, error: "Missing proposalId" }, { status: 400 });
    }

    const document = await proposalRendererService.renderProposalDocument(proposalId);
    return NextResponse.json({ ok: true, document });
  } catch (err: any) {
    console.error("[API /api/proposals/document/generate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to generate proposal document." },
      { status: 500 }
    );
  }
}