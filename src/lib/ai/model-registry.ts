import { AllowedProviderId, BillingMode, ModelCapability } from "./types";

export type ModelCategory = "coding" | "reasoning" | "chat" | "embedding" | "vision";

export interface RegisteredModel {
  provider: AllowedProviderId;
  modelId: string;
  displayName: string;
  category: ModelCategory;
  billingMode: BillingMode;
  location: "local" | "cloud";
  capabilities: string[];
  priority: number;
  isPreferredForRole?: string;
  isEmbeddingOnly?: boolean;
}

export const EXACT_GEMMA4_CODER_MODEL_ID = "hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M";

export const LOCAL_CODING_FALLBACK_CHAIN = [
  EXACT_GEMMA4_CODER_MODEL_ID,
  "deepseek-coder:6.7b",
  "qwen2.5:7b",
];

export const MODEL_REGISTRY: RegisteredModel[] = [
  // --- Local Ollama Coding Models ---
  {
    provider: "ollama_local",
    modelId: EXACT_GEMMA4_CODER_MODEL_ID,
    displayName: "Gemma4 12B Coder (Q4_K_M)",
    category: "coding",
    billingMode: "local",
    location: "local",
    capabilities: [
      "coding",
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "Tailwind",
      "debugging",
      "refactoring",
      "frontend implementation",
      "structured code generation",
    ],
    priority: 1,
    isPreferredForRole: "agent-developer",
  },
  {
    provider: "ollama_local",
    modelId: "deepseek-coder:6.7b",
    displayName: "DeepSeek Coder 6.7B",
    category: "coding",
    billingMode: "local",
    location: "local",
    capabilities: ["coding", "code_review", "refactoring", "TypeScript", "Python"],
    priority: 2,
  },
  {
    provider: "ollama_local",
    modelId: "qwen2.5:7b",
    displayName: "Qwen 2.5 7B",
    category: "coding",
    billingMode: "local",
    location: "local",
    capabilities: ["coding", "multilingual", "structured_extraction", "reasoning"],
    priority: 3,
  },

  // --- Local Ollama Chat / Reasoning Models ---
  {
    provider: "ollama_local",
    modelId: "deepseek-r1:14b",
    displayName: "DeepSeek R1 14B (Reasoning)",
    category: "reasoning",
    billingMode: "local",
    location: "local",
    capabilities: ["deep_reasoning", "chain_of_thought", "math", "analysis"],
    priority: 1,
  },
  {
    provider: "ollama_local",
    modelId: "mistral:7b",
    displayName: "Mistral 7B Instruct",
    category: "chat",
    billingMode: "local",
    location: "local",
    capabilities: ["general_chat", "instruction_following", "summarization"],
    priority: 4,
  },
  {
    provider: "ollama_local",
    modelId: "llama3.2:latest",
    displayName: "Llama 3.2 3B (Lightweight)",
    category: "chat",
    billingMode: "local",
    location: "local",
    capabilities: ["fast_inference", "summarization", "classification"],
    priority: 5,
    isPreferredForRole: "agent-analyst",
  },
  {
    provider: "ollama_local",
    modelId: "qwen2.5:3b",
    displayName: "Qwen 2.5 3B (Fast)",
    category: "chat",
    billingMode: "local",
    location: "local",
    capabilities: ["fast_inference", "formatting", "data_cleaning"],
    priority: 6,
  },

  // --- Local Ollama Embedding Model (Strictly Non-Chat) ---
  {
    provider: "ollama_local",
    modelId: "nomic-embed-text:latest",
    displayName: "Nomic Embed Text",
    category: "embedding",
    billingMode: "local",
    location: "local",
    capabilities: ["vector_embeddings", "semantic_similarity"],
    priority: 10,
    isEmbeddingOnly: true,
  },

  // --- Cloud Free & Configured Models ---
  {
    provider: "gemini_free",
    modelId: "gemini-3.5-flash-lite",
    displayName: "Google Gemini 3.5 Flash Lite (Free Tier)",
    category: "reasoning",
    billingMode: "free_tier",
    location: "cloud",
    capabilities: ["high_reasoning", "complex_planning", "structured_json", "multimodal"],
    priority: 1,
    isPreferredForRole: "agent-ceo",
  },
  {
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    displayName: "Groq Llama 3.3 70B Versatile",
    category: "chat",
    billingMode: "provider_free_or_configured",
    location: "cloud",
    capabilities: ["fast_inference", "copywriting", "outreach_drafts", "research_synthesis"],
    priority: 1,
    isPreferredForRole: "agent-research",
  },
];