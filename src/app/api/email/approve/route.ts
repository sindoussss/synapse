import { NextRequest, NextResponse } from "next/server";
import { salesSendService } from "@/lib/services/sales/sales-send.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sendId, action, reason } = body;

    if (!sendId || typeof sendId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid sendId." },
        { status: 400 }
      );
    }

    let result;
    if (action === "reject") {
      result = await salesSendService.rejectSend(sendId, reason);
    } else {
      result = await salesSendService.approveAndSend(sendId);
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/email/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process email dispatch approval." },
      { status: 500 }
    );
  }
}