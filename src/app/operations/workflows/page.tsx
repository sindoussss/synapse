"use client";

import React, { useState } from "react";
import Link from "next/link";
import { workflowReconstructionService } from "@/lib/services/workflow/workflow-reconstruction.service";
import { workflowResumeService } from "@/lib/services/workflow/workflow-resume.service";
import { workflowDiagnosisService } from "@/lib/services/workflow/workflow-diagnosis.service";
import { workflowEventRepository } from "@/lib/repositories/workflow-event.repository";

export default function OperationsWorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState("WF-PRJ-SINDOUS-01");

  const state = workflowReconstructionService.replayWorkflow(selectedWorkflow);
  const resumeEval = workflowResumeService.evaluateResumeSafety(selectedWorkflow);
  const diagnosis = workflowDiagnosisService.diagnoseWorkflow(selectedWorkflow);
  const chainCheck = workflowEventRepository.verifyChainIntegrity(selectedWorkflow);

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
              Operator Workflow State & Recovery Console
            </h1>
            <p className="text-sm text-[#666666] mt-1">
              Replay event streams, verify hash chains, compare derived snapshots, and evaluate safe crash resumption.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/project-control"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333] font-semibold"
            >
              ← Project Command Center
            </Link>
          </div>
        </div>

        {/* Workflow Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-2 font-mono text-xs">
            <div className="text-[#666666] font-sans text-xs">Workflow ID</div>
            <div className="text-sm font-bold text-[#111111]">{selectedWorkflow}</div>
            <div className="text-[#777777]">Current State: <span className="text-emerald-400 font-bold">{state?.currentState || "UNKNOWN"}</span></div>
            <div className="text-[#777777]">Events Processed: <span className="text-[#333333]">{state?.totalEventsProcessed || 0}</span></div>
          </div>

          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-2 font-mono text-xs">
            <div className="text-[#666666] font-sans text-xs">Chain Integrity</div>
            <div className={`text-sm font-bold ${chainCheck.valid ? "text-emerald-400" : "text-rose-400"}`}>
              {chainCheck.valid ? "VERIFIED (0 Violations)" : "TAMPERED / BROKEN CHAIN"}
            </div>
            <div className="text-[#777777]">Snapshot Consistent: <span className="text-emerald-400">{state?.isConsistentWithSnapshot ? "YES" : "NO"}</span></div>
          </div>

          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-2 font-mono text-xs">
            <div className="text-[#666666] font-sans text-xs">Resume Safety Decision</div>
            <div className={`text-sm font-bold ${resumeEval.decision === "SAFE_TO_RESUME" ? "text-emerald-400" : "text-amber-400"}`}>
              {resumeEval.decision}
            </div>
            <div className="text-[#777777] truncate">Action: {resumeEval.nextSafeAction}</div>
          </div>
        </div>

        {/* Diagnostic Breakdown */}
        <div className="bg-white/60 border border-[#d4d4d0] p-5 rounded-xl space-y-3 font-mono text-xs">
          <div className="text-sm font-bold text-[#111111] font-sans border-b border-[#d4d4d0] pb-2">
            Automated Diagnostic Assessment ("Why is this stuck?")
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#333333]">
            <div><span className="text-[#777777]">Blocking State:</span> {diagnosis.blockingState || "NONE (Operating Normally)"}</div>
            <div><span className="text-[#777777]">Responsible Actor:</span> {diagnosis.responsibleActor || "NONE"}</div>
            <div className="col-span-2"><span className="text-[#777777]">Next Authorized Action:</span> {diagnosis.nextAuthorizedAction}</div>
            <div className="col-span-2"><span className="text-[#777777]">Evidence Citing:</span> {diagnosis.evidence.join(", ")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}