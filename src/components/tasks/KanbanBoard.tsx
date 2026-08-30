
"use client";

import React, { useState } from "react";
import { Task, TaskStatus } from "@/data/types";
import { TaskCard } from "./TaskCard";
import { CreateTaskModal } from "./CreateTaskModal";
import { useTaskManager } from "@/context/TaskContext";
import { MOCK_AGENTS } from "@/data/agents";
import { Button } from "@/components/ui/Button";
import { Search, Plus } from "lucide-react";

interface KanbanBoardProps {
  tasks: Task[];
}

const COLUMNS: { key: TaskStatus; label: string; dotColor: string; borderColor: string }[] = [
  { key: "queued", label: "Queued", dotColor: "bg-[#71717a]", borderColor: "border-t-[#71717a]" },
  { key: "running", label: "Running", dotColor: "bg-[#22c55e]", borderColor: "border-t-[#22c55e]" },
  { key: "waiting_approval", label: "Waiting Approval", dotColor: "bg-[#f59e0b]", borderColor: "border-t-[#f59e0b]" },
  { key: "completed", label: "Completed", dotColor: "bg-[#10b981]", borderColor: "border-t-[#10b981]" },
  { key: "failed", label: "Failed", dotColor: "bg-[#f43f5e]", borderColor: "border-t-[#f43f5e]" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks }) => {
  const { createTask } = useTaskManager();
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const taskTypes = Array.from(new Set(tasks.map((t) => t.type)));

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAgent = agentFilter === "all" || task.assignedAgentId === agentFilter;
    const matchesType = typeFilter === "all" || task.type === typeFilter;

    return matchesSearch && matchesAgent && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search, Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#d4d4d0]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search task title, ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none cursor-pointer"
          >
            <option value="all">All Agents</option>
            {MOCK_AGENTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none cursor-pointer"
          >
            <option value="all">All Task Types</option>
            {taskTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            icon={<Plus size={14} />}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className={`bg-white border border-[#d4d4d0] border-t-2 ${col.borderColor} rounded-none flex flex-col min-h-[480px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 border-b border-[#d4d4d0] bg-[#fafafa]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                    {col.label}
                  </h3>
                </div>
                <span className="px-1.5 py-0.2 bg-[#1f1f23] border border-[#d4d4d0] text-[10px] font-mono font-bold text-[#555555] rounded-none">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[700px]">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center text-[11px] font-mono text-[#52525b] border border-dashed border-[#d4d4d0]/60">
                    No tasks in {col.label.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {createModalOpen && (
        <CreateTaskModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={async (input) => {
            await createTask(input);
          }}
          existingTasks={tasks}
        />
      )}
    </div>
  );
};
