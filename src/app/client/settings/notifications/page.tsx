"use client";

import React from "react";
import Link from "next/link";

export default function ClientNotificationPreferencesPage() {
  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Notification Settings</h1>
            <p className="text-xs text-[#666666] mt-0.5">Manage your notification channels for project updates.</p>
          </div>
          <Link href="/client" className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333]">
            ← Client Portal
          </Link>
        </div>

        <div className="bg-white/60 border border-[#d4d4d0] p-6 rounded-xl space-y-4 text-xs">
          <div className="text-sm font-bold text-[#111111]">Email & In-App Alerts</div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-[#f7f7f5]/40 rounded-lg cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-indigo-600 h-4 w-4 rounded" />
              <div>
                <div className="font-semibold text-[#222222]">Website Preview & Review Ready</div>
                <div className="text-[#777777] text-[11px]">Receive notification when a new preview is published.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-[#f7f7f5]/40 rounded-lg cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-indigo-600 h-4 w-4 rounded" />
              <div>
                <div className="font-semibold text-[#222222]">Source Code Package Ready</div>
                <div className="text-[#777777] text-[11px]">Receive download alert when source code is released.</div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}