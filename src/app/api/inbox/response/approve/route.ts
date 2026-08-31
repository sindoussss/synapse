import { NextRequest, NextResponse } from "next/server";
import { responseDraftRepository } from "@/lib/repositories/response-draft.repository";
import { activityRepository } from "@/lib/repositories/activity.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { responseId, action, updates } = body;

    if (!responseId) {
      return NextResponse.json({ ok: false, error: "Missing responseId" }, { status: 400 });
    }

    let result;
    if (action === "edit" && updates) {
      result = await responseDraftRepository.update(responseId, updates);
    } else if (action === "reject") {
      result = await responseDraftRepository.updateStatus(responseId, "rejected");
      await activityRepository.add({
        type: "approval_event",
        title: `Response Draft Rejected: ${responseId}`,
        description: `Operator rejected suggested reply draft (${responseId}).`,
        level: "warning",
        agentName: "Human Operator",
      });
    } else {
      result = await responseDraftRepository.updateStatus(responseId, "approved");
      await activityRepository.add({
        type: "approval_event",
        title: `Response Draft Approved for Sending: ${responseId}`,
        description: `Operator approved reply draft (${responseId}) for future dispatch. (Response remains unsent in Phase 11).`,
        level: "success",
        agentName: "Human Operator",
      });
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process response draft." },
      { status: 500 }
    );
  }
}