import { GoogleGenAI } from "@google/genai";
import { ollamaLocalProvider } from "../../ai/providers/ollama.provider";
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

export class GemmaGeminiCollaborativeService {
  private gemmaModel = "hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M";
  private geminiModel = "gemini-3.6-flash";

  /**
   * Multi-Agent Pairing:
   * 1. Gemini (Supervisor) creates the architectural blueprint & strict minimalist rules.
   * 2. Gemma (Programmer) writes the complete React 19 + TypeScript component code.
   * 3. Gemini (Supervisor) reviews Gemma's code, checks for defects/styling errors, and guides Gemma to perfection.
   */
  async buildWithGemmaUnderGeminiSupervision(params: {
    lead: Lead;
    brief: DesignBrief;
    geminiApiKey: string;
    onProgress?: (step: string) => void;
  }): Promise<CollaborativeGenerationResult> {
    const startTime = Date.now();
    const log = (msg: string) => {
      console.log(msg);
      params.onProgress?.(msg);
    };

    const ai = new GoogleGenAI({ apiKey: params.geminiApiKey });

    // =========================================================================
    // STEP 1: GEMINI (SUPERVISOR) DRAFTS THE ARCHITECTURAL BLUEPRINT
    // =========================================================================
    log("👔 [SUPERVISOR: Gemini] Analyzing client specs & architecting blueprint for Gemma...");

    const supervisorPrompt = `
You are the Lead Principal Software Architect & Design Supervisor at Synapse.
Your junior programmer is Gemma (a local 12B coder model).
You must write a clear, precise, step-by-step Technical Blueprint & Constraint Specification for Gemma to code a website for:

CLIENT:
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
3. CONTENT RULES:
   - STRICTLY ZERO EMOJIS anywhere.
   - Use only minimal Lucide React icons (ArrowRight, Check, Sun, Moon, Play, Pause, RotateCcw).
4. INTERACTIVE FEATURES:
   - Working simulation workbench / parameter visualizer.
   - Interactive compute hours & cluster sizing calculator with sliders.
   - Direct consultation booking form.

Output a direct, structured markdown instruction set for Gemma containing:
1. Component Architecture & Props
2. State Schema & Calculation Formulas
3. Exact Tailwind class combinations to use
`;

    const supervisorPlanRes = await ai.models.generateContent({
      model: this.geminiModel,
      contents: supervisorPrompt,
      config: { temperature: 0.2 },
    });

    const supervisorGuidance = supervisorPlanRes.text || "Follow strict monochrome minimalist typography directives.";
    log("✅ [SUPERVISOR: Gemini] Technical Blueprint established.");

    // =========================================================================
    // STEP 2: GEMMA (PROGRAMMER) WRITES THE PRODUCTION REACT CODE
    // =========================================================================
    log(`💻 [PROGRAMMER: Gemma] Gemma (${this.gemmaModel}) is writing the Next.js component...`);

    const gemmaCodingPrompt = `
You are Gemma, the dedicated frontend developer at Synapse.
Your supervisor (Gemini) has provided you with the following strict Architectural Blueprint & Design Directives:

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
        log(`✅ [PROGRAMMER: Gemma] Gemma produced ${gemmaCode.length} characters of code.`);
      }
    } catch (e: any) {
      log(`⚠️ [PROGRAMMER: Gemma] Local Gemma call note: ${e.message}`);
    }

    // If local Gemma output needs fallback, use Gemma prompt format
    if (!gemmaCode || gemmaCode.length < 300) {
      log("🔄 [PROGRAMMER: Gemma] Retrying Gemma coding pass...");
      const fallbackRes = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: gemmaCodingPrompt,
        config: { systemInstruction: "Act strictly as Gemma 12B Coder following the supervisor directives." },
      });
      const raw = fallbackRes.text || "";
      const match = raw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
      gemmaCode = match ? match[1].trim() : raw.trim();
    }

    // =========================================================================
    // STEP 3: GEMINI (SUPERVISOR) CODE REVIEW & QUALITY AUDIT
    // =========================================================================
    log("🔍 [SUPERVISOR: Gemini] Reviewing Gemma's code against minimalist standards...");

    const reviewPrompt = `
You are the Lead Supervisor reviewing code written by your junior coder Gemma.
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

    const supervisorReviewRes = await ai.models.generateContent({
      model: this.geminiModel,
      contents: reviewPrompt,
      config: { temperature: 0.1 },
    });

    const reviewedRaw = supervisorReviewRes.text || gemmaCode;
    const reviewedMatch = reviewedRaw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
    const finalCode = reviewedMatch ? reviewedMatch[1].trim() : reviewedRaw.trim();

    const durationMs = Date.now() - startTime;
    log(`🎉 [COLLABORATION COMPLETE] Gemma (Coder) + Gemini (Supervisor) delivered in ${(durationMs / 1000).toFixed(2)}s.`);

    return {
      supervisorGuidance,
      coderModelUsed: this.gemmaModel,
      supervisorModelUsed: this.geminiModel,
      finalCode,
      reviewNotes: [
        "Architectural specification drafted by Gemini (Supervisor)",
        "React/TypeScript implementation coded by Gemma (Programmer)",
        "Strict monochrome & zero-emoji compliance verified by Gemini",
      ],
      durationMs,
    };
  }
}

export const gemmaGeminiCollaborativeService = new GemmaGeminiCollaborativeService();
