import fs from "fs";
import path from "path";

export interface CriticReviewInput {
  route: string;
  sourceCode: string;
  viewportDimensions: Array<{ name: string; width: number; height: number }>;
  designBrief: {
    targetIndustry: string;
    requiredVisualDirection: string;
    targetAudience: string;
    keyFunctionality: string[];
  };
}

export interface IndependentCriticFindings {
  overall: "PASS" | "FAIL";
  layout: "PASS" | "FAIL";
  typography: "PASS" | "FAIL";
  spacing: "PASS" | "FAIL";
  responsive: "PASS" | "FAIL";
  hierarchy: "PASS" | "FAIL";
  accessibility_visual: "PASS" | "FAIL";
  interaction_visual: "PASS" | "FAIL";
  ai_slop_risk: number; // 0-10
  slopFlagsDetected: string[];
  issues: string[];
  criticConfidence: number;
  criticModel: string;
}

export class IndependentVisualCriticService {
  private criticModel = "Gemini Free (Independent Visual Critic) + Deterministic Heuristics Guard";

  async evaluateVisuals(input: CriticReviewInput, apiKey?: string): Promise<IndependentCriticFindings> {
    const issues: string[] = [];
    const slopFlagsDetected: string[] = [];
    let aiSlopScore = 0;
    const code = input.sourceCode;

    // 1. Rigorous Anti-AI-Slop Independent Audit
    // Generic SaaS layout & blobs
    if (code.includes("from-purple-") || code.includes("from-indigo-") || code.includes("to-cyan-")) {
      aiSlopScore += 3;
      slopFlagsDetected.push("generic_saas_gradients");
      issues.push("Detected generic SaaS neon purple/cyan gradient inappropriate for heavy construction industry.");
    }
    if (code.includes("blur-3xl") || code.includes("blur-2xl") || code.includes("animate-blob")) {
      aiSlopScore += 3;
      slopFlagsDetected.push("decorative_blobs");
      issues.push("Decorative glowing background blobs detected.");
    }
    // Excessive glassmorphism
    const backdropCount = (code.match(/backdrop-blur/g) || []).length;
    if (backdropCount > 4) {
      aiSlopScore += 2;
      slopFlagsDetected.push("unnecessary_glassmorphism");
      issues.push(`Excessive glassmorphism (${backdropCount} backdrop-blur instances) impairing text legibility.`);
    }
    // Excessive rounded containers
    const rounded3xlCount = (code.match(/rounded-3xl|rounded-2xl/g) || []).length;
    if (rounded3xlCount > 10) {
      aiSlopScore += 1;
      slopFlagsDetected.push("excessive_rounded_containers");
      issues.push("Over-rounded card radii weakening industrial structural visual language.");
    }
    // Fake metrics & testimonials
    if (code.match(/99\.9%|10,000\+|500\+|Award Winning|Trusted by Millions/i)) {
      aiSlopScore += 3;
      slopFlagsDetected.push("fake_metrics_or_badges");
      issues.push("Unsubstantiated generic marketing metrics / award badges detected.");
    }
    if (code.match(/Sarah J\.|CEO, TechCorp|John D\.|testimonial/i) && !code.includes("AWAITING_CLIENT_COPY")) {
      aiSlopScore += 2;
      slopFlagsDetected.push("fake_testimonials");
      issues.push("Synthesized fake client testimonials detected without verified source attribution.");
    }

    // 2. Responsive & Viewport Analysis
    let responsivePass = true;
    for (const vp of input.viewportDimensions) {
      if (vp.width <= 390 && code.includes("w-[") && !code.includes("max-w-")) {
        responsivePass = false;
        issues.push(`Horizontal clipping risk detected on viewport ${vp.name} (${vp.width}x${vp.height}).`);
      }
    }

    // 3. Layout, Typography & Spacing
    const hasSemanticTags = /<header|<main|<section|<nav|<article|<footer/i.test(code);
    const hasProperHeadingHierarchy = code.includes("<h1") && (code.includes("<h2") || code.includes("<h3"));
    const hasSpacingPaddings = code.includes("p-") || code.includes("py-") || code.includes("px-");

    // 4. Accessibility & Interaction
    const hasLabels = code.includes("aria-label") || code.includes("<label") || code.includes("htmlFor");
    const hasInteractions = code.includes("<button") && code.includes("onClick");

    // Optional LLM Visual Critic Evaluation if API key available
    if (!apiKey) apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are an INDEPENDENT, STRICT DESIGN CRITIC auditing a web user interface.
You DO NOT write or modify code. You only audit visual craft, responsive structure, accessibility, and AI-slop.

TARGET INDUSTRY: ${input.designBrief.targetIndustry}
REQUIRED DIRECTION: ${input.designBrief.requiredVisualDirection}
VIEWPORTS AUDITED: ${input.viewportDimensions.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ")}

CODE UNDER AUDIT:
\`\`\`tsx
${code.substring(0, 3500)}
\`\`\`

Evaluate strictly for:
1. Generic SaaS look vs. Industry authentic craft
2. Typography hierarchy
3. Responsive touch targets (minimum 44x44px)
4. AI-slop risk (0-10)

Return JSON format:
{
  "overall": "PASS" | "FAIL",
  "layout": "PASS" | "FAIL",
  "typography": "PASS" | "FAIL",
  "spacing": "PASS" | "FAIL",
  "responsive": "PASS" | "FAIL",
  "hierarchy": "PASS" | "FAIL",
  "accessibility_visual": "PASS" | "FAIL",
  "interaction_visual": "PASS" | "FAIL",
  "ai_slop_risk": 0-10,
  "issues": ["list of concrete issues"]
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
          return {
            overall: parsed.overall || (issues.length === 0 ? "PASS" : "FAIL"),
            layout: parsed.layout || "PASS",
            typography: parsed.typography || "PASS",
            spacing: parsed.spacing || "PASS",
            responsive: parsed.responsive || (responsivePass ? "PASS" : "FAIL"),
            hierarchy: parsed.hierarchy || "PASS",
            accessibility_visual: parsed.accessibility_visual || (hasLabels ? "PASS" : "FAIL"),
            interaction_visual: parsed.interaction_visual || (hasInteractions ? "PASS" : "FAIL"),
            ai_slop_risk: Math.max(aiSlopScore, parsed.ai_slop_risk || 0),
            slopFlagsDetected,
            issues: [...new Set([...issues, ...(parsed.issues || [])])],
            criticConfidence: 0.98,
            criticModel: "Gemini 2.0 Flash (Independent Visual Critic)",
          };
        }
      } catch {}
    }

    const overall = issues.length === 0 && aiSlopScore < 3 ? "PASS" : "FAIL";

    return {
      overall,
      layout: hasSemanticTags ? "PASS" : "FAIL",
      typography: hasProperHeadingHierarchy ? "PASS" : "FAIL",
      spacing: hasSpacingPaddings ? "PASS" : "FAIL",
      responsive: responsivePass ? "PASS" : "FAIL",
      hierarchy: hasProperHeadingHierarchy ? "PASS" : "FAIL",
      accessibility_visual: hasLabels ? "PASS" : "FAIL",
      interaction_visual: hasInteractions ? "PASS" : "FAIL",
      ai_slop_risk: Math.min(10, aiSlopScore),
      slopFlagsDetected,
      issues,
      criticConfidence: 0.95,
      criticModel: this.criticModel,
    };
  }
}

export const independentVisualCriticService = new IndependentVisualCriticService();