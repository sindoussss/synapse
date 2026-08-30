import { Agent } from "@/data/types";
import { AllowedProviderId, CEOPlanOutput, ExecutionTelemetry, LLMProvider, ProviderHealth } from "./types";
import { geminiFreeProvider } from "./providers/gemini.provider";
import { groqProvider } from "./providers/groq.provider";
import { ollamaLocalProvider } from "./providers/ollama.provider";
import { EXACT_GEMMA4_CODER_MODEL_ID } from "./model-registry";

export const ALLOWED_PROVIDERS: AllowedProviderId[] = ["groq", "gemini_free", "ollama_local"];

export const FORBIDDEN_PROVIDERS = [
  "openai",
  "anthropic",
  "xai",
  "deepseek_direct",
  "openrouter",
  "ollama_cloud",
  "paid_gemini",
];

export const AGENT_ROUTING_POLICIES: Record<string, {
  policyName: string;
  preferredProvider: AllowedProviderId;
  preferredModelName: string;
  routeOrder: AllowedProviderId[];
  taskClasses: string[];
}> = {
  "agent-ceo": {
    policyName: "High Reasoning Strategy",
    preferredProvider: "gemini_free",
    preferredModelName: "Gemini 3.5 Flash Lite (Free Tier)",
    routeOrder: ["gemini_free", "groq", "ollama_local"],
    taskClasses: ["strategic_planning", "risk_evaluation", "budgeting"],
  },
  "agent-research": {
    policyName: "High Speed Synthesis",
    preferredProvider: "groq",
    preferredModelName: "Llama 3.3 70B Versatile",
    routeOrder: ["groq", "gemini_free", "ollama_local"],
    taskClasses: ["directory_crawling", "lead_enrichment", "domain_discovery"],
  },
  "agent-analyst": {
    policyName: "Deterministic Local First",
    preferredProvider: "ollama_local",
    preferredModelName: "Llama 3.2 3B (Localhost)",
    routeOrder: ["ollama_local", "groq", "gemini_free"],
    taskClasses: ["technical_audit", "seo_heuristics", "data_normalization"],
  },
  "agent-developer": {
    policyName: "Local Coding & Prototype Synthesis",
    preferredProvider: "ollama_local",
    preferredModelName: "Gemma4 12B Coder Q4_K_M (Localhost)",
    routeOrder: ["ollama_local", "gemini_free", "groq"],
    taskClasses: ["prototype_synthesis", "component_scaffolding", "code_review", "frontend_implementation"],
  },
  "agent-sales": {
    policyName: "Copywriting & Cadence",
    preferredProvider: "groq",
    preferredModelName: "Llama 3.3 70B Versatile",
    routeOrder: ["groq", "gemini_free", "ollama_local"],
    taskClasses: ["personalized_outreach", "objection_handling", "value_prop"],
  },
};

export class ModelRouter {
  private providers: Record<AllowedProviderId, LLMProvider> = {
    gemini_free: geminiFreeProvider,
    groq: groqProvider,
    ollama_local: ollamaLocalProvider,
  };

  validateProviderRequest(providerId: string): AllowedProviderId {
    const normalized = providerId.toLowerCase().trim();
    if (FORBIDDEN_PROVIDERS.includes(normalized)) {
      throw new Error(`BLOCKED_PROVIDER: Provider '${providerId}' is disabled by Synapse AI Policy. Only Groq, Gemini Free, and Local Ollama are permitted.`);
    }
    if (!ALLOWED_PROVIDERS.includes(normalized as AllowedProviderId)) {
      throw new Error(`UNKNOWN_OR_UNAPPROVED_PROVIDER: Provider '${providerId}' is not in the approved allowlist.`);
    }
    return normalized as AllowedProviderId;
  }

  async getAllProvidersHealth(): Promise<Record<AllowedProviderId, { status: ProviderHealth; message?: string; installedModels?: string[] }>> {
    const [geminiHealth, groqHealth, ollamaHealth] = await Promise.all([
      geminiFreeProvider.checkHealth(),
      groqProvider.checkHealth(),
      ollamaLocalProvider.checkHealth(),
    ]);

    return {
      gemini_free: geminiHealth,
      groq: groqHealth,
      ollama_local: ollamaHealth,
    };
  }

  getAgentRoutingInfo(agentId: string) {
    const policy = AGENT_ROUTING_POLICIES[agentId] || {
      policyName: "Balanced Routing",
      preferredProvider: "ollama_local" as AllowedProviderId,
      preferredModelName: "Gemma4 12B Coder (Localhost)",
      routeOrder: ["ollama_local", "gemini_free", "groq"] as AllowedProviderId[],
      taskClasses: ["general_inference"],
    };

    return {
      policyName: policy.policyName,
      preferredProvider: policy.preferredProvider,
      preferredModelName: policy.preferredModelName,
      routeOrder: policy.routeOrder,
      displayRoute: policy.routeOrder
        .map((p) => (p === "ollama_local" ? "Ollama Local (Gemma4-Coder)" : p === "gemini_free" ? "Gemini Free" : "Groq"))
        .join(" → "),
    };
  }

  async executePlanWithRouting(prompt: string, agents: Agent[], requestedAgentId = "agent-ceo"): Promise<CEOPlanOutput> {
    const policy = AGENT_ROUTING_POLICIES[requestedAgentId] || AGENT_ROUTING_POLICIES["agent-ceo"];
    const routeOrder = policy.routeOrder;
    let fallbackCount = 0;
    const errors: string[] = [];

    const startTime = Date.now();

    for (const providerId of routeOrder) {
      const provider = this.providers[providerId];
      if (!provider) continue;

      if (!provider.isConfigured() && providerId !== "ollama_local") {
        errors.push(`${provider.name}: Not configured with API key`);
        fallbackCount++;
        continue;
      }

      try {
        const plan = await provider.generatePlan(prompt, agents);
        const latencyMs = Date.now() - startTime;

        const telemetry: ExecutionTelemetry = {
          agentRole: requestedAgentId,
          taskType: "CEO Strategic Planning",
          provider: providerId,
          model: providerId === "ollama_local"
            ? EXACT_GEMMA4_CODER_MODEL_ID
            : providerId === "gemini_free"
            ? "gemini-3.5-flash-lite"
            : "llama-3.3-70b-versatile",
          billingMode: provider.billingMode,
          location: providerId === "ollama_local" ? "localhost" : "cloud",
          startedAt: new Date(startTime).toISOString(),
          finishedAt: new Date().toISOString(),
          latencyMs,
          estimatedCostUsd: providerId === "gemini_free" ? 0 : providerId === "ollama_local" ? "UNKNOWN_HARDWARE_COST" : 0,
          fallbackCount,
          status: "SUCCESS",
        };

        plan.telemetry = telemetry;
        return plan;
      } catch (err: any) {
        errors.push(`${provider.name}: ${err?.message || "Execution failed"}`);
        fallbackCount++;
      }
    }

    throw new Error(`WAITING_PROVIDER: All allowed providers (${routeOrder.join(", ")}) failed or are unavailable. Errors: ${errors.join("; ")}`);
  }
}

export const modelRouter = new ModelRouter();