"use client";

import React, { useState } from "react";

export default function SalesCopilotPage() {
  const [selectedOpportunity, setSelectedOpportunity] = useState("OPP-SINDOUS-01");
  const [activeTab, setActiveTab] = useState<"summary" | "gaps" | "quote" | "proposal">("summary");

  return (
    <div className="text-[#111] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#d4d4d0] pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111] flex items-center gap-3">
              <span className="p-2 bg-indigo-600/20 text-[#1a365d] rounded-lg border border-indigo-500/30">💼</span>
              Sales Copilot & Proposal Intelligence
            </h1>
            <p className="text-[#666666] mt-1">Evidence-first sales guidance, requirement gap analysis, and grounded quoting.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
              Advisory Role Only
            </span>
            <span className="px-3 py-1 bg-[#f7f7f5] text-[#333333] border border-[#d4d4d0] rounded-full text-xs font-mono">
              Tenant: ORG-CASILI-01
            </span>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Active Opportunity</div>
            <div className="text-lg font-bold text-[#111111] mt-1">Sindous Building Supplies</div>
            <div className="text-xs text-[#1a365d] mt-1">Stage: Proposal Pending</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Opportunity Health</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">HEALTHY</div>
            <div className="text-xs text-[#666666] mt-1">0 blocking issues detected</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Requirement Readiness</div>
            <div className="text-lg font-bold text-blue-400 mt-1">READY_FOR_PROPOSAL</div>
            <div className="text-xs text-[#666666] mt-1">Core scope confirmed</div>
          </div>
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-4">
            <div className="text-xs text-[#666666] font-medium">Authoritative Quote Total</div>
            <div className="text-lg font-bold text-[#111111] mt-1">₱88,000.00</div>
            <div className="text-xs text-[#666666] mt-1">50% Deposit / 50% Completion</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[#d4d4d0]">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "summary" ? "border-indigo-500 text-[#1a365d]" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Evidence Summary
          </button>
          <button
            onClick={() => setActiveTab("gaps")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "gaps" ? "border-indigo-500 text-[#1a365d]" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Requirement Gaps
          </button>
          <button
            onClick={() => setActiveTab("quote")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "quote" ? "border-indigo-500 text-[#1a365d]" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Authoritative Quote
          </button>
          <button
            onClick={() => setActiveTab("proposal")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "proposal" ? "border-indigo-500 text-[#1a365d]" : "border-transparent text-[#666666] hover:text-[#111111]"}`}
          >
            Proposal Draft
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#111111]">Verified Company Facts</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-[#666666]">Company:</span> <strong className="text-[#111111]">Sindous Building Supplies & Construction Services</strong> <span className="text-emerald-400 text-xs">(VERIFIED)</span></div>
                <div><span className="text-[#666666]">Industry:</span> <strong className="text-[#111111]">Construction & Building Materials</strong> <span className="text-emerald-400 text-xs">(VERIFIED)</span></div>
                <div><span className="text-[#666666]">Website / Domain:</span> <strong className="text-[#111111]">sindous.ph</strong> <span className="text-emerald-400 text-xs">(VERIFIED)</span></div>
                <div><span className="text-[#666666]">Contact Email:</span> <strong className="text-[#111111]">sindousbuilding@gmail.com</strong> <span className="text-emerald-400 text-xs">(VERIFIED)</span></div>
              </div>
            </div>
            <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#111111]">Recommended Next Action</h3>
              <p className="text-sm text-[#333333]">Draft custom proposal based on confirmed quote calculator and product catalog scope.</p>
              <div className="flex gap-3 pt-2">
                <button className="px-4 py-2 bg-indigo-600 hover:bg-[#111111] text-[#111111] text-sm font-medium rounded-lg shadow">Draft Proposal</button>
                <button className="px-4 py-2 bg-[#f7f7f5] hover:bg-slate-700 text-[#333333] text-sm font-medium rounded-lg">Dismiss Action</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "gaps" && (
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#111111]">Requirement Gap Analysis</h3>
            <div className="space-y-2">
              <div className="p-3 bg-[#f7f7f5]/60 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#111111]">Product Grid & Catalog</div>
                  <div className="text-xs text-[#666666]">Hardware and construction materials filterable showcase.</div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/30">CONFIRMED</span>
              </div>
              <div className="p-3 bg-[#f7f7f5]/60 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#111111]">Interactive Quote Calculator</div>
                  <div className="text-xs text-[#666666]">Real-time materials estimating and price breakdown.</div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/30">CONFIRMED</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "quote" && (
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#111111]">Authoritative Pricing Breakdown</h3>
            <table className="w-full text-left text-sm text-[#333333]">
              <thead className="border-b border-[#d4d4d0] text-[#666666]">
                <tr>
                  <th className="py-2">Item Description</th>
                  <th className="py-2">Provenance</th>
                  <th className="py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr><td className="py-2">Modern Homepage & Hero Section</td><td>AUTHORITATIVE_CATALOG</td><td className="text-right">₱20,000.00</td></tr>
                <tr><td className="py-2">Product Catalog Grid</td><td>AUTHORITATIVE_CATALOG</td><td className="text-right">₱30,000.00</td></tr>
                <tr><td className="py-2">Interactive Quote Calculator</td><td>AUTHORITATIVE_CATALOG</td><td className="text-right">₱25,000.00</td></tr>
                <tr><td className="py-2">Contact & Inquiries Form</td><td>AUTHORITATIVE_CATALOG</td><td className="text-right">₱10,000.00</td></tr>
                <tr><td className="py-2">Custom Domain & SSL Setup</td><td>AUTHORITATIVE_CATALOG</td><td className="text-right">₱3,000.00</td></tr>
              </tbody>
            </table>
            <div className="text-right font-bold text-[#111111] text-lg pt-4 border-t border-[#d4d4d0]">
              Total: ₱88,000.00
            </div>
          </div>
        )}

        {activeTab === "proposal" && (
          <div className="bg-white border border-[#d4d4d0] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#111111]">Grounded Proposal Draft</h3>
            <div className="p-4 bg-white rounded-lg border border-[#d4d4d0] text-sm font-mono space-y-2">
              <div className="text-[#1a365d] font-bold">Sindous Building Supplies Web Modernization Proposal</div>
              <div className="text-[#666666]">Scope: Hero, Product Grid, Interactive Quote Calculator, Contact Form.</div>
              <div className="text-[#666666]">Exclusions: Custom backend ERP integration.</div>
              <div className="text-[#666666]">Price: ₱88,000.00 (50% upfront deposit, 50% on delivery).</div>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-[#111111] font-medium rounded-lg">Approve Proposal</button>
              <button className="px-4 py-2 bg-[#f7f7f5] hover:bg-slate-700 text-[#333333] font-medium rounded-lg">Edit Scope</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}