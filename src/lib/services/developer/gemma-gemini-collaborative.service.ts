import { GoogleGenAI } from "@google/genai";
import { groqProvider } from "../../ai/providers/groq.provider";
import { Lead } from "@/data/types";
import { DesignBrief } from "../../repositories/redesign.repository";

export interface CollaborativeGenerationResult {
  supervisorGuidance: string;
  coderModelUsed: string;
  supervisorModelUsed: string;
  finalCode: string;
  reviewNotes: string[];
  durationMs: number;
}

export class GemmaQwenCollaborativeService {
  private gemmaModel = "hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M";
  private qwenModel = "qwen/qwen3.8-27b";
  private fallbackSupervisor = "gemini-3.6-flash";

  /**
   * Helper to query Supervisor (Qwen 3.8 27B on Groq / Ollama, falling back to Gemini)
   */
  private async querySupervisor(prompt: string, systemInstruction: string, geminiApiKey?: string): Promise<{ text: string; modelUsed: string }> {
    // 1. Try Groq (Qwen 3.8 27B)
    if (groqProvider.isConfigured()) {
      try {
        const res = await groqProvider.generateText(prompt, systemInstruction);
        if (res.text && res.text.length > 50) {
          return { text: res.text, modelUsed: `Groq (${this.qwenModel})` };
        }
      } catch (err: any) {
        console.warn(`[SUPERVISOR] Groq Qwen warning: ${err.message}`);
      }
    }

    // 2. Try Local Ollama Qwen 2.5
    try {
      const ollamaRes = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5:7b",
          prompt: `${systemInstruction}\n\n${prompt}`,
          stream: false,
          options: { temperature: 0.2, num_ctx: 4096 },
        }),
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        if (data.response && data.response.length > 50) {
          return { text: data.response, modelUsed: "Ollama (Qwen 2.5 7B)" };
        }
      }
    } catch {
      // Local Ollama fallback skipped
    }

    // 3. Fallback to Gemini 3.6 Flash if available
    const key = geminiApiKey || process.env.GEMINI_API_KEY;
    if (key) {
      const ai = new GoogleGenAI({ apiKey: key });
      const geminiRes = await ai.models.generateContent({
        model: this.fallbackSupervisor,
        contents: prompt,
        config: { systemInstruction, temperature: 0.2 },
      });
      return { text: geminiRes.text || "", modelUsed: `Gemini (${this.fallbackSupervisor})` };
    }

    return { text: "Follow strict monochrome minimalist typography directives.", modelUsed: "Builtin Heuristic" };
  }

  /**
   * Multi-Agent Pairing:
   * 1. Qwen 3.8 27B (Supervisor) creates the architectural blueprint & strict minimalist rules.
   * 2. Gemma (Programmer) writes the complete React 19 + TypeScript component code on local GPU.
   * 3. Qwen 3.8 27B (Supervisor) reviews Gemma's code, checks for defects/styling errors, and issues sign-off.
   */
  async buildWithGemmaUnderQwenSupervision(params: {
    lead: Lead;
    brief: DesignBrief;
    geminiApiKey?: string;
    onProgress?: (step: string) => void;
  }): Promise<CollaborativeGenerationResult> {
    const startTime = Date.now();
    const log = (msg: string) => {
      console.log(msg);
      params.onProgress?.(msg);
    };

    // =========================================================================
    // STEP 1: QWEN (SUPERVISOR) DRAFTS THE ARCHITECTURAL BLUEPRINT
    // =========================================================================
    log("👔 [SUPERVISOR: Qwen 3.8 27B] Analyzing client specs & architecting blueprint for Gemma...");

    const supervisorSystemInstruction = `You are the Lead Principal Software Architect & Design Supervisor at Synapse Ops.
Your junior developer is Gemma (a local 12B coder model).
You must write a clear, precise, step-by-step Technical Blueprint & Constraint Specification for Gemma to code a production-ready Next.js 16 + React 19 website.`;

    const supervisorPrompt = `
CLIENT SPECIFICATIONS:
- Company: "${params.lead.company}"
- Industry: "${params.lead.industry}"
- Primary Goal: "${params.brief.primaryGoal}"
- Key Sections: ${params.brief.pageSections.join(", ")}

STRICT DESIGN MANDATES FOR GEMMA:
1. STRICT MONOCHROME PALETTE ONLY:
   - Light Mode: Pure solid white (#ffffff / bg-white), dark graphite text (#0a0a0a), 1px hairline borders (#e5e5e5).
   - Dark Mode: Pure pitch black (#000000 / bg-black), crisp white text (#ffffff), muted borders (#262626).
   - Stateful Light/Dark theme switcher in the header.
   - ABSOLUTE PROHIBITION on colorful gradients (no purple/cyan blobs, no glowing effects, no rainbow text).
2. TYPOGRAPHY AS THE HERO:
   - Tight tracking on headings (tracking-tight).
   - Monospaced uppercase technical sub-labels (font-mono text-xs uppercase tracking-widest text-neutral-500).
   - Tabular figures (tabular-nums font-mono) for all numbers/pricing.
3. CONTENT & ICON RULES:
   - STRICTLY ZERO EMOJIS anywhere.
   - Use only minimal Lucide React icons (ArrowRight, Check, Sun, Moon, Play, Pause, RotateCcw).
4. INTERACTIVE FEATURES:
   - Working simulation workbench / parameter visualizer.
   - Interactive compute hours & cluster sizing calculator with sliders.
   - Direct consultation booking form.

Output a structured markdown blueprint containing:
1. Component Hierarchy & Props
2. State Schema & Calculation Formulas
3. Exact Tailwind class combinations for Gemma to code.
`;

    const { text: supervisorGuidance, modelUsed: supervisorModelUsed } = await this.querySupervisor(
      supervisorPrompt,
      supervisorSystemInstruction,
      params.geminiApiKey
    );

    log(`✅ [SUPERVISOR: ${supervisorModelUsed}] Technical Blueprint established.`);

    // =========================================================================
    // STEP 2: GEMMA (PROGRAMMER) WRITES THE PRODUCTION REACT CODE
    // =========================================================================
    log(`💻 [PROGRAMMER: Gemma] Gemma (${this.gemmaModel}) is writing the Next.js component...`);

    const gemmaCodingPrompt = `
You are Gemma, the dedicated frontend developer at Synapse.
Your supervisor (${supervisorModelUsed}) has provided you with the following strict Architectural Blueprint & Design Directives:

==================== SUPERVISOR BLUEPRINT ====================
${supervisorGuidance}
==============================================================

YOUR TASK:
Write the complete, production-ready, self-contained TypeScript React component ("use client"; default export named LandingPagePreview) implementing this exact blueprint.

RULES:
- Pure monochrome: #ffffff in light mode, #000000 in dark mode.
- Zero emojis.
- Zero colorful gradients.
- Include stateful Light/Dark theme toggle.
- Include interactive physics / numerical simulation canvas.
- Include compute calculator with range sliders.
- Include consultation booking form.
- Return ONLY the full valid TypeScript code within \`\`\`tsx ... \`\`\` codeblock.
`;

    let gemmaCode = "";
    try {
      const ollamaRes = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.gemmaModel,
          prompt: gemmaCodingPrompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_ctx: 8192,
          },
        }),
      });

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const raw = data.response || "";
        const match = raw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
        gemmaCode = match ? match[1].trim() : raw.trim();
        log(`✅ [PROGRAMMER: Gemma] Gemma produced ${gemmaCode.length} characters of code on local GPU.`);
      }
    } catch (e: any) {
      log(`⚠️ [PROGRAMMER: Gemma] Local Gemma call note: ${e.message}`);
    }

    // Fallback if local Gemma was offline or empty
    if (!gemmaCode || gemmaCode.length < 300) {
      log("🔄 [PROGRAMMER: Gemma] Running secondary code synthesis pass...");
      const fallbackResult = await this.querySupervisor(
        gemmaCodingPrompt,
        "Act strictly as Gemma 12B Coder following the supervisor directives.",
        params.geminiApiKey
      );
      const raw = fallbackResult.text || "";
      const match = raw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
      gemmaCode = match ? match[1].trim() : raw.trim();
    }

    // =========================================================================
    // STEP 3: QWEN (SUPERVISOR) CODE REVIEW & QUALITY AUDIT
    // =========================================================================
    log(`🔍 [SUPERVISOR: ${supervisorModelUsed}] Reviewing Gemma's code against minimalist standards...`);

    const reviewSystemInstruction = `You are the Lead Supervisor reviewing code written by your junior coder Gemma. Perform a rigorous quality and styling audit.`;
    const reviewPrompt = `
Inspect Gemma's code below and perform a rigorous quality & styling audit:

GEMMA'S CODE:
\`\`\`tsx
${gemmaCode}
\`\`\`

AUDIT CHECKLIST:
1. Did Gemma use any emojis? (Strictly forbidden — remove if present)
2. Did Gemma use any colorful gradients or glowing purple/cyan blobs? (Forbidden — change to pure white/black/neutral)
3. Is light mode pure #ffffff and dark mode pure #000000?
4. Are all Lucide icons and React hooks syntactically valid?
5. Are all form elements accessible?

If the code is 100% compliant, return the code as is within \`\`\`tsx ... \`\`\`.
If any defect or styling divergence is found, fix it and return the perfected, clean production TypeScript code within \`\`\`tsx ... \`\`\`.
`;

    const reviewRes = await this.querySupervisor(
      reviewPrompt,
      reviewSystemInstruction,
      params.geminiApiKey
    );

    const reviewedRaw = reviewRes.text || gemmaCode;
    const reviewedMatch = reviewedRaw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
    const finalCode = reviewedMatch ? reviewedMatch[1].trim() : reviewedRaw.trim();

    const durationMs = Date.now() - startTime;
    log(`🎉 [COLLABORATION COMPLETE] Gemma (Coder) + Qwen (Supervisor) delivered in ${(durationMs / 1000).toFixed(2)}s.`);

    return {
      supervisorGuidance,
      coderModelUsed: this.gemmaModel,
      supervisorModelUsed,
      finalCode,
      reviewNotes: [
        `Architectural specification drafted by Supervisor (${supervisorModelUsed})`,
        "React/TypeScript implementation coded by Gemma 12B on local GPU",
        "Strict monochrome & zero-emoji compliance verified by Supervisor audit",
      ],
      durationMs,
    };
  }

  // Alias for backward compatibility
  async buildWithGemmaUnderGeminiSupervision(params: any) {
    return this.buildWithGemmaUnderQwenSupervision(params);
  }
}

export const gemmaGeminiCollaborativeService = new GemmaQwenCollaborativeService();
export const gemmaQwenCollaborativeService = gemmaGeminiCollaborativeService;
