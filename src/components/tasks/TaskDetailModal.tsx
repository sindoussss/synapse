"use client";

import React, { useState } from "react";
import { Task, TaskStatus } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { MOCK_AGENTS } from "@/data/agents";
import { MOCK_LEADS } from "@/data/leads";
import { useTaskManager } from "@/context/TaskContext";
import { EditTaskModal } from "./EditTaskModal";
import { 
  Clock, 
  Bot, 
  Building2, 
  Play, 
  Check, 
  AlertTriangle, 
  X, 
  Edit3, 
  Trash2, 
  RefreshCw,
  Layers,
  FileCode,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Code2,
  ShieldCheck,
  Eye,
  FileText,
  Rocket,
  Globe,
  Mail
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose }) => {
  const { transitionTask, deleteTask, updateTask, refresh } = useTaskManager();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [customOutput, setCustomOutput] = useState("");
  const [customError, setCustomError] = useState("");
  const [showOutputPrompt, setShowOutputPrompt] = useState(false);
  const [showErrorPrompt, setShowErrorPrompt] = useState(false);

  // Execution state
  const [executingAgent, setExecutingAgent] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionSuccess, setExecutionSuccess] = useState<string | null>(null);

  // Operator Concept & Deployment Approval state
  const [approvingConcept, setApprovingConcept] = useState(false);
  const [requestingDeploy, setRequestingDeploy] = useState(false);
  const [approvingDeploy, setApprovingDeploy] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<any | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<string>("page.tsx");

  const agent = MOCK_AGENTS.find(a => a.id === task.assignedAgentId);
  const lead = task.targetLeadId ? MOCK_LEADS.find(l => l.id === task.targetLeadId) : null;

  const isResearchLeadDiscovery = 
    (task.assignedAgentId === "agent-research" || task.assignedAgentId?.toLowerCase().includes("research")) &&
    (task.type.toLowerCase().includes("lead") || task.type.toLowerCase().includes("discovery"));

  const isWebsiteAudit = 
    (task.assignedAgentId === "agent-analyst" || task.assignedAgentId?.toLowerCase().includes("analyst")) ||
    (task.type.toLowerCase().includes("audit") || task.type.toLowerCase().includes("site"));

  const isMockupDevelopment = 
    (task.assignedAgentId === "agent-developer" || task.assignedAgentId?.toLowerCase().includes("developer") || task.assignedAgentId?.toLowerCase().includes("dev")) ||
    (task.type.toLowerCase().includes("mockup") || task.type.toLowerCase().includes("concept"));

  const isSalesOutreach =
    (task.assignedAgentId === "agent-sales" || task.assignedAgentId?.toLowerCase().includes("sales")) ||
    (task.type.toLowerCase().includes("outreach") || task.type.toLowerCase().includes("draft"));

  // Sales Draft local edit state
  const [approvingDraft, setApprovingDraft] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedSubject, setEditedSubject] = useState(task.output?.subject || "");
  const [editedBody, setEditedBody] = useState(task.output?.emailBody || "");
  const [editedFollowUp, setEditedFollowUp] = useState(task.output?.followUp || "");

  // Phase 10 Email Sending State
  const [recipientInput, setRecipientInput] = useState(lead?.contactEmail || "operator-test@synapseops.internal");
  const [requestingSend, setRequestingSend] = useState(false);
  const [approvingSend, setApprovingSend] = useState(false);
  const [activeSend, setActiveSend] = useState<any | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleRunAgent = async (endpoint: string) => {
    setExecutingAgent(true);
    setExecutionError(null);
    setExecutionSuccess(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Execution failed.");
      }

      setExecutionSuccess("Execution completed successfully!");
      await refresh();
    } catch (err: any) {
      console.error("Execution error:", err);
      setExecutionError(err.message || "Execution failed.");
      await refresh();
    } finally {
      setExecutingAgent(false);
    }
  };

  const handleApproveConcept = async (action: "approve" | "reject") => {
    if (!task.output?.projectId) return;
    setApprovingConcept(true);
    try {
      const res = await fetch("/api/developer/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: task.output.projectId, action })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Approval failed.");
      await refresh();
    } catch (err: any) {
      console.error("Approval error:", err);
    } finally {
      setApprovingConcept(false);
    }
  };

  const handleRequestDeployment = async () => {
    if (!task.output?.projectId) return;
    setRequestingDeploy(true);
    setDeployError(null);
    try {
      const res = await fetch("/api/deployment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redesignProjectId: task.output.projectId })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to request deployment.");
      setActiveDeployment(data.result.deployment);
      await refresh();
    } catch (err: any) {
      setDeployError(err.message || "Failed to request deployment.");
    } finally {
      setRequestingDeploy(false);
    }
  };

  const handleApproveDeployment = async (action: "approve" | "reject") => {
    if (!activeDeployment?.id) return;
    setApprovingDeploy(true);
    setDeployError(null);
    try {
      const res = await fetch("/api/deployment/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId: activeDeployment.id, action })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Deployment execution failed.");
      setActiveDeployment(data.result);
      await refresh();
    } catch (err: any) {
      setDeployError(err.message || "Deployment failed.");
    } finally {
      setApprovingDeploy(false);
    }
  };

  const handleApproveDraft = async (action: "approve" | "reject") => {
    if (!task.output?.draftId) return;
    setApprovingDraft(true);
    try {
      const res = await fetch("/api/sales/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: task.output.draftId, action })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to process draft approval.");
      await refresh();
    } catch (err: any) {
      console.error("Draft approval error:", err);
    } finally {
      setApprovingDraft(false);
    }
  };

  const handleSaveDraftEdit = async () => {
    if (!task.output?.draftId) return;
    setApprovingDraft(true);
    try {
      const res = await fetch("/api/sales/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: task.output.draftId,
          action: "edit",
          updates: {
            subject: editedSubject,
            body: editedBody,
            followUp: editedFollowUp,
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save draft edits.");
      setIsEditingDraft(false);
      await refresh();
    } catch (err: any) {
      console.error("Draft edit error:", err);
    } finally {
      setApprovingDraft(false);
    }
  };

  const handleRequestSendEmail = async () => {
    if (!task.output?.draftId) return;
    setRequestingSend(true);
    setSendError(null);
    try {
      const res = await fetch("/api/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreachDraftId: task.output.draftId,
          recipientOverride: recipientInput.trim() || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to request email dispatch.");
      setActiveSend(data.result.emailSend);
      await refresh();
    } catch (err: any) {
      setSendError(err.message || "Failed to request email dispatch.");
    } finally {
      setRequestingSend(false);
    }
  };

  const handleApproveSendEmail = async (action: "approve" | "reject") => {
    if (!activeSend?.id) return;
    setApprovingSend(true);
    setSendError(null);
    try {
      const res = await fetch("/api/email/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendId: activeSend.id, action })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Email dispatch failed.");
      setActiveSend(data.result);
      await refresh();
    } catch (err: any) {
      setSendError(err.message || "Email dispatch failed.");
    } finally {
      setApprovingSend(false);
    }
  };

  const handleStatusTransition = async (nextStatus: TaskStatus) => {
    if (nextStatus === "completed" && !showOutputPrompt && !task.output) {
      setShowOutputPrompt(true);
      return;
    }
    if (nextStatus === "failed" && !showErrorPrompt && !task.error) {
      setShowErrorPrompt(true);
      return;
    }

    let parsedOutput: any = undefined;
    if (customOutput.trim()) {
      try { parsedOutput = JSON.parse(customOutput); } catch { parsedOutput = customOutput.trim(); }
    }

    await transitionTask(task.id, nextStatus, {
      output: parsedOutput,
      error: customError.trim() || undefined
    });

    setShowOutputPrompt(false);
    setShowErrorPrompt(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  const auditOutput = task.output?.scores ? task.output : null;
  const mockupOutput = task.output?.designBrief ? task.output : null;
  const draftOutput = task.output?.subject ? task.output : null;

  return (
    <>
      <Modal
        isOpen={isOpen && !isEditing}
        onClose={onClose}
        title={`Task Inspector // ${task.id}`}
        subtitle={task.title}
        maxWidth="xl"
      >
        <div className="space-y-4 font-mono text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Top Status Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
            <div>
              <span className="text-[10px] text-[#666666] block uppercase">Current Status</span>
              <div className="mt-1"><StatusBadge status={task.status} size="sm" /></div>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block uppercase">Priority</span>
              <div className="mt-1"><PriorityBadge priority={task.priority} /></div>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block uppercase">Task Type</span>
              <span className="text-[#111111] font-bold block mt-1">{task.type}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block uppercase">Created</span>
              <span className="text-[#555555] block mt-1 truncate">
                {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Developer Agent Dedicated Trigger (Phase 7) */}
          {isMockupDevelopment && (
            <div className="p-3 bg-[#f8fafc]/40 border border-[#8b5cf6]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-[#a78bfa]" />
                  <span className="font-bold text-[#111111] uppercase">
                    Developer Agent Next.js Redesign Engine
                  </span>
                </div>
                <span className="text-[10px] bg-[#312e81] text-[#c7d2fe] px-2 py-0.5 border border-[#4338ca]">
                  {task.status === "completed" ? "APPROVED CONCEPT" : task.status === "waiting_approval" ? "AWAITING HUMAN APPROVAL" : "READY TO GENERATE"}
                </span>
              </div>

              <p className="text-xs text-[#c4b5fd]/80 font-sans">
                Generates a personalized, responsive Next.js & Tailwind CSS concept component addressing real audit deficiencies with interactive CTAs.
              </p>

              {task.status === "queued" && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-[#a78bfa] truncate max-w-[240px]">
                    Company: {task.input?.companyName || task.title}
                  </span>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleRunAgent("/api/developer/execute")}
                    loading={executingAgent}
                    icon={<Play size={13} />}
                  >
                    {executingAgent ? "Scaffolding Next.js Redesign Concept..." : "Run Developer Agent (Generate Concept)"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Sales Agent Dedicated Trigger (Phase 9) */}
          {isSalesOutreach && task.status === "queued" && (
            <div className="p-3 bg-[#ecfdf5]/30 border border-[#10b981]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-[#047857]" />
                  <span className="font-bold text-[#111111] uppercase">
                    Sales Agent Personalized Outreach Engine
                  </span>
                </div>
                <span className="text-[10px] bg-[#065f46] text-[#a7f3d0] px-2 py-0.5 border border-[#047857]">
                  READY TO DRAFT
                </span>
              </div>

              <p className="text-xs text-[#a7f3d0]/80 font-sans">
                Synthesizes a polite, respectful, and evidence-grounded cold outreach email referencing real audit findings and the live preview URL. Zero emails are sent automatically.
              </p>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#047857] truncate max-w-[240px]">
                  Target: {task.input?.companyName || task.title}
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleRunAgent("/api/sales/execute")}
                  loading={executingAgent}
                  icon={<Play size={13} />}
                >
                  {executingAgent ? "Synthesizing Personalized Draft..." : "Run Sales Agent (Draft Outreach)"}
                </Button>
              </div>
            </div>
          )}

          {/* Research Agent Dedicated Trigger (Phase 5) */}
          {isResearchLeadDiscovery && task.status === "queued" && (
            <div className="p-3 bg-[#0d1527] border border-[#3b82f6]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#1a365d]" />
                  <span className="font-bold text-[#111111] uppercase">
                    Research Agent Lead Discovery Engine
                  </span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#64748b]">
                  Target: {task.input?.industry || "Real Estate"} ({task.input?.region || "Philippines"})
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleRunAgent("/api/research/execute")}
                  loading={executingAgent}
                  icon={<Play size={13} />}
                >
                  {executingAgent ? "Executing Discovery..." : "Run Agent (Execute Discovery)"}
                </Button>
              </div>
            </div>
          )}

          {/* Website Analyst Dedicated Trigger (Phase 6) */}
          {isWebsiteAudit && task.status === "queued" && (
            <div className="p-3 bg-[#f8fafc]/40 border border-[#6366f1]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={14} className="text-[#1e3a5f]" />
                  <span className="font-bold text-[#111111] uppercase">
                    Website Analyst Technical & UX Audit Engine
                  </span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#818cf8] truncate max-w-[240px]">
                  Target: {task.input?.website || task.input?.targetUrl || "Assigned Domain"}
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleRunAgent("/api/audit/execute")}
                  loading={executingAgent}
                  icon={<Play size={13} />}
                >
                  {executingAgent ? "Executing Technical & UX Audit..." : "Run Agent (Execute Audit)"}
                </Button>
              </div>
            </div>
          )}

          {executionSuccess && (
            <div className="p-2.5 bg-[#f0fdf4] border border-[#166534] text-[#166534] flex items-start gap-2">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Execution Complete!</span>
                <p className="font-sans text-xs text-[#bbf7d0] mt-0.5">{executionSuccess}</p>
              </div>
            </div>
          )}

          {executionError && (
            <div className="p-2.5 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239] flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Execution Error</span>
                <p className="font-sans text-xs text-[#fecaca] mt-0.5">{executionError}</p>
              </div>
            </div>
          )}

          {/* Phase 7: Rich Mockup Deliverable & Approval Inspector */}
          {mockupOutput && (
            <div className="space-y-3 p-3 bg-[#0d0e14] border border-[#8b5cf6]/40">
              <div className="flex items-center justify-between border-b border-[#d4d4d0] pb-2">
                <span className="font-bold text-[#111111] uppercase flex items-center gap-1.5">
                  <Code2 size={14} className="text-[#a78bfa]" />
                  Redesign Concept: {mockupOutput.companyName}
                </span>
                <div className="flex items-center gap-2">
                  {task.status === "waiting_approval" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveConcept("approve")}
                        loading={approvingConcept}
                        icon={<Check size={12} />}
                      >
                        Approve Concept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleApproveConcept("reject")}
                        loading={approvingConcept}
                        icon={<X size={12} />}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {task.status === "completed" && (
                    <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] border border-[#047857] text-[10px] font-bold uppercase">
                      ✓ Concept Approved
                    </span>
                  )}
                </div>
              </div>

              {/* Design Brief Overview */}
              <div className="p-2.5 bg-[#14151f] border border-[#d4d4d0] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#a78bfa] block">
                  Strategic Design Brief
                </span>
                <p className="text-xs font-sans text-[#e2e8f0]">
                  <strong>Direction:</strong> {mockupOutput.designBrief.designDirection}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-sans">
                  <div className="p-2 bg-[#f0fdf4]/40 border border-[#166534] text-[#86efac]">
                    <strong>Preserved Strengths:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {mockupOutput.designBrief.preserve.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-2 bg-[#3b0764]/40 border border-[#7e22ce] text-[#d8b4fe]">
                    <strong>Audit Fixes Implemented:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {mockupOutput.designBrief.improve.map((imp: string, i: number) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Phase 8: Controlled Preview Deployment Gate */}
              {task.status === "completed" && (
                <div className="p-3 bg-[#0f172a] border border-[#38bdf8]/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rocket size={14} className="text-[#1a365d]" />
                      <span className="font-bold text-[#f8fafc] uppercase">
                        Phase 8: Controlled Preview Deployment
                      </span>
                    </div>
                    {activeDeployment?.previewUrl ? (
                      <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] border border-[#047857] text-[10px] font-bold uppercase">
                        LIVE PREVIEW READY
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#1e293b] text-[#93c5fd] px-2 py-0.5 border border-[#334155]">
                        VERCEL SANDBOX
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#94a3b8] font-sans">
                    Deploy the approved Next.js & Tailwind concept to an isolated Vercel preview URL. Requires explicit operator authorization.
                  </p>

                  {!activeDeployment && (
                    <div className="pt-1 flex justify-end">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleRequestDeployment}
                        loading={requestingDeploy}
                        icon={<Rocket size={13} />}
                      >
                        Request Preview Deployment
                      </Button>
                    </div>
                  )}

                  {activeDeployment && activeDeployment.status === "pending_approval" && (
                    <div className="p-3 bg-[#f8fafc]/60 border border-[#6366f1] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#c7d2fe] text-xs">
                          Deployment Authorization Required ({activeDeployment.id})
                        </span>
                        <span className="text-[10px] bg-[#4338ca] text-white px-2 py-0.5">
                          RISK: MEDIUM (ISOLATED PREVIEW)
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-[#e0e7ff]">
                        Target Provider: <strong>Vercel</strong> | Target: <strong>Preview Sandbox</strong> (Zero client DNS changes).
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleApproveDeployment("reject")}
                          loading={approvingDeploy}
                          icon={<X size={12} />}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApproveDeployment("approve")}
                          loading={approvingDeploy}
                          icon={<Check size={12} />}
                        >
                          Approve & Deploy to Vercel
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeDeployment?.previewUrl && (
                    <div className="p-3 bg-[#f0fdf4] border border-[#166534] text-[#166534] flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold block">Live Preview Deployed!</span>
                        <a
                          href={activeDeployment.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1a365d] hover:underline flex items-center gap-1 text-xs mt-0.5 font-bold"
                        >
                          <span>{activeDeployment.previewUrl}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <a
                        href={activeDeployment.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow"
                      >
                        <span>Open Preview ↗</span>
                      </a>
                    </div>
                  )}

                  {deployError && (
                    <div className="p-2.5 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239] space-y-1">
                      <span className="font-bold block text-xs">Deployment Notice:</span>
                      <p className="font-sans text-[11px]">{deployError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Summary */}
              {mockupOutput.validationResults && (
                <div className="p-2 bg-[#12131a] border border-[#d4d4d0] flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#666666] flex items-center gap-1">
                    <ShieldCheck size={12} className="text-[#166534]" /> Automated Validation:
                  </span>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[#166534] font-bold">✓ Security & Secret Sanitized</span>
                    <span className="text-[#166534] font-bold">✓ Responsive Viewport</span>
                    <span className="text-[#166534] font-bold">✓ Interactive CTAs</span>
                  </div>
                </div>
              )}

              {/* Generated Files Explorer */}
              {Array.isArray(mockupOutput.generatedFiles) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#666666]">
                      Isolated Project Artifacts ({mockupOutput.generatedFiles.length} files):
                    </span>
                    <div className="flex gap-1">
                      {mockupOutput.generatedFiles.map((f: any, i: number) => {
                        const filename = f.path.split("/").pop();
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveCodeTab(filename)}
                            className={`px-2 py-0.5 text-[10px] font-mono border ${
                              activeCodeTab === filename
                                ? "bg-[#8b5cf6] text-white border-[#8b5cf6]"
                                : "bg-[#f7f7f5] text-[#555555] border-[#d4d4d0]"
                            }`}
                          >
                            {filename}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <pre className="p-2.5 bg-[#090a0f] border border-[#d4d4d0] text-[10px] text-[#c4b5fd] overflow-x-auto max-h-48">
                    {mockupOutput.generatedFiles.find((f: any) => f.path.endsWith(activeCodeTab))?.contentSnippet ||
                      JSON.stringify(mockupOutput.generatedFiles, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Phase 6: Rich Audit Output View */}
          {auditOutput && (
            <div className="space-y-3 p-3 bg-[#0c0e14] border border-[#3b82f6]/40">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="font-bold text-[#111111] uppercase flex items-center gap-1.5">
                  <Gauge size={14} className="text-[#1a365d]" />
                  Verified Audit Report: {auditOutput.website}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  auditOutput.recommendedAction === "pursue" 
                    ? "bg-[#065f46] text-[#6ee7b7] border border-[#047857]"
                    : auditOutput.recommendedAction === "review"
                    ? "bg-[#78350f] text-[#fde68a] border border-[#b45309]"
                    : "bg-[#374151] text-[#d1d5db] border border-[#4b5563]"
                }`}>
                  Action: {auditOutput.recommendedAction}
                </span>
              </div>

              {/* Scorecard Hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-[#161e2e] border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#94a3b8] uppercase block">Website Score</span>
                  <span className="text-lg font-bold text-[#1a365d] block mt-0.5">{auditOutput.scores.website}/100</span>
                </div>
                <div className="p-2 bg-[#161e2e] border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#94a3b8] uppercase block">Redesign Opportunity</span>
                  <span className="text-lg font-bold text-[#f59e0b] block mt-0.5">{auditOutput.scores.redesignOpportunity}/100</span>
                </div>
                <div className="p-2 bg-[#161e2e] border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#94a3b8] uppercase block">Performance</span>
                  <span className="text-sm font-bold text-[#111111] block mt-1">{auditOutput.scores.performance}/100</span>
                </div>
                <div className="p-2 bg-[#161e2e] border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#94a3b8] uppercase block">Mobile / UX</span>
                  <span className="text-sm font-bold text-[#111111] block mt-1">{auditOutput.scores.mobile}/100</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase 9: Rich Sales Outreach Deliverable & Operator Review Inspector */}
          {draftOutput && (
            <div className="space-y-3 p-3 bg-[#ecfdf5]/40 border border-[#10b981]/50">
              <div className="flex items-center justify-between border-b border-[#134e3a] pb-2">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-[#047857]" />
                  <span className="font-bold text-[#111111] uppercase">
                    Personalized Outreach Package: {draftOutput.companyName || task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === "waiting_approval" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveDraft("approve")}
                        loading={approvingDraft}
                        icon={<Check size={12} />}
                      >
                        Approve Draft
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (isEditingDraft) {
                            handleSaveDraftEdit();
                          } else {
                            setEditedSubject(draftOutput.subject);
                            setEditedBody(draftOutput.emailBody);
                            setEditedFollowUp(draftOutput.followUp || "");
                            setIsEditingDraft(true);
                          }
                        }}
                        loading={approvingDraft}
                        icon={<Edit3 size={12} />}
                      >
                        {isEditingDraft ? "Save Edits" : "Edit Draft"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleApproveDraft("reject")}
                        loading={approvingDraft}
                        icon={<X size={12} />}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {task.status === "completed" && (
                    <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] border border-[#047857] text-[10px] font-bold uppercase">
                      ✓ Draft Approved (Ready for Outreach)
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Preview Link Reference */}
              {draftOutput.previewUrl && (
                <div className="p-2 bg-[#ecfdf5]/50 border border-[#059669] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#a7f3d0]">
                    <Globe size={12} className="text-[#047857]" />
                    <span>Embedded Concept Preview:</span>
                    <a
                      href={draftOutput.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#1a365d] hover:underline"
                    >
                      {draftOutput.previewUrl}
                    </a>
                  </div>
                  <a
                    href={draftOutput.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-[10px] rounded flex items-center gap-1"
                  >
                    <span>Test Link</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {/* Subject Line */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#6ee7b7] block">
                  Subject Line:
                </span>
                {isEditingDraft ? (
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full bg-[#0d1f18] border border-[#10b981] p-2 text-xs text-white font-mono rounded"
                  />
                ) : (
                  <div className="p-2.5 bg-[#0d1f18] border border-[#134e3a] text-xs font-bold text-[#f8fafc]">
                    {draftOutput.subject}
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#6ee7b7]">
                    Email Body:
                  </span>
                  <span className="text-[10px] text-[#a7f3d0]/70">
                    Word Count: {(isEditingDraft ? editedBody : draftOutput.emailBody).split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                {isEditingDraft ? (
                  <textarea
                    rows={8}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full bg-[#0d1f18] border border-[#10b981] p-2.5 text-xs text-white font-mono rounded leading-relaxed"
                  />
                ) : (
                  <pre className="p-3 bg-[#0d1f18] border border-[#134e3a] text-xs text-[#d1fae5] whitespace-pre-wrap font-sans leading-relaxed">
                    {draftOutput.emailBody}
                  </pre>
                )}
              </div>

              {/* Follow-up Message */}
              {(draftOutput.followUp || isEditingDraft) && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#6ee7b7] block">
                    Follow-Up Sequence (+4 Days):
                  </span>
                  {isEditingDraft ? (
                    <textarea
                      rows={3}
                      value={editedFollowUp}
                      onChange={(e) => setEditedFollowUp(e.target.value)}
                      className="w-full bg-[#0d1f18] border border-[#10b981] p-2 text-xs text-white font-mono rounded leading-relaxed"
                    />
                  ) : (
                    <pre className="p-2.5 bg-[#0d1f18] border border-[#134e3a] text-xs text-[#a7f3d0] whitespace-pre-wrap font-sans leading-relaxed">
                      {draftOutput.followUp}
                    </pre>
                  )}
                </div>
              )}

              {/* Evidence Grounding Badges */}
              {draftOutput.personalization && (
                <div className="p-2.5 bg-[#0b1c15] border border-[#134e3a] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#047857] flex items-center gap-1">
                    <ShieldCheck size={12} /> Grounded Personalization Evidence:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-sans">
                    <div className="p-1.5 bg-[#ecfdf5] border border-[#065f46]">
                      <strong className="text-[#6ee7b7] block">Audit Signals:</strong>
                      <span className="text-[#d1fae5]">{draftOutput.personalization.auditSignalsUsed?.join(", ") || "Audit observations"}</span>
                    </div>
                    <div className="p-1.5 bg-[#ecfdf5] border border-[#065f46]">
                      <strong className="text-[#6ee7b7] block">Company Facts:</strong>
                      <span className="text-[#d1fae5]">{draftOutput.personalization.companyFactsUsed?.join(", ") || "Verified company identity"}</span>
                    </div>
                    <div className="p-1.5 bg-[#ecfdf5] border border-[#065f46]">
                      <strong className="text-[#6ee7b7] block">Improvements Referenced:</strong>
                      <span className="text-[#d1fae5]">{draftOutput.personalization.redesignImprovementsReferenced?.join(", ") || "Next.js concept features"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 10: Controlled Outbound Email Dispatch Gate */}
              {task.status === "completed" && (
                <div className="p-3 bg-[#0c1f17] border border-[#10b981]/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-[#047857]" />
                      <span className="font-bold text-[#111111] uppercase">
                        Phase 10: Controlled Outbound Email Dispatch
                      </span>
                    </div>
                    {activeSend?.status === "sent" ? (
                      <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] border border-[#047857] text-[10px] font-bold uppercase">
                        ✓ EMAIL SENT VIA GMAIL
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#ecfdf5] text-[#a7f3d0] px-2 py-0.5 border border-[#059669]">
                        GMAIL GATEWAY
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#a7f3d0]/80 font-sans">
                    Dispatch the approved personalized cold email through Gmail. Requires a dedicated secondary human send authorization.
                  </p>

                  {!activeSend && (
                    <div className="p-2.5 bg-[#081a13] border border-[#134e3a] space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase text-[#6ee7b7] block font-bold mb-1">
                            Target Recipient Email Address:
                          </label>
                          <input
                            type="email"
                            value={recipientInput}
                            onChange={(e) => setRecipientInput(e.target.value)}
                            placeholder="e.g. decisionmaker@company.com or test@email.com"
                            className="w-full bg-[#0d281e] border border-[#10b981] p-1.5 text-xs text-white font-mono rounded"
                          />
                        </div>
                        <div className="sm:self-end">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={handleRequestSendEmail}
                            loading={requestingSend}
                            icon={<Mail size={13} />}
                          >
                            Request Send Authorization
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#6ee7b7]/70">
                        * To safely test, enter your test email above. Nothing will be sent without the next explicit confirmation step.
                      </p>
                    </div>
                  )}

                  {activeSend && activeSend.status === "pending_approval" && (
                    <div className="p-3 bg-[#f8fafc]/70 border border-[#6366f1] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#c7d2fe] text-xs">
                          Final Outbound Send Authorization Required ({activeSend.id})
                        </span>
                        <span className="text-[10px] bg-[#dc2626] text-white px-2 py-0.5 font-bold">
                          RISK: HIGH (LIVE EMAIL SEND)
                        </span>
                      </div>
                      <div className="text-[11px] font-sans text-[#e0e7ff] space-y-1">
                        <div>Recipient: <strong>{activeSend.recipient}</strong></div>
                        <div>Subject: <strong>{activeSend.subject}</strong></div>
                        <div>Provider: <strong>Gmail</strong></div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleApproveSendEmail("reject")}
                          loading={approvingSend}
                          icon={<X size={12} />}
                        >
                          Reject Send
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApproveSendEmail("approve")}
                          loading={approvingSend}
                          icon={<Check size={12} />}
                        >
                          Approve & Send Email (Gmail)
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeSend && activeSend.status === "sent" && (
                    <div className="p-3 bg-[#f0fdf4] border border-[#166534] text-[#166534] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold block text-xs">✓ Email Successfully Sent!</span>
                        <span className="text-[10px] font-mono text-[#86efac]">
                          Message ID: {activeSend.providerMessageId || "Confirmed"}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-[#bbf7d0]">
                        Dispatched to <strong>{activeSend.recipient}</strong> on {new Date(activeSend.sentAt || Date.now()).toLocaleString()}. Lead status updated to <strong>Contacted</strong>.
                      </p>
                    </div>
                  )}

                  {sendError && (
                    <div className="p-2.5 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239] space-y-1">
                      <span className="font-bold block text-xs">Dispatch Notice / Configuration Required:</span>
                      <p className="font-sans text-[11px]">{sendError}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-[#a7f3d0]/60 italic">
                * Operator Approval Notice: Approving this draft stores it as Outreach Ready in Supabase. Phase 10 requires separate send authorization before email dispatch.
              </p>
            </div>
          )}

          {/* Manual Status Controls Bar */}
          <div className="p-3 bg-[#fafafa] border border-[#d4d4d0] space-y-2">
            <span className="text-[10px] font-semibold uppercase text-[#666666] block">
              Manual Status Transitions:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {task.status === "queued" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusTransition("running")}
                  icon={<Play size={12} />}
                >
                  Start Execution (Running)
                </Button>
              )}

              {task.status === "running" && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleStatusTransition("completed")}
                    icon={<Check size={12} />}
                  >
                    Mark Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusTransition("waiting_approval")}
                    icon={<AlertTriangle size={12} className="text-[#f59e0b]" />}
                  >
                    Request Approval
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleStatusTransition("failed")}
                    icon={<X size={12} />}
                  >
                    Mark Failed
                  </Button>
                </>
              )}

              {task.status === "waiting_approval" && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleStatusTransition("completed")}
                    icon={<Check size={12} />}
                  >
                    Authorize & Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleStatusTransition("failed")}
                    icon={<X size={12} />}
                  >
                    Reject (Mark Failed)
                  </Button>
                </>
              )}

              {(task.status === "completed" || task.status === "failed") && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusTransition("queued")}
                  icon={<RefreshCw size={12} />}
                >
                  Re-queue Task (Reset to Queued)
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase text-[#555555] block">
              Instructions & Scope
            </span>
            <div className="p-3 bg-white border border-[#d4d4d0] font-sans text-xs text-[#333333] leading-relaxed">
              {task.description}
            </div>
          </div>

          {/* Assigned Agent & Target Lead */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-[#fafafa] border border-[#d4d4d0]">
              <div className="flex items-center gap-2 text-[#666666] text-[10px] uppercase">
                <Bot size={12} className="text-[#1a365d]" /> Assigned Agent
              </div>
              <div className="mt-1 font-bold text-[#111111]">
                {agent ? agent.name : task.assignedAgentId}
              </div>
              <div className="text-[11px] text-[#555555]">
                Role: {agent ? agent.role : "Specialist Agent"}
              </div>
            </div>

            <div className="p-3 bg-[#fafafa] border border-[#d4d4d0]">
              <div className="flex items-center gap-2 text-[#666666] text-[10px] uppercase">
                <Building2 size={12} className="text-[#1a365d]" /> Target Lead / Subject
              </div>
              <div className="mt-1 font-bold text-[#111111]">
                {lead ? lead.company : (task.targetLeadId || task.input?.companyName || "None / General")}
              </div>
              <div className="text-[11px] text-[#555555]">
                {lead ? `${lead.industry} · ${lead.website}` : (task.input?.website || "Autonomous operational workflow")}
              </div>
            </div>
          </div>

          {/* Edit / Delete Footer Controls */}
          <div className="pt-3 border-t border-[#d4d4d0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9f1239] text-xs">Confirm delete?</span>
                  <Button size="sm" variant="danger" onClick={handleDelete}>
                    Yes, Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  icon={<Trash2 size={12} className="text-[#9f1239]" />}
                >
                  Delete Task
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(true)}
                icon={<Edit3 size={12} />}
              >
                Edit Task
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {isEditing && (
        <EditTaskModal
          task={task}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSave={async (id, updates) => {
            await updateTask(id, updates);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
};