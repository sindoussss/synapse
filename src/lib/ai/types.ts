import { Agent, TaskPriority, OperationalEnvironment } from "@/data/types";

export type AllowedProviderId = "groq" | "gemini_free" | "ollama_local";

export type DisabledProviderId = 
  | "openai" 
  | "anthropic" 
  | "xai" 
  | "deepseek_direct" 
  | "openrouter" 
  | "ollama_cloud" 
  | "paid_gemini" 
  | "unknown_provider";

export type BillingMode = "free_tier" | "local" | "provider_free_or_configured";

export type ProviderHealth = 
  | "ONLINE" 
  | "RATE_LIMITED" 
  | "QUOTA_EXHAUSTED" 
  | "OFFLINE" 
  | "NOT_CONFIGURED";

export type ModelCapability = 
  | "structured_output" 
  | "reasoning" 
  | "code_generation" 
  | "fast_inference" 
  | "large_context";

export interface ModelRegistryEntry {
  provider: AllowedProviderId;
  modelId: string;
  displayName: string;
  billingMode: BillingMode;
  location: "cloud" | "localhost";
  enabled: boolean;
  available: boolean;
  capabilities: ModelCapability[];
  lastHealthCheck: string;
  priority: number;
  taskClasses: string[];
}

export interface ExecutionTelemetry {
  agentRole: string;
  taskType: string;
  provider: AllowedProviderId;
  model: string;
  billingMode: BillingMode;
  location: "cloud" | "localhost";
  startedAt: string;
  finishedAt: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd: number | "UNKNOWN_HARDWARE_COST" | 0;
  fallbackCount: number;
  status: "SUCCESS" | "RATE_LIMITED" | "FAILED" | "WAITING_PROVIDER";
  error?: string;
}

export interface CEOPlanTask {
  title: string;
  description: string;
  type: string;
  priority: TaskPriority;
  assignedAgentRole: string;
  input: Record<string, any>;
  environment?: OperationalEnvironment;
}

import { PlanValidationResult } from "./entity-verification.types";

export interface CEOPlanOutput {
  goalSummary: string;
  reasoningSummary: string;
  tasks: CEOPlanTask[];
  telemetry?: ExecutionTelemetry;
  validation?: PlanValidationResult;
  environment?: OperationalEnvironment;
}

export interface LLMProvider {
  readonly id: AllowedProviderId;
  readonly name: string;
  readonly billingMode: BillingMode;
  isConfigured(): boolean;
  checkHealth(): Promise<{ status: ProviderHealth; message?: string; installedModels?: string[] }>;
  generatePlan(prompt: string, agents: Agent[]): Promise<CEOPlanOutput>;
  generateText(prompt: string, systemInstruction?: string, jsonMode?: boolean): Promise<{ text: string; model: string; inputTokens?: number; outputTokens?: number }>;
}