import { NextRequest, NextResponse } from "next/server";
import { developerService } from "@/lib/services/developer.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { leadId, forceOverride } = body;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid leadId." },
        { status: 400 }
      );
    }

    const task = await developerService.createMockupTask(leadId, !!forceOverride);

    return NextResponse.json({
      ok: true,
      task,
    });
  } catch (err: any) {
    console.error("[API /api/developer/create] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create mockup task." },
      { status: 500 }
    );
  }
}