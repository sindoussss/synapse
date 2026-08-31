"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";

interface WorkItem {
  workItemId: string;
  organizationId: string;
  projectId: string;
  workType: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  eligibleActors: string[];
  blockingReasons: string[];
  dependencies: string[];
}

export default function ProjectWorkQueuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/work-queue/list?organizationId=ORG-CASILI-01&projectId=${resolvedParams.projectId}`);
        const data = await res.json();
        if (data.ok) {
          setItems(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load project work items", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resolvedParams.projectId]);

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/project-control/${resolvedParams.projectId}`}
            className="text-xs text-[#111] hover:underline font-semibold flex items-center gap-1"
          >
            ← Back to Project Command Center
          </Link>
          <span className="text-xs font-mono text-[#666666]">
            Project Scope: {resolvedParams.projectId}
          </span>
        </div>

        {/* Header */}
        <div className="bg-white/80 border border-[#d4d4d0] rounded-2xl p-6 shadow-xs backdrop-blur-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight">
                Project Orchestration Queue
              </h1>
              <p className="text-sm text-[#666666] mt-1 font-sans">
                Task dependency graph and execution timeline for <span className="font-mono text-[#222222]">{resolvedParams.projectId}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Work Table */}
        <div className="bg-white/80 rounded-xl border border-[#d4d4d0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f7f5] border-b border-[#d4d4d0] text-[#666666] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Work Item ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Eligible Actors</th>
                  <th className="py-3.5 px-4">Blocker / Dependency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#777777] font-sans">
                      Loading project work items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#777777] font-sans">
                      No work items found for project {resolvedParams.projectId}.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.workItemId} className="hover:bg-[#f7f7f5] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#111111]">{item.workItemId}</td>
                      <td className="py-3.5 px-4 font-sans text-[#333333]">{item.workType}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.priority === "CRITICAL"
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : item.priority === "HIGH"
                              ? "bg-amber-100 text-amber-700 border border-amber-300"
                              : "bg-[#f7f7f5] text-[#333333] border border-[#d4d4d0]"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.status === "READY"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : item.status === "WAITING_HUMAN"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : item.status === "BLOCKED"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-[#f7f7f5] text-[#333333]"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#666666] text-[11px]">
                        {item.eligibleActors?.join(", ")}
                      </td>
                      <td className="py-3.5 px-4 text-[#666666] text-[11px] font-sans">
                        {item.blockingReasons?.length > 0
                          ? item.blockingReasons.join("; ")
                          : item.dependencies?.length > 0
                          ? `Depends on: ${item.dependencies.join(", ")}`
                          : "None (Clean)"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
