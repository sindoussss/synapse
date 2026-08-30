import { NextRequest, NextResponse } from "next/server";
import { researchService } from "@/lib/services/research.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, apiKey } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid taskId." },
        { status: 400 }
      );
    }

    const result = await researchService.executeLeadDiscovery(taskId, apiKey);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/research/execute] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to execute lead discovery task." },
      { status: 500 }
    );
  }
}