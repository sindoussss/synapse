"use client";

import React, { use } from "react";
import Link from "next/link";
import { workOrchestrationRepository, WorkItemRecord } from "@/lib/repositories/work-orchestration.repository";

export default function ProjectWorkQueuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01";

  const items = workOrchestrationRepository.listWorkItems({
    projectId: resolvedParams.projectId,
    organizationId: orgId,
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
                Project Orchestration Queue
              </h1>
              <p className="text-sm text-[#666666] mt-1 font-sans">
                Task dependency graph and execution timeline for <span className="font-mono text-[#222222]">{resolvedParams.projectId}</span>.
              </p>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333]">
                Tasks: {items.length}
              </span>
            </div>
          </div>
        </div>

        {/* Task List / Graph */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white/40 p-8 rounded-xl border border-[#d4d4d0] text-center text-[#777777] text-sm">
              No tasks currently tracked for this project.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.workItemId}
                className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111111] text-sm font-mono">{item.workItemId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.status === "SUCCEEDED"
                          ? "bg-[#f0fdf4] text-[#166534] border border-[#86efac]"
                          : item.status === "WAITING_HUMAN"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : item.status === "BLOCKED"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-[#f7f7f5] text-[#333333] border border-[#d4d4d0]"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#f7f7f5] text-[#666666] font-mono">
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[#333333] font-sans">
                    Type: <span className="font-semibold">{item.workType}</span> | Eligible Actors: {item.eligibleActors.join(", ")}
                  </p>
                  {item.dependencies.length > 0 && (
                    <p className="text-[11px] text-[#666666] font-mono">
                      Prerequisites: {item.dependencies.join(", ")}
                    </p>
                  )}
                  {item.blockingReasons.length > 0 && (
                    <p className="text-[11px] text-amber-400 font-sans">
                      ⚠️ Blocker: {item.blockingReasons.join("; ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#666666]">
                  <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}