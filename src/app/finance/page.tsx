"use client";

import { useEffect, useState } from "react";

interface ARSummary {
  totalContractValue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingUninvoiced: number;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
  invoices: any[];
}

export default function FinancePage() {
  const [summary, setSummary] = useState<ARSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/invoices/ar/summary");
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error("Failed to fetch AR summary", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 bg-white min-h-screen text-[#111111]">
      <div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Finance & Accounts Receivable</h1>
        <p className="text-sm text-[#666666] mt-1">
          Monitor contract values, invoice delivery, payment verifications, and deterministic AR aging.
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[#d4d4d0] bg-white/50 p-4">
          <p className="text-xs font-medium text-[#666666]">Total Contract Value</p>
          <h3 className="mt-2 text-xl font-bold text-[#111111]">
            PHP {((summary?.totalContractValue || 0) / 100).toLocaleString()}
          </h3>
          <p className="mt-1 text-xs text-[#777777]">Executed agreements</p>
        </div>

        <div className="rounded-xl border border-[#d4d4d0] bg-white/50 p-4">
          <p className="text-xs font-medium text-[#666666]">Total Invoiced</p>
          <h3 className="mt-2 text-xl font-bold text-[#1a365d]">
            PHP {((summary?.totalInvoiced || 0) / 100).toLocaleString()}
          </h3>
          <p className="mt-1 text-xs text-[#777777]">Active invoices</p>
        </div>

        <div className="rounded-xl border border-[#d4d4d0] bg-white/50 p-4">
          <p className="text-xs font-medium text-[#666666]">Total Verified Paid</p>
          <h3 className="mt-2 text-xl font-bold text-emerald-400">
            PHP {((summary?.totalPaid || 0) / 100).toLocaleString()}
          </h3>
          <p className="mt-1 text-xs text-[#777777]">Verified cash collected</p>
        </div>

        <div className="rounded-xl border border-[#d4d4d0] bg-white/50 p-4">
          <p className="text-xs font-medium text-[#666666]">Total Outstanding (AR)</p>
          <h3 className="mt-2 text-xl font-bold text-amber-400">
            PHP {((summary?.totalOutstanding || 0) / 100).toLocaleString()}
          </h3>
          <p className="mt-1 text-xs text-[#777777]">Balance due</p>
        </div>

        <div className="rounded-xl border border-[#d4d4d0] bg-white/50 p-4">
          <p className="text-xs font-medium text-[#666666]">Remaining Uninvoiced</p>
          <h3 className="mt-2 text-xl font-bold text-[#333333]">
            PHP {((summary?.remainingUninvoiced || 0) / 100).toLocaleString()}
          </h3>
          <p className="mt-1 text-xs text-[#777777]">Future milestones/final</p>
        </div>
      </div>

      {/* AR Aging Buckets */}
      <div className="rounded-xl border border-[#d4d4d0] bg-white/40 p-6">
        <h2 className="text-base font-semibold text-[#111111]">Deterministic AR Aging Buckets</h2>
        <p className="mt-1 text-xs text-[#666666]">
          Strict date-based calculation of outstanding receivables across all clients.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-[#d4d4d0]/80 bg-white/60 p-3 text-center">
            <p className="text-xs text-[#666666] font-medium">Current</p>
            <p className="mt-1 text-sm font-bold text-emerald-400">
              PHP {((summary?.aging.current || 0) / 100).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-[#d4d4d0]/80 bg-white/60 p-3 text-center">
            <p className="text-xs text-[#666666] font-medium">1-30 Days Overdue</p>
            <p className="mt-1 text-sm font-bold text-amber-400">
              PHP {((summary?.aging.days1to30 || 0) / 100).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-[#d4d4d0]/80 bg-white/60 p-3 text-center">
            <p className="text-xs text-[#666666] font-medium">31-60 Days Overdue</p>
            <p className="mt-1 text-sm font-bold text-orange-400">
              PHP {((summary?.aging.days31to60 || 0) / 100).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-[#d4d4d0]/80 bg-white/60 p-3 text-center">
            <p className="text-xs text-[#666666] font-medium">61-90 Days Overdue</p>
            <p className="mt-1 text-sm font-bold text-rose-400">
              PHP {((summary?.aging.days61to90 || 0) / 100).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-[#d4d4d0]/80 bg-white/60 p-3 text-center">
            <p className="text-xs text-[#666666] font-medium">90+ Days Overdue</p>
            <p className="mt-1 text-sm font-bold text-red-500">
              PHP {((summary?.aging.days90Plus || 0) / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-[#d4d4d0] bg-white/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111111]">Accounts Receivable Invoices</h2>
            <p className="text-xs text-[#666666]">
              Approved, dispatched, and payment-tracked invoice ledger.
            </p>
          </div>
          <button
            onClick={fetchSummary}
            className="rounded-lg border border-[#d4d4d0] bg-[#f7f7f5] px-3 py-1.5 text-xs font-medium text-[#333333] hover:bg-slate-700"
          >
            Refresh Ledger
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#d4d4d0] text-[#666666]">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Amount Paid</th>
                <th className="py-2.5 px-3">Balance Due</th>
                <th className="py-2.5 px-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[#333333]">
              {(!summary?.invoices || summary.invoices.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#777777]">
                    No active invoices yet. Create an invoice from an executed agreement in Leads / Deals.
                  </td>
                </tr>
              ) : (
                summary.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f7f7f5]/30">
                    <td className="py-3 px-3 font-mono font-medium text-[#1a365d]">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3">{inv.clientEntity?.companyName || "N/A"}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inv.status === "paid"
                            ? "bg-[#f0fdf4]/80 text-emerald-400 border border-emerald-500/30"
                            : inv.status === "partially_paid"
                            ? "bg-indigo-950/80 text-[#1a365d] border border-indigo-500/30"
                            : inv.status === "approved" || inv.status === "sent"
                            ? "bg-blue-950/80 text-blue-400 border border-blue-500/30"
                            : "bg-amber-950/80 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium">{inv.currency} {(inv.totalAmount / 100).toLocaleString()}</td>
                    <td className="py-3 px-3 text-emerald-400">{inv.currency} {(inv.amountPaid / 100).toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-rose-400">{inv.currency} {(inv.balanceDue / 100).toLocaleString()}</td>
                    <td className="py-3 px-3 text-[#666666]">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}