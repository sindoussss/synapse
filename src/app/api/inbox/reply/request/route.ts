import { NextRequest, NextResponse } from "next/server";
import { salesReplySendService } from "@/lib/services/sales/sales-reply-send.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { responseDraftId } = body;

    if (!responseDraftId) {
      return NextResponse.json({ ok: false, error: "Missing responseDraftId" }, { status: 400 });
    }

    const result = await salesReplySendService.requestReplySend(responseDraftId);
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/inbox/reply/request] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to request reply send." },
      { status: 500 }
    );
  }
}