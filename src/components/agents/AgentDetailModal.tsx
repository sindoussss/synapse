
"use client";

import React from "react";
import { Agent } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTaskManager } from "@/context/TaskContext";

interface AgentDetailModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, isOpen, onClose }) => {
  const { getAgentTaskInfo, tasks } = useTaskManager();
  const taskInfo = getAgentTaskInfo(agent.id);
  const agentTasks = tasks.filter(t => t.assignedAgentId === agent.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Telemetry // ${agent.name}`}
      subtitle={`Role: ${agent.role} · ID: ${agent.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Status & Model Bar */}
        <div className="flex items-center justify-between p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Live Status</span>
            <div className="mt-1"><StatusBadge status={taskInfo.status} /></div>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Inference Engine</span>
            <span className="text-xs font-bold text-[#111111]">{agent.model}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Completed Tasks</span>
            <span className="text-xs font-bold text-[#166534]">{taskInfo.completedCount}</span>
          </div>
        </div>

        {/* Current Execution Details */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
            Active Task Focus
          </span>
          <div className="p-3 bg-white border border-[#d4d4d0] text-[#111111] leading-relaxed">
            {taskInfo.currentTaskTitle}
          </div>
        </div>

        {/* Assigned Tasks Breakdown */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
            Assigned Task Queue ({agentTasks.length})
          </span>
          <div className="divide-y divide-[#d4d4d0] bg-white border border-[#d4d4d0] max-h-40 overflow-y-auto">
            {agentTasks.length === 0 ? (
              <div className="p-3 text-center text-[#666666]">No tasks currently assigned to this agent.</div>
            ) : (
              agentTasks.map(t => (
                <div key={t.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-bold text-[#111111]">{t.id}: </span>
                    <span className="text-[#333333]">{t.title}</span>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subroutine Capabilities */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
            Authorized Autonomous Subroutines
          </span>
          <div className="grid grid-cols-2 gap-2">
            {agent.capabilities.map((cap, i) => (
              <div key={i} className="p-2 bg-[#f7f7f5] border border-[#d4d4d0] text-[#333333] flex items-center gap-2">
                <span className="text-[#1a365d]">›</span> {cap}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
