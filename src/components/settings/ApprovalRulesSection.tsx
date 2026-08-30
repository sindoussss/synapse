"use client";

import React, { useState } from "react";
import { ApprovalRulesSettings } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Mail, DollarSign, Check } from "lucide-react";

interface ApprovalRulesSectionProps {
  rules: ApprovalRulesSettings;
}

export const ApprovalRulesSection: React.FC<ApprovalRulesSectionProps> = ({ rules }) => {
  const [autoLowRisk, setAutoLowRisk] = useState(rules.autoApproveLowRisk);
  const [requireOutreach, setRequireOutreach] = useState(rules.requireReviewForOutreach);

  return (
    <div className="bg-white border border-[#d4d4d0] rounded-none">
      <div className="p-4 border-b border-[#d4d4d0] bg-[#fafafa]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
          Autonomous Policy & Approval Rules
        </h3>
        <p className="text-xs text-[#666666] mt-0.5">
          Establish boundaries for autonomous actions vs. mandatory human operator sign-offs.
        </p>
      </div>

      <div className="p-4 space-y-3 font-mono text-xs">
        <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-[#111111]">Auto-Approve Low Risk Read-Only Actions</span>
            <p className="text-[11px] text-[#666666] font-sans">
              Allow agents to autonomously crawl public domains, audit HTML, and synthesize mockups without prompt.
            </p>
          </div>
          <Button
            size="sm"
            variant={autoLowRisk ? "primary" : "secondary"}
            onClick={() => setAutoLowRisk(!autoLowRisk)}
          >
            {autoLowRisk ? "ENABLED" : "DISABLED"}
          </Button>
        </div>

        <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-[#111111]">Mandatory Operator Review for Cold Outreach</span>
            <p className="text-[11px] text-[#666666] font-sans">
              All emails, proposals, and external communication must be approved before SMTP dispatch.
            </p>
          </div>
          <Button
            size="sm"
            variant={requireOutreach ? "primary" : "secondary"}
            onClick={() => setRequireOutreach(!requireOutreach)}
          >
            {requireOutreach ? "ENFORCED" : "OFF"}
          </Button>
        </div>

        <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-[#111111]">Max Daily Outbound Email Cap</span>
            <p className="text-[11px] text-[#666666] font-sans">
              Hard limit to safeguard domain deliverability and IP reputation.
            </p>
          </div>
          <span className="px-3 py-1 bg-white border border-[#d4d4d0] text-[#111111] font-bold">
            {rules.maxDailyOutreachEmails} emails/day
          </span>
        </div>
      </div>
    </div>
  );
};
