import { NextRequest, NextResponse } from "next/server";
import { proposalBuilderService } from "@/lib/services/proposals/proposal-builder.service";
import { proposalRepository } from "@/lib/repositories/proposal.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { proposalId, action } = body;

    if (!proposalId) {
      return NextResponse.json({ ok: false, error: "Missing proposalId" }, { status: 400 });
    }

    if (action === "reject") {
      const updated = await proposalRepository.updateStatus(proposalId, "rejected");
      return NextResponse.json({ ok: true, proposal: updated });
    } else {
      const updated = await proposalBuilderService.approveProposal(proposalId);
      return NextResponse.json({ ok: true, proposal: updated });
    }
  } catch (err: any) {
    console.error("[API /api/proposals/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process proposal approval." },
      { status: 500 }
    );
  }
}