import { GoogleGenAI } from "@google/genai";
import { Agent } from "@/data/types";
import { AllowedProviderId, BillingMode, CEOPlanOutput, LLMProvider, ProviderHealth } from "../types";

export class GeminiFreeProvider implements LLMProvider {
  readonly id: AllowedProviderId = "gemini_free";
  readonly name = "Google Gemini (Free Tier)";
  readonly billingMode: BillingMode = "free_tier";

  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 10;
  }

  async checkHealth(): Promise<{ status: ProviderHealth; message?: string }> {
    if (!this.isConfigured()) {
      return { status: "NOT_CONFIGURED", message: "GEMINI_API_KEY not set in server environment." };
    }

    try {
      const apiKey = this.getApiKey()!;
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: "ping",
      });
      if (res.text) {
        return { status: "ONLINE", message: "Free Tier active and responsive (gemini-3.5-flash-lite)." };
      }
      return { status: "ONLINE" };
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("quota")) {
        return { status: "QUOTA_EXHAUSTED", message: "Free Tier quota exhausted or rate limit reached." };
      }
      return { status: "OFFLINE", message: err?.message || "Connection failed." };
    }
  }

  async generateText(prompt: string, systemInstruction?: string, jsonMode?: boolean): Promise<{ text: string; model: string; inputTokens?: number; outputTokens?: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.5-flash-lite";

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: jsonMode ? "application/json" : "text/plain",
          temperature: 0.2,
        },
      });

      return {
        text: response.text || "",
        model,
        inputTokens: (response as any).usageMetadata?.promptTokenCount,
        outputTokens: (response as any).usageMetadata?.candidatesTokenCount,
      };
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("GEMINI_FREE_QUOTA_EXHAUSTED: Google Gemini Free tier rate limit or quota exceeded.");
      }
      throw err;
    }
  }

  async generatePlan(prompt: string, agents: Agent[]): Promise<CEOPlanOutput> {
    const agentCapabilitiesSummary = agents
      .map((a) => `- Role: "${a.role}" (Name: "${a.name}", ID: "${a.id}")\n  Specialties: ${a.capabilities.join(", ")}`)
      .join("\n");

    const systemInstruction = `
You are the autonomous CEO Agent of Synapse Ops, an enterprise AI operational OS.
Your objective is to analyze high-level human business goals and synthesize them into a structured, sequential, realistic operational workflow.

You orchestrate these specialist execution agents:
${agentCapabilitiesSummary}

TASK DECOMPOSITION RULES:
1. Deconstruct the business goal into 3 to 6 distinct, sequential, operational tasks.
2. All tasks must be executable units.
3. Assign each task strictly to the most appropriate agent role ("Research Agent", "Website Analyst", "Developer Agent", "Sales Agent").
4. Set realistic priorities ("low", "medium", "high", "critical").
5. Provide relevant structured input parameters for each task in JSON.
6. Provide a concise "reasoningSummary".

OUTPUT REQUIREMENT:
Respond with valid JSON adhering to this schema:
{
  "goalSummary": "One-sentence summary",
  "reasoningSummary": "2-3 sentences explaining the strategy",
  "tasks": [
    {
      "title": "Clear actionable task title",
      "description": "Detailed instructions",
      "type": "Lead Discovery",
      "priority": "high",
      "assignedAgentRole": "Research Agent",
      "input": {}
    }
  ]
}
`;

    const { text, model, inputTokens, outputTokens } = await this.generateText(
      `Human Business Goal:\n"${prompt.trim()}"\n\nGenerate the structured operational plan.`,
      systemInstruction,
      true
    );

    let parsed: CEOPlanOutput;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    parsed.tasks = (parsed.tasks || []).map((t, idx) => ({
      title: t.title?.trim() || `Task #${idx + 1}`,
      description: t.description?.trim() || "Execute assigned subroutine.",
      type: t.type || "Lead Discovery",
      priority: ["low", "medium", "high", "critical"].includes(t.priority?.toLowerCase())
        ? (t.priority.toLowerCase() as any)
        : "medium",
      assignedAgentRole: t.assignedAgentRole || "Research Agent",
      input: typeof t.input === "object" && t.input !== null ? t.input : {},
    }));

    parsed.reasoningSummary = parsed.reasoningSummary || "Strategic sequential workflow generated by CEO Agent.";

    return parsed;
  }
}

export const geminiFreeProvider = new GeminiFreeProvider();