import { NextRequest, NextResponse } from "next/server";
import { developerService } from "@/lib/services/developer.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { taskId, apiKey } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid taskId." },
        { status: 400 }
      );
    }

    const result = await developerService.executeMockupDevelopment(taskId, apiKey);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/developer/execute] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to execute concept generation." },
      { status: 500 }
    );
  }
}