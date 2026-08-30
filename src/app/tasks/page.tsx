
"use client";

import React from "react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { StatCard } from "@/components/ui/StatCard";
import { useTaskManager } from "@/context/TaskContext";
import { Clock, Play, AlertCircle, CheckCircle2, Flame } from "lucide-react";

export default function TasksPage() {
  const { tasks, stats } = useTaskManager();

  return (
    <div className="space-y-6">
      {/* Top Banner Dynamic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Queued"
          value={stats.queued}
          subtext="Awaiting executor start"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Running"
          value={stats.running}
          subtext="Active pipeline run"
          activePulse={stats.running > 0}
          changeType={stats.running > 0 ? "positive" : "neutral"}
          change={`${stats.running} executing`}
          icon={<Play size={16} />}
        />
        <StatCard
          label="Waiting Approval"
          value={stats.waiting_approval}
          subtext="Safety hold state"
          change={stats.waiting_approval > 0 ? "Review needed" : "None"}
          changeType={stats.waiting_approval > 0 ? "warning" : "neutral"}
          icon={<AlertCircle size={16} />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          subtext="Successful deliverables"
          changeType="positive"
          change={`${stats.completed} done`}
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          subtext="Errors & challenges"
          change={stats.failed > 0 ? "Inspection required" : "Zero errors"}
          changeType={stats.failed > 0 ? "negative" : "positive"}
          icon={<Flame size={16} />}
        />
      </div>

      {/* Interactive Kanban Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#555555]">
            Task Execution Board ({tasks.length} Total Tasks)
          </h2>
          <span className="text-[11px] font-mono text-[#166534]">
            ● LocalStorage Engine Active
          </span>
        </div>

        <KanbanBoard tasks={tasks} />
      </div>
    </div>
  );
}
