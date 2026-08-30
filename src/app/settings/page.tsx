import React from "react";
import { 
  MOCK_AI_PROVIDERS, 
  MOCK_BUDGET_SETTINGS, 
  MOCK_APPROVAL_RULES, 
  MOCK_BUSINESS_SETTINGS 
} from "@/data/settings";
import { AIProvidersSection } from "@/components/settings/AIProvidersSection";
import { BudgetLimitsSection } from "@/components/settings/BudgetLimitsSection";
import { ApprovalRulesSection } from "@/components/settings/ApprovalRulesSection";
import { BusinessSettingsSection } from "@/components/settings/BusinessSettingsSection";
import { Settings, Shield, Sliders } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 bg-white border border-[#d4d4d0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sliders size={20} className="text-[#1a365d]" />
          <div>
            <h2 className="text-sm font-mono font-bold text-[#111111] uppercase">
              Operations Control Panel & System Parameters
            </h2>
            <p className="text-xs text-[#666666] mt-0.5 font-sans">
              Configure foundation model providers, spending thresholds, safety policies, and business targets.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline px-2 py-1 bg-[#f7f7f5] border border-[#d4d4d0] text-[11px] font-mono text-[#166534]">
          STATE: PERSISTED (MOCK)
        </span>
      </div>

      {/* 4 Required Settings Sections */}
      <div className="space-y-6">
        {/* 1. AI Providers */}
        <AIProvidersSection providers={MOCK_AI_PROVIDERS} />

        {/* 2. Budget Limits */}
        <BudgetLimitsSection settings={MOCK_BUDGET_SETTINGS} />

        {/* 3. Approval Rules */}
        <ApprovalRulesSection rules={MOCK_APPROVAL_RULES} />

        {/* 4. Business Settings */}
        <BusinessSettingsSection business={MOCK_BUSINESS_SETTINGS} />
      </div>
    </div>
  );
}
