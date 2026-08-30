"use client";

import React, { useState } from "react";
import { Approval } from "@/data/types";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ApprovalDetailModal } from "./ApprovalDetailModal";
import { ShieldAlert, Check, X, Eye, Bot, Clock } from "lucide-react";

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onReject
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white border border-[#d4d4d0] p-4 rounded-none space-y-3.5 hover:border-[#c8c8c2] transition-colors">
        {/* Top Header: ID, Agent, Risk Level */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4d4d0] pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-[#111111]">{approval.id}</span>
            <span className="text-[11px] font-mono text-[#666666] flex items-center gap-1">
              <Bot size={12} className="text-[#1a365d]" /> {approval.requestedByAgent}
            </span>
            {approval.status !== "pending" && <StatusBadge status={approval.status} size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge risk={approval.riskLevel} />
          </div>
        </div>

        {/* Main Action & Target */}
        <div>
          <h3 className="text-sm font-semibold text-[#111111] font-mono">
            {approval.action}
          </h3>
          <div className="text-xs text-[#1a365d] font-mono mt-1">
            Target: <span className="text-[#111111] font-medium">{approval.targetEntity}</span>
          </div>
        </div>

        {/* Reason Box */}
        <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0] rounded-none">
          <span className="text-[10px] font-mono uppercase text-[#666666] block mb-1">
            Reason & Strategic Context:
          </span>
          <p className="text-xs text-[#333333] font-sans leading-relaxed">
            {approval.reason}
          </p>
        </div>

        {/* Footer & Action Buttons */}
        <div className="pt-2 border-t border-[#d4d4d0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#666666]">
            <Clock size={12} />
            <span>Requested: {approval.timestamp}</span>
            {approval.expiresIn && <span> · Expires in {approval.expiresIn}</span>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOpen(true)}
              icon={<Eye size={12} />}
            >
              View Details
            </Button>

            {approval.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(approval.id)}
                  icon={<X size={12} />}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onApprove(approval.id)}
                  icon={<Check size={12} />}
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ApprovalDetailModal
        approval={approval}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onApprove={onApprove}
        onReject={onReject}
      />
    </>
  );
};
