"use client";

import React, { useState } from "react";
import Link from "next/link";
import { workerRepository, WorkerRecord } from "@/lib/repositories/worker.repository";
import { deadLetterRepository } from "@/lib/repositories/dead-letter.repository";
import { workerHealthService } from "@/lib/services/worker/worker-health.service";

export default function GlobalWorkersPage() {
  const orgId = "ORG-CASILI-01";
  const [filter, setFilter] = useState("ALL");

  const workers = workerRepository.listWorkers({ organizationId: orgId });
  const deadLetters = deadLetterRepository.listDeadLetters({ organizationId: orgId });
  const health = workerHealthService.evaluateHealth(orgId);

  const filteredWorkers = workers.filter((w) => {
    if (filter === "ALL") return true;
    return w.status === filter;
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
                SYNAPSE Worker Runtime Fleet
              </h1>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              Durable, fault-tolerant execution nodes with fencing tokens and lease heartbeats.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/work-queue"
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-[#111111] text-[#111111] transition-all font-semibold"
            >
              Work Queue →
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Runtime Fleet Health</div>
            <div className={`text-base font-bold mt-0.5 ${health.overallHealth === "HEALTHY" ? "text-emerald-400" : "text-amber-400"}`}>
              {health.overallHealth}
            </div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Active Heartbeating</div>
            <div className="text-base font-bold text-[#111111] mt-0.5">{health.activeWorkerCount} Nodes</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Stale / Missing Heartbeats</div>
            <div className="text-base font-bold text-[#333333] mt-0.5">{health.staleWorkerCount} Nodes</div>
          </div>
          <div className="bg-white/60 border border-[#d4d4d0] p-3 rounded-xl">
            <div className="text-[#666666] font-sans text-[11px]">Dead Letter Queue</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">{deadLetters.length} Retained</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2 bg-white/60 p-3 rounded-xl border border-[#d4d4d0]">
          {["ALL", "IDLE", "RUNNING", "DRAINING", "STOPPED", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === st
                  ? "bg-indigo-600 text-[#111111] shadow-md shadow-indigo-600/30"
                  : "bg-[#f7f7f5] text-[#333333] hover:bg-slate-700 border border-[#d4d4d0]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Workers Table */}
        <div className="bg-white/40 rounded-xl border border-[#d4d4d0] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-[#d4d4d0] text-[#666666] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Worker ID & Role</th>
                  <th className="py-3.5 px-4">Project Scope</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Current Task</th>
                  <th className="py-3.5 px-4">Last Heartbeat</th>
                  <th className="py-3.5 px-4 text-right">Tasks (Pass / Fail)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredWorkers.map((w) => (
                  <tr key={w.workerId} className="hover:bg-[#f7f7f5]/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#111111]">{w.workerId}</div>
                      <div className="text-[#666666] text-[11px] font-sans">{w.workerType}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-[#333333]">
                      {w.projectId || "GLOBAL"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          w.status === "IDLE"
                            ? "bg-[#f0fdf4] text-[#166534] border border-[#86efac]"
                            : w.status === "RUNNING"
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                            : "bg-[#f7f7f5] text-[#666666]"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#666666]">
                      {w.currentWorkItemId || "None (Idle)"}
                    </td>
                    <td className="py-3.5 px-4 text-[#666666] text-[11px]">
                      {new Date(w.lastHeartbeatAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-emerald-400 font-bold">{w.completedTasks}</span> / <span className="text-rose-400 font-bold">{w.failedTasks}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}