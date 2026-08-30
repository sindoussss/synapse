import fs from "fs";
import path from "path";

/**
 * Provider Routing Service
 *
 * SYNAPSE uses Ollama-local as its ONLY developer model provider.
 * Gemini is used READ-ONLY for visual review (gemini-visual-critic.service.ts).
 *
 * Allowed local models:
 *   PRIMARY:   Ollama Gemma 4 12B (via hf.co GGUF)
 *   FALLBACK1: DeepSeek Coder 6.7b
 *   FALLBACK2: Qwen 2.5 7b
 *
 * Claude, OpenAI, Anthropic, and all paid external providers
 * are NOT part of SYNAPSE's runtime architecture.
 */

export type SynapseProvider = "ollama_local" | "gemini_visual_only";

export interface ProviderRouteDecision {
  primaryModel: string;
  activeModel: string;
  provider: SynapseProvider;
  isFallback: boolean;
  fallbackReason?: string;
  routingReason: string;
  status: "ROUTED" | "BLOCKED";
}

export class ProviderRoutingService {
  private readonly OLLAMA_PRIMARY = "hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M";
  private readonly OLLAMA_FALLBACK_1 = "deepseek-coder:6.7b";
  private readonly OLLAMA_FALLBACK_2 = "qwen2.5:7b";
  private readonly GEMINI_VISUAL_MODEL = "gemini-2.0-flash";

  private readonly allowedLocalModels = [
    this.OLLAMA_PRIMARY,
    this.OLLAMA_FALLBACK_1,
    this.OLLAMA_FALLBACK_2,
  ];

  // Any external paid provider not on the allowlist is BLOCKED
  private readonly FORBIDDEN_PROVIDERS = [
    "claude", "anthropic", "openai", "gpt-", "gpt4", "o1-", "o3-",
  ];

  routeDeveloperRequest(requestedModel?: string): ProviderRouteDecision {
    const target = requestedModel || this.OLLAMA_PRIMARY;
    const lower = target.toLowerCase();

    // Block explicitly forbidden providers
    if (this.FORBIDDEN_PROVIDERS.some((fp) => lower.includes(fp))) {
      return {
        primaryModel: this.OLLAMA_PRIMARY,
        activeModel: "BLOCKED",
        provider: "ollama_local",
        isFallback: false,
        fallbackReason: `FORBIDDEN_PROVIDER: '${target}' is not an approved SYNAPSE runtime provider.`,
        routingReason: "FORBIDDEN_PROVIDER_BLOCKED",
        status: "BLOCKED",
      };
    }

    // Visual-review requests always go to Gemini read-only
    if (lower.includes("gemini") || lower === "visual_review") {
      return {
        primaryModel: this.GEMINI_VISUAL_MODEL,
        activeModel: this.GEMINI_VISUAL_MODEL,
        provider: "gemini_visual_only",
        isFallback: false,
        routingReason: "VISUAL_REVIEW — Gemini read-only critic (no code generation).",
        status: "ROUTED",
      };
    }

    // Requested model not in allowlist → deterministic fallback to primary
    if (!this.allowedLocalModels.includes(target)) {
      return {
        primaryModel: this.OLLAMA_PRIMARY,
        activeModel: this.OLLAMA_FALLBACK_1,
        provider: "ollama_local",
        isFallback: true,
        fallbackReason: `Requested model '${target}' not in Ollama allowlist. Falling back to DeepSeek Coder.`,
        routingReason: "MODEL_NOT_ALLOWLISTED",
        status: "ROUTED",
      };
    }

    return {
      primaryModel: this.OLLAMA_PRIMARY,
      activeModel: target,
      provider: "ollama_local",
      isFallback: target !== this.OLLAMA_PRIMARY,
      fallbackReason: target !== this.OLLAMA_PRIMARY ? `Non-primary Ollama model selected.` : undefined,
      routingReason: target === this.OLLAMA_PRIMARY ? "PRIMARY_OLLAMA_MODEL" : "ALTERNATE_OLLAMA_MODEL",
      status: "ROUTED",
    };
  }
}

export const providerRoutingService = new ProviderRoutingService();