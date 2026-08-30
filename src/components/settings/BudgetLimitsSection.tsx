"use client";

import React, { useState } from "react";
import { BudgetSettings } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { DollarSign, ShieldAlert, AlertTriangle } from "lucide-react";

interface BudgetLimitsSectionProps {
  settings: BudgetSettings;
}

export const BudgetLimitsSection: React.FC<BudgetLimitsSectionProps> = ({ settings }) => {
  const [killSwitch, setKillSwitch] = useState(settings.autoKillSwitchActive);

  return (
    <div className="bg-white border border-[#d4d4d0] rounded-none">
      <div className="p-4 border-b border-[#d4d4d0] bg-[#fafafa]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
          Budget Limits & Financial Safeguards
        </h3>
        <p className="text-xs text-[#666666] mt-0.5">
          Ceilings and automated spending cutoffs across all LLM providers and scraper proxies.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] font-mono text-[#666666] block uppercase">Monthly Spending Cap</span>
            <span className="text-lg font-mono font-bold text-[#111111] block mt-1">
              $${settings.monthlyCapUsd}.00
            </span>
            <span className="text-[10px] font-mono text-[#555555]">Used: $${settings.currentMonthlySpendUsd}</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] font-mono text-[#666666] block uppercase">Daily Spend Limit</span>
            <span className="text-lg font-mono font-bold text-[#111111] block mt-1">
              $${settings.dailyLimitUsd}.00
            </span>
            <span className="text-[10px] font-mono text-[#166534]">Today: $${settings.currentDailySpendUsd}</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] font-mono text-[#666666] block uppercase">Avg Cost Per Qualified Lead</span>
            <span className="text-lg font-mono font-bold text-[#1a365d] block mt-1">
              $${settings.costPerLeadAverageUsd}
            </span>
            <span className="text-[10px] font-mono text-[#555555]">Within target range</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] font-mono text-[#666666] block uppercase">Auto Kill-Switch</span>
            <span className="text-lg font-mono font-bold text-[#166534] block mt-1">
              {killSwitch ? "ACTIVE" : "DISABLED"}
            </span>
            <span className="text-[10px] font-mono text-[#666666]">Trigger at 100% daily</span>
          </div>
        </div>

        {/* Kill Switch Toggle Form */}
        <div className="p-3.5 bg-[#f7f7f5] border border-[#d4d4d0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-[#f59e0b]" />
            <div>
              <div className="text-xs font-mono font-bold text-[#111111]">
                Autonomous Execution Hard Stop (Emergency Kill Switch)
              </div>
              <p className="text-[11px] text-[#555555] mt-0.5">
                Automatically pause all 5 agents immediately if daily spend exceeds $${settings.dailyLimitUsd}.00.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={killSwitch ? "primary" : "secondary"}
            onClick={() => setKillSwitch(!killSwitch)}
          >
            {killSwitch ? "ARMED (ENABLED)" : "ENABLE SAFEGUARD"}
          </Button>
        </div>
      </div>
    </div>
  );
};
