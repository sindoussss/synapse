import { Agent } from "@/data/types";
import { AllowedProviderId, BillingMode, CEOPlanOutput, LLMProvider, ProviderHealth } from "../types";
import { EXACT_GEMMA4_CODER_MODEL_ID, LOCAL_CODING_FALLBACK_CHAIN } from "../model-registry";

export const FRONTEND_DESIGN_QUALITY_POLICY = `
FRONTEND DESIGN QUALITY POLICY (STRICT):
Avoid:
- purple/blue gradient hero defaults
- glassmorphism everywhere
- glowing blobs
- excessive rounded cards
- generic SaaS layouts
- giant centered marketing hero
- random gradient text
- fake testimonials
- fake statistics
- repetitive 3-column cards
- excessive pill buttons

Prefer:
- industry-specific design & color palette
- strong typography & balanced scale
- deliberate whitespace
- restrained interactions
- clean, semantic hierarchy
- responsive layouts (mobile, tablet, desktop)
- accessibility (contrast, ARIA, focus states)
- editorial/asymmetric composition when appropriate

Before implementation:
Analyze industry, brand, audience, typography, layout, and content hierarchy.
DO NOT generate generic AI slop by default.
`;

export class OllamaLocalProvider implements LLMProvider {
  readonly id: AllowedProviderId = "ollama_local";
  readonly name = "Ollama (Localhost)";
  readonly billingMode: BillingMode = "local";

  private getBaseUrl(): string {
    const url = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    // Strictly prevent cloud URLs
    if (url.includes("ollama.com") || url.includes("ollama.ai")) {
      throw new Error("Security Violation: Ollama Cloud is forbidden. Must use local daemon on 127.0.0.1:11434.");
    }
    return url;
  }

  isConfigured(): boolean {
    return true; // Local daemon does not require cloud API key
  }

  async checkHealth(): Promise<{ status: ProviderHealth; message?: string; installedModels?: string[] }> {
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return { status: "OFFLINE", message: `Local daemon returned status ${res.status}`, installedModels: [] };
      }

      const data = await res.json();
      const models = (data.models || []).map((m: any) => m.name);
      const coderInstalled = models.includes(EXACT_GEMMA4_CODER_MODEL_ID);

      return {
        status: "ONLINE",
        message: `Connected to localhost. ${models.length} models installed. Preferred Coder (${EXACT_GEMMA4_CODER_MODEL_ID}): ${coderInstalled ? "VERIFIED" : "NOT FOUND"}`,
        installedModels: models,
      };
    } catch (err: any) {
      return { status: "OFFLINE", message: "Local Ollama daemon is offline or unreachable at 127.0.0.1:11434.", installedModels: [] };
    }
  }

  async getPreferredModel(taskType: "coding" | "general" = "coding"): Promise<string> {
    const health = await this.checkHealth();
    if (health.status !== "ONLINE" || !health.installedModels) {
      return EXACT_GEMMA4_CODER_MODEL_ID;
    }

    if (taskType === "coding") {
      for (const m of LOCAL_CODING_FALLBACK_CHAIN) {
        if (health.installedModels.includes(m)) {
          return m;
        }
      }
    }

    if (health.installedModels.includes(EXACT_GEMMA4_CODER_MODEL_ID)) {
      return EXACT_GEMMA4_CODER_MODEL_ID;
    }

    // Return first non-embedding model
    const nonEmbedding = health.installedModels.filter(m => !m.includes("embed"));
    return nonEmbedding[0] || EXACT_GEMMA4_CODER_MODEL_ID;
  }

  async generateText(
    prompt: string,
    systemInstruction?: string,
    jsonMode?: boolean,
    modelOverride?: string
  ): Promise<{ text: string; model: string; inputTokens?: number; outputTokens?: number }> {
    const health = await this.checkHealth();
    if (health.status !== "ONLINE") {
      throw new Error("OLLAMA_LOCAL_OFFLINE: Local Ollama daemon is not running on 127.0.0.1:11434.");
    }

    const model = modelOverride || await this.getPreferredModel("coding");
    const baseUrl = this.getBaseUrl();

    // Attach Frontend Design Quality Policy if instruction is provided
    const effectiveSystem = systemInstruction
      ? `${systemInstruction}\n\n${FRONTEND_DESIGN_QUALITY_POLICY}`
      : FRONTEND_DESIGN_QUALITY_POLICY;

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system: effectiveSystem,
        format: jsonMode ? "json" : undefined,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Local Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      text: data.response || "",
      model: data.model || model,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
    };
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

    parsed.reasoningSummary = parsed.reasoningSummary || "Strategic sequential workflow generated by CEO Agent via Local Ollama.";

    return parsed;
  }
}

export const ollamaLocalProvider = new OllamaLocalProvider();