import { NextRequest, NextResponse } from "next/server";
import { approvalRepository } from "@/lib/repositories/approval.repository";
import { taskService } from "@/lib/services/task.service";
import { activityRepository } from "@/lib/repositories/activity.repository";
import { pilotService } from "@/lib/services/pilot/pilot.service";

export async function POST(req: NextRequest) {
  try {
    const { approvalId } = await req.json();
    if (!approvalId) {
      return NextResponse.json({ ok: false, error: "approvalId is required" }, { status: 400 });
    }

    const approval = await approvalRepository.getById(approvalId);
    if (!approval) {
      return NextResponse.json({ ok: false, error: `Approval '${approvalId}' not found` }, { status: 404 });
    }

    await approvalRepository.updateStatus(approvalId, "approved");

    let sendResult: any = null;
    const payload = approval.details?.payloadPreview || (approval as any).payload || {};

    if (payload.recipient && payload.body) {
      try {
        sendResult = await pilotService.sendOutreachMessage({
          pilotId: payload.pilotId || "PLT-SINDOUS-PILOT",
          organizationId: payload.organizationId || "ORG-SINDOUS-BUILDING",
          contactId: payload.contactId || "CNT-SINDOUS-01",
          recipientEmail: payload.recipient,
          subject: payload.subject || "Message from SYNAPSE",
          body: payload.body,
          approvalId: approval.id,
          isRealMarketRecipient: false,
        });
      } catch (sendErr: any) {
        console.error("[/api/approvals/approve] Send Error:", sendErr);
      }
    }

    const taskId = payload.taskId || approvalId.replace("APR-", "TSK-");
    const task = await taskService.getTaskById(taskId);
    if (task) {
      await taskService.transitionStatus(task.id, "completed", { output: sendResult || { approved: true } });
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Approval Executed: ${approvalId}`,
      description: `Operator authorized action "${approval.action}". ${sendResult?.messageId ? "Outbound email dispatched." : ""}`,
      level: "success",
      agentName: "Operator",
      metadata: { approvalId, messageId: sendResult?.messageId },
    });

    return NextResponse.json({ ok: true, approval, sendResult });
  } catch (err: any) {
    console.error("[/api/approvals/approve] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}