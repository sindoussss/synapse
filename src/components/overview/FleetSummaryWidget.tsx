"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Agent } from "@/data/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { AgentDetailModal } from "@/components/agents/AgentDetailModal";
import { useTaskManager } from "@/context/TaskContext";

interface FleetSummaryWidgetProps {
  agents: Agent[];
}

export const FleetSummaryWidget: React.FC<FleetSummaryWidgetProps> = ({ agents }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { getAgentTaskInfo } = useTaskManager();

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3 mb-2 border-b border-[#e5e5e5]">
        <h2 className="ops-display text-[22px] text-[#111]">
          Fleet ({agents.length})
        </h2>
        <Link href="/agents" className="text-[13px] text-[#111] underline underline-offset-4 decoration-[#ccc] hover:decoration-[#111]">
          All agents
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px] border-collapse">
          <thead>
            <tr className="border-b border-[#e5e5e5] text-[12px] text-[#888]">
              <th className="py-3 pr-4 font-normal">Agent</th>
              <th className="py-3 pr-4 font-normal">Role</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal">Focus</th>
              <th className="py-3 pr-4 font-normal">Model</th>
              <th className="py-3 font-normal text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const taskInfo = getAgentTaskInfo(agent.id);

              return (
                <tr key={agent.id} className="border-b border-[#f0f0f0]">
                  <td className="py-4 pr-4 text-[#111] whitespace-nowrap">
                    {agent.name}
                  </td>
                  <td className="py-4 pr-4 text-[#666] whitespace-nowrap">
                    {agent.role}
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <StatusBadge status={taskInfo.status} size="sm" />
                  </td>
                  <td className="py-4 pr-4 text-[#111] max-w-xs truncate" title={taskInfo.currentTaskTitle}>
                    {taskInfo.currentTaskTitle}
                  </td>
                  <td className="py-4 pr-4 text-[#666] whitespace-nowrap">
                    {agent.model}
                  </td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </section>
  );
};
