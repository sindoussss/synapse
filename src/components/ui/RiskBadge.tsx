import React from "react";
import { RiskLevel } from "@/data/types";

interface RiskBadgeProps {
  risk: RiskLevel;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk }) => {
  return (
    <span className="text-[12px] text-[#111] capitalize">
      Risk {risk}
    </span>
  );
};
