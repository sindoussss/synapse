"use client";

import React, { useState } from "react";
import { Agent } from "@/data/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { AgentDetailModal } from "./AgentDetailModal";
import { useTaskManager } from "@/context/TaskContext";

interface AgentCardProps {
  agent: Agent;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const { getAgentTaskInfo, refresh } = useTaskManager();

  const taskInfo = getAgentTaskInfo(agent.id);

  const isResearchAgent = agent.id === "agent-research" || agent.role.toLowerCase().includes("research");
  const isWebsiteAnalyst = agent.id === "agent-analyst" || agent.role.toLowerCase().includes("analyst");

  const hasQueuedDiscoveryTask = 
    isResearchAgent &&
    taskInfo.activeTask && 
    taskInfo.activeTask.status === "queued" &&
    (taskInfo.activeTask.type.toLowerCase().includes("lead") || taskInfo.activeTask.type.toLowerCase().includes("discovery"));

  const hasQueuedAuditTask = 
    isWebsiteAnalyst &&
    taskInfo.activeTask && 
    taskInfo.activeTask.status === "queued" &&
    (taskInfo.activeTask.type.toLowerCase().includes("audit") || taskInfo.activeTask.type.toLowerCase().includes("site"));

  const handleRunTask = async (endpoint: string) => {
    if (!taskInfo.activeTask) return;
    setExecuting(true);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskInfo.activeTask.id })
      });
      await refresh();
    } catch (err) {
      console.error("Agent execution error:", err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <div className="border-t border-[#e5e5e5] pt-5 flex flex-col justify-between min-h-[280px]">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h3 className="ops-display text-[22px] text-[#111]">{agent.name}</h3>
              <p className="text-[13px] text-[#333] mt-1">{agent.role}</p>
            </div>
            <StatusBadge status={taskInfo.status} />
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[13px] text-[#888]">Focus</span>
              {hasQueuedDiscoveryTask && (
                <button
                  onClick={() => handleRunTask("/api/research/execute")}
                  disabled={executing}
                  className="text-[13px] underline underline-offset-4 cursor-pointer"
                >
                  {executing ? "Executing…" : "Run discovery"}
                </button>
              )}
              {hasQueuedAuditTask && (
                <button
                  onClick={() => handleRunTask("/api/audit/execute")}
                  disabled={executing}
                  className="text-[13px] underline underline-offset-4 cursor-pointer"
                >
                  {executing ? "Auditing…" : "Run audit"}
                </button>
              )}
            </div>
            <p className="text-[14px] text-[#111] leading-relaxed">
              {taskInfo.currentTaskTitle}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div>
              <dt className="text-[#888]">{taskInfo.status === "running" ? "Active route" : "Preferred route"}</dt>
              <dd className="text-[#111] mt-0.5">{agent.model}</dd>
            </div>
            <div>
              <dt className="text-[#888]">Completed</dt>
              <dd className="text-[#111] mt-0.5">{taskInfo.completedCount}</dd>
            </div>
            <div>
              <dt className="text-[#888]">Uptime</dt>
              <dd className="text-[#111] mt-0.5">{agent.uptime}</dd>
            </div>
            <div>
              <dt className="text-[#888]">Efficiency</dt>
              <dd className="text-[#111] mt-0.5">{agent.efficiencyRate}%</dd>
            </div>
          </dl>

          <p className="mt-4 text-[13px] text-[#333] leading-relaxed">
            {agent.capabilities.join(" · ")}
          </p>
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-2">
          <span className="text-[13px] text-[#888]">
            Active tasks {taskInfo.runningCount}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setModalOpen(true)}
          >
            Telemetry
          </Button>
        </div>
      </div>

      <AgentDetailModal
        agent={agent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};