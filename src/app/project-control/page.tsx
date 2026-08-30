"use client";

import React, { useState } from "react";
import Link from "next/link";
import { projectControlService, ProjectControlSummaryRow } from "@/lib/services/control-plane/project-control.service";

export default function ProjectControlOverviewPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const orgId = "ORG-CASILI-01"; // Authoritative operator tenant context

  const projects: ProjectControlSummaryRow[] = projectControlService.listProjects(orgId, {
    status: filter,
    search: search.trim() || undefined,
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
                SYNAPSE Project Command Center
              </h1>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              Unified operational control plane aggregating CRM, QA, Payments, Builds, and Deployments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333] px-3 py-1.5 rounded-md font-mono">
              Tenant: {orgId}
            </span>
            <span className="text-xs bg-[#f0fdf4]/80 border border-[#86efac] text-[#166534] px-3 py-1.5 rounded-md font-mono">
              LIVE_REAL: VERIFIED
            </span>
          </div>
        </div>

        {/* Controls: Filter & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white/60 p-4 rounded-xl border border-[#d4d4d0]">
          <div className="flex flex-wrap gap-2">
            {["ALL", "HEALTHY", "ACTION_REQUIRED", "COMPLETED", "BLOCKED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === st
                    ? "bg-indigo-600 text-[#111111] shadow-md shadow-indigo-600/30"
                    : "bg-[#f7f7f5] text-[#333333] hover:bg-slate-700 border border-[#d4d4d0]"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d4d4d0] rounded-lg px-3 py-1.5 text-xs text-[#222222] placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table / Cards Grid */}
        <div className="bg-white/40 rounded-xl border border-[#d4d4d0] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-[#d4d4d0] text-[#666666] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Project & Client</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Health</th>
                  <th className="py-3.5 px-4">Build</th>
                  <th className="py-3.5 px-4">QA</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Delivery</th>
                  <th className="py-3.5 px-4">Deployment</th>
                  <th className="py-3.5 px-4">Actions</th>
                  <th className="py-3.5 px-4 text-right">Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[#777777] font-sans">
                      No authorized projects matching filter.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.projectId} className="hover:bg-[#f7f7f5]/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-sans font-semibold text-[#111111]">{p.projectName}</div>
                        <div className="text-[#666666] text-[11px] font-sans">{p.clientName} ({p.projectId})</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333] text-[11px]">
                          {p.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.health === "HEALTHY"
                              ? "bg-[#f0fdf4] text-[#166534] border border-[#86efac]"
                              : p.health === "ACTION_REQUIRED"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {p.health}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#333333]">{p.buildStatus}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">{p.qaStatus}</td>
                      <td className="py-3.5 px-4">
                        <span className={p.paymentStatus === "PAID" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={p.deliveryStatus === "DELIVERED" ? "text-emerald-400" : "text-[#666666]"}>
                          {p.deliveryStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-cyan-400 font-bold">{p.deploymentStatus}</td>
                      <td className="py-3.5 px-4">
                        {p.actionRequiredCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700 text-[10px]">
                            {p.actionRequiredCount} PENDING
                          </span>
                        ) : (
                          <span className="text-[#777777] text-[11px]">CLEAN</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          href={`/project-control/${p.projectId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-[#111111] text-[#111111] text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                        >
                          Command Center →
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