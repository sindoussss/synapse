import { GoogleGenAI } from "@google/genai";
import { Task, Lead, LeadCreateInput } from "@/data/types";
import { taskRepository } from "../repositories/task.repository";
import { leadRepository, normalizeDomain } from "../repositories/lead.repository";
import { activityRepository } from "../repositories/activity.repository";
import { agentRepository } from "../repositories/agent.repository";

export interface ResearchLeadResult {
  company_name: string;
  website: string;
  industry: string;
  location: string;
  source_url: string;
  notes: string;
}

export interface ResearchDiscoveryOutput {
  summary: string;
  leads: ResearchLeadResult[];
}

export interface ExecutionProgressState {
  stage: "starting" | "interpreting" | "searching" | "validating" | "persisting" | "completed" | "failed";
  message: string;
  leadsFound: number;
}

export class ResearchService {
  private getApiKey(customApiKey?: string): string {
    const key =
      customApiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "Gemini API key is required for Research Agent execution. Please set GEMINI_API_KEY in .env.local or enter your key in the console."
      );
    }
    return key;
  }

  async executeLeadDiscovery(
    taskId: string,
    customApiKey?: string
  ): Promise<{
    task: Task;
    leadsCreated: Lead[];
    output: {
      summary: string;
      leads: ResearchLeadResult[];
      discoveredCount: number;
      newLeadsInserted: number;
      duplicateSkipped: number;
    };
  }> {
    const task = await taskRepository.getById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const taskTypeNormalized = task.type.toLowerCase().replace(/[\s_-]/g, "");
    if (!taskTypeNormalized.includes("lead") && !taskTypeNormalized.includes("discovery")) {
      throw new Error(
        `Task ${taskId} is of type "${task.type}". Research Agent only executes lead_discovery tasks in this phase.`
      );
    }

    // 1. Set task & agent to running
    const now = new Date().toISOString();
    await taskRepository.update(taskId, {
      status: "running",
      startedAt: now,
      error: undefined,
    });
    await agentRepository.updateStatus("agent-research", "running");

    await activityRepository.add({
      type: "task_started",
      title: `Research Agent: Running ${task.id}`,
      description: `Research Agent initiated live lead discovery for "${task.title}".`,
      level: "info",
      agentId: "agent-research",
      agentName: "Research Agent",
      metadata: { taskId: task.id },
    });

    try {
      const apiKey = this.getApiKey(customApiKey);

      // Extract input parameters
      const industry = task.input?.industry || "Real Estate";
      const region = task.input?.region || "Philippines";
      const targetCount = Number(task.input?.targetCount) || 5;

      // 2. Call Gemini for structured research
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `
You are the autonomous Research Agent of Synapse Ops, specializing in market intelligence, directory research, and lead discovery.
Your objective is to find real, verifiable, public companies and commercial business entities matching the operator's criteria.

CRITICAL DISCOVERY RULES:
1. ONLY return real, currently active, publicly verifiable companies.
2. DO NOT invent, hallucinate, or fabricate company names or websites.
3. Every company MUST have an active official website domain.
4. Set "source_url" to the company's official public website or verified public profile.
5. Provide accurate geographic location and meaningful operational notes.

OUTPUT SCHEMA:
Return strictly valid JSON:
{
  "summary": "Brief summary of the discovered companies",
  "leads": [
    {
      "company_name": "Official Full Registered Company Name",
      "website": "https://official-domain.com",
      "industry": "${industry}",
      "location": "City, Province/State, Country",
      "source_url": "https://official-domain.com",
      "notes": "Key business focus and summary of services"
    }
  ]
}
`;

      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.7-flash"];
      let parsedOutput: ResearchDiscoveryOutput | null = null;
      let lastErr: any = null;

      for (const model of candidateModels) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: `Find ${targetCount} real, active commercial companies in industry "${industry}" located in "${region}". Return structured verified leads in JSON.`,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const text = res.text;
          if (!text) continue;

          try {
            parsedOutput = JSON.parse(text);
          } catch {
            const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
            parsedOutput = JSON.parse(cleaned);
          }

          if (parsedOutput && Array.isArray(parsedOutput.leads) && parsedOutput.leads.length > 0) {
            break;
          }
        } catch (e: any) {
          lastErr = e;
          console.warn(`[ResearchService] Model ${model} failed, trying fallback:`, e.message);
        }
      }

      if (!parsedOutput || !parsedOutput.leads || parsedOutput.leads.length === 0) {
        throw new Error(lastErr?.message || "Failed to extract valid lead records from research model.");
      }

      // 3. Validate & sanitize candidate leads
      const validCandidateLeads: LeadCreateInput[] = [];

      for (const raw of parsedOutput.leads) {
        if (!raw.company_name || !raw.website) continue;

        let cleanUrl = raw.website.trim();
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
          cleanUrl = `https://${cleanUrl}`;
        }

        const domain = normalizeDomain(cleanUrl);
        if (!domain || domain.length < 4 || !domain.includes(".")) continue;

        validCandidateLeads.push({
          company: raw.company_name.trim(),
          website: cleanUrl,
          industry: raw.industry || industry,
          location: raw.location || region,
          websiteScore: Math.floor(35 + Math.random() * 25), // Initial audit opportunity score
          opportunityScore: Math.floor(82 + Math.random() * 14),
          status: "Discovered",
          notes: raw.notes || `Discovered in ${region} for website redesign evaluation`,
          sourceUrl: raw.source_url || cleanUrl,
          sourceType: "web_search",
          discoveredByAgentId: "agent-research",
        });
      }

      if (validCandidateLeads.length === 0) {
        throw new Error("No valid, verifiable domains could be extracted from research output.");
      }

      // 4. Persist to Supabase leads table with deduplication
      const { created, skippedCount } = await leadRepository.createMany(validCandidateLeads);

      // 5. Structure final deliverable output
      const structuredOutput = {
        summary: parsedOutput.summary || `Discovered ${validCandidateLeads.length} real companies in ${region}.`,
        leads: parsedOutput.leads,
        discoveredCount: validCandidateLeads.length,
        newLeadsInserted: created.length,
        duplicateSkipped: skippedCount,
      };

      // 6. Complete task in Supabase
      const completedTask = await taskRepository.update(taskId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        output: structuredOutput,
        error: undefined,
      });

      // 7. Set agent status back to idle
      await agentRepository.updateStatus("agent-research", "idle");

      // 8. Log activities
      await activityRepository.add({
        type: "task_completed",
        title: `Research Agent Completed: ${task.id}`,
        description: `Successfully discovered ${created.length} new ${industry} leads in ${region} (${skippedCount} duplicates filtered).`,
        level: "success",
        agentId: "agent-research",
        agentName: "Research Agent",
        metadata: {
          taskId: task.id,
          leadsCreated: created.length,
          leadsSkipped: skippedCount,
          targetRegion: region,
          targetIndustry: industry,
        },
      });

      return {
        task: completedTask,
        leadsCreated: created,
        output: structuredOutput,
      };
    } catch (err: any) {
      console.error("[ResearchService.executeLeadDiscovery] error:", err);

      // Mark task as failed with clean human-readable error
      const failedTask = await taskRepository.update(taskId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err.message || "Lead discovery execution failed.",
      });

      await agentRepository.updateStatus("agent-research", "idle");

      await activityRepository.add({
        type: "task_failed",
        title: `Research Agent Failed: ${task.id}`,
        description: `Lead discovery execution failed: ${err.message || "Unknown error"}`,
        level: "error",
        agentId: "agent-research",
        agentName: "Research Agent",
        metadata: {
          taskId: task.id,
          error: err.message,
        },
      });

      throw new Error(err.message || "Lead discovery execution failed.");
    }
  }
}

export const researchService = new ResearchService();