"use client";

import React from "react";
import Link from "next/link";
import { billingRepository } from "@/lib/repositories/billing.repository";

export default function ClientBillingPage() {
  const orgId = "ORG-CASILI-01";
  const clientId = "client_sindous";

  const invoices = billingRepository.listInvoices({ organizationId: orgId, clientId });
  const milestones = billingRepository.listMilestones("PRJ-SINDOUS-01");
  const receipts = billingRepository.listReceipts({ organizationId: orgId });

  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.balanceDueMinor, 0);

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/client" className="text-xs text-[#1a365d] hover:underline">
                ← Client Portal
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mt-1">
              Billing & Commercial Center
            </h1>
            <p className="text-sm text-[#666666] mt-0.5">
              Authoritative view of invoices, milestone schedules, payments, and receipts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-[#d4d4d0] px-4 py-2 rounded-xl text-right">
              <div className="text-[10px] uppercase font-mono text-[#666666]">Total Outstanding</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                PHP {(totalOutstanding / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Invoices ({invoices.length})</h2>
                <span className="text-xs font-mono text-[#666666]">Verified Accounting</span>
              </div>

              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.invoiceId} className="bg-[#f7f7f5]/40 border border-[#d4d4d0]/60 p-4 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#111111]">{inv.invoiceId}</span>
                          <span className="px-2 py-0.5 rounded bg-[#f7f7f5] text-[10px] font-mono text-indigo-300 font-bold">
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-xs text-[#666666] mt-0.5">Project: {inv.projectId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-[#111111]">
                          {inv.currency} {(inv.totalMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-mono text-[#666666]">
                          Balance Due: {inv.currency} {(inv.balanceDueMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="border-t border-[#d4d4d0]/40 pt-2 space-y-1">
                      {inv.lineItems.map((li) => (
                        <div key={li.lineItemId} className="flex justify-between text-xs text-[#333333]">
                          <span>{li.description}</span>
                          <span className="font-mono text-[#666666]">
                            {inv.currency} {(li.subtotalMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone Schedule */}
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Billing Milestones</h2>
                <span className="text-xs font-mono text-[#666666]">Schedule</span>
              </div>
              <div className="space-y-2">
                {milestones.map((m) => (
                  <div key={m.milestoneId} className="flex items-center justify-between p-3 rounded-xl bg-[#f7f7f5]/40 border border-[#d4d4d0]/40 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#f7f7f5] font-mono text-[10px] text-[#333333]">
                        Step {m.sequence}
                      </span>
                      <span className="text-[#222222] font-medium">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[#333333]">
                        PHP {(m.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#f0fdf4] text-emerald-400 font-bold text-[10px]">
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipts & Verified Payments */}
          <div className="space-y-6">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Official Receipts</h2>
                <span className="text-[10px] font-mono text-emerald-400">CRYPTOGRAPHIC PROOF</span>
              </div>
              <div className="space-y-3">
                {receipts.map((r) => (
                  <div key={r.receiptId} className="p-3 bg-[#f7f7f5]/40 border border-[#d4d4d0]/40 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#111111]">{r.receiptId}</span>
                      <span className="px-2 py-0.5 rounded bg-[#f0fdf4] text-[#166534] font-bold text-[10px]">
                        {r.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#333333] font-mono">
                      <span>Amount:</span>
                      <span>{r.currency} {(r.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#777777] truncate">Txn: {r.providerTransactionId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}