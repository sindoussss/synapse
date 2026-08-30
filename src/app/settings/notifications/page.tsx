"use client";

import React from "react";
import Link from "next/link";
import { notificationPreferencesRepository } from "@/lib/repositories/notification-preferences.repository";

export default function OperatorNotificationPreferencesPage() {
  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Operator Alert Preferences</h1>
            <p className="text-xs text-[#666666] mt-0.5">Configure alerting channels for incidents, approvals, and deployments.</p>
          </div>
          <Link href="/notifications" className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333]">
            ← Notifications
          </Link>
        </div>

        <div className="bg-white/60 border border-[#d4d4d0] p-6 rounded-xl space-y-4">
          <div className="text-sm font-bold text-[#111111]">Mandatory Channels (Protected)</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#f7f7f5]/40 rounded-lg">
              <div>
                <div className="font-semibold text-[#222222]">Security & Kill-Switch Incidents</div>
                <div className="text-[#777777] text-[11px]">Immediate in-app and email alert on security threats.</div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">LOCKED_ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f7f7f5]/40 rounded-lg">
              <div>
                <div className="font-semibold text-[#222222]">Payment & Financial Discrepancies</div>
                <div className="text-[#777777] text-[11px]">Instant alerting on payment mismatches and reversals.</div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">LOCKED_ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}