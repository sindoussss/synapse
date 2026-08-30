import { NextRequest, NextResponse } from "next/server";
import { auditService } from "@/lib/services/audit.service";

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

    const result = await auditService.executeWebsiteAudit(taskId, apiKey);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/audit/execute] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to execute website audit task." },
      { status: 500 }
    );
  }
}