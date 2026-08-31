import { NextRequest, NextResponse } from "next/server";
import { developerService } from "@/lib/services/developer.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { projectId, action, reason } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid projectId." },
        { status: 400 }
      );
    }

    let result;
    if (action === "reject") {
      result = await developerService.rejectRedesign(projectId, reason);
    } else {
      result = await developerService.approveRedesign(projectId);
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/developer/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process concept approval." },
      { status: 500 }
    );
  }
}