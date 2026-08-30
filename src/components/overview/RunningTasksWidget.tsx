"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Task, TaskStatus } from "@/data/types";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { useTaskManager } from "@/context/TaskContext";

interface RunningTasksWidgetProps {
  tasks: Task[];
}

export const RunningTasksWidget: React.FC<RunningTasksWidgetProps> = ({ tasks }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { transitionTask } = useTaskManager();

  const handleQuickStatus = async (e: React.MouseEvent, taskId: string, nextStatus: TaskStatus) => {
    e.stopPropagation();
    await transitionTask(taskId, nextStatus);
  };

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3 mb-2 border-b border-[#e5e5e5]">
        <h2 className="ops-display text-[22px] text-[#111]">
          Running ({tasks.length})
        </h2>
        <Link href="/tasks" className="text-[13px] text-[#111] underline underline-offset-4 decoration-[#ccc] hover:decoration-[#111]">
          Kanban
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="py-6 text-[15px] text-[#666]">
          No tasks are running.{" "}
          <Link href="/tasks" className="text-[#111] underline underline-offset-4">
            View the board
          </Link>
        </p>
      ) : (
        <div>
          {tasks.map((task) => {
            const agent = MOCK_AGENTS.find(a => a.id === task.assignedAgentId);
            const lead = task.targetLeadId ? MOCK_LEADS.find(l => l.id === task.targetLeadId) : null;

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="py-4 border-b border-[#f0f0f0] cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-[12px] text-[#888] tabular-nums">{task.id}</span>
                    <span className="text-[15px] text-[#111]">{task.title}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleQuickStatus(e, task.id, "completed")}
                      className="text-[13px] text-[#111] underline underline-offset-4 cursor-pointer"
                    >
                      Complete
                    </button>
                    <button
                      onClick={(e) => handleQuickStatus(e, task.id, "waiting_approval")}
                      className="text-[13px] text-[#111] underline underline-offset-4 cursor-pointer"
                    >
                      Hold
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-[14px] text-[#666]">
                  {task.description}
                </p>

                <div className="mt-2 text-[13px] text-[#888]">
                  {agent ? agent.name : task.assignedAgentId}
                  {lead && <span> · {lead.company}</span>}
                  <span>
                    {" · "}
                    {task.startedAt ? new Date(task.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Running"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </section>
  );
};
