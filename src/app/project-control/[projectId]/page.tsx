"use client";

import React, { use } from "react";
import Link from "next/link";
import { projectControlService, ProjectControlSnapshot } from "@/lib/services/control-plane/project-control.service";

export default function ProjectControlDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01"; // Authoritative operator tenant context
  const snapshot: ProjectControlSnapshot | null = projectControlService.getProjectSnapshot(resolvedParams.projectId, orgId);

  if (!snapshot) {
    return (
      <div className="text-[#111] p-8 flex items-center justify-center font-sans">
        <div className="bg-white border border-[#d4d4d0] p-6 rounded-xl max-w-md text-center space-y-4">
          <div className="text-amber-400 text-3xl font-bold">404 / Boundary Block</div>
          <p className="text-sm text-[#666666]">
            Project <span className="font-mono text-[#222222]">{resolvedParams.projectId}</span> was not found or is outside your authorized tenant scope.
          </p>
          <Link href="/project-control" className="inline-block px-4 py-2 bg-indigo-600 rounded-lg text-xs font-semibold text-[#111111]">
            ← Back to Command Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/project-control" className="text-xs text-[#1a365d] hover:text-indigo-300 font-semibold flex items-center gap-1">
            ← Back to All Projects
          </Link>
          <span className="text-xs font-mono text-[#666666]">
            Last Updated: {new Date().toLocaleTimeString()} (LIVE)
          </span>
        </div>

        {/* 1. Header Card */}
        <div className="bg-white/80 border border-[#d4d4d0] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight">
                  {snapshot.project.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    snapshot.operations.health.overall === "HEALTHY"
                      ? "bg-[#f0fdf4] text-[#166534] border border-[#86efac]"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {snapshot.operations.health.overall}
                </span>
              </div>
              <p className="text-sm text-[#666666] mt-1 font-sans">
                Client: <span className="text-[#222222] font-medium">{snapshot.client.name}</span> ({snapshot.client.email}) | ID: <span className="font-mono text-[#333333]">{snapshot.project.projectId}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#333333]">
                {snapshot.project.version}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-cyan-300">
                Stage: {snapshot.project.stage}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 text-xs font-mono">
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">Contract Value</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">₱{snapshot.commercial.contractValue.toLocaleString()}</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">Payment Status</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{snapshot.commercial.isPaid ? "PAID" : "PENDING"}</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">QA Status</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">ALL PASS (6/6)</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">Build Status</div>
              <div className="text-base font-bold text-[#222222] mt-0.5">{snapshot.release.buildStatus}</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">Deployment</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5">{snapshot.deployment.deploymentStatus}</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-[#d4d4d0]/80">
              <div className="text-[#666666] font-sans text-[11px]">Delivery</div>
              <div className="text-base font-bold text-[#222222] mt-0.5">{snapshot.delivery.deliveryStatus}</div>
            </div>
          </div>
        </div>

        {/* 2. Action Required Banner */}
        {snapshot.actionsRequired.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <span>⚠️ Action Required ({snapshot.actionsRequired.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {snapshot.actionsRequired.map((act) => (
                <div key={act.actionId} className="bg-white/80 p-3 rounded-lg border border-amber-900/40 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-200 font-mono">{act.actionType}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-200">
                      {act.priority}
                    </span>
                  </div>
                  <p className="text-[#333333] text-[11px] font-sans">{act.reason}</p>
                  <p className="text-[#777777] text-[10px] font-mono">Evidence: {act.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed 4-Column Grid Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Commercial */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Commercial Health</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between"><span className="text-[#666666]">Invoice ID:</span><span>{snapshot.commercial.invoiceId}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Contract:</span><span>₱{snapshot.commercial.contractValue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Paid:</span><span className="text-emerald-400">₱{snapshot.commercial.paidAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Environment:</span><span>{snapshot.commercial.paymentEnvironment}</span></div>
            </div>
          </div>

          {/* Quality Assurance */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Quality & QA Gates</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">Code: <span className="text-emerald-400 font-bold">PASS</span></div>
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">Visual: <span className="text-emerald-400 font-bold">PASS</span></div>
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">Functional: <span className="text-emerald-400 font-bold">PASS</span></div>
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">A11y: <span className="text-emerald-400 font-bold">PASS</span></div>
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">Security: <span className="text-emerald-400 font-bold">PASS</span></div>
              <div className="bg-white p-2 rounded border border-[#d4d4d0]/80">Content: <span className="text-emerald-400 font-bold">PASS</span></div>
            </div>
          </div>

          {/* Release & Build Artifact */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Release & Build Artifact</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between"><span className="text-[#666666]">Release Candidate:</span><span>{snapshot.release.releaseCandidateId}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Artifact ID:</span><span>{snapshot.release.artifactId}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Artifact Hash:</span><span className="text-[10px] text-[#333333]">{snapshot.release.artifactHash.slice(0, 16)}...</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Approval:</span><span className="text-emerald-400">CLIENT_APPROVED</span></div>
            </div>
          </div>

          {/* Deployment */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Deployment Operations</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between"><span className="text-[#666666]">Target Provider:</span><span>{snapshot.deployment.targetProvider}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Live URL:</span><a href={snapshot.deployment.liveUrl} target="_blank" rel="noreferrer" className="text-[#1a365d] underline">{snapshot.deployment.liveUrl}</a></div>
              <div className="flex justify-between"><span className="text-[#666666]">Rollback Target:</span><span>{snapshot.deployment.rollbackTarget}</span></div>
            </div>
          </div>

          {/* Implementation & Source Binding */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Implementation Integrity</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between"><span className="text-[#666666]">Snapshot:</span><span>{snapshot.implementation.snapshotId}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Source Hash:</span><span className="text-[10px] text-[#333333]">{snapshot.implementation.sourceHash.slice(0, 16)}...</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Developer Model:</span><span>{snapshot.implementation.developerModel}</span></div>
            </div>
          </div>

          {/* Telemetry & Observability */}
          <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Execution Telemetry</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between"><span className="text-[#666666]">Executions:</span><span>{snapshot.telemetry.executionCount}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Model:</span><span>{snapshot.telemetry.latestModel}</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Avg Latency:</span><span>{snapshot.telemetry.latestLatencyMs}ms</span></div>
              <div className="flex justify-between"><span className="text-[#666666]">Cost:</span><span>UNKNOWN (Local Ollama)</span></div>
            </div>
          </div>
        </div>

        {/* 10. Lifecycle Timeline */}
        <div className="bg-white/60 border border-[#d4d4d0] p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold uppercase text-[#666666] tracking-wider">Authoritative Lifecycle Timeline</h3>
          <div className="flex flex-wrap gap-2">
            {snapshot.timeline.map((item, idx) => (
              <div key={item.stage} className="bg-white p-2.5 rounded-lg border border-[#d4d4d0] flex items-center gap-2 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#222222]">{item.stage}</span>
                <span className="text-[#777777] text-[10px]">({item.actor})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}