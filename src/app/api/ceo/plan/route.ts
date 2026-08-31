import { NextRequest, NextResponse } from "next/server";
import { ceoService } from "@/lib/services/ceo.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { goal, apiKey } = body;

    if (!goal || typeof goal !== "string" || goal.trim().length < 5) {
      return NextResponse.json(
        { ok: false, error: "Please enter a specific business goal (at least 5 characters)." },
        { status: 400 }
      );
    }

    const plan = await ceoService.planGoal(goal.trim());

    return NextResponse.json({
      ok: true,
      plan,
    });
  } catch (err: any) {
    console.error("[API /api/ceo/plan] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to generate plan with CEO Agent." },
      { status: 500 }
    );
  }
}