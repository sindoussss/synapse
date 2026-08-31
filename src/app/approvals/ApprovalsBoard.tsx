"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ApprovalBoardItem } from "@/lib/services/approval/approval-control.service";

interface ApprovalsBoardProps {
  requests: ApprovalBoardItem[];
  exceptionCount: number;
}

export function ApprovalsBoard({ requests, exceptionCount }: ApprovalsBoardProps) {
  const [filter, setFilter] = useState("ALL");

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING" || filter === "APPROVED" || filter === "REJECTED") {
      return r.status === filter;
    }
    if (filter === "CRITICAL" || filter === "HIGH" || filter === "MEDIUM") {
      return r.riskLevel === filter;
    }
    if (filter === "DEPLOYMENT") return r.requestType === "PRODUCTION_DEPLOYMENT";
    if (filter === "PAYMENT") return r.requestType.includes("PAYMENT");
    if (filter === "SECURITY") return r.requestType.includes("SECURITY");
    return true;
  });

  return (
    <div className="text-[#111]">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e5] pb-6">
          <div>
            <h1 className="ops-display text-[28px] text-[#111]">
              Approvals
            </h1>
            <p className="text-[14px] text-[#666] mt-1">
              Human-in-the-loop governance for privileged operations.
            </p>
          </div>
          <Link href="/project-control" className="text-[13px] underline underline-offset-4">
            Project command center
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="text-[13px] text-[#666]">Critical</div>
            <div className="ops-display text-[28px] mt-1">
              {requests.filter((r) => r.riskLevel === "CRITICAL").length}
            </div>
          </div>
          <div>
            <div className="text-[13px] text-[#666]">High risk</div>
            <div className="ops-display text-[28px] mt-1">
              {requests.filter((r) => r.riskLevel === "HIGH").length}
            </div>
          </div>
          <div>
            <div className="text-[13px] text-[#666]">Requests</div>
            <div className="ops-display text-[28px] mt-1">{requests.length}</div>
          </div>
          <div>
            <div className="text-[13px] text-[#666]">Exceptions</div>
            <div className="ops-display text-[28px] mt-1">{exceptionCount}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
          {["ALL", "PENDING", "CRITICAL", "HIGH", "DEPLOYMENT", "PAYMENT", "SECURITY"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`cursor-pointer ${
                filter === st
                  ? "text-[#111] underline underline-offset-4"
                  : "text-[#888] hover:text-[#111]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-[#e5e5e5] text-[12px] text-[#888]">
              <tr>
                <th className="py-3 pr-4 font-normal">Request</th>
                <th className="py-3 pr-4 font-normal">Project</th>
                <th className="py-3 pr-4 font-normal">Risk</th>
                <th className="py-3 pr-4 font-normal">Status</th>
                <th className="py-3 pr-4 font-normal">Proposed action</th>
                <th className="py-3 font-normal text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.approvalRequestId} className="border-b border-[#f0f0f0]">
                  <td className="py-4 pr-4">
                    <div className="text-[#111]">{r.approvalRequestId}</div>
                    <div className="text-[13px] text-[#666]">{r.requestType}</div>
                  </td>
                  <td className="py-4 pr-4 text-[#666]">{r.projectId}</td>
                  <td className="py-4 pr-4 text-[#111]">{r.riskLevel}</td>
                  <td className="py-4 pr-4 text-[#111]">{r.status}</td>
                  <td className="py-4 pr-4 text-[#666] max-w-xs truncate">
                    {r.proposedAction}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/approvals/${r.approvalRequestId}`}
                      className="underline underline-offset-4"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
