import { GoogleGenAI } from "@google/genai";
import { Task, Lead } from "@/data/types";
import { taskRepository } from "../repositories/task.repository";
import { leadRepository } from "../repositories/lead.repository";
import { activityRepository } from "../repositories/activity.repository";
import { agentRepository } from "../repositories/agent.repository";
import { auditRepository, WebsiteAuditRecord, AuditFinding } from "../repositories/audit.repository";
import { htmlAnalyzer, RawHtmlSignals } from "./audit/html-analyzer";
import { scoreCalculator, AuditScores, RecommendedAction } from "./audit/score-calculator";

export interface AuditExecutionResult {
  task: Task;
  audit: WebsiteAuditRecord;
  leadUpdated?: Lead;
}

export class AuditService {
  private getApiKey(customApiKey?: string): string {
    const key =
      customApiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "Gemini API key is required for Website Analyst execution. Please set GEMINI_API_KEY in .env.local or enter your key in the console."
      );
    }
    return key;
  }

  async createAuditTaskForLead(leadId: string): Promise<Task> {
    const lead = await leadRepository.getById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found.`);

    return taskRepository.create({
      title: `Technical & Conversion UX Audit: ${lead.company}`,
      description: `Analyze ${lead.website} for mobile responsiveness, page speed bottlenecks, WCAG accessibility, and conversion friction.`,
      type: "website_audit",
      status: "queued",
      priority: "high",
      assignedAgentId: "agent-analyst",
      targetLeadId: lead.id,
      input: {
        leadId: lead.id,
        company: lead.company,
        website: lead.website,
        industry: lead.industry,
      },
    });
  }

  async executeWebsiteAudit(
    taskId: string,
    customApiKey?: string
  ): Promise<AuditExecutionResult> {
    const task = await taskRepository.getById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const typeNorm = task.type.toLowerCase().replace(/[\s_-]/g, "");
    if (!typeNorm.includes("audit") && !typeNorm.includes("site") && !typeNorm.includes("website")) {
      throw new Error(`Task ${taskId} is of type "${task.type}". Website Analyst only executes website_audit tasks.`);
    }

    // Determine target website
    let targetWebsite = task.input?.website || task.input?.targetUrl;
    let leadId = task.targetLeadId || task.input?.leadId;

    if (!targetWebsite && leadId) {
      const lead = await leadRepository.getById(leadId);
      if (lead) targetWebsite = lead.website;
    }

    if (!targetWebsite) {
      throw new Error(`No target website URL specified for task ${taskId}.`);
    }

    // 1. Set task & agent to running
    const now = new Date().toISOString();
    await taskRepository.update(taskId, {
      status: "running",
      startedAt: now,
      error: undefined,
    });
    await agentRepository.updateStatus("agent-analyst", "running");

    await activityRepository.add({
      type: "task_started",
      title: `Website Analyst: Auditing ${task.id}`,
      description: `Website Analyst began live technical & UX inspection of "${targetWebsite}".`,
      level: "info",
      agentId: "agent-analyst",
      agentName: "Website Analyst",
      metadata: { taskId: task.id, website: targetWebsite },
    });

    try {
      // 2. Fetch and extract real HTML signals
      const signals: RawHtmlSignals = await htmlAnalyzer.fetchAndAnalyze(targetWebsite);

      // 3. Call LLM for design evaluation and structured findings based ON REAL SIGNALS
      const apiKey = this.getApiKey(customApiKey);
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `
You are the autonomous Website Analyst of Synapse Ops.
You inspect real technical signals collected from a target website and provide an objective, evidence-based assessment of its design quality, usability, and redesign opportunity.

RULES:
1. Ground all findings strictly on the provided real HTML signals and text snippet.
2. DO NOT pretend to measure metrics not provided in the signals.
3. Categorize findings into: "performance", "mobile", "seo", "accessibility", "conversion", "design".
4. Assign realistic severities: "low", "medium", "high", "critical".
5. Give a design/modernity score from 10 to 95 based on layout structure, clarity, and copywriting.
6. Provide clear, actionable recommendations for redesign pitching.

OUTPUT JSON SCHEMA:
{
  "designScore": 55,
  "summary": "2-3 sentence executive summary of website strengths and key areas for redesign improvement",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "findings": [
    {
      "category": "performance" | "mobile" | "seo" | "accessibility" | "conversion" | "design",
      "severity": "low" | "medium" | "high" | "critical",
      "evidence": "Observed evidence from page signals",
      "recommendation": "Specific redesign / technical fix"
    }
  ]
}
`;

      const promptContent = `
Website URL: ${signals.url} (Final: ${signals.finalUrl})
HTTP Status: ${signals.statusCode} | HTTPS: ${signals.isHttps}
Response Time: ${signals.responseTimeMs}ms | Page Weight: ${Math.round(signals.contentLengthBytes / 1024)} KB
Title Tag: "${signals.title || "Missing"}" (${signals.title?.length || 0} chars)
Meta Description: "${signals.metaDescription || "Missing"}"
Meta Viewport: "${signals.metaViewport || "Missing (Not Responsive)"}"
Heading Hierarchy: H1 (${signals.h1Count}, text: "${signals.h1Text || "None"}"), H2 (${signals.h2Count}), H3 (${signals.h3Count})
Images: Total ${signals.totalImages}, Images With Alt: ${signals.imagesWithAlt}, Missing Alt: ${signals.missingAltCount}
Forms: ${signals.formCount} forms (Email inputs: ${signals.hasEmailInputs}, Phone inputs: ${signals.hasTelInputs})
Contact Links: Phone link: ${signals.hasPhoneLink}, Mailto link: ${signals.hasMailtoLink}
CTA Buttons / Action Phrases: ${JSON.stringify(signals.ctaButtonTexts)}
Script Count: ${signals.scriptCount}, Stylesheets: ${signals.stylesheetCount}
Text Content Preview:
"${signals.textSnippet}"

Evaluate the design modernity, conversion readiness, and structured audit findings in JSON.
`;

      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.7-flash"];
      let llmEval: any = null;

      for (const model of candidateModels) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: promptContent,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          if (res.text) {
            try {
              llmEval = JSON.parse(res.text);
            } catch {
              const cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
              llmEval = JSON.parse(cleaned);
            }
            if (llmEval && typeof llmEval.designScore === "number") {
              break;
            }
          }
        } catch (e: any) {
          console.warn(`[AuditService] Model ${model} failed, trying next:`, e.message);
        }
      }

      const designScore = llmEval?.designScore ?? 50;

      // 4. Calculate deterministic scores & recommended action
      const { scores, recommendedAction } = scoreCalculator.calculateScores(signals, designScore);

      const findings: AuditFinding[] = Array.isArray(llmEval?.findings)
        ? llmEval.findings.map((f: any) => ({
            category: ["performance", "mobile", "seo", "accessibility", "conversion", "design"].includes(f.category)
              ? f.category
              : "design",
            severity: ["low", "medium", "high", "critical"].includes(f.severity) ? f.severity : "medium",
            evidence: f.evidence || "Evidence noted during inspection.",
            recommendation: f.recommendation || "Implement modern layout standards.",
          }))
        : [];

      // Add deterministic findings if missing crucial elements
      if (!signals.metaViewport) {
        findings.unshift({
          category: "mobile",
          severity: "critical",
          evidence: "Missing <meta name='viewport'> tag. Page will render poorly on mobile screens.",
          recommendation: "Implement standard responsive viewport tag and mobile-first container layouts.",
        });
      }
      if (signals.missingAltCount > 0) {
        findings.push({
          category: "accessibility",
          severity: "medium",
          evidence: `${signals.missingAltCount} out of ${signals.totalImages} images lack descriptive alt attributes.`,
          recommendation: "Provide meaningful descriptive alt tags for all content images to comply with WCAG 2.1.",
        });
      }
      if (signals.ctaButtonTexts.length === 0) {
        findings.push({
          category: "conversion",
          severity: "high",
          evidence: "No distinct primary Call-To-Action buttons or direct lead inquiry pathways detected above the fold.",
          recommendation: "Add prominent primary booking/inquiry CTA button in hero section.",
        });
      }

      const summary =
        llmEval?.summary ||
        `Technical & UX audit of ${signals.url} completed with Website Score ${scores.website}/100 and Redesign Opportunity Score ${scores.redesignOpportunity}/100 (${recommendedAction.toUpperCase()}).`;

      const strengths = Array.isArray(llmEval?.strengths) ? llmEval.strengths : [signals.isHttps ? "Secure HTTPS enabled" : "Active domain"];
      const weaknesses = Array.isArray(llmEval?.weaknesses) ? llmEval.weaknesses : ["Conversion and mobile optimization opportunities detected"];

      // 5. Persist audit to repository
      const auditRecord = await auditRepository.create({
        leadId,
        taskId: task.id,
        website: targetWebsite,
        scores,
        findings,
        strengths,
        weaknesses,
        summary,
        recommendedAction,
      });

      // 6. Update Lead in Supabase if leadId is associated
      let leadUpdated: Lead | undefined = undefined;
      if (leadId) {
        const lead = await leadRepository.getById(leadId);
        if (lead) {
          leadUpdated = await leadRepository.updateStatus(leadId, "Audited");
          // Update score in Supabase
          const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
          if (supabase) {
            await supabase
              .from("leads")
              .update({
                website_score: scores.website,
                opportunity_score: scores.redesignOpportunity,
                notes: `Website Score: ${scores.website}/100 | Redesign Opportunity: ${scores.redesignOpportunity}/100 (${recommendedAction.toUpperCase()}) | ${summary}`,
                updated_at: new Date().toISOString(),
              } as any)
              .eq("id", leadId);
          }
        }
      }

      // 7. Update Task to completed with deliverable output
      const completedTask = await taskRepository.update(taskId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        output: auditRecord,
        error: undefined,
      });

      // 8. Reset agent to idle
      await agentRepository.updateStatus("agent-analyst", "idle");

      // 9. Log activity
      await activityRepository.add({
        type: "task_completed",
        title: `Website Analyst Completed: ${task.id}`,
        description: `Audited ${targetWebsite}: Score ${scores.website}/100, Opportunity ${scores.redesignOpportunity}/100 (${recommendedAction.toUpperCase()}).`,
        level: "success",
        agentId: "agent-analyst",
        agentName: "Website Analyst",
        metadata: {
          taskId: task.id,
          website: targetWebsite,
          websiteScore: scores.website,
          opportunityScore: scores.redesignOpportunity,
          recommendedAction,
        },
      });

      return {
        task: completedTask,
        audit: auditRecord,
        leadUpdated,
      };
    } catch (err: any) {
      console.error("[AuditService.executeWebsiteAudit] error:", err);

      await taskRepository.update(taskId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err.message || "Website audit execution failed.",
      });

      await agentRepository.updateStatus("agent-analyst", "idle");

      await activityRepository.add({
        type: "task_failed",
        title: `Website Analyst Failed: ${task.id}`,
        description: `Audit of ${targetWebsite} failed: ${err.message}`,
        level: "error",
        agentId: "agent-analyst",
        agentName: "Website Analyst",
        metadata: {
          taskId: task.id,
          website: targetWebsite,
          error: err.message,
        },
      });

      throw new Error(err.message || "Website audit execution failed.");
    }
  }
}

export const auditService = new AuditService();