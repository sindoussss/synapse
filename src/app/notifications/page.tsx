"use client";

import React, { useState } from "react";
import Link from "next/link";
import { notificationRepository, NotificationRecord } from "@/lib/repositories/notification.repository";

export default function OperatorNotificationsPage() {
  const orgId = "ORG-CASILI-01";
  const [filter, setFilter] = useState("ALL");

  const notifs = notificationRepository.listNotifications({
    organizationId: orgId,
    recipientType: "OPERATOR",
  });

  const filteredNotifs = notifs.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "CRITICAL" || filter === "HIGH" || filter === "MEDIUM") return n.priority === filter;
    return true;
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#111111] animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
                Operator Notification Center
              </h1>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              Authoritative alert feed for production approvals, incidents, payment exceptions, and system events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/project-control"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333] transition-all font-semibold"
            >
              ← Project Command Center
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-white/60 p-3 rounded-xl border border-[#d4d4d0]">
          {["ALL", "UNREAD", "CRITICAL", "HIGH", "MEDIUM"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === st
                  ? "bg-indigo-600 text-[#111111] shadow-md shadow-indigo-600/30"
                  : "bg-[#f7f7f5] text-[#333333] hover:bg-slate-700 border border-[#d4d4d0]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="bg-white/40 border border-[#d4d4d0] p-8 rounded-xl text-center text-[#777777] text-sm">
              No notifications matching this filter.
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.notificationId}
                className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#d4d4d0] transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        n.priority === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : n.priority === "HIGH"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-[#f7f7f5] text-[#666666]"
                      }`}
                    >
                      {n.priority}
                    </span>
                    <span className="text-xs font-bold text-[#111111]">{n.title}</span>
                    <span className="text-[10px] text-[#777777] font-mono">[{n.projectId}]</span>
                  </div>
                  <p className="text-xs text-[#666666] font-sans">{n.bodyReference}</p>
                  <div className="text-[10px] text-[#777777] font-mono">
                    Provider: {n.provider || "IN_APP"} | ID: {n.providerMessageId || "LOCAL"} | At: {n.createdAt}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {n.approvalRequestId && (
                    <Link
                      href={`/approvals/${n.approvalRequestId}`}
                      className="px-3 py-1 bg-indigo-600 hover:bg-[#111111] text-[#111111] rounded-lg text-xs font-semibold transition-all"
                    >
                      Open Approval →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}