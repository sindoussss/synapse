"use client";

import React, { use } from "react";
import Link from "next/link";
import { clientReviewRepository } from "@/lib/repositories/client-review.repository";

export default function OperatorProjectReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  const operatorNotes = activeSession
    ? clientReviewRepository.listOperatorNotes(activeSession.reviewSessionId, orgId)
    : [];

  return (
    <div className="text-[#111] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4d4d0] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/project-control/${resolvedParams.projectId}`} className="text-xs text-[#1a365d] hover:underline">
                ← Project Command Center
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mt-1">
              Operator Review & Feedback Console — {resolvedParams.projectId}
            </h1>
            <p className="text-sm text-[#666666] mt-0.5">
              Triage client comments, manage operator notes, and convert feedback into formal change requests.
            </p>
          </div>
          {activeSession && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333]">
                Session: {activeSession.reviewSessionId}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#86efac] text-[#166534] font-bold">
                {activeSession.status}
              </span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Comments Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Client Feedback Items ({comments.length})</h2>
                <span className="text-[11px] font-mono text-[#666666]">Snapshot: {activeSession?.snapshotId}</span>
              </div>

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center text-xs text-[#777777] py-8">No feedback recorded.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.commentId} className="bg-[#f7f7f5]/40 border border-[#d4d4d0]/60 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#111111]">{c.authorId}</span>
                          <span className="px-2 py-0.5 rounded bg-[#f7f7f5] text-[10px] font-mono text-indigo-300 font-bold">
                            {c.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{c.status}</span>
                      </div>
                      <p className="text-xs text-[#333333] font-sans">{c.body}</p>
                      <div className="flex items-center justify-between border-t border-[#d4d4d0]/50 pt-2 text-[10px] font-mono text-[#777777]">
                        <span>Page: {c.pagePath} | Viewport: {c.viewport}</span>
                        <div className="flex gap-2">
                          <button className="px-2 py-1 rounded bg-[#f7f7f5] hover:bg-slate-700 text-[#222222]">
                            Reply
                          </button>
                          <button className="px-2 py-1 rounded bg-indigo-600 hover:bg-[#111111] text-[#111111] font-semibold">
                            Convert to Change Request →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Operator Internal Notes */}
          <div className="space-y-4">
            <div className="bg-white/60 border border-[#d4d4d0] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-3">
                <h2 className="text-sm font-bold text-[#111111]">Operator Internal Notes</h2>
                <span className="text-[10px] font-mono text-rose-400 font-bold">INTERNAL ONLY</span>
              </div>
              <div className="space-y-3">
                {operatorNotes.length === 0 ? (
                  <div className="text-center text-xs text-[#777777] py-4">No internal notes.</div>
                ) : (
                  operatorNotes.map((n) => (
                    <div key={n.noteId} className="bg-[#f7f7f5]/40 border border-[#d4d4d0]/40 p-3 rounded-xl text-xs space-y-1">
                      <div className="text-[#222222] font-sans">{n.body}</div>
                      <div className="text-[10px] font-mono text-[#777777]">Author: {n.authorId} | {n.createdAt}</div>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-2 rounded-lg bg-[#f7f7f5] hover:bg-slate-700 text-[#222222] text-xs font-semibold">
                + Add Private Operator Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}