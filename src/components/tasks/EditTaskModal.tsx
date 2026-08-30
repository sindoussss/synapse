
"use client";

import React, { useState } from "react";
import { Task, TaskUpdateInput, TaskPriority, TaskType } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { Save, Bot, Building2 } from "lucide-react";

interface EditTaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: TaskUpdateInput) => Promise<void>;
}

const TASK_TYPES = [
  "Lead Discovery",
  "Site Audit",
  "Mockup Dev",
  "Outreach",
  "Executive Strategy",
  "System Ops"
];

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [type, setType] = useState<TaskType>(task.type);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignedAgentId, setAssignedAgentId] = useState(task.assignedAgentId);
  const [targetLeadId, setTargetLeadId] = useState(task.targetLeadId || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    if (!description.trim()) {
      setError("Task description is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave(task.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        assignedAgentId,
        targetLeadId: targetLeadId || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Task // ${task.id}`}
      subtitle="Modify parameters, priority, or reassign agent"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {error && (
          <div className="p-2.5 bg-[#fef2f2] border border-[#991b1b] text-[#9f1239]">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#111111] uppercase">
            Task Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#111111] uppercase">
            Description *
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase">
              Task Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase flex items-center gap-1">
              <Bot size={12} className="text-[#1a365d]" /> Assigned Agent
            </label>
            <select
              value={assignedAgentId}
              onChange={(e) => setAssignedAgentId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              {MOCK_AGENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase flex items-center gap-1">
              <Building2 size={12} className="text-[#1a365d]" /> Related Lead
            </label>
            <select
              value={targetLeadId}
              onChange={(e) => setTargetLeadId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              <option value="">-- None / General --</option>
              {MOCK_LEADS.map((l) => (
                <option key={l.id} value={l.id}>{l.company} ({l.id})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-[#d4d4d0] flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting} icon={<Save size={14} />}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
