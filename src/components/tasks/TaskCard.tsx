
"use client";

import React, { useState } from "react";
import { Clock, Bot, Building2, Play, Check, AlertTriangle } from "lucide-react";
import { Task, TaskStatus } from "@/data/types";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { TaskDetailModal } from "./TaskDetailModal";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { useTaskManager } from "@/context/TaskContext";

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { transitionTask } = useTaskManager();

  const agent = MOCK_AGENTS.find(a => a.id === task.assignedAgentId);
  const lead = task.targetLeadId ? MOCK_LEADS.find(l => l.id === task.targetLeadId) : null;

  const handleQuickTransition = async (e: React.MouseEvent, nextStatus: TaskStatus) => {
    e.stopPropagation();
    await transitionTask(task.id, nextStatus);
  };

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="bg-white border border-[#d4d4d0] hover:border-[#3b82f6] p-3 rounded-none cursor-pointer transition-all duration-150 space-y-2.5 group"
      >
        {/* Header / ID & Priority */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold text-[#111111] group-hover:text-[#1a365d] transition-colors">
            {task.id}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 bg-[#f7f7f5] border border-[#d4d4d0] text-[10px] font-mono text-[#555555]">
              {task.type}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-semibold text-[#111111] leading-snug font-sans">
          {task.title}
        </h4>

        {/* Target lead if exists */}
        {lead && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#1a365d] truncate">
            <Building2 size={11} className="shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}

        {/* Quick Transition Action Pill */}
        <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
          {task.status === "queued" && (
            <button
              onClick={(e) => handleQuickTransition(e, "running")}
              className="px-2 py-0.5 bg-[#f0fdf4] border border-[#166534] text-[#166534] hover:bg-[#166534] text-[10px] font-mono flex items-center gap-1 rounded-none cursor-pointer transition-colors"
            >
              <Play size={10} /> Start Run
            </button>
          )}

          {task.status === "running" && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handleQuickTransition(e, "completed")}
                className="px-1.5 py-0.5 bg-[#ecfdf5] border border-[#047857] text-[#047857] hover:bg-[#047857] text-[10px] font-mono flex items-center gap-1 rounded-none cursor-pointer transition-colors"
                title="Mark Completed"
              >
                <Check size={10} /> Done
              </button>
              <button
                onClick={(e) => handleQuickTransition(e, "waiting_approval")}
                className="px-1.5 py-0.5 bg-[#fffbeb] border border-[#78350f] text-[#92400e] hover:bg-[#78350f] text-[10px] font-mono flex items-center gap-1 rounded-none cursor-pointer transition-colors"
                title="Hold for Approval"
              >
                <AlertTriangle size={10} /> Hold
              </button>
            </div>
          )}

          {task.status === "waiting_approval" && (
            <button
              onClick={(e) => handleQuickTransition(e, "running")}
              className="px-2 py-0.5 bg-[#fffbeb] border border-[#78350f] text-[#92400e] hover:bg-[#78350f] text-[10px] font-mono flex items-center gap-1 rounded-none cursor-pointer transition-colors"
            >
              <Play size={10} /> Resume
            </button>
          )}

          {task.status === "failed" && (
            <span className="text-[10px] font-mono text-[#9f1239] truncate max-w-[150px]">
              Failed
            </span>
          )}

          {task.status === "completed" && (
            <span className="text-[10px] font-mono text-[#166534]">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#d4d4d0] flex items-center justify-between text-[10px] font-mono text-[#666666]">
          <span className="flex items-center gap-1 truncate max-w-[120px]" title={agent ? agent.name : task.assignedAgentId}>
            <Bot size={11} className="text-[#666666] shrink-0" />
            <span className="truncate">{agent ? agent.name : task.assignedAgentId}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock size={11} />
            {task.startedAt ? new Date(task.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Queued"}
          </span>
        </div>
      </div>

      {modalOpen && (
        <TaskDetailModal
          task={task}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};
