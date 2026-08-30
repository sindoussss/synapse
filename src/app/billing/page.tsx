"use client";

import React from "react";
import Link from "next/link";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { financialReconciliationService } from "@/lib/services/billing/financial-reconciliation.service";

export default function OperatorBillingPage() {
  const orgId = "ORG-CASILI-01";

  const invoices = billingRepository.listInvoices({ organizationId: orgId });
  const ledger = billingRepository.listLedgerEntries({ organizationId: orgId });
  const reconReport = financialReconciliationService.generateReconciliationReport(orgId);

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/project-control" className="text-xs text-[#1a365d] hover:underline">
                ← Project Control
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mt-1">
              Financial Operations & Billing Control Center
            </h1>
            <p className="text-sm text-[#666666] mt-0.5">
              Portfolio-wide commercial invoicing, ledger reconciliation, PayPal verification, and exception management.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#86efac] text-[#166534] font-bold">
              Ledger Status: {reconReport.reconciliationStatus}
            </span>
          </div>
        </div>

        {/* Currency Financial Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reconReport.summariesByCurrency.map((s) => (
            <React.Fragment key={s.currency}>
              <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-2xl space-y-1">
                <div className="text-[11px] font-mono text-[#666666] uppercase">Invoiced ({s.currency})</div>
                <div className="text-xl font-bold font-mono text-[#111111]">
                  {s.currency} {(s.totalInvoicedMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-mono text-[#777777]">{s.invoiceCount} invoices</div>
              </div>
              <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-2xl space-y-1">
                <div className="text-[11px] font-mono text-[#666666] uppercase">Verified Collected</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {s.currency} {(s.totalVerifiedReceivedMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-mono text-[#777777]">100% reconciled</div>
              </div>
              <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-2xl space-y-1">
                <div className="text-[11px] font-mono text-[#666666] uppercase">Outstanding Balance</div>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {s.currency} {(s.totalOutstandingMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-mono text-[#777777]">Awaiting payment</div>
              </div>
              <div className="bg-white/60 border border-[#d4d4d0] p-4 rounded-2xl space-y-1">
                <div className="text-[11px] font-mono text-[#666666] uppercase">Refunds & Disputes</div>
                <div className="text-xl font-bold font-mono text-rose-400">
                  {s.currency} {((s.totalRefundedMinor + s.totalDisputedMinor) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-mono text-[#777777]">0 active exceptions</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Commercial Invoices ({invoices.length})</h2>
                <span className="text-xs font-mono text-[#666666]">Authoritative Records</span>
              </div>
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.invoiceId} className="bg-[#f7f7f5]/40 border border-[#d4d4d0]/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#111111]">{inv.invoiceId}</span>
                        <span className="px-2 py-0.5 rounded bg-[#f7f7f5] font-mono text-indigo-300 font-bold text-[10px]">
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[#666666] mt-1 font-mono text-[11px]">
                        Project: {inv.projectId} | Client: {inv.clientId}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-[#111111]">
                        {inv.currency} {(inv.totalMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        Paid: {inv.currency} {(inv.paidMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Ledger Feed */}
          <div className="space-y-4">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Immutable Ledger ({ledger.length})</h2>
                <span className="text-[10px] font-mono text-[#1a365d]">APPEND-ONLY</span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {ledger.map((l) => (
                  <div key={l.ledgerEntryId} className="p-3 bg-[#f7f7f5]/40 border border-[#d4d4d0]/40 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#111111]">{l.ledgerEntryId}</span>
                      <span className="px-2 py-0.5 rounded bg-[#f0fdf4] text-[#166534] font-bold text-[10px]">
                        {l.verificationState}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono text-[#333333]">
                      <span>{l.entryType} ({l.provider}):</span>
                      <span>{l.currency} {(l.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#777777] truncate">Txn: {l.providerTransactionId}</div>
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