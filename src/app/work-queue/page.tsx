"use client";

import React, { useState, useEffect } from "react";
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

interface QueueSummary {
  totalCount: number;
  readyCount: number;
  blockedCount: number;
  waitingHumanCount: number;
  runningCount: number;
  criticalCount: number;
}

export default function GlobalWorkQueuePage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({
    totalCount: 0,
    readyCount: 0,
    blockedCount: 0,
    waitingHumanCount: 0,
    runningCount: 0,
    criticalCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/work-queue/list?organizationId=ORG-CASILI-01&status=${filter}`);
        const data = await res.json();
        if (data.ok) {
          setItems(data.items || []);
          if (data.summary) {
            setSummary(data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to load work queue", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filter]);

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#111111] animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
                SYNAPSE Autonomous Work Queue
              </h1>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              Deterministic priority scheduling, dependency resolution, and worker allocation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/project-control"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333] hover:bg-[#eaeaea] transition-all font-semibold"
            >
              ← Command Center
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Total Work</div>
            <div className="text-lg font-bold text-[#111111] mt-0.5">{summary.totalCount}</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Ready to Run</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">{summary.readyCount}</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Blocked</div>
            <div className="text-lg font-bold text-rose-600 mt-0.5">{summary.blockedCount}</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Waiting Human</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">{summary.waitingHumanCount}</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Active Running</div>
            <div className="text-lg font-bold text-cyan-600 mt-0.5">{summary.runningCount}</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Critical Items</div>
            <div className="text-lg font-bold text-red-600 mt-0.5">{summary.criticalCount}</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2 bg-white/60 p-3 rounded-xl border border-[#d4d4d0]">
          {["ALL", "READY", "BLOCKED", "WAITING_HUMAN", "RUNNING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === st
                  ? "bg-black text-white shadow-xs"
                  : "bg-[#f7f7f5] text-[#333333] hover:bg-[#eaeaea] border border-[#d4d4d0]"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Work Table */}
        <div className="bg-white/80 rounded-xl border border-[#d4d4d0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f7f5] border-b border-[#d4d4d0] text-[#666666] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Work Item ID & Project</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Eligible Actors</th>
                  <th className="py-3.5 px-4">Blocker / Dependency</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#777777] font-sans">
                      Loading work queue items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#777777] font-sans">
                      No work items match filter '{filter}'.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.workItemId} className="hover:bg-[#f7f7f5] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#111111]">{item.workItemId}</div>
                        <div className="text-[#666666] text-[11px] font-sans">{item.projectId}</div>
                      </td>
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
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          href={`/project-control/${item.projectId}/work`}
                          className="inline-block px-2.5 py-1 rounded bg-[#f7f7f5] hover:bg-[#e5e5e5] border border-[#d4d4d0] text-[11px] font-semibold text-neutral-800"
                        >
                          Details →
                        </Link>
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
