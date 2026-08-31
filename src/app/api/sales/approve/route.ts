import { NextRequest, NextResponse } from "next/server";
import { salesService } from "@/lib/services/sales.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { draftId, action, updates, reason } = body;

    if (!draftId || typeof draftId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid draftId." },
        { status: 400 }
      );
    }

    let result;
    if (action === "edit" && updates) {
      result = await salesService.updateDraft(draftId, updates);
    } else if (action === "reject") {
      result = await salesService.rejectDraft(draftId, reason);
    } else {
      result = await salesService.approveDraft(draftId);
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/sales/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process outreach approval." },
      { status: 500 }
    );
  }
}