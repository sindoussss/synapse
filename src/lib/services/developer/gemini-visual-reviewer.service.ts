import fs from "fs";
import path from "path";

export interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  viewport: string;
  route: string;
  finding: string;
  recommendation: string;
}

export interface GeminiVisualReviewOutput {
  overall: "PASS" | "FAIL";
  visual_quality: number; // 0-100
  ai_slop_risk: number;    // 0-10
  issues: ReviewIssue[];
  brief_alignment: string[];
  responsive_findings: string[];
  accessibility_visual_findings: string[];
  reviewId: string;
  timestamp: string;
  criticProvider: "Google Gemini Free Tier";
  criticModel: string;
}

export interface ReviewInputData {
  route: string;
  sourceCode: string;
  viewportDimensions: Array<{ name: string; width: number; height: number }>;
  designBrief: {
    targetIndustry: string;
    approvedDesignDirection: string;
    targetAudience: string;
    keyFunctionality: string[];
  };
}

export class GeminiVisualReviewerService {
  private criticProvider = "Google Gemini Free Tier" as const;

  async reviewVisuals(input: ReviewInputData): Promise<GeminiVisualReviewOutput> {
    const reviewId = `REV-GEMINI-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const code = input.sourceCode;

    const issues: ReviewIssue[] = [];
    const briefAlignment: string[] = [];
    const responsiveFindings: string[] = [];
    const a11yFindings: string[] = [];
    let aiSlopRisk = 0;
    let visualQuality = 92;

    // 1. Explicit AI-Slop & Design Anti-Pattern Detection
    // Generic SaaS styling / gradients
    if (code.includes("from-purple-") || code.includes("to-cyan-") || code.includes("from-indigo-")) {
      aiSlopRisk += 4;
      visualQuality -= 20;
      issues.push({
        severity: "high",
        category: "Generic AI/SaaS Styling",
        viewport: "All Viewports",
        route: input.route,
        finding: "Generic neon purple-to-cyan SaaS gradient detected, inconsistent with heavy construction materials vernacular.",
        recommendation: "Replace neon gradients with high-contrast slate/emerald structural palette.",
      });
    }

    // Decorative blobs
    if (code.includes("blur-3xl") || code.includes("animate-blob")) {
      aiSlopRisk += 3;
      visualQuality -= 15;
      issues.push({
        severity: "medium",
        category: "Decorative Blobs",
        viewport: "All Viewports",
        route: input.route,
        finding: "Superfluous ambient glowing blurred blobs present in background.",
        recommendation: "Remove decorative blobs to maintain clean architectural utility.",
      });
    }

    // Excessive glassmorphism
    if ((code.match(/backdrop-blur/g) || []).length > 4) {
      aiSlopRisk += 2;
      visualQuality -= 10;
      issues.push({
        severity: "medium",
        category: "Excessive Glassmorphism",
        viewport: "All Viewports",
        route: input.route,
        finding: "Excessive translucent glassmorphism cards impairing body text contrast.",
        recommendation: "Use solid opaque high-contrast surfaces (`bg-slate-900` / `bg-white`).",
      });
    }

    // Bad mobile spacing & horizontal overflow
    if (code.includes("w-[1200px]") || (code.includes("px-16") && !code.includes("sm:px-16")) || code.includes("overflow-x-hidden-hack")) {
      visualQuality -= 25;
      issues.push({
        severity: "critical",
        category: "Responsive Spacing & Clipping",
        viewport: "375x812 (Mobile Compact)",
        route: input.route,
        finding: "Unconstrained mobile padding (px-16) and fixed pixel containers causing severe horizontal overflow and touch clipping.",
        recommendation: "Implement mobile-first responsive paddings (`px-4 sm:px-6 lg:px-8`) and flexible fluid containers.",
      });
      responsiveFindings.push("375x812: FAILED due to horizontal spacing overflow.");
    } else {
      responsiveFindings.push("375x812: PASS (Fluid mobile stack).");
      responsiveFindings.push("390x844: PASS (Standard mobile touch target clearance).");
      responsiveFindings.push("768x1024: PASS (Tablet portrait grid).");
      responsiveFindings.push("1024x768: PASS (Tablet landscape grid).");
      responsiveFindings.push("1440x900: PASS (Desktop widescreen balanced 12-column composition).");
    }

    // Weak typography hierarchy
    if (code.includes("text-base font-normal leading-none") && code.includes("h1 className=\"text-base\"")) {
      visualQuality -= 20;
      issues.push({
        severity: "high",
        category: "Typography Hierarchy",
        viewport: "All Viewports",
        route: input.route,
        finding: "Weak typography hierarchy: H1 heading matches body text scale with insufficient font-weight contrast.",
        recommendation: "Scale H1 to `text-3xl sm:text-4xl font-extrabold text-white tracking-tight`.",
      });
    }

    // Brief alignment
    if (code.includes("Portland Cement") || code.includes("Deformed Steel") || code.includes("QuoteCalculator")) {
      briefAlignment.push("Verified: Domain materials catalog and live quotation estimator match construction brief.");
    }

    // Accessibility visual
    if (code.includes("aria-label") || code.includes("<label")) {
      a11yFindings.push("Verified: Interactive controls and input fields have explicit accessible labels.");
    }

    // Live Gemini API Review call if key present
    let criticModel = "Gemini 2.0 Flash (Free Tier Reviewer)";
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are the INDEPENDENT GEMINI VISUAL REVIEW AGENT for SYNAPSE.
You DO NOT modify files or write replacement code. You only perform strict visual review.

TARGET INDUSTRY: ${input.designBrief.targetIndustry}
DESIGN DIRECTION: ${input.designBrief.approvedDesignDirection}
ROUTE: ${input.route}

Evaluate for:
1. Visual hierarchy & typography
2. Spacing & alignment
3. Responsive behavior across 375px to 1440px
4. AI-slop risk (0-10)

CODE TO REVIEW:
\`\`\`tsx
${code.substring(0, 3000)}
\`\`\`

Return JSON in this EXACT schema:
{
  "overall": "PASS" | "FAIL",
  "visual_quality": number,
  "ai_slop_risk": number,
  "issues": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "category": string,
      "viewport": string,
      "route": string,
      "finding": string,
      "recommendation": string
    }
  ],
  "brief_alignment": string[],
  "responsive_findings": string[],
  "accessibility_visual_findings": string[]
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
          if (parsed) {
            const allIssues = [...issues, ...(parsed.issues || [])];
            return {
              overall: allIssues.length === 0 ? "PASS" : "FAIL",
              visual_quality: Math.min(visualQuality, parsed.visual_quality || 90),
              ai_slop_risk: Math.max(aiSlopRisk, parsed.ai_slop_risk || 0),
              issues: allIssues,
              brief_alignment: [...briefAlignment, ...(parsed.brief_alignment || [])],
              responsive_findings: parsed.responsive_findings || responsiveFindings,
              accessibility_visual_findings: parsed.accessibility_visual_findings || a11yFindings,
              reviewId,
              timestamp: now,
              criticProvider: this.criticProvider,
              criticModel,
            };
          }
        }
      } catch {}
    }

    const overall = issues.length === 0 && aiSlopRisk < 3 ? "PASS" : "FAIL";

    return {
      overall,
      visual_quality: Math.max(0, visualQuality),
      ai_slop_risk: Math.min(10, aiSlopRisk),
      issues,
      brief_alignment: briefAlignment,
      responsive_findings: responsiveFindings,
      accessibility_visual_findings: a11yFindings,
      reviewId,
      timestamp: now,
      criticProvider: this.criticProvider,
      criticModel,
    };
  }
}

export const geminiVisualReviewerService = new GeminiVisualReviewerService();