"use client";

import React from "react";
import { StatCard } from "@/components/ui/StatCard";
import { CeoCommandWidget } from "@/components/ceo/CeoCommandWidget";
import { RunningTasksWidget } from "@/components/overview/RunningTasksWidget";
import { RecentActivityWidget } from "@/components/overview/RecentActivityWidget";
import { FleetSummaryWidget } from "@/components/overview/FleetSummaryWidget";
import { useTaskManager } from "@/context/TaskContext";

export default function OverviewPage() {
  const { tasks, agents, leads, approvals, activities, stats, getAgentTaskInfo } = useTaskManager();

  const runningTasks = tasks.filter(t => t.status === "running");
  const activeAgentsCount = agents.filter(a => {
    const info = getAgentTaskInfo(a.id);
    return info.status === "running" || info.status === "active";
  }).length;

  const pendingApprovalsCount = approvals.filter(a => a.status === "pending").length + stats.waiting_approval;

  return (
    <div className="space-y-14">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-8 border-b border-[#e5e5e5] pb-10">
        <StatCard
          label="Active agents"
          value={`${activeAgentsCount}/${agents.length > 0 ? agents.length : 5}`}
          change="Live"
        />
        <StatCard
          label="Queued tasks"
          value={stats.queued}
          change={stats.queued === 0 ? "None in queue" : `${stats.queued} in queue`}
        />
        <StatCard
          label="Leads found"
          value={leads.length}
          change="Prospects"
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovalsCount}
          change={pendingApprovalsCount > 0 ? "Action required" : "Clear"}
        />
        <StatCard
          label="Completed tasks"
          value={stats.completed}
          change={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100}% rate`}
        />
      </div>

      <CeoCommandWidget />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-14">
          <RunningTasksWidget tasks={runningTasks} />
        </div>
        <div className="lg:col-span-5">
          <RecentActivityWidget activities={activities} />
        </div>
      </div>

      <FleetSummaryWidget agents={agents} />
    </div>
  );
}
