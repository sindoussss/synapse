'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function ClientDashboardPage() {
  const [activeClient] = useState('Sindous Building Supplies & Construction Services');
  const [clientId] = useState('CLI-SINDOUS-01');

  const projects = [
    {
      id: 'PRJ-SINDOUS-01',
      name: 'Sindous Building Supplies Production Portal',
      domain: 'Heavy Construction & Structural Materials',
      version: 'v1.0.0 (RC-2026-LIVE-9180)',
      previewUrl: 'http://127.0.0.1:3005/preview/sindous-building',
      status: 'OPERATIONS',
      paymentStatus: 'FULLY_PAID',
      health: 'HEALTHY',
      delivery: 'READY_FOR_DOWNLOAD',
    },
  ];

  return (
    <div className="text-[#111] p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                Client Portal
              </span>
              <span className="text-xs text-[#666666]">Authenticated Session</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-2 text-[#111111]">{activeClient}</h1>
            <p className="text-sm text-[#666666] mt-1">Client ID: {clientId} | Workspace: WS-SINDOUS-01</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs bg-white border border-[#d4d4d0] text-emerald-400 px-3 py-1.5 rounded-md font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operations Control Plane Live
            </span>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#111111]">Your Production Projects</h2>
            <span className="text-xs text-[#666666]">1 Active Project</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {projects.map((proj) => (
              <div key={proj.id} className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 hover:border-[#d4d4d0] transition space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#111111] flex items-center gap-3">
                      {proj.name}
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-0.5 rounded">
                        {proj.status}
                      </span>
                    </h3>
                    <p className="text-sm text-[#666666] mt-1">{proj.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded border border-blue-500/20">
                      Payment: {proj.paymentStatus}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded border border-emerald-500/20">
                      Health: {proj.health}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/60 rounded-lg border border-slate-900 text-xs">
                  <div>
                    <span className="text-[#777777] block">Current Version</span>
                    <span className="font-mono text-[#222222] font-semibold">{proj.version}</span>
                  </div>
                  <div>
                    <span className="text-[#777777] block">Preview Endpoint</span>
                    <a href={proj.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      Open Live Preview ↗
                    </a>
                  </div>
                  <div>
                    <span className="text-[#777777] block">QA Status</span>
                    <span className="text-emerald-400 font-semibold">100% Passed (95/100 QA)</span>
                  </div>
                  <div>
                    <span className="text-[#777777] block">Source Package</span>
                    <span className="text-emerald-400 font-semibold">✓ Verified & Ready</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/client/projects/${proj.id}`}
                      className="bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
                    >
                      Open Project Dashboard →
                    </Link>
                    <a
                      href={proj.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                      View Live Website ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#666666]">
                    <Link href={`/client/projects/${proj.id}/changes`} className="hover:text-[#222222] underline">
                      Change Requests
                    </Link>
                    <Link href={`/client/projects/${proj.id}/support`} className="hover:text-[#222222] underline">
                      Support & Maintenance
                    </Link>
                    <Link href={`/client/projects/${proj.id}/handoff`} className="hover:text-[#222222] underline">
                      Handoff Package
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
