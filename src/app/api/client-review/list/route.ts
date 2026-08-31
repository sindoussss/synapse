import { NextResponse } from "next/server";
import { clientReviewRepository } from "@/lib/repositories/client-review.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    const sessions = await clientReviewRepository.getSessionsByProject(projectId);
    const feedback = await clientReviewRepository.getFeedbackByProject(projectId);
    return NextResponse.json({ ok: true, sessions, feedback });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}