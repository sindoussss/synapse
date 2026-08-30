
"use client";

import React, { useState } from "react";
import { Task, TaskCreateInput, TaskPriority, TaskType, TaskStatus } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { Plus, Bot, Building2, Layers } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: TaskCreateInput) => Promise<void>;
  existingTasks: Task[];
}

const TASK_TYPES = [
  "Lead Discovery",
  "Site Audit",
  "Mockup Dev",
  "Outreach",
  "Executive Strategy",
  "System Ops"
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingTasks
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Lead Discovery");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedAgentId, setAssignedAgentId] = useState(MOCK_AGENTS[0].id);
  const [status, setStatus] = useState<TaskStatus>("queued");
  const [targetLeadId, setTargetLeadId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [inputPayload, setInputPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    let parsedInput: any = null;
    if (inputPayload.trim()) {
      try {
        parsedInput = JSON.parse(inputPayload);
      } catch (err) {
        parsedInput = inputPayload.trim();
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        assignedAgentId,
        status,
        targetLeadId: targetLeadId || undefined,
        parentTaskId: parentTaskId || undefined,
        input: parsedInput,
      });

      setTitle("");
      setDescription("");
      setType("Lead Discovery");
      setPriority("medium");
      setTargetLeadId("");
      setParentTaskId("");
      setInputPayload("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Operational Task"
      subtitle="Manual task injection into autonomous executor pool"
      maxWidth="xl"
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
            placeholder="e.g. Audit mobile conversion funnel for Apex Logistics"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#111111] uppercase">
            Description & Instructions *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Detailed instructions for the assigned agent..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              <option value="queued">Queued</option>
              <option value="running">Running</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <Building2 size={12} className="text-[#1a365d]" /> Related Lead (Optional)
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

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#111111] uppercase flex items-center gap-1">
              <Layers size={12} className="text-[#1a365d]" /> Parent Task (Optional)
            </label>
            <select
              value={parentTaskId}
              onChange={(e) => setParentTaskId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none"
            >
              <option value="">-- None / Root Task --</option>
              {existingTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.id}: {t.title.substring(0, 30)}...</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#111111] uppercase">
            Task Input Payload (JSON or text, optional)
          </label>
          <textarea
            rows={2}
            placeholder='e.g. {"url": "https://apexlogistics-demo.com", "depth": 2}'
            value={inputPayload}
            onChange={(e) => setInputPayload(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#d4d4d0] text-xs font-mono text-[#93c5fd] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="pt-3 border-t border-[#d4d4d0] flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting} icon={<Plus size={14} />}>
            {submitting ? "Injecting Task..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
