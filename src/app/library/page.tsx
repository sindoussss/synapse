"use client";

import React, { useState } from "react";

export default function DesignLibraryPage() {
  const [activeTab, setActiveTab] = useState<"components" | "patterns" | "tokens">("components");

  return (
    <div className="text-[#111] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#d4d4d0] pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111] flex items-center gap-3">
              <span className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">🎨</span>
              Versioned Design + Component Intelligence Library
            </h1>
            <p className="text-[#666666] mt-1">Reusable engineering knowledge with immutable versioning and anti-template protection.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
              Immutable Versioning Active
            </span>
            <span className="px-3 py-1 bg-[#f7f7f5] text-[#333333] border border-[#d4d4d0] rounded-full text-xs font-mono">
              Components: 4 Validated
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Validated Components</div>
            <div className="text-2xl font-bold text-[#111111] mt-1">4</div>
            <div className="text-xs text-emerald-400 mt-1">100% QA pass rate</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Design Patterns</div>
            <div className="text-2xl font-bold text-[#111111] mt-1">2</div>
            <div className="text-xs text-[#1a365d] mt-1">Structural 12-Col, Editorial</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Token Sets</div>
            <div className="text-2xl font-bold text-[#111111] mt-1">2</div>
            <div className="text-xs text-purple-400 mt-1">Industrial, Minimal Luxe</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Anti-Template Status</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">HEALTHY</div>
            <div className="text-xs text-[#666666] mt-1">0 cookie-cutter violations</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[#d4d4d0]">
          <button
            onClick={() => setActiveTab("components")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "components" ? "border-purple-500 text-purple-400" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Component Registry
          </button>
          <button
            onClick={() => setActiveTab("patterns")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "patterns" ? "border-purple-500 text-purple-400" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Design Patterns
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "tokens" ? "border-purple-500 text-purple-400" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Design Token Sets
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "components" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#111111]">Interactive Quote Calculator</h3>
                  <div className="text-xs text-purple-400 font-mono">COMP-QUOTE-CALC-V1 (v1)</div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/30">VALIDATED</span>
              </div>
              <p className="text-sm text-[#333333]">Dynamic material estimation and real-time project quote calculator.</p>
              <div className="text-xs text-[#666666] space-y-1">
                <div><strong>Category:</strong> CALCULATOR</div>
                <div><strong>Supported:</strong> Construction & Building Materials, Manufacturing</div>
                <div><strong>Quality:</strong> STABLE (Usage: 3 projects)</div>
              </div>
            </div>

            <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#111111]">Filterable Product Grid</h3>
                  <div className="text-xs text-purple-400 font-mono">COMP-PROD-GRID-V1 (v1)</div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/30">VALIDATED</span>
              </div>
              <p className="text-sm text-[#333333]">Responsive card grid for showcasing categorized inventory and materials.</p>
              <div className="text-xs text-[#666666] space-y-1">
                <div><strong>Category:</strong> CATALOG</div>
                <div><strong>Supported:</strong> Construction, Wholesale, Distribution</div>
                <div><strong>Quality:</strong> STABLE (Usage: 4 projects)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "patterns" && (
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#111111]">Design Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#f7f7f5]/50 rounded-lg border border-[#d4d4d0] space-y-2">
                <div className="font-bold text-[#111111]">STRUCTURAL_12_COLUMN</div>
                <p className="text-xs text-[#333333]">High-density, modular grid ideal for B2B industrial suppliers with large product lines.</p>
                <div className="text-xs text-emerald-400">Suitable: Construction, Manufacturing, Logistics</div>
              </div>
              <div className="p-4 bg-[#f7f7f5]/50 rounded-lg border border-[#d4d4d0] space-y-2">
                <div className="font-bold text-[#111111]">EDITORIAL_MASONRY</div>
                <p className="text-xs text-[#333333]">Rich visual storytelling for hospitality, luxury venues, and culinary experiences.</p>
                <div className="text-xs text-emerald-400">Suitable: Fine Dining, Luxury Hospitality, Architecture</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#111111]">Design Token Sets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#f7f7f5]/50 rounded-lg border border-[#d4d4d0] space-y-2">
                <div className="font-bold text-[#111111]">Industrial Structural v1</div>
                <div className="text-xs text-[#666666]">Primary: #2563EB | Surface: #0F172A | Mono Tags</div>
              </div>
              <div className="p-4 bg-[#f7f7f5]/50 rounded-lg border border-[#d4d4d0] space-y-2">
                <div className="font-bold text-[#111111]">Minimal Luxe v1</div>
                <div className="text-xs text-[#666666]">Primary: #D4AF37 | Surface: #141414 | Serif Headings</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}