import { LLMProvider } from "./types";
import { geminiFreeProvider } from "./providers/gemini.provider";

let currentProvider: LLMProvider = geminiFreeProvider;

export function getLLMProvider(): LLMProvider {
  return currentProvider;
}

export function setLLMProvider(provider: LLMProvider): void {
  currentProvider = provider;
}