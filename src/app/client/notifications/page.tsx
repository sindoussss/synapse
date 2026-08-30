"use client";

import React from "react";
import Link from "next/link";
import { notificationRepository } from "@/lib/repositories/notification.repository";

export default function ClientNotificationsPage() {
  const orgId = "ORG-CASILI-01";
  const clientNotifs = notificationRepository.listNotifications({
    organizationId: orgId,
    recipientType: "CLIENT",
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Client Notifications</h1>
            <p className="text-xs text-[#666666] mt-0.5">Stay updated on your project review milestones and source deliveries.</p>
          </div>
          <Link href="/client" className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333]">
            ← Client Portal
          </Link>
        </div>

        {/* List */}
        <div className="space-y-3">
          {clientNotifs.length === 0 ? (
            <div className="bg-white/40 border border-[#d4d4d0] p-8 rounded-xl text-center text-[#777777] text-sm">
              No notifications at this time.
            </div>
          ) : (
            clientNotifs.map((n) => (
              <div
                key={n.notificationId}
                className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#111111]">{n.title}</div>
                  <div className="text-xs text-[#666666]">{n.bodyReference}</div>
                  <div className="text-[10px] text-[#777777] font-mono">Date: {n.createdAt}</div>
                </div>
                <div>
                  <Link
                    href={`/client`}
                    className="px-3 py-1 bg-indigo-600 hover:bg-[#111111] text-[#111111] rounded-lg text-xs font-semibold"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}