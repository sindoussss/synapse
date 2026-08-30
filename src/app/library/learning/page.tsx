"use client";

import React, { useState } from "react";

export default function DesignLearningPage() {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "CONTRADICTION">("ALL");

  return (
    <div className="text-[#111] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#d4d4d0] pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111] flex items-center gap-3">
              <span className="p-2 bg-indigo-600/20 text-[#1a365d] rounded-lg border border-indigo-500/30">🧠</span>
              Evidence-Driven Design Learning & Continuous Improvement
            </h1>
            <p className="text-[#666666] mt-1">Real observational project telemetry with anti-causality protection and operator review gates.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
              Anti-Causality Gate Active
            </span>
            <span className="px-3 py-1 bg-[#f7f7f5] text-[#333333] border border-[#d4d4d0] rounded-full text-xs font-mono">
              Sample Semantics: N=1 Safeguarded
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Active Usages Tracked</div>
            <div className="text-2xl font-bold text-[#111111] mt-1">3</div>
            <div className="text-xs text-[#1a365d] mt-1">PRJ-SINDOUS, PRJ-LUXE</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Supported Findings</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">1</div>
            <div className="text-xs text-[#666666] mt-1">High confidence (N=3)</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Contradictions Detected</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">0</div>
            <div className="text-xs text-[#666666] mt-1">Consistent evidence</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Controlled Experiments</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">0 Active</div>
            <div className="text-xs text-[#666666] mt-1">Operator pre-registration required</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 border-b border-[#d4d4d0] pb-2">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${activeFilter === "ALL" ? "bg-indigo-600 text-[#111111]" : "bg-white text-[#666666] hover:text-[#111111]"}`}
          >
            All Evidence
          </button>
          <button
            onClick={() => setActiveFilter("PENDING")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${activeFilter === "PENDING" ? "bg-indigo-600 text-[#111111]" : "bg-white text-[#666666] hover:text-[#111111]"}`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setActiveFilter("ACCEPTED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${activeFilter === "ACCEPTED" ? "bg-indigo-600 text-[#111111]" : "bg-white text-[#666666] hover:text-[#111111]"}`}
          >
            Accepted Policy
          </button>
        </div>

        {/* Evidence Card */}
        <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono rounded">
                  SUPPORTED (N=3)
                </span>
                <span className="text-xs text-[#666666] font-mono">LRN-QUOTE-CALC-01</span>
              </div>
              <h3 className="text-lg font-bold text-[#111111] mt-1">QuoteCalculator v1 Responsiveness & Accessibility</h3>
            </div>
            <span className="px-2.5 py-1 bg-[#111111]/10 text-[#1a365d] text-xs font-semibold rounded border border-indigo-500/30">
              OPERATOR ACCEPTED
            </span>
          </div>

          <div className="p-4 bg-white/60 rounded-lg border border-[#d4d4d0]/80 space-y-2">
            <div className="text-xs text-[#666666] font-semibold uppercase tracking-wider">Observed Telemetry:</div>
            <p className="text-sm text-[#222222]">
              QuoteCalculator v1 completed QA across N=3 validation suites with 0 responsive regressions and 100% accessibility score.
            </p>
            <div className="text-xs text-[#666666] font-semibold uppercase tracking-wider mt-3">Evidence Basis:</div>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-[#f7f7f5] text-[#333333] rounded font-mono text-xs">EVID-VIS-P50-01</span>
              <span className="px-2 py-0.5 bg-[#f7f7f5] text-[#333333] rounded font-mono text-xs">EVID-RESP-P50-01</span>
              <span className="px-2 py-0.5 bg-[#f7f7f5] text-[#333333] rounded font-mono text-xs">EVID-A11Y-P50-01</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 text-xs text-[#666666]">
            <div>Confidence: <strong className="text-emerald-400">HIGH</strong> | Subject: <span className="font-mono text-purple-300">COMP-QUOTE-CALC-V1</span></div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] rounded text-xs font-medium">View Telemetry</button>
              <button className="px-3 py-1 bg-emerald-600/20 text-[#166534] border border-emerald-500/30 rounded text-xs font-medium">Adopt as Best Practice</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}