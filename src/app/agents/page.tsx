"use client";

import React from "react";
import { MOCK_AGENTS } from "@/data/agents";
import { AgentCard } from "@/components/agents/AgentCard";
import { StatCard } from "@/components/ui/StatCard";
import { useTaskManager } from "@/context/TaskContext";

export default function AgentsPage() {
  const { getAgentTaskInfo, stats } = useTaskManager();

  const activeCount = MOCK_AGENTS.filter(a => {
    const info = getAgentTaskInfo(a.id);
    return info.status === "running" || info.status === "active";
  }).length;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8 border-b border-[#e5e5e5] pb-10">
        <StatCard
          label="Fleet"
          value={MOCK_AGENTS.length}
          change="Specialists"
        />
        <StatCard
          label="Active"
          value={`${activeCount}/${MOCK_AGENTS.length}`}
          change="Engaged"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          change="Across fleet"
        />
        <StatCard
          label="Providers"
          value="3"
          change="Groq, Gemini, Ollama"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between pb-3 mb-2 border-b border-[#e5e5e5]">
          <h2 className="ops-display text-[22px] text-[#111]">
            Configured fleet ({MOCK_AGENTS.length})
          </h2>
          <span className="text-[13px] text-[#888]">
            Tasks assigned dynamically
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-4">
          {MOCK_AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
