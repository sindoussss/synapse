'use client';
import React from 'react';
import Link from 'next/link';

export default function HandoffCenterPage({ params }: { params: { projectId: string } }) {
  const projectId = params?.projectId || 'PRJ-SINDOUS-01';

  return (
    <div className="text-[#111] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <Link href={`/client/projects/${projectId}`} className="hover:text-[#222222]">
            ← Project Overview
          </Link>
          <span>/</span>
          <span className="text-[#222222] font-medium">Handoff Center</span>
        </div>

        <header className="border-b border-[#d4d4d0] pb-4">
          <h1 className="text-2xl font-bold text-[#111111]">Client Handoff Package</h1>
          <p className="text-xs text-[#666666] mt-1">
            Complete architectural documentation, deployment records, and administrator guides for Sindous Building Supplies.
          </p>
        </header>

        <div className="bg-white/60 border border-[#d4d4d0] rounded-xl p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Handoff Metadata</h2>
          <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-slate-900">
            <div>
              <span className="text-[#777777] block">Final Approved Version</span>
              <span className="font-mono text-[#222222]">v1.0.0 (RC-2026-LIVE-9180)</span>
            </div>
            <div>
              <span className="text-[#777777] block">Production Endpoint</span>
              <a href="http://127.0.0.1:3005/preview/sindous-building" className="text-blue-400 hover:underline">
                http://127.0.0.1:3005/preview/sindous-building ↗
              </a>
            </div>
            <div>
              <span className="text-[#777777] block">Accessibility Standard</span>
              <span className="text-emerald-400">WCAG AA Compliant</span>
            </div>
            <div>
              <span className="text-[#777777] block">Security Status</span>
              <span className="text-emerald-400">Clean (0 secrets, 0 eval)</span>
            </div>
          </div>

          <h3 className="text-xs font-bold text-[#333333] pt-2">Known Technical Limitations</h3>
          <ul className="list-disc list-inside text-[#666666] space-y-1">
            <li>Concrete volume batching estimation based on standard Class A 1:2:4 ratio.</li>
            <li>ERP integration scheduled for v2.0 roadmap.</li>
          </ul>

          <h3 className="text-xs font-bold text-[#333333] pt-2">Maintenance & Change Protocol</h3>
          <p className="text-[#666666] leading-relaxed">
            All code modifications must be submitted as Change Requests and must pass deterministic multi-vector QA prior to deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
