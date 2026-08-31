import { NextResponse } from "next/server";
import { workOrchestrationRepository, WorkStatus } from "@/lib/repositories/work-orchestration.repository";
import { workOrchestratorService } from "@/lib/services/orchestration/work-orchestrator.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;

    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId") || "ORG-CASILI-01";
    const statusParam = url.searchParams.get("status");
    const projectId = url.searchParams.get("projectId") || undefined;

    const summary = workOrchestratorService.getQueueSummary(orgId);
    const items = workOrchestrationRepository.listWorkItems({
      organizationId: orgId,
      projectId,
      status: statusParam && statusParam !== "ALL" ? (statusParam as WorkStatus) : undefined,
    });

    return NextResponse.json({ ok: true, summary, items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list work queue." },
      { status: 500 }
    );
  }
}
