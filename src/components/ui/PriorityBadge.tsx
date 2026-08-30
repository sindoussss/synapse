import React from "react";
import { TaskPriority } from "@/data/types";

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  return (
    <span className="text-[12px] text-[#111] capitalize">
      {priority}
    </span>
  );
};
