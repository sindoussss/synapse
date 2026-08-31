import { NextRequest, NextResponse } from "next/server";
import { deploymentService } from "@/lib/services/deployment.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { redesignProjectId } = body;

    if (!redesignProjectId || typeof redesignProjectId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid redesignProjectId." },
        { status: 400 }
      );
    }

    const result = await deploymentService.requestPreviewDeployment(redesignProjectId);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/deployment/request] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to request preview deployment." },
      { status: 500 }
    );
  }
}