import { NextRequest, NextResponse } from "next/server";
import { salesReplySendService } from "@/lib/services/sales/sales-reply-send.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replySendId } = body;

    if (!replySendId) {
      return NextResponse.json({ ok: false, error: "Missing replySendId" }, { status: 400 });
    }

    const result = await salesReplySendService.approveAndSendReply(replySendId);
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/inbox/reply/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to dispatch reply." },
      { status: 500 }
    );
  }
}