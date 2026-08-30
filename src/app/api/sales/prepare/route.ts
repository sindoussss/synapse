import { NextRequest, NextResponse } from "next/server";
import { salesService } from "@/lib/services/sales.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId } = body;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid leadId." },
        { status: 400 }
      );
    }

    const task = await salesService.prepareOutreachTask(leadId);

    return NextResponse.json({
      ok: true,
      task,
    });
  } catch (err: any) {
    console.error("[API /api/sales/prepare] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to prepare outreach task." },
      { status: 500 }
    );
  }
}