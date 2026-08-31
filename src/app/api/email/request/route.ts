import { NextRequest, NextResponse } from "next/server";
import { salesSendService } from "@/lib/services/sales/sales-send.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { outreachDraftId, recipientOverride } = body;

    if (!outreachDraftId || typeof outreachDraftId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid outreachDraftId." },
        { status: 400 }
      );
    }

    const result = await salesSendService.requestSendEmail(outreachDraftId, recipientOverride);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/email/request] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to request email dispatch." },
      { status: 500 }
    );
  }
}