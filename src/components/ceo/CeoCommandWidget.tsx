"use client";

import React, { useState } from "react";
import { CEOPlanOutput } from "@/lib/ai/types";
import { ceoService } from "@/lib/services/ceo.service";
import { useTaskManager } from "@/context/TaskContext";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const EXAMPLE_PROMPTS = [
  "Veltraxis Industrial Holdings Philippines",
  "Discover Chicago dental clinics with slow mobile load times and pitch responsive redesigns.",
  "Target Austin law firms needing WCAG accessibility compliance and modern quote forms."
];

export const CeoCommandWidget: React.FC = () => {
  const { refresh } = useTaskManager();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CEOPlanOutput | null>(null);
  const [approvedResult, setApprovedResult] = useState<{ count: number; summary: string } | null>(null);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      setError("Please enter a business goal description.");
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);
    setApprovedResult(null);

    try {
      const res = await fetch("/api/ceo/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate plan.");
      }

      setPlan(data.plan);
    } catch (err: any) {
      console.error("Plan generation error:", err);
      setError(err.message || "Failed to generate operational plan with CEO Agent.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!plan) return;
    if (plan.validation && !plan.validation.valid) {
      setError(`Cannot approve plan: ${plan.validation.errors.join("; ")}`);
      return;
    }

    setSubmittingApproval(true);
    setError(null);

    try {
      const res = await ceoService.approveAndCreateTasks(plan, goal);
      await refresh();
      setApprovedResult({
        count: res.createdTasks.length,
        summary: res.summary,
      });
      setPlan(null);
      setGoal("");
    } catch (err: any) {
      console.error("Failed to approve plan:", err);
      setError(err.message || "Failed to inject tasks into Supabase.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleDiscardPlan = () => {
    setPlan(null);
    setError(null);
  };

  const isValidationFailed = plan?.validation && !plan.validation.valid;

  return (
    <div className="bg-white">
      <div className="flex items-baseline justify-between gap-4 pb-3 mb-6 border-b border-[#e5e5e5]">
        <div>
          <h2 className="ops-display text-[22px] text-[#111]">
            Command
          </h2>
          <p className="mt-1 text-[14px] text-[#666] max-w-2xl">
            Enter a strategic business goal. The CEO agent analyzes, verifies entities, and proposes operational tasks. Routed through Gemini, Groq, or local Ollama.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <form onSubmit={handleGeneratePlan} className="space-y-4">
          <div>
            <label className="text-[13px] text-[#666] block mb-2">
              Strategic business goal
            </label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Veltraxis Industrial Holdings Philippines"
              className="w-full bg-transparent border-0 border-b border-[#111] py-2 text-[16px] text-[#111] placeholder:text-[#999] focus:outline-none resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex items-baseline gap-x-4 gap-y-2 flex-wrap text-[13px]">
            <span className="text-[#888]">Try</span>
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGoal(prompt)}
                disabled={loading}
                className="text-left text-[#111] underline underline-offset-4 decoration-[#ccc] hover:decoration-[#111] truncate max-w-xs cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <p className="text-[13px] text-[#666]">
              Entity verification and human approval are required.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
            >
              {loading ? "CEO Analyzing & Decomposing..." : "Generate Operational Plan"}
            </Button>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="py-3 text-[14px] text-[#111] border-b border-[#e5e5e5]">
            <div className="font-medium">Could not generate the plan</div>
            <p className="mt-1 text-[#666]">{error}</p>
          </div>
        )}

        {/* Approved Success Feedback */}
        {approvedResult && (
          <div className="py-4 text-[14px] text-[#111] border-b border-[#e5e5e5] space-y-2">
            <div className="ops-display text-[20px]">
              Plan approved
            </div>
            <p className="text-[#666]">
              {approvedResult.summary} {approvedResult.count} tasks are queued for execution.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/tasks" className="underline underline-offset-4">
                Open tasks
              </Link>
              <button
                onClick={() => setApprovedResult(null)}
                className="text-[#666] hover:text-[#111] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Proposed Plan Review Area (Human Approval Step) */}
        {plan && (
          <div className="mt-8 pt-8 border-t border-[#111] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <h3 className="ops-display text-[22px] text-[#111]">
                Proposed plan ({plan.tasks.length} tasks)
              </h3>
              <div className="flex items-baseline gap-4 text-[13px] text-[#111]">
                {plan.validation?.entityStatus === "UNVERIFIED" && (
                  <span>Entity unverified</span>
                )}
                {plan.validation?.entityStatus === "VERIFIED" && (
                  <span>Entity verified</span>
                )}
                <span>Human sign-off required</span>
              </div>
            </div>

            {plan.validation && plan.validation.warnings.length > 0 && (
              <div className="text-[14px] text-[#111]">
                <div className="mb-1">Evidence gating</div>
                <ul className="list-disc pl-5 text-[#666] space-y-0.5">
                  {plan.validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.validation && !plan.validation.valid && (
              <div className="text-[14px] text-[#111]">
                <div className="mb-1">Validation failed</div>
                <ul className="list-disc pl-5 text-[#666] space-y-0.5">
                  {plan.validation.errors.map((errStr, i) => (
                    <li key={i}>{errStr}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[15px]">
              <div>
                <div className="text-[13px] text-[#888] mb-1">Goal</div>
                <p className="text-[#111] leading-relaxed">{plan.goalSummary}</p>
              </div>
              <div>
                <div className="text-[13px] text-[#888] mb-1">Reasoning</div>
                <p className="text-[#666] leading-relaxed">{plan.reasoningSummary}</p>
              </div>
            </div>

            <div>
              <div className="text-[13px] text-[#888] mb-2">Task sequence</div>
              <div>
                {plan.tasks.map((task, idx) => (
                  <div key={idx} className="py-4 border-t border-[#e5e5e5]">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="tabular-nums text-[#888]">{idx + 1}</span>
                        <span className="text-[#111]">{task.title}</span>
                        <PriorityBadge priority={task.priority} />
                        <span className="text-[13px] text-[#888]">{task.type}</span>
                      </div>
                      <span className="text-[13px] text-[#666]">{task.assignedAgentRole}</span>
                    </div>
                    <p className="mt-2 text-[14px] text-[#666] leading-relaxed">
                      {task.description}
                    </p>
                    {task.input && Object.keys(task.input).length > 0 && (
                      <p className="mt-2 text-[12px] text-[#888]">
                        Input: {JSON.stringify(task.input)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <p className="text-[13px] text-[#666] max-w-xl">
                Approving writes these {plan.tasks.length} tasks to the repository in queued status.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleDiscardPlan}
                  disabled={submittingApproval}
                >
                  Discard
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApprovePlan}
                  loading={submittingApproval}
                  disabled={isValidationFailed}
                >
                  {submittingApproval ? "Saving…" : "Approve and inject tasks"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};