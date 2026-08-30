"use client";

import React, { use } from "react";
import Link from "next/link";
import { clientReviewRepository } from "@/lib/repositories/client-review.repository";

export default function ClientProjectReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const orgId = "ORG-CASILI-01";

  const sessions = clientReviewRepository.listSessions({
    organizationId: orgId,
    projectId: resolvedParams.projectId,
  });

  const activeSession = sessions.find((s) => s.status === "OPEN") || sessions[0];
  const comments = activeSession
    ? clientReviewRepository.listComments({
        organizationId: orgId,
        reviewSessionId: activeSession.reviewSessionId,
      })
    : [];

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
              Interactive Website Review — {resolvedParams.projectId}
            </h1>
            <p className="text-sm text-[#666666] mt-0.5">
              Review your live build snapshot, leave feedback, and request revisions.
            </p>
          </div>
          {activeSession && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333]">
                Snapshot: {activeSession.snapshotId}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#86efac] text-[#166534] font-bold">
                {activeSession.status}
              </span>
            </div>
          )}
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Website Preview Container */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#d4d4d0] rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-white/80 px-4 py-3 border-b border-[#d4d4d0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-[#666666] ml-2">https://preview.sindous.ph</span>
                </div>
                <div className="text-[11px] font-mono text-[#1a365d]">Comment Mode Active</div>
              </div>
              <div className="p-8 min-h-[450px] flex items-center justify-center bg-white/40 text-center">
                <div className="space-y-3 max-w-md">
                  <div className="text-lg font-bold text-[#111111]">Sindous Construction & Design</div>
                  <p className="text-xs text-[#666666]">
                    Premium architectural and civil engineering services based in the Philippines. Verified snapshot {activeSession?.snapshotId || "N/A"}.
                  </p>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-[#111111] text-[#111111] rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30">
                    + Click Anywhere on Preview to Leave Note
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comment & Feedback Sidebar */}
          <div className="space-y-4">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Review Feedback ({comments.length})</h2>
                <span className="text-[11px] font-mono text-[#666666]">Active Thread</span>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center text-xs text-[#777777] py-6">No comments recorded yet.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.commentId} className="bg-[#f7f7f5]/40 border border-[#d4d4d0]/60 p-3 rounded-xl space-y-1 text-xs font-sans">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#222222]">{c.authorId} ({c.authorRole})</span>
                        <span className="text-[10px] font-mono text-indigo-300 font-bold">{c.status}</span>
                      </div>
                      <p className="text-[#333333] text-[11px]">{c.body}</p>
                      <div className="text-[10px] font-mono text-[#777777]">Target: {c.pagePath} | {c.category}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-[#d4d4d0] pt-4 space-y-2">
                <button className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-xs font-semibold shadow-lg shadow-emerald-600/20">
                  ✓ Sign-Off & Approve Version
                </button>
                <button className="w-full py-2 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#333333] text-xs font-semibold">
                  Request Revision Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}