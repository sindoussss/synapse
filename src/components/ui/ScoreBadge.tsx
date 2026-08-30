import React from "react";

interface ScoreBadgeProps {
  score: number;
  type?: "website" | "opportunity";
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score }) => {
  return (
    <span className="tabular-nums text-[13px] text-[#111]">
      {score}/100
    </span>
  );
};
