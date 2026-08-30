"use client";

import React from "react";
import { BusinessSettings } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { Building, Target, Clock, Globe } from "lucide-react";

interface BusinessSettingsSectionProps {
  business: BusinessSettings;
}

export const BusinessSettingsSection: React.FC<BusinessSettingsSectionProps> = ({ business }) => {
  return (
    <div className="bg-white border border-[#d4d4d0] rounded-none">
      <div className="p-4 border-b border-[#d4d4d0] bg-[#fafafa]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
          Business Operations & Pipeline Target Settings
        </h3>
        <p className="text-xs text-[#666666] mt-0.5">
          General business entity profile, target industry niches, and scheduling parameters.
        </p>
      </div>

      <div className="p-4 space-y-4 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase">Autonomous Agency Entity</span>
            <span className="text-[#111111] font-bold block mt-1">{business.businessName}</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase">Internal Domain</span>
            <span className="text-[#111111] font-bold block mt-1">{business.businessDomain}</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase">Daily Lead Discovery Target</span>
            <span className="text-[#111111] font-bold block mt-1">{business.dailyLeadTarget} qualified targets/day</span>
          </div>

          <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase">Outreach Window & Timezone</span>
            <span className="text-[#111111] font-bold block mt-1">{business.outreachHours} ({business.timezone})</span>
          </div>
        </div>

        {/* Target Industries */}
        <div className="p-3 bg-[#f7f7f5] border border-[#d4d4d0] space-y-2">
          <span className="text-[10px] text-[#666666] block uppercase">Active Target Niches & Verticals</span>
          <div className="flex flex-wrap gap-1.5">
            {business.targetIndustries.map((ind, i) => (
              <span key={i} className="px-2.5 py-1 bg-white border border-[#d4d4d0] text-xs text-[#111111]">
                {ind}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
