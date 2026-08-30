"use client";

import React, { useState } from "react";
import { Lead } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Button } from "@/components/ui/Button";
import { Globe, Mail, MapPin, Layers, AlertCircle, DollarSign, ExternalLink, Sparkles, CheckCircle2, Code2, FileText } from "lucide-react";
import { useTaskManager } from "@/context/TaskContext";

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const { refresh } = useTaskManager();
  const [creatingAudit, setCreatingAudit] = useState(false);
  const [creatingMockup, setCreatingMockup] = useState(false);
  const [preparingOutreach, setPreparingOutreach] = useState(false);
  const [taskCreatedMessage, setTaskCreatedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateAuditTask = async () => {
    setCreatingAudit(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/audit/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create audit task.");
      setTaskCreatedMessage(`Queued Website Audit task created: ${data.task.id}`);
      await refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create audit task.");
    } finally {
      setCreatingAudit(false);
    }
  };

  const handleCreateMockupTask = async () => {
    setCreatingMockup(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/developer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, forceOverride: true })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create mockup task.");
      setTaskCreatedMessage(`Queued Mockup Development task created: ${data.task.id}`);
      await refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create mockup task.");
    } finally {
      setCreatingMockup(false);
    }
  };

  const handlePrepareOutreach = async () => {
    setPreparingOutreach(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/sales/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to prepare outreach task.");
      setTaskCreatedMessage(`Queued Outreach Draft task created: ${data.task.id}`);
      await refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to prepare outreach task.");
    } finally {
      setPreparingOutreach(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lead Prospectus // ${lead.company}`}
      subtitle={`ID: ${lead.id} · Industry: ${lead.industry}`}
      maxWidth="xl"
    >
      <div className="space-y-4 font-mono text-xs">
        {/* High-level Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#f7f7f5] border border-[#d4d4d0]">
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Pipeline Status</span>
            <div className="mt-1"><StatusBadge status={lead.status} size="sm" /></div>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Website Score</span>
            <div className="mt-1"><ScoreBadge score={lead.websiteScore} type="website" /></div>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Opportunity Score</span>
            <div className="mt-1"><ScoreBadge score={lead.opportunityScore} type="opportunity" /></div>
          </div>
          <div>
            <span className="text-[10px] text-[#666666] block uppercase">Est. Deal Value</span>
            <span className="text-sm font-bold text-[#166534] block mt-0.5">{lead.estimatedDealValue}</span>
          </div>
        </div>

        {/* Autonomous Action Dispatches */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 bg-[#0f172a] border border-[#3b82f6]/40 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-bold text-[#f8fafc] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#1a365d]" />
                Technical & UX Audit
              </span>
              <p className="text-[11px] text-[#94a3b8] font-sans mt-0.5">
                Dispatch Website Analyst to inspect response time, mobile viewport, and conversion friction.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateAuditTask}
              loading={creatingAudit}
              icon={<Sparkles size={12} />}
            >
              Audit Website
            </Button>
          </div>

          <div className="p-3 bg-[#f8fafc]/40 border border-[#8b5cf6]/40 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-bold text-[#f8fafc] flex items-center gap-1.5">
                <Code2 size={13} className="text-[#a78bfa]" />
                Redesign Concept
              </span>
              <p className="text-[11px] text-[#c4b5fd]/80 font-sans mt-0.5">
                Dispatch Developer Agent to scaffold a personalized Next.js concept.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreateMockupTask}
              loading={creatingMockup}
              icon={<Code2 size={12} />}
            >
              Create Concept
            </Button>
          </div>

          <div className="p-3 bg-[#ecfdf5]/30 border border-[#10b981]/40 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-bold text-[#f8fafc] flex items-center gap-1.5">
                <Mail size={13} className="text-[#047857]" />
                Sales Outreach Draft
              </span>
              <p className="text-[11px] text-[#a7f3d0]/80 font-sans mt-0.5">
                Dispatch Sales Agent to formulate a respectful email with preview link.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrepareOutreach}
              loading={preparingOutreach}
              icon={<Mail size={12} />}
            >
              Prepare Outreach
            </Button>
          </div>
        </div>

        {taskCreatedMessage && (
          <div className="p-2.5 bg-[#f0fdf4] border border-[#166534] text-[#166534] flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{taskCreatedMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239]">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Contact & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 bg-[#fafafa] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase flex items-center gap-1">
              <Globe size={11} /> Website
            </span>
            <a
              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a365d] font-bold block mt-1 truncate hover:underline"
            >
              {lead.website}
            </a>
          </div>

          <div className="p-3 bg-[#fafafa] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase flex items-center gap-1">
              <Mail size={11} /> Contact Decision Maker
            </span>
            <span className="text-[#111111] font-bold block mt-1 truncate">
              {lead.contactEmail || "In Discovery"}
            </span>
          </div>

          <div className="p-3 bg-[#fafafa] border border-[#d4d4d0]">
            <span className="text-[10px] text-[#666666] block uppercase flex items-center gap-1">
              <MapPin size={11} /> HQ Location
            </span>
            <span className="text-[#111111] font-bold block mt-1 truncate">
              {lead.location || "Philippines"}
            </span>
          </div>
        </div>

        {/* Detected Technical Audit Issues */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase text-[#555555] flex items-center gap-1.5">
            <AlertCircle size={13} className="text-[#f59e0b]" />
            Audit Notes & Technical Observations
          </span>

          <div className="space-y-1.5">
            {lead.detectedIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-white border border-[#d4d4d0] text-[#9f1239] flex items-start gap-2"
              >
                <span className="text-[#ef4444] font-bold">!</span>
                <span className="text-xs text-[#111111] font-sans">{issue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Detected */}
        {lead.techStack && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-[#555555] flex items-center gap-1.5">
              <Layers size={13} className="text-[#1a365d]" />
              Detected Legacy Technology Stack
            </span>
            <div className="flex flex-wrap gap-1.5">
              {lead.techStack.map((tech, i) => (
                <span key={i} className="px-2 py-1 bg-[#f7f7f5] border border-[#d4d4d0] text-xs text-[#333333]">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Phase 11 & 12: Inbound Reply Intelligence & Conversation Viewer */}
        <LeadConversationSection leadId={lead.id} leadStatus={lead.status as string} />

        {/* Phase 13: Opportunity & Deal Intelligence */}
        <LeadOpportunitySection leadId={lead.id} />
      </div>
    </Modal>
  );
};

function LeadConversationSection({ leadId, leadStatus }: { leadId: string; leadStatus: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [replySends, setReplySends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [requestingReplySend, setRequestingReplySend] = useState(false);
  const [approvingReplySend, setApprovingReplySend] = useState(false);
  const [replySendError, setReplySendError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/inbox/list");
      const data = await res.json();
      if (data.ok) {
        setMessages((data.messages || []).filter((m: any) => m.leadId === leadId));
        setAnalyses((data.analyses || []).filter((a: any) => a.leadId === leadId));
        setDrafts((data.drafts || []).filter((d: any) => d.leadId === leadId));
      }

      const rRes = await fetch("/api/inbox/reply/list");
      const rData = await rRes.json();
      if (rData.ok) {
        setReplySends((rData.replySends || []).filter((s: any) => s.leadId === leadId));
      }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
  }, [leadId]);

  const handleApproveResponse = async (draftId: string, action: "approve" | "reject") => {
    setApproving(true);
    try {
      await fetch("/api/inbox/response/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId: draftId, action }),
      });
      await fetchData();
    } catch {}
    setApproving(false);
  };

  const handleRequestReplySend = async (draftId: string) => {
    setRequestingReplySend(true);
    setReplySendError(null);
    try {
      const res = await fetch("/api/inbox/reply/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseDraftId: draftId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to request reply send.");
      await fetchData();
    } catch (err: any) {
      setReplySendError(err.message || "Failed to request reply send.");
    } finally {
      setRequestingReplySend(false);
    }
  };

  const handleApproveReplySend = async (replySendId: string, action: "approve" | "reject") => {
    setApprovingReplySend(true);
    setReplySendError(null);
    try {
      const res = await fetch("/api/inbox/reply/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replySendId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to dispatch reply.");
      await fetchData();
    } catch (err: any) {
      setReplySendError(err.message || "Failed to dispatch reply.");
    } finally {
      setApprovingReplySend(false);
    }
  };

  const isSuppressed = leadStatus === "do_not_contact";

  return (
    <div className="space-y-3 pt-2 border-t border-[#d4d4d0]">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#111111] uppercase text-xs flex items-center gap-1.5">
          <Mail size={13} className="text-[#1a365d]" />
          Conversation History & Inbound Intelligence
        </span>
        {isSuppressed && (
          <span className="px-2 py-0.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase">
            🛑 DO NOT CONTACT (SUPPRESSED)
          </span>
        )}
      </div>

      {isSuppressed && (
        <div className="p-3 bg-[#fef2f2] border border-[#7f1d1d] text-[#fecaca] text-xs space-y-1">
          <strong className="block text-[#9f1239]">🛑 HARD SAFETY SUPPRESSION ACTIVE:</strong>
          <p className="font-sans text-[11px]">
            This prospect requested to unsubscribe or be removed from communications. All future outbound sending to this lead is permanently blocked by engine safety enforcement.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-[11px] text-[#666666] italic">Loading conversation data...</div>
      ) : messages.length === 0 ? (
        <div className="p-3 bg-[#121215] border border-[#d4d4d0] text-[11px] text-[#666666] font-sans">
          No inbound replies detected yet for this prospect. Click <strong>[Check Replies (Gmail)]</strong> on the Leads dashboard to synchronize.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const analysis = analyses.find((a) => a.emailMessageId === msg.id);
            const draft = drafts.find((d) => d.replyAnalysisId === analysis?.id);

            return (
              <div key={idx} className="space-y-2 p-3 bg-[#0f172a]/50 border border-[#3b82f6]/30">
                {/* Message Header */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={`px-1.5 py-0.5 font-bold uppercase ${msg.direction === "inbound" ? "bg-[#065f46] text-[#6ee7b7]" : "bg-[#1e293b] text-[#94a3b8]"}`}>
                    {msg.direction.toUpperCase()}: {msg.sender}
                  </span>
                  <span className="text-[#64748b]">
                    {new Date(msg.receivedAt || msg.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Message Subject & Body */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#f8fafc]">{msg.subject}</div>
                  <pre className="p-2.5 bg-[#0b1120] border border-[#1e293b] text-xs text-[#cbd5e1] whitespace-pre-wrap font-sans leading-relaxed">
                    {msg.bodyText}
                  </pre>
                  {msg.hasAttachments && (
                    <div className="text-[10px] text-[#f59e0b] bg-[#fffbeb] p-1.5 border border-[#78350f]">
                      ⚠️ Attachment present — manual review required. (Attachments are not automatically parsed).
                    </div>
                  )}
                </div>

                {/* Reply Intelligence Analysis */}
                {analysis && (
                  <div className="p-2.5 bg-[#181b2e] border border-[#6366f1]/40 space-y-1.5 text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#c7d2fe] flex items-center gap-1">
                        <Sparkles size={12} className="text-[#1e3a5f]" />
                        Sales Agent Intent Classification:
                      </span>
                      <span className="px-2 py-0.5 bg-[#312e81] text-[#e0e7ff] text-[10px] font-bold font-mono uppercase">
                        {analysis.classification} ({(analysis.confidence * 100).toFixed(0)}% Conf)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#c4b5fd]">{analysis.summary}</p>
                    {analysis.questions?.length > 0 && (
                      <div className="text-[10px] text-[#e0e7ff]">
                        <strong>Questions Detected:</strong> {analysis.questions.join("; ")}
                      </div>
                    )}
                    <div className="text-[10px] text-[#1e3a5f]">
                      <strong>Suggested Next Step:</strong> {analysis.suggestedNextStep}
                    </div>
                  </div>
                )}

                {/* Suggested Response Draft */}
                {draft && (
                  <div className="p-2.5 bg-[#ecfdf5]/60 border border-[#10b981]/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#6ee7b7] text-xs">
                        Suggested Response Draft ({draft.status.toUpperCase()} FOR FUTURE SENDING)
                      </span>
                      <div className="flex gap-1.5">
                        {draft.status === "waiting_approval" && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApproveResponse(draft.id, "approve")}
                              loading={approving}
                            >
                              Approve Response
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleApproveResponse(draft.id, "reject")}
                              loading={approving}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {draft.status === "approved" && (
                          <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] text-[10px] font-bold">
                            ✓ APPROVED (UNSENT)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#f8fafc] font-bold">{draft.subject}</div>
                    <pre className="p-2 bg-[#0d281e] border border-[#134e3a] text-xs text-[#d1fae5] whitespace-pre-wrap font-sans leading-relaxed">
                      {draft.body}
                    </pre>

                    {/* Phase 12: Controlled Thread Reply Dispatch Gate */}
                    {draft.status === "approved" && (
                      <div className="p-2.5 bg-[#0a1e16] border border-[#059669] space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#6ee7b7] text-xs flex items-center gap-1">
                            <Mail size={12} className="text-[#047857]" />
                            Phase 12: Thread Reply Dispatch (Gmail)
                          </span>
                          {replySends.find((s) => s.responseDraftId === draft.id && s.status === "sent") ? (
                            <span className="px-2 py-0.5 bg-[#065f46] text-[#6ee7b7] text-[10px] font-bold">
                              ✓ REPLY SENT IN THREAD
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#a7f3d0]">Same-Thread Delivery</span>
                          )}
                        </div>

                        {(() => {
                          const activeReplySend = replySends.find((s) => s.responseDraftId === draft.id);

                          if (!activeReplySend) {
                            return (
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-[#a7f3d0]">
                                  Recipient: <strong>{msg.sender}</strong>
                                </span>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleRequestReplySend(draft.id)}
                                  loading={requestingReplySend}
                                  icon={<Mail size={12} />}
                                >
                                  Request Reply Send Authorization
                                </Button>
                              </div>
                            );
                          }

                          if (activeReplySend.status === "pending_approval") {
                            return (
                              <div className="p-2.5 bg-[#f8fafc]/70 border border-[#6366f1] space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#c7d2fe] text-xs">
                                    Send Authorization Required ({activeReplySend.id})
                                  </span>
                                  <span className="text-[10px] bg-[#dc2626] text-white px-2 py-0.5 font-bold">
                                    HIGH RISK: LIVE THREAD REPLY
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#e0e7ff]">
                                  Replying in same Gmail thread to: <strong>{activeReplySend.recipient}</strong>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleApproveReplySend(activeReplySend.id, "reject")}
                                    loading={approvingReplySend}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleApproveReplySend(activeReplySend.id, "approve")}
                                    loading={approvingReplySend}
                                  >
                                    Approve & Send Reply (Gmail)
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          if (activeReplySend.status === "sent") {
                            return (
                              <div className="p-2 bg-[#f0fdf4] border border-[#166534] text-[#166534] text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong>✓ Reply Dispatched in Existing Conversation Thread!</strong>
                                  <span className="text-[10px] font-mono text-[#86efac]">
                                    Message ID: {activeReplySend.providerMessageId || "Confirmed"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#bbf7d0]">
                                  Sent to <strong>{activeReplySend.recipient}</strong> on {new Date(activeReplySend.sentAt || Date.now()).toLocaleString()}.
                                </p>
                              </div>
                            );
                          }

                          return null;
                        })()}

                        {replySendError && (
                          <div className="p-2 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239] text-xs">
                            {replySendError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadOpportunitySection({ leadId }: { leadId: string }) {
  const [opp, setOpp] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const fetchOppData = async () => {
    try {
      const oppRes = await fetch("/api/opportunities/list");
      const oppData = await oppRes.json();
      if (oppData.ok) {
        const found = (oppData.opportunities || []).find((o: any) => o.leadId === leadId);
        setOpp(found || null);
      }

      const anRes = await fetch("/api/opportunities/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const anData = await anRes.json();
      if (anData.ok) {
        setAnalysis(anData.analysis);
      }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchOppData();
  }, [leadId]);

  const handleCreateOpportunity = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/opportunities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.ok) {
        setOpp(data.opportunity);
      }
    } catch {}
    setCreating(false);
  };

  const handleStageChange = async (newStage: string) => {
    if (!opp) return;
    setUpdatingStage(true);
    try {
      const res = await fetch("/api/opportunities/update-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id, stage: newStage }),
      });
      const data = await res.json();
      if (data.ok) {
        setOpp(data.opportunity);
      }
    } catch {}
    setUpdatingStage(false);
  };

  if (loading) return null;
  if (!analysis?.opportunityRecommended && !opp) return null;

  const currentData = opp || analysis;
  const readiness = currentData.proposalReadiness || 0;

  return (
    <div className="space-y-3 pt-3 border-t border-[#d4d4d0]">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#111111] uppercase text-xs flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#eab308]" />
          Phase 13: Deal & Opportunity Management
        </span>
        {opp ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#555555] uppercase font-mono">Stage:</span>
            <select
              value={opp.stage}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={updatingStage}
              className="px-2 py-0.5 bg-[#f7f7f5] border border-[#c8c8c2] text-[#111111] text-xs font-bold font-mono uppercase"
            >
              <option value="new">NEW</option>
              <option value="discovery">DISCOVERY</option>
              <option value="qualified">QUALIFIED</option>
              <option value="proposal_ready">PROPOSAL READY</option>
              <option value="proposal_sent">PROPOSAL SENT</option>
              <option value="negotiation">NEGOTIATION</option>
              <option value="won">CLOSED WON</option>
              <option value="lost">CLOSED LOST</option>
            </select>
          </div>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={handleCreateOpportunity}
            loading={creating}
            icon={<Sparkles size={12} />}
          >
            Create Opportunity / Deal
          </Button>
        )}
      </div>

      <div className="p-3 bg-[#13141f] border border-[#4338ca]/40 space-y-3">
        {/* Title & Proposal Readiness */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#e0e7ff]">{currentData.title}</span>
            <span className="font-mono font-bold text-[#92400e] text-[11px]">
              {readiness}% Proposal Ready
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#f8fafc] rounded-full overflow-hidden">
            <div
              className={`h-full ${readiness >= 75 ? "bg-[#10b981]" : readiness >= 50 ? "bg-[#f59e0b]" : "bg-[#6366f1]"}`}
              style={{ width: `${readiness}%` }}
            />
          </div>
          <p className="text-[11px] text-[#cbd5e1] font-sans leading-relaxed">{currentData.summary}</p>
        </div>

        {/* Commercial Signals Badges */}
        {currentData.commercialSignals && currentData.commercialSignals.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#1e3a5f] font-bold uppercase block">Commercial Signals:</span>
            <div className="flex flex-wrap gap-1.5">
              {currentData.commercialSignals.map((sig: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-[#312e81] border border-[#4338ca] text-[10px] text-[#e0e7ff] font-mono">
                  #{sig}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Client Requested Scope (Grounded Provenance) */}
        {((currentData.requestedScope && currentData.requestedScope.length > 0) ||
          (currentData.requiredFeatures && currentData.requiredFeatures.length > 0)) && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#1e3a5f] font-bold uppercase block">
              Grounded Client Requirements & Scope:
            </span>
            <div className="space-y-1">
              {[...(currentData.requestedScope || []), ...(currentData.requiredFeatures || [])].map((req: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-1.5 border text-[11px] flex items-center justify-between ${
                    req.status === "superseded"
                      ? "bg-[#eceae4]/40 border-[#c8c8c2] text-[#666666] line-through"
                      : "bg-[#0b0f19] border-[#1e293b] text-[#e2e8f0]"
                  }`}
                >
                  <span>
                    ✓ {req.requirement} {req.category && <span className="text-[#94a3b8] font-mono text-[9px]">({req.category})</span>}
                  </span>
                  <span className="text-[9px] font-mono text-[#64748b]">
                    {req.status === "superseded"
                      ? `Superseded: ${req.supersededReason || "Client Retracted"}`
                      : req.sourceMessageId ? `Source: ${req.sourceMessageId} ("${req.sourceQuote}")` : "Inferred"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qualification Matrix Grid */}
        {currentData.qualification && (
          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-[9px]">
            <div className="p-1 bg-[#f8fafc]/60 border border-[#3730a3]">
              <span className="text-[#1e3a5f] block">NEED</span>
              <strong className="text-[#1a365d] uppercase">{currentData.qualification.need}</strong>
            </div>
            <div className="p-1 bg-[#f8fafc]/60 border border-[#3730a3]">
              <span className="text-[#1e3a5f] block">AUTHORITY</span>
              <strong className="text-[#1a365d] uppercase">{currentData.qualification.authority}</strong>
            </div>
            <div className="p-1 bg-[#f8fafc]/60 border border-[#3730a3]">
              <span className="text-[#1e3a5f] block">BUDGET</span>
              <strong className="text-[#1a365d] uppercase">{currentData.qualification.budget}</strong>
            </div>
            <div className="p-1 bg-[#f8fafc]/60 border border-[#3730a3]">
              <span className="text-[#1e3a5f] block">TIMELINE</span>
              <strong className="text-[#1a365d] uppercase">{currentData.qualification.timeline}</strong>
            </div>
            <div className="p-1 bg-[#f8fafc]/60 border border-[#3730a3]">
              <span className="text-[#1e3a5f] block">ENGAGEMENT</span>
              <strong className="text-[#1a365d] uppercase">{currentData.qualification.engagement}</strong>
            </div>
          </div>
        )}

        {/* Next Recommended Action */}
        <div className="p-2 bg-[#042f2e] border border-[#0d9488] text-xs flex items-center justify-between">
          <span className="text-[#5eead4]">
            <strong>Recommended Next Action:</strong> <span className="font-mono">{currentData.nextRecommendedAction}</span>
          </span>
          <span className="text-[10px] text-[#99f6e4] italic">Operator action required</span>
        </div>

        {/* Phase 14: Human-Controlled Proposal Builder */}
        {opp && <LeadProposalBuilderSection opportunity={opp} leadId={leadId} />}
      </div>
    </div>
  );
}

function LeadProposalBuilderSection({ opportunity, leadId }: { opportunity: any; leadId: string }) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [approvingDoc, setApprovingDoc] = useState(false);
  const [requestingDelivery, setRequestingDelivery] = useState(false);
  const [approvingDelivery, setApprovingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Operator Pricing & Timeline Form
  const [currency, setCurrency] = useState("PHP");
  const [basePrice, setBasePrice] = useState<number>(85000);
  const [paymentTerms, setPaymentTerms] = useState("50% upfront / 50% upon completion");
  const [estimatedDuration, setEstimatedDuration] = useState("4-6 weeks");

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/proposals/list");
      const data = await res.json();
      if (data.ok) {
        setProposals((data.proposals || []).filter((p: any) => p.opportunityId === opportunity.id));
      }

      const docRes = await fetch("/api/proposals/document/list");
      const docData = await docRes.json();
      if (docData.ok) {
        setDocuments((docData.documents || []).filter((d: any) => d.opportunityId === opportunity.id));
      }

      const delRes = await fetch("/api/proposals/delivery/list");
      const delData = await delRes.json();
      if (delData.ok) {
        setDeliveries((delData.deliveries || []).filter((d: any) => d.opportunityId === opportunity.id));
      }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchProposals();
  }, [opportunity.id]);

  const handleGenerateProposal = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          operatorPricing: {
            currency,
            basePrice: Number(basePrice),
            paymentTerms,
          },
          operatorTimeline: {
            estimatedDuration,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchProposals();
        setShowBuilder(false);
      }
    } catch {}
    setGenerating(false);
  };

  const handleApproveProposal = async (proposalId: string, action: "approve" | "reject") => {
    setApproving(true);
    try {
      await fetch("/api/proposals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action }),
      });
      await fetchProposals();
    } catch {}
    setApproving(false);
  };

  const handleGenerateDocument = async (proposalId: string) => {
    setGeneratingDoc(true);
    try {
      const res = await fetch("/api/proposals/document/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchProposals();
      }
    } catch {}
    setGeneratingDoc(false);
  };

  const handleApproveDocument = async (documentId: string, action: "approve" | "reject") => {
    setApprovingDoc(true);
    try {
      await fetch("/api/proposals/document/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action }),
      });
      await fetchProposals();
    } catch {}
    setApprovingDoc(false);
  };

  const handleRequestDelivery = async (documentId: string) => {
    setRequestingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch("/api/proposals/delivery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to request proposal delivery.");
      await fetchProposals();
    } catch (err: any) {
      setDeliveryError(err.message || "Failed to request delivery.");
    } finally {
      setRequestingDelivery(false);
    }
  };

  const handleApproveDelivery = async (deliveryId: string, action: "approve" | "reject") => {
    setApprovingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch("/api/proposals/delivery/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to deliver proposal.");
      await fetchProposals();
    } catch (err: any) {
      setDeliveryError(err.message || "Failed to deliver proposal.");
    } finally {
      setApprovingDelivery(false);
    }
  };

  const latestProposal = proposals[0];
  const latestDoc = documents[0];
  const latestDelivery = deliveries[0];

  return (
    <div className="space-y-3 pt-3 border-t border-[#3730a3]/50">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#111111] uppercase text-xs flex items-center gap-1.5">
          <FileText size={13} className="text-[#1a365d]" />
          Phase 14 & 15: Proposal Document & Delivery
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowBuilder(!showBuilder)}
          icon={<FileText size={12} />}
        >
          {showBuilder ? "Close Builder" : latestProposal ? "Revise Proposal (v" + (latestProposal.version + 1) + ")" : "Prepare Proposal Draft"}
        </Button>
      </div>

      {/* Operator Pricing & Timeline Configuration Form */}
      {showBuilder && (
        <div className="p-3 bg-[#0a0f1d] border border-[#3b82f6]/40 space-y-3 text-xs">
          <div className="font-bold text-[#93c5fd]">Operator Pricing & Timeline Assumptions (Required for Commercial Scope):</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs font-mono"
              >
                <option value="PHP">PHP (Philippine Peso)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Base Investment Amount</label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs font-mono"
                placeholder="e.g. 85000"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Estimated Delivery Duration</label>
              <input
                type="text"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
                placeholder="e.g. 4-6 weeks"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Payment Structure</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
                placeholder="e.g. 50% upfront / 50% upon completion"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleGenerateProposal}
              loading={generating}
            >
              Generate Grounded Proposal Draft
            </Button>
          </div>
        </div>
      )}

      {/* Latest Proposal Viewer Card */}
      {latestProposal && (
        <div className="p-3 bg-[#0d1527] border border-[#1e40af]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#1e3a8a] text-[#93c5fd] text-[10px] font-mono font-bold">
                VERSION {latestProposal.version} ({latestProposal.id})
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                latestProposal.status === "approved"
                  ? "bg-[#065f46] text-[#6ee7b7]"
                  : latestProposal.status === "waiting_approval"
                  ? "bg-[#854d0e] text-[#fef08a]"
                  : "bg-[#374151] text-[#d1d5db]"
              }`}>
                {latestProposal.status.toUpperCase()}
              </span>
            </div>

            <div className="flex gap-1.5">
              {latestProposal.status === "waiting_approval" && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleApproveProposal(latestProposal.id, "reject")}
                    loading={approving}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApproveProposal(latestProposal.id, "approve")}
                    loading={approving}
                  >
                    Approve Proposal
                  </Button>
                </>
              )}
              {latestProposal.status === "approved" && !latestDoc && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleGenerateDocument(latestProposal.id)}
                  loading={generatingDoc}
                  icon={<FileText size={12} />}
                >
                  Generate Proposal Document (PDF)
                </Button>
              )}
            </div>
          </div>

          <div className="text-xs font-bold text-[#f8fafc]">{latestProposal.title}</div>
          <p className="text-[11px] text-[#cbd5e1] font-sans leading-relaxed">{latestProposal.executiveSummary}</p>

          {/* Investment & Timeline Summary */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-[#08101e] border border-[#172554] text-xs">
            <div>
              <span className="text-[10px] text-[#1a365d] block uppercase font-mono">Investment & Terms:</span>
              <strong className="text-[#f8fafc] block font-mono">
                {latestProposal.pricing?.hasPrice
                  ? `${latestProposal.pricing.currency} ${Number(latestProposal.pricing.basePrice).toLocaleString()}`
                  : "Operator pricing required."}
              </strong>
              <span className="text-[10px] text-[#94a3b8]">{latestProposal.pricing?.paymentTerms}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#1a365d] block uppercase font-mono">Estimated Duration:</span>
              <strong className="text-[#f8fafc] block">{latestProposal.timeline?.estimatedDuration}</strong>
              <span className="text-[10px] text-[#94a3b8]">{latestProposal.timeline?.startAssumption}</span>
            </div>
          </div>

          {/* Scope Items Count & Exclusions */}
          <div className="text-[10px] text-[#94a3b8] space-y-1">
            <div>
              <strong className="text-[#e2e8f0]">Included Committed Scope ({latestProposal.scopeItems?.length || 0} items):</strong>{" "}
              {latestProposal.scopeItems?.map((s: any) => s.name).join(", ")}
            </div>
            {latestProposal.exclusions?.length > 0 && (
              <div>
                <strong className="text-[#9f1239]">Out of Scope / Exclusions:</strong> {latestProposal.exclusions.join("; ")}
              </div>
            )}
          </div>

          {/* Phase 15: Proposal Document Snapshot & Delivery Gate */}
          {latestDoc && (
            <div className="p-3 bg-[#0a1e16] border border-[#059669] space-y-2 mt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#6ee7b7] flex items-center gap-1">
                  <FileText size={12} className="text-[#047857]" />
                  Document Snapshot ({latestDoc.id} v{latestDoc.documentVersion})
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                  latestDoc.status === "approved" ? "bg-[#065f46] text-[#6ee7b7]" : "bg-[#854d0e] text-[#fef08a]"
                }`}>
                  {latestDoc.status.toUpperCase()}
                </span>
              </div>

              <div className="text-[10px] text-[#a7f3d0] font-mono">
                SHA-256 Hash: {latestDoc.contentHash.substring(0, 16)}... (Immutable PDF Snapshot)
              </div>

              <div className="flex items-center justify-between pt-1">
                {latestDoc.status === "waiting_approval" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApproveDocument(latestDoc.id, "approve")}
                    loading={approvingDoc}
                  >
                    Approve Document (For Delivery)
                  </Button>
                )}

                {latestDoc.status === "approved" && !latestDelivery && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRequestDelivery(latestDoc.id)}
                    loading={requestingDelivery}
                    icon={<Mail size={12} />}
                  >
                    Request Proposal Delivery
                  </Button>
                )}
              </div>

              {/* Delivery Authorization Card */}
              {latestDelivery && (
                <div className="p-2.5 bg-[#f8fafc]/80 border border-[#6366f1] space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#c7d2fe] text-xs">
                      Delivery Gate ({latestDelivery.id})
                    </span>
                    <span className="text-[10px] bg-[#dc2626] text-white px-2 py-0.5 font-bold uppercase">
                      HIGH RISK: EXTERNAL PROPOSAL DELIVERY
                    </span>
                  </div>

                  <div className="text-[10px] text-[#e0e7ff] space-y-0.5">
                    <div>Recipient: <strong>{latestDelivery.recipient}</strong></div>
                    <div>Subject: <strong>{latestDelivery.subject}</strong></div>
                    <div>Attachment: <strong className="text-[#1a365d]">Exact Approved Proposal PDF</strong></div>
                  </div>

                  {latestDelivery.status === "pending_approval" && (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleApproveDelivery(latestDelivery.id, "reject")}
                        loading={approvingDelivery}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveDelivery(latestDelivery.id, "approve")}
                        loading={approvingDelivery}
                      >
                        Approve & Send Proposal (Gmail)
                      </Button>
                    </div>
                  )}

                  {latestDelivery.status === "sent" && (
                    <div className="p-2 bg-[#f0fdf4] border border-[#166534] text-[#166534] text-xs space-y-0.5">
                      <strong>✓ Proposal PDF Delivered via Gmail in Conversation Thread!</strong>
                      <div className="text-[10px] font-mono text-[#86efac]">
                        Message ID: {latestDelivery.providerMessageId}
                      </div>
                      <div className="text-[10px] text-[#bbf7d0]">
                        Opportunity updated to <strong>PROPOSAL_SENT</strong>.
                      </div>
                    </div>
                  )}

                  {deliveryError && (
                    <div className="p-2 bg-[#fef2f2] border border-[#7f1d1d] text-[#9f1239] text-xs">
                      {deliveryError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase 16: Proposal Response Tracking & Negotiation Workspace */}
          <LeadNegotiationWorkspaceSection opportunityId={opportunity.id} />
        </div>
      )}
    </div>
  );
}

function LeadNegotiationWorkspaceSection({ opportunityId }: { opportunityId: string }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simText, setSimText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/negotiations/get?opportunityId=${opportunityId}`);
      const data = await res.json();
      if (data.ok && data.session) {
        setSession(data.session);
      }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchSession();
  }, [opportunityId]);

  const handleSimulateInbound = async () => {
    if (!simText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/negotiations/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, text: simText }),
      });
      const data = await res.json();
      if (data.ok) {
        setSession(data.session);
        setSimText("");
      }
    } catch {}
    setAnalyzing(false);
  };

  const handleDecision = async (changeId: string, decision: "accepted" | "rejected") => {
    if (!session) return;
    setDeciding(true);
    try {
      const res = await fetch("/api/negotiations/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, changeId, decision }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchSession();
      }
    } catch {}
    setDeciding(false);
  };

  const latestEvent = session?.events?.[0];

  return (
    <div className="p-3 bg-[#111827] border border-[#4f46e5]/60 space-y-3 mt-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#e0e7ff] uppercase flex items-center gap-1.5 text-xs">
          <Sparkles size={13} className="text-[#818cf8]" />
          Phase 16: Proposal Response & Negotiation Workspace
        </span>
        {session && (
          <span className="px-2 py-0.5 bg-[#312e81] text-[#c7d2fe] text-[10px] font-mono font-bold uppercase">
            STATUS: {session.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Simulator / Inbound Test Area */}
      <div className="p-2.5 bg-[#0b0f19] border border-[#1f2937] space-y-2">
        <label className="text-[10px] text-[#9ca3af] block uppercase font-mono">
          Analyze Inbound Prospect Proposal Feedback:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            placeholder="e.g. Can we remove the CMS and do PHP 80,000?"
            className="flex-1 p-1.5 bg-[#1f2937] border border-[#374151] text-white text-xs"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleSimulateInbound}
            loading={analyzing}
          >
            Analyze Feedback
          </Button>
        </div>
      </div>

      {/* Latest Analysis & Objections */}
      {latestEvent && (
        <div className="p-2.5 bg-[#0f172a] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1a365d] font-mono uppercase">
              Event: {latestEvent.eventType.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-[#64748b] font-mono">
              {new Date(latestEvent.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="text-[11px] text-[#e2e8f0]">{latestEvent.summary}</div>

          {/* Requested Changes with Decision Buttons */}
          {latestEvent.requestedChanges && latestEvent.requestedChanges.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-[#1e3a5f] uppercase font-bold block">
                Requested Scope & Commercial Changes:
              </span>
              {latestEvent.requestedChanges.map((chg: any, i: number) => (
                <div
                  key={i}
                  className="p-2 bg-[#f8fafc]/60 border border-[#3730a3] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#e0e7ff]">{chg.target}</span>
                    <span className="text-[10px] text-[#94a3b8] block">
                      Source: "{chg.sourceQuote}" • Action: {chg.action || chg.type}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {chg.status === "pending_operator_decision" ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDecision(chg.id || chg.target, "rejected")}
                          loading={deciding}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleDecision(chg.id || chg.target, "accepted")}
                          loading={deciding}
                        >
                          Accept
                        </Button>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                        chg.status === "accepted" ? "bg-[#065f46] text-[#6ee7b7]" : "bg-[#7f1d1d] text-[#9f1239]"
                      }`}>
                        {chg.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Commercial Signals Badges */}
          {latestEvent.commercialSignals && latestEvent.commercialSignals.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {latestEvent.commercialSignals.map((s: string, idx: number) => (
                <span key={idx} className="px-1.5 py-0.5 bg-[#1e293b] text-[#94a3b8] text-[9px] font-mono">
                  #{s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 17: Human-Controlled Agreement Drafting */}
      <LeadAgreementSection opportunityId={opportunityId} />
    </div>
  );
}

function LeadAgreementSection({ opportunityId }: { opportunityId: string }) {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showBaselineForm, setShowBaselineForm] = useState(false);

  // Baseline Form State
  const [proposalVersion, setProposalVersion] = useState(2);
  const [price, setPrice] = useState(88000);
  const [currency, setCurrency] = useState("PHP");
  const [paymentTerms, setPaymentTerms] = useState("50% upfront / 50% upon completion");
  const [timelineDuration, setTimelineDuration] = useState("4-5 weeks");
  const [includedScope, setIncludedScope] = useState("Homepage Layout, Service Catalog Pages, Interactive Contact Form");
  const [excludedScope, setExcludedScope] = useState("Content Management System (CMS), Online Booking");

  const fetchAgreements = async () => {
    try {
      const res = await fetch(`/api/agreements/get?opportunityId=${opportunityId}`);
      const data = await res.json();
      if (data.ok && data.agreements) {
        setAgreements(data.agreements);
      }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchAgreements();
  }, [opportunityId]);

  const handleDraftAgreement = async () => {
    setDrafting(true);
    try {
      // Find active proposal ID
      const propRes = await fetch("/api/proposals/list");
      const propData = await propRes.json();
      const oppProps = (propData.proposals || []).filter((p: any) => p.opportunityId === opportunityId);
      const targetProp = oppProps.find((p: any) => p.version === Number(proposalVersion)) || oppProps[0];

      const res = await fetch("/api/agreements/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          baselineInput: {
            proposalId: targetProp?.id || "PROP-DEFAULT",
            proposalVersion: Number(proposalVersion),
            currency,
            price: Number(price),
            paymentTerms,
            timelineDuration,
            includedScope: includedScope.split(",").map((s) => s.trim()).filter(Boolean),
            excludedScope: excludedScope.split(",").map((s) => s.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchAgreements();
        setShowBaselineForm(false);
      }
    } catch {}
    setDrafting(false);
  };

  const handleApproveAgreement = async (agreementId: string, action: "approve" | "reject") => {
    setApproving(true);
    try {
      await fetch("/api/agreements/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreementId, action }),
      });
      await fetchAgreements();
    } catch {}
    setApproving(false);
  };

  const latestAgreement = agreements[0];

  return (
    <div className="p-3 bg-[#0d1527] border border-[#2563eb]/60 space-y-3 mt-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#e0e7ff] uppercase flex items-center gap-1.5 text-xs">
          <FileText size={13} className="text-[#1a365d]" />
          Phase 17: Human-Controlled Agreement Drafting
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowBaselineForm(!showBaselineForm)}
          icon={<FileText size={12} />}
        >
          {showBaselineForm ? "Close Form" : latestAgreement ? `Revise Agreement (v${latestAgreement.version + 1})` : "Prepare Agreement Draft"}
        </Button>
      </div>

      {/* Commercial Baseline Lock Form */}
      {showBaselineForm && (
        <div className="p-3 bg-[#08101e] border border-[#3b82f6]/40 space-y-3 text-xs">
          <div className="font-bold text-[#93c5fd]">
            Confirm Locked Commercial Baseline (Operator-Approved Terms):
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Agreed Proposal Version</label>
              <input
                type="number"
                value={proposalVersion}
                onChange={(e) => setProposalVersion(Number(e.target.value))}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Final Investment ({currency})</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Agreed Delivery Timeline</label>
              <input
                type="text"
                value={timelineDuration}
                onChange={(e) => setTimelineDuration(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase block">Payment Structure</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#94a3b8] uppercase block">Included Scope (Comma-separated)</label>
              <input
                type="text"
                value={includedScope}
                onChange={(e) => setIncludedScope(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#94a3b8] uppercase block">Excluded Scope (Comma-separated)</label>
              <input
                type="text"
                value={excludedScope}
                onChange={(e) => setExcludedScope(e.target.value)}
                className="w-full p-1.5 bg-[#1e293b] border border-[#334155] text-white text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleDraftAgreement}
              loading={drafting}
            >
              Lock Baseline & Generate Agreement Draft
            </Button>
          </div>
        </div>
      )}

      {/* Latest Agreement Snapshot */}
      {latestAgreement && (
        <div className="p-3 bg-[#0a101d] border border-[#1d4ed8] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#1e3a8a] text-[#93c5fd] text-[10px] font-mono font-bold">
                AGREEMENT v{latestAgreement.version} ({latestAgreement.id})
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                latestAgreement.status === "approved_for_delivery"
                  ? "bg-[#065f46] text-[#6ee7b7]"
                  : latestAgreement.status === "waiting_operator_review"
                  ? "bg-[#854d0e] text-[#fef08a]"
                  : "bg-[#374151] text-[#d1d5db]"
              }`}>
                {latestAgreement.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            <div className="flex gap-1.5">
              {latestAgreement.status === "waiting_operator_review" && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleApproveAgreement(latestAgreement.id, "reject")}
                    loading={approving}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApproveAgreement(latestAgreement.id, "approve")}
                    loading={approving}
                  >
                    Approve for Delivery
                  </Button>
                </>
              )}
              {latestAgreement.status === "approved_for_delivery" && (
                <span className="text-[10px] text-[#166534] font-bold">
                  ✓ APPROVED FOR DELIVERY (UNSENT)
                </span>
              )}
            </div>
          </div>

          <div className="p-2 bg-[#fffbeb] border border-[#9a3412] text-[#fde047] text-[10px] font-mono">
            ⚠️ Draft agreement — requires operator/legal review before delivery.
          </div>

          <div className="text-xs font-bold text-[#f8fafc]">{latestAgreement.title}</div>

          {/* Parties & Commercial Grid */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-[#050b14] border border-[#1e293b] text-xs">
            <div>
              <span className="text-[10px] text-[#1a365d] block uppercase font-mono">Parties:</span>
              <strong className="text-[#f8fafc] block">{latestAgreement.parties?.client?.companyName}</strong>
              <span className="text-[10px] text-[#94a3b8]">Provider: {latestAgreement.parties?.serviceProvider?.businessName}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#1a365d] block uppercase font-mono">Agreed Investment & Terms:</span>
              <strong className="text-[#166534] block font-mono">
                {latestAgreement.pricing?.currency} {Number(latestAgreement.pricing?.amount).toLocaleString()}
              </strong>
              <span className="text-[10px] text-[#94a3b8]">{latestAgreement.paymentTerms}</span>
            </div>
          </div>

          {/* Protected Legal Clauses Badges */}
          <div className="space-y-1">
            <span className="text-[10px] text-[#1e3a5f] uppercase font-bold block">
              Protected Legal Clauses (Standard Template):
            </span>
            <div className="flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 bg-[#f8fafc] border border-[#4338ca] text-[9px] text-[#c7d2fe]">
                ✓ IP Ownership (Protected)
              </span>
              <span className="px-1.5 py-0.5 bg-[#f8fafc] border border-[#4338ca] text-[9px] text-[#c7d2fe]">
                ✓ Limitation of Liability (Protected)
              </span>
              <span className="px-1.5 py-0.5 bg-[#f8fafc] border border-[#4338ca] text-[9px] text-[#c7d2fe]">
                ✓ Confidentiality (Protected)
              </span>
              <span className="px-1.5 py-0.5 bg-[#f8fafc] border border-[#4338ca] text-[9px] text-[#c7d2fe]">
                ✓ Governing Law (Protected)
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#64748b] font-mono">
            SHA-256 Content Hash: {latestAgreement.contentHash.substring(0, 16)}...
          </div>

          {/* Phase 18: Agreement Document & Delivery Controls */}
          {latestAgreement.status === "approved_for_delivery" && (
            <AgreementDeliveryWorkflow agreement={latestAgreement} onRefresh={fetchAgreements} />
          )}
        </div>
      )}
    </div>
  );
}

function AgreementDeliveryWorkflow({ agreement, onRefresh }: { agreement: any; onRefresh: () => void }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [signingSessions, setSigningSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [approvingDoc, setApprovingDoc] = useState(false);
  const [requestingDeliv, setRequestingDeliv] = useState(false);
  const [sendingDeliv, setSendingDeliv] = useState(false);
  const [signing, setSigning] = useState(false);
  const [recipient, setRecipient] = useState(agreement.parties?.client?.contactEmail || "alex casiliCasili Casili Casili Casili <casilijohnpatrickcasili@gmail.com>");

  const loadDeliveryData = async () => {
    try {
      const [docRes, delRes, signRes] = await Promise.all([
        fetch(`/api/agreements/document/list?agreementId=${agreement.id}`),
        fetch(`/api/agreements/delivery/list?agreementId=${agreement.id}`),
        fetch(`/api/agreements/signing/get?agreementId=${agreement.id}`),
      ]);
      const [docData, delData, signData] = await Promise.all([
        docRes.json(),
        delRes.json(),
        signRes.json(),
      ]);
      if (docData.ok) setDocuments(docData.documents || []);
      if (delData.ok) setDeliveries(delData.deliveries || []);
      if (signData.ok) setSigningSessions(signData.sessions || []);
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => {
    loadDeliveryData();
  }, [agreement.id]);

  const handleGenerateDoc = async () => {
    setGeneratingDoc(true);
    try {
      await fetch("/api/agreements/document/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreementId: agreement.id }),
      });
      await loadDeliveryData();
    } catch {}
    setGeneratingDoc(false);
  };

  const handleApproveDoc = async (documentId: string) => {
    setApprovingDoc(true);
    try {
      await fetch("/api/agreements/document/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      await loadDeliveryData();
    } catch {}
    setApprovingDoc(false);
  };

  const handleRequestDelivery = async (documentId: string) => {
    setRequestingDeliv(true);
    try {
      await fetch("/api/agreements/delivery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, recipient }),
      });
      await loadDeliveryData();
    } catch {}
    setRequestingDeliv(false);
  };

  const handleApproveAndSend = async (deliveryId: string) => {
    setSendingDeliv(true);
    try {
      await fetch("/api/agreements/delivery/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId }),
      });
      await loadDeliveryData();
      onRefresh();
    } catch {}
    setSendingDeliv(false);
  };

  const handleSign = async (sessionId: string, role: "client" | "operator") => {
    setSigning(true);
    try {
      await fetch("/api/agreements/signing/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role, signerEmail: recipient }),
      });
      await loadDeliveryData();
      onRefresh();
    } catch {}
    setSigning(false);
  };

  const latestDoc = documents[0];
  const latestDelivery = deliveries[0];
  const latestSession = signingSessions[0];

  return (
    <div className="pt-3 border-t border-[#1e293b] space-y-3">
      <div className="text-xs font-bold text-[#1a365d] flex items-center justify-between">
        <span>PHASE 18: CONTROLLED AGREEMENT DELIVERY & E-SIGNATURE INTAKE</span>
      </div>

      {/* Step 1: Generate Document */}
      {!latestDoc && (
        <div className="p-2.5 bg-[#050b14] border border-[#334155] flex items-center justify-between text-xs">
          <div>
            <strong className="text-white block">Step 1: Immutable Agreement PDF</strong>
            <span className="text-[10px] text-[#94a3b8]">Generate vector PDF document from approved baseline terms.</span>
          </div>
          <Button size="sm" variant="primary" onClick={handleGenerateDoc} loading={generatingDoc}>
            Generate Signing PDF
          </Button>
        </div>
      )}

      {/* Step 2: Document Review & Delivery Request */}
      {latestDoc && (
        <div className="p-2.5 bg-[#050b14] border border-[#1e3a8a] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white">Document v{latestDoc.documentVersion} ({latestDoc.id})</span>
              <span className={`ml-2 px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold ${
                latestDoc.status === "approved" || latestDoc.status === "signing_active" || latestDoc.status === "completed"
                  ? "bg-[#065f46] text-[#6ee7b7]"
                  : "bg-[#854d0e] text-[#fef08a]"
              }`}>
                {latestDoc.status}
              </span>
            </div>
            <div className="flex gap-1.5">
              <a
                href={latestDoc.pdfReference}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-white text-[10px] rounded"
              >
                Preview PDF
              </a>
              {latestDoc.status === "waiting_approval" && (
                <Button size="sm" variant="primary" onClick={() => handleApproveDoc(latestDoc.id)} loading={approvingDoc}>
                  Approve Document
                </Button>
              )}
            </div>
          </div>

          {/* Delivery Request Form */}
          {latestDoc.status === "approved" && !latestDelivery && (
            <div className="p-2 bg-[#0a101d] border border-[#3b82f6]/40 space-y-2 mt-2">
              <span className="text-[10px] font-bold text-[#93c5fd] block uppercase">Request Agreement Delivery:</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient Email"
                  className="flex-1 p-1 bg-[#1e293b] border border-[#334155] text-white text-xs font-mono"
                />
                <Button size="sm" variant="primary" onClick={() => handleRequestDelivery(latestDoc.id)} loading={requestingDeliv}>
                  Request Delivery
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: High Risk Approval Gate */}
      {latestDelivery && latestDelivery.status === "pending_approval" && (
        <div className="p-3 bg-[#fffbeb] border-2 border-[#ea580c] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#fed7aa] uppercase">⚠️ HIGH-RISK GATE: External Agreement Send Authorization</span>
            <Button size="sm" variant="primary" onClick={() => handleApproveAndSend(latestDelivery.id)} loading={sendingDeliv}>
              Approve & Send Agreement (Gmail / SMTP)
            </Button>
          </div>
          <div className="text-[11px] text-[#fed7aa]">
            Recipient: <strong className="text-white">{latestDelivery.recipient}</strong> • Subject: <em>{latestDelivery.subject}</em>
          </div>
        </div>
      )}

      {/* Step 4: Active E-Signature Intake & Tracking */}
      {latestSession && (
        <div className="p-3 bg-[#0a101d] border border-[#3b82f6] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#93c5fd] uppercase">
              E-Signature Intake: [{latestSession.provider.toUpperCase()}] ({latestSession.providerRequestId})
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
              latestSession.status === "completed"
                ? "bg-[#065f46] text-[#6ee7b7]"
                : latestSession.status === "awaiting_operator"
                ? "bg-[#854d0e] text-[#fef08a]"
                : "bg-[#1e3a8a] text-[#93c5fd]"
            }`}>
              {latestSession.status.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          {/* Signers Status Grid */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-[#050b14] border border-[#1e293b]">
            <div>
              <span className="text-[10px] text-[#94a3b8] uppercase block font-mono">1. Client Signer:</span>
              <strong className="text-white block">{agreement.parties?.client?.contactName || "Client Signer"}</strong>
              <span className={`text-[10px] font-bold ${latestSession.clientSignedAt ? "text-[#166534]" : "text-[#92400e]"}`}>
                {latestSession.clientSignedAt ? `✓ Signed at ${new Date(latestSession.clientSignedAt).toLocaleTimeString()}` : "⏳ Pending Signature"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#94a3b8] uppercase block font-mono">2. Operator Countersignature:</span>
              <strong className="text-white block">Alex Mercer (Principal Digital Architect)</strong>
              <span className={`text-[10px] font-bold ${latestSession.operatorSignedAt ? "text-[#166534]" : "text-[#92400e]"}`}>
                {latestSession.operatorSignedAt ? `✓ Signed at ${new Date(latestSession.operatorSignedAt).toLocaleTimeString()}` : "⏳ Pending Countersignature"}
              </span>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex justify-end gap-2 pt-1">
            {!latestSession.clientSignedAt && (
              <Button size="sm" variant="primary" onClick={() => handleSign(latestSession.id, "client")} loading={signing}>
                Simulate / Record Client Signature
              </Button>
            )}
            {latestSession.clientSignedAt && !latestSession.operatorSignedAt && (
              <Button size="sm" variant="primary" onClick={() => handleSign(latestSession.id, "operator")} loading={signing}>
                Countersign as Operator
              </Button>
            )}
            {latestSession.status === "completed" && (
              <span className="text-[11px] text-[#166534] font-bold flex items-center gap-1">
                ✓ Agreement fully executed & binding. (Recommended: Mark Opportunity Won)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}