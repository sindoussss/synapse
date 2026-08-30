"use client";

import React from "react";
import { Approval } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Shield, Check, X, Bot, AlertTriangle, DollarSign } from "lucide-react";

interface ApprovalDetailModalProps {
  approval: Approval;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const ApprovalDetailModal: React.FC<ApprovalDetailModalProps> = ({
  approval,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Approval Inspector // ${approval.id}`}
      subtitle={`Requested by ${approval.requestedByAgent} · ${approval.timestamp}`}
      maxWidth="xl"
      footer={
        approval.status === "pending" ? (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (onReject) onReject(approval.id);
                onClose();
              }}
              icon={<X size={14} />}
            >
              Reject Action
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onApprove) onApprove(approval.id);
                onClose();
              }}
              icon={<Check size={14} />}
            >
              Authorize & Dispatch
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Risk & Target Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Evaluated Risk</span>
            <div className="mt-1"><RiskBadge risk={approval.riskLevel} /></div>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Requesting Subroutine</span>
            <span className="text-[#111111] font-bold block mt-1">{approval.requestedByAgent}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Status</span>
            <div className="mt-1"><StatusBadge status={approval.status} size="sm" /></div>
          </div>
        </div>

        {/* Action Title & Full Reason */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-[#555555] block">
            Requested Autonomous Action
          </span>
          <div className="p-3 bg-[#fafafa] border border-[#d4d4d0] text-[#111111] font-sans text-sm font-semibold">
            {approval.action}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-[#555555] block">
            Autonomous Rationale & Intent
          </span>
          <div className="p-3 bg-white border border-[#d4d4d0] font-sans text-xs text-[#333333] leading-relaxed">
            {approval.reason}
          </div>
        </div>

        {/* Safety Checks Passed */}
        {approval.details.safetyChecksPassed && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase text-[#555555] flex items-center gap-1.5">
              <Shield size={13} className="text-[#166534]" /> Automated Guardrails Validated
            </span>
            <div className="space-y-1">
              {approval.details.safetyChecksPassed.map((chk, i) => (
                <div key={i} className="p-2 bg-[#f0fdf4]/30 border border-[#166534] text-[#166534] flex items-center gap-2">
                  <Check size={12} />
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payload / Arguments Preview */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-[#555555] block">
            Payload Parameters
          </span>
          <div className="p-3 bg-white border border-[#d4d4d0] overflow-x-auto">
            <pre className="text-[11px] text-[#93c5fd]">
              {JSON.stringify(approval.details.payloadPreview, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
};
