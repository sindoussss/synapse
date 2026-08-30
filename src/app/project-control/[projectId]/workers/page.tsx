"use client";

import React, { use } from "react";
import Link from "next/link";
import { workerRepository, WorkerRecord } from "@/lib/repositories/worker.repository";

export default function ProjectWorkersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01";

  const workers = workerRepository.listWorkers({
    organizationId: orgId,
    projectId: resolvedParams.projectId,
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/project-control/${resolvedParams.projectId}`}
            className="text-xs text-[#1a365d] hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            ← Back to Project Command Center
          </Link>
          <span className="text-xs font-mono text-[#666666]">
            Project Scope: {resolvedParams.projectId}
          </span>
        </div>

        {/* Header */}
        <div className="bg-white/80 border border-[#d4d4d0] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight">
                Project Worker Execution Fleet
              </h1>
              <p className="text-sm text-[#666666] mt-1 font-sans">
                Dedicated worker runtimes allocated to <span className="font-mono text-[#222222]">{resolvedParams.projectId}</span>.
              </p>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333]">
                Allocated Workers: {workers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Workers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.length === 0 ? (
            <div className="col-span-2 bg-white/40 p-8 rounded-xl border border-[#d4d4d0] text-center text-[#777777] text-sm">
              No workers currently assigned specifically to this project scope.
            </div>
          ) : (
            workers.map((w) => (
              <div
                key={w.workerId}
                className="bg-white/60 border border-[#d4d4d0] p-5 rounded-xl space-y-3 font-mono text-xs"
              >
                <div className="flex justify-between items-center border-b border-[#d4d4d0] pb-3">
                  <div>
                    <span className="font-bold text-[#111111] text-sm">{w.workerId}</span>
                    <span className="text-[#666666] text-[11px] font-sans ml-2">({w.workerType})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      w.status === "IDLE"
                        ? "bg-[#f0fdf4] text-[#166534] border border-[#86efac]"
                        : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                <div className="space-y-1 text-[#333333]">
                  <div className="flex justify-between"><span className="text-[#666666]">Current Work Item:</span><span>{w.currentWorkItemId || "None"}</span></div>
                  <div className="flex justify-between"><span className="text-[#666666]">Active Lease ID:</span><span>{w.currentLeaseId || "None"}</span></div>
                  <div className="flex justify-between"><span className="text-[#666666]">Completed Tasks:</span><span className="text-emerald-400 font-bold">{w.completedTasks}</span></div>
                  <div className="flex justify-between"><span className="text-[#666666]">Failed Tasks:</span><span className="text-rose-400 font-bold">{w.failedTasks}</span></div>
                  <div className="flex justify-between"><span className="text-[#666666]">Last Heartbeat:</span><span>{new Date(w.lastHeartbeatAt).toLocaleTimeString()}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}