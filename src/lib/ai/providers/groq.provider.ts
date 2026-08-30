import { Agent } from "@/data/types";
import { AllowedProviderId, BillingMode, CEOPlanOutput, LLMProvider, ProviderHealth } from "../types";

export class GroqProvider implements LLMProvider {
  readonly id: AllowedProviderId = "groq";
  readonly name = "Groq API";
  readonly billingMode: BillingMode = "provider_free_or_configured";
  private baseUrl = "https://api.groq.com/openai/v1";

  private getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 10 && !key.includes("placeholder");
  }

  async checkHealth(): Promise<{ status: ProviderHealth; message?: string; installedModels?: string[] }> {
    if (!this.isConfigured()) {
      return { status: "NOT_CONFIGURED", message: "GROQ_API_KEY not configured or is placeholder." };
    }

    try {
      const apiKey = this.getApiKey();
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        if (res.status === 429) {
          return { status: "RATE_LIMITED", message: "Groq rate limit reached." };
        }
        return { status: "OFFLINE", message: `Groq returned status ${res.status}` };
      }

      const data = await res.json();
      const models = (data.data || []).map((m: any) => m.id);
      return { status: "ONLINE", message: `Connected. ${models.length} models available (Active: qwen/qwen3.8-27b).`, installedModels: models };
    } catch (err: any) {
      return { status: "OFFLINE", message: err?.message || "Cannot reach Groq API." };
    }
  }

  async generateText(prompt: string, systemInstruction?: string, jsonMode?: boolean): Promise<{ text: string; model: string; inputTokens?: number; outputTokens?: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

    const model = "qwen/qwen3.8-27b";

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || "",
      model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }

  async generatePlan(prompt: string, agents: Agent[]): Promise<CEOPlanOutput> {
    const agentCapabilitiesSummary = agents
      .map((a) => `- Role: "${a.role}" (Name: "${a.name}", ID: "${a.id}")\n  Specialties: ${a.capabilities.join(", ")}`)
      .join("\n");

    const systemInstruction = `
You are the autonomous CEO Agent of Synapse Ops, an enterprise AI operational OS.
Your objective is to analyze high-level human business goals and synthesize them into a structured, sequential, realistic operational workflow.

Specialist execution agents available:
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

    const { text } = await this.generateText(
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

    parsed.reasoningSummary = parsed.reasoningSummary || "Strategic plan generated via Groq API.";

    return parsed;
  }
}

export const groqProvider = new GroqProvider();