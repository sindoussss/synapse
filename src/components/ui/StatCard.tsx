import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral" | "warning";
  icon?: React.ReactNode;
  activePulse?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  change,
}) => {
  return (
    <div className="py-1 pr-6">
      <div className="text-[13px] text-[#111]">{label}</div>
      <div className="ops-display mt-2 text-[36px] leading-none tabular-nums text-[#111]">
        {value}
      </div>
      {(change || subtext) && (
        <div className="mt-2 text-[13px] text-[#333] leading-snug">
          {change ? change : subtext}
        </div>
      )}
    </div>
  );
};
