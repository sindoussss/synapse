"use client";

import React, { use } from "react";
import Link from "next/link";
import { notificationRepository } from "@/lib/repositories/notification.repository";

export default function ProjectNotificationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01";

  const notifs = notificationRepository.listNotifications({
    organizationId: orgId,
    projectId: resolvedParams.projectId,
  });

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/project-control/${resolvedParams.projectId}`} className="text-xs text-[#1a365d] hover:underline">
                ← Project Overview
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight mt-1">
              Notification Timeline — {resolvedParams.projectId}
            </h1>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-[#f7f7f5] rounded-lg text-[#333333]">
            {notifs.length} Events Dispatched
          </span>
        </div>

        <div className="space-y-3">
          {notifs.map((n) => (
            <div
              key={n.notificationId}
              className="bg-white/60 border border-[#d4d4d0] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#f7f7f5] text-indigo-300 font-bold">
                    {n.notificationType}
                  </span>
                  <span className="text-[#222222] font-sans font-semibold">{n.title}</span>
                  <span className="text-[#777777] text-[11px]">→ {n.recipientType}</span>
                </div>
                <div className="text-[#666666] font-sans text-xs">{n.bodyReference}</div>
                <div className="text-[10px] text-[#777777]">
                  Channel: {n.channel} | Status: {n.status} | Idempotency: {n.idempotencyKey} | Provider ID: {n.providerMessageId || "N/A"}
                </div>
              </div>
              <div className="text-right text-[11px] text-[#777777]">
                {n.createdAt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}