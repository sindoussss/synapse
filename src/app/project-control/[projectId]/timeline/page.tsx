"use client";

import React, { use } from "react";
import Link from "next/link";
import { workflowEventRepository, WorkflowEventRecord } from "@/lib/repositories/workflow-event.repository";

export default function ProjectTimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01";

  const events = workflowEventRepository.listEvents({
    organizationId: orgId,
    projectId: resolvedParams.projectId,
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/project-control/${resolvedParams.projectId}`}
            className="text-xs text-[#1a365d] hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            ← Back to Project Command Center
          </Link>
          <span className="text-xs font-mono text-[#666666]">
            Project: {resolvedParams.projectId}
          </span>
        </div>

        {/* Header */}
        <div className="bg-white/80 border border-[#d4d4d0] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight">
                Authoritative Workflow Event Timeline
              </h1>
              <p className="text-sm text-[#666666] mt-1">
                Append-only cryptographic event log for state reconstruction and auditability.
              </p>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300">
                Total Events: {events.length}
              </span>
            </div>
          </div>
        </div>

        {/* Event Stream */}
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-[#f7f7f5]">
          {events.map((e) => (
            <div key={e.eventId} className="relative pl-10">
              <div className="absolute left-2.5 top-3.5 h-3 w-3 rounded-full bg-[#111111] border-2 border-slate-950" />
              <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-2 font-mono text-xs hover:border-[#d4d4d0] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d4d4d0] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111] bg-[#f7f7f5] px-2 py-0.5 rounded">
                      Seq #{e.sequenceNumber}
                    </span>
                    <span className="text-[#1a365d] font-bold">{e.eventType}</span>
                  </div>
                  <span className="text-[#777777] text-[11px]">
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#333333]">
                  <div>
                    <span className="text-[#777777]">Actor:</span> {e.actorType} ({e.actorId})
                  </div>
                  <div>
                    <span className="text-[#777777]">State Transition:</span>{" "}
                    <span className="text-[#666666]">{e.previousState}</span> →{" "}
                    <span className="text-emerald-400 font-bold">{e.nextState}</span>
                  </div>
                </div>

                {e.evidenceIds.length > 0 && (
                  <div className="text-[11px] text-[#666666]">
                    <span className="text-[#777777]">Evidence:</span> {e.evidenceIds.join(", ")}
                  </div>
                )}

                <div className="text-[10px] text-[#777777] truncate">
                  <span className="text-slate-600">SHA-256 Hash:</span> {e.eventHash}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}