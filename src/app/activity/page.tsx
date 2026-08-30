
"use client";

import React from "react";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { StatCard } from "@/components/ui/StatCard";
import { useTaskManager } from "@/context/TaskContext";
import { Activity, Clock, ShieldCheck, Zap } from "lucide-react";

export default function ActivityPage() {
  const { activities } = useTaskManager();

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Logged Events"
          value={activities.length}
          subtext="Actual task lifecycle log"
          icon={<Activity size={16} />}
        />
        <StatCard
          label="State Engine"
          value="Synchronous"
          subtext="Instant local persistence"
          change="Live"
          changeType="positive"
          icon={<Zap size={16} />}
        />
        <StatCard
          label="Latency"
          value="< 5ms"
          subtext="Local repository speed"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Audit Integrity"
          value="100%"
          subtext="Action attribution logged"
          icon={<ShieldCheck size={16} />}
        />
      </div>

      {/* Full Activity Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#555555]">
            Operational Event Stream ({activities.length} Events)
          </h2>
          <span className="text-[11px] font-mono text-[#666666]">
            Chronological User & System Log
          </span>
        </div>

        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}
