import React from "react";
import { AgentStatus, TaskStatus, LeadStatus } from "@/data/types";

interface StatusBadgeProps {
  status: AgentStatus | TaskStatus | LeadStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const sizeClasses = size === "sm" ? "text-[12px]" : "text-[13px]";

  let label = status;

  switch (status.toLowerCase()) {
    case "active":
      label = status === "active" ? "Active" : "Running";
      break;
    case "running":
      label = "Running";
      break;
    case "waiting_approval":
      label = "Waiting approval";
      break;
    case "outreach pending":
    case "pending":
      label = status === "waiting_approval" ? "Waiting approval" : String(status);
      break;
    case "completed":
    case "closed won":
    case "approved":
    case "failed":
    case "error":
    case "rejected":
    case "idle":
    case "queued":
    case "discovered":
    case "audited":
    case "mockup ready":
    case "qualified":
    case "contacted":
    case "unresponsive":
      label = String(status).replace(/_/g, " ");
      break;
    default:
      label = String(status).replace(/_/g, " ");
  }

  return (
    <span className={`inline-flex items-center gap-2 text-[#111] capitalize ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 bg-[#111] ${status === "running" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
};
