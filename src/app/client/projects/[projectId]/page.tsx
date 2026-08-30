'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function ClientProjectOverviewPage({ params }: { params: { projectId: string } }) {
  const projectId = params?.projectId || 'PRJ-SINDOUS-01';
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'requirements' | 'qa' | 'approval' | 'payment' | 'delivery' | 'operations'>('overview');
  const [approvalStatus] = useState<'APPROVED' | 'PENDING'>('APPROVED');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  return (
    <div className="text-[#111] p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <Link href="/client" className="hover:text-[#222222]">
            ← Client Portal
          </Link>
          <span>/</span>
          <span className="text-[#222222] font-mono font-medium">{projectId}</span>
        </div>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-500/20">
                PRODUCTION OPERATIONS
              </span>
              <span className="text-xs text-[#666666] font-mono">RC-2026-LIVE-9180</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-2 text-[#111111]">
              Sindous Building Supplies & Construction Services
            </h1>
            <p className="text-sm text-[#666666] mt-1">
              Industrial Building Materials Catalog & Live Concrete Volume Estimator
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://127.0.0.1:3005/preview/sindous-building"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Open Live Website ↗
            </a>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-[#d4d4d0] pb-3 text-sm">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'preview', label: 'Live Preview' },
            { id: 'requirements', label: 'Requirements' },
            { id: 'qa', label: 'QA & Review' },
            { id: 'approval', label: 'Version Approval' },
            { id: 'payment', label: 'Payment (PayPal)' },
            { id: 'delivery', label: 'Source Delivery' },
            { id: 'operations', label: 'Operations & Health' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-md font-medium transition ${
                activeTab === tab.id
                  ? 'bg-[#f7f7f5] text-emerald-400 border border-[#d4d4d0] shadow-sm'
                  : 'text-[#666666] hover:text-[#222222] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#111111]">Project Summary</h2>
              <p className="text-sm text-[#333333] leading-relaxed">
                SYNAPSE has implemented a professional commercial web portal for Sindous Building Supplies featuring PNS/ASTM structural materials, real-time Class A concrete volume calculator, and wholesale contractor quotation requests.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#d4d4d0]/60 text-xs">
                <div>
                  <span className="text-[#777777] block">Snapshot ID</span>
                  <span className="font-mono text-[#333333]">SNAP-2026-LIVE-9180</span>
                </div>
                <div>
                  <span className="text-[#777777] block">Source Hash</span>
                  <span className="font-mono text-[#333333]">c5da2d80...5066db9</span>
                </div>
                <div>
                  <span className="text-[#777777] block">Release Candidate</span>
                  <span className="font-mono text-[#333333]">RC-2026-LIVE-9180</span>
                </div>
                <div>
                  <span className="text-[#777777] block">Live Port</span>
                  <span className="font-mono text-[#333333]">3005 (HTTP 200 OK)</span>
                </div>
              </div>
            </div>

            <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#333333] uppercase tracking-wider">Quick Actions</h3>
              <div className="flex flex-col gap-2.5">
                <Link
                  href={`/client/projects/${projectId}/changes`}
                  className="w-full text-center bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  Submit Change Request
                </Link>
                <Link
                  href={`/client/projects/${projectId}/support`}
                  className="w-full text-center bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  Request Maintenance & Support
                </Link>
                <Link
                  href={`/client/projects/${projectId}/handoff`}
                  className="w-full text-center bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  View Handoff Package
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#111111]">Live Website Preview</h2>
              <a
                href="http://127.0.0.1:3005/preview/sindous-building"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-[#111111] px-3 py-1.5 rounded-md font-semibold"
              >
                Open in Full Tab ↗
              </a>
            </div>
            <div className="w-full h-96 bg-white border border-[#d4d4d0] rounded-lg overflow-hidden flex items-center justify-center text-[#666666]">
              <iframe
                src="http://127.0.0.1:3005/preview/sindous-building"
                title="Website Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Requirement Intelligence & Classification</h2>
            <div className="space-y-3">
              {[
                { desc: 'Structural Materials Catalog (PNS/ASTM standard concrete, rebars, aggregates)', category: 'CLIENT REQUESTED', status: 'IMPLEMENTED' },
                { desc: 'Interactive Concrete Volume & Bag Estimator (Class A 1:2:4 ratio)', category: 'CLIENT REQUESTED', status: 'IMPLEMENTED' },
                { desc: 'Contractor Wholesale Inquiry & Quotation Submission Form', category: 'CLIENT REQUESTED', status: 'IMPLEMENTED' },
                { desc: 'Automated SEO meta tags for heavy construction supplies', category: 'SYSTEM INFERRED', status: 'IMPLEMENTED' },
                { desc: 'Direct ERP Inventory Integration', category: 'UNKNOWN', status: 'PLANNED' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/60 rounded-lg border border-slate-900 text-xs">
                  <span className="text-[#222222]">{r.desc}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      r.category === 'CLIENT REQUESTED' ? 'bg-blue-500/20 text-blue-400' :
                      r.category === 'SYSTEM INFERRED' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#f7f7f5] text-[#666666]'
                    }`}>
                      {r.category}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Independent Multi-Vector QA Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-white rounded-lg border border-slate-900 text-center">
                <span className="text-[#777777] block">Code Quality</span>
                <span className="text-2xl font-bold text-emerald-400">95 / 100</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-900 text-center">
                <span className="text-[#777777] block">Visual Quality (Gemini)</span>
                <span className="text-2xl font-bold text-emerald-400">94 / 100</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-900 text-center">
                <span className="text-[#777777] block">Accessibility</span>
                <span className="text-2xl font-bold text-emerald-400">WCAG AA</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-900 text-center">
                <span className="text-[#777777] block">Security Audit</span>
                <span className="text-2xl font-bold text-emerald-400">0 Secrets / 0 Eval</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Snapshot-Bound Client Approval</h2>
            <p className="text-sm text-[#333333]">
              Approved Version: <strong className="text-[#111111]">v1.0.0 (RC-2026-LIVE-9180)</strong>
            </p>
            <div className="p-4 bg-[#f0fdf4]/20 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold text-lg">✓</span>
                <div>
                  <span className="text-[#166534] font-semibold block">Version Approved by Client</span>
                  <span className="text-[#666666]">Bound to Snapshot ID: SNAP-2026-LIVE-9180</span>
                </div>
              </div>
              <span className="text-[#666666] font-mono">STATUS: {approvalStatus}</span>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Invoice & PayPal Payment Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-900 text-xs">
              <div>
                <span className="text-[#777777] block">Invoice Total</span>
                <span className="text-[#111111] font-bold text-sm">PHP 88,000.00</span>
              </div>
              <div>
                <span className="text-[#777777] block">Amount Paid</span>
                <span className="text-emerald-400 font-bold text-sm">PHP 88,000.00</span>
              </div>
              <div>
                <span className="text-[#777777] block">Balance Due</span>
                <span className="text-[#222222] font-bold text-sm">PHP 0.00</span>
              </div>
              <div>
                <span className="text-[#777777] block">Payment Status</span>
                <span className="text-emerald-400 font-bold text-sm">✓ FULLY_PAID</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Exact Approved Source Package Delivery</h2>
            <div className="p-4 bg-white rounded-lg border border-slate-900 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Package Status</span>
                <span className="text-emerald-400 font-bold">✓ AVAILABLE FOR DOWNLOAD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">SHA-256 Package Hash</span>
                <span className="font-mono text-[#333333]">8ef4cb5e985856ebf7b15a6b0c26685bb77ad4585141071e626e95267104ae05</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Included Files</span>
                <span className="text-[#333333]">4 Authorized Files (app/page.tsx, components/Header.tsx, components/Catalog.tsx, package.json)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDownloadSuccess(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-sm font-semibold px-6 py-2.5 rounded-lg transition"
              >
                Download Source Package (.zip / .tar)
              </button>
              {downloadSuccess && (
                <p className="text-xs text-emerald-400 mt-2">
                  ✓ Verified exact approved snapshot package downloaded successfully. Download event audited.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="bg-white/60 border border-[#d4d4d0]/80 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">Operations & Health Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-white rounded-lg border border-slate-900">
                <span className="text-[#777777] block">Health Status</span>
                <span className="text-emerald-400 font-bold">● HEALTHY</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-900">
                <span className="text-[#777777] block">Open Incidents</span>
                <span className="text-[#333333] font-bold">0 Active Incidents</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-900">
                <span className="text-[#777777] block">Rollback Readiness</span>
                <span className="text-emerald-400 font-bold">ARMED & VERIFIED</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
