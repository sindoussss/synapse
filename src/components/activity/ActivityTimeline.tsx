"use client";

import React, { useState } from "react";
import { ActivityItem, ActivityType } from "@/data/types";
import { Search, Filter, CheckCircle2, AlertTriangle, Flame, Info, Bot } from "lucide-react";

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = activities.filter((act) => {
    const matchesSearch =
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.description.toLowerCase().includes(search.toLowerCase()) ||
      act.agentName.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || act.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle2 size={14} className="text-[#166534]" />;
      case "warning":
        return <AlertTriangle size={14} className="text-[#92400e]" />;
      case "error":
        return <Flame size={14} className="text-[#9f1239]" />;
      default:
        return <Info size={14} className="text-[#1a365d]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Type Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#d4d4d0]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search activity stream, agent, or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#666666] uppercase">Event Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="agent_action">Agent Action</option>
            <option value="approval_event">Approval Events</option>
            <option value="lead_event">Lead Discoveries</option>
            <option value="task_lifecycle">Task Lifecycle</option>
            <option value="system_alert">System Alerts</option>
          </select>
        </div>
      </div>

      {/* Chronological List */}
      <div className="bg-white border border-[#d4d4d0] divide-y divide-[#d4d4d0]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#666666]">
            No activity log events match the active search or filters.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="p-4 hover:bg-[#f7f7f5]/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getLevelIcon(item.level)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap font-mono">
                      <span className="text-xs font-bold text-[#111111]">{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#eceae4] text-[#555555] rounded-none flex items-center gap-1">
                        <Bot size={10} className="text-[#1a365d]" />
                        {item.agentName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#f7f7f5] border border-[#d4d4d0] text-[#666666] uppercase">
                        {item.type.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-xs text-[#333333] font-sans leading-relaxed">
                      {item.description}
                    </p>

                    {item.metadata && (
                      <div className="pt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-[#666666]">
                        {Object.entries(item.metadata).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-white border border-[#d4d4d0] text-[#555555]">
                            <strong className="text-[#666666] font-normal">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono sm:pl-4">
                  <div className="text-[11px] font-semibold text-[#111111]">{item.timeAgo}</div>
                  <div className="text-[10px] text-[#666666]">{item.timestamp}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
