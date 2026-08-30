import Link from "next/link";
import { approvalControlService } from "@/lib/services/approval/approval-control.service";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalRequestId: string }>;
}) {
  const resolvedParams = await params;
  const orgId = "ORG-CASILI-01";
  const preview = approvalControlService.getApprovalPreview(resolvedParams.approvalRequestId, orgId);

  if (!preview) {
    return (
      <div className="py-12">
        <h1 className="ops-display text-[28px] text-[#111]">Request not found</h1>
        <p className="mt-2 text-[14px] text-[#666]">
          Request {resolvedParams.approvalRequestId} was not found or belongs to another tenant.
        </p>
        <Link href="/approvals" className="inline-block mt-4 underline underline-offset-4">
          Back to approvals
        </Link>
      </div>
    );
  }

  const req = preview.request;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <Link href="/approvals" className="text-[13px] underline underline-offset-4">
          Back to approvals
        </Link>
        <span className="text-[13px] text-[#888]">{req.approvalRequestId}</span>
      </div>

      <div>
        <div className="text-[13px] text-[#888]">{req.riskLevel} risk · {req.status}</div>
        <h1 className="ops-display text-[32px] text-[#111] mt-1">{req.requestType}</h1>
        <p className="text-[15px] text-[#666] mt-2">{req.proposedAction}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[14px]">
        <div>
          <h2 className="ops-display text-[20px] mb-3">Target</h2>
          <div className="space-y-1 text-[#111]">
            <div>Project {req.projectId}</div>
            <div>Environment {req.environment}</div>
            <div>Release {req.releaseCandidateId || "None"}</div>
            <div>Snapshot {req.snapshotId || "None"}</div>
          </div>
        </div>
        <div>
          <h2 className="ops-display text-[20px] mb-3">Integrity</h2>
          <div className="space-y-1 text-[#666] break-all">
            <div>Source {req.sourceHash || "N/A"}</div>
            <div>Manifest {req.manifestHash || "N/A"}</div>
            <div>Evidence {req.evidenceIds.join(", ") || "None"}</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="ops-display text-[20px] mb-3">Consequences</h2>
        <p className="text-[15px] text-[#111]">{req.consequences}</p>
        <p className="mt-2 text-[14px] text-[#666]">
          Blockers: {req.blockers.length > 0 ? req.blockers.join(", ") : "None. Workflow will resume."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e5e5] pt-6">
        <p className="text-[13px] text-[#666]">
          Decisions are audited with operator signature binding.
        </p>
        <div className="flex items-center gap-4 text-[14px]">
          <button type="button" className="underline underline-offset-4 cursor-pointer">
            Request changes
          </button>
          <button type="button" className="underline underline-offset-4 cursor-pointer">
            Reject
          </button>
          <button type="button" className="bg-[#111] text-white px-4 py-2 cursor-pointer">
            Approve and resume
          </button>
        </div>
      </div>
    </div>
  );
}
