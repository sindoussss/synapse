import { NextRequest, NextResponse } from "next/server";
import { deploymentService } from "@/lib/services/deployment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deploymentId, action, reason } = body;

    if (!deploymentId || typeof deploymentId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid deploymentId." },
        { status: 400 }
      );
    }

    let result;
    if (action === "reject") {
      result = await deploymentService.rejectDeployment(deploymentId, reason);
    } else {
      result = await deploymentService.approveDeployment(deploymentId);
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/deployment/approve] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process deployment approval." },
      { status: 500 }
    );
  }
}