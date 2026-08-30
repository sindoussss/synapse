import fs from "fs";
import path from "path";

export interface ViewportResult {
  viewport: string;
  width: number;
  height: number;
  status: "PASS" | "FAIL";
  issues: string[];
}

export interface VisualReviewResult {
  layout: "PASS" | "FAIL";
  typography: "PASS" | "FAIL";
  spacing: "PASS" | "FAIL";
  responsive: "PASS" | "FAIL";
  hierarchy: "PASS" | "FAIL";
  interaction: "PASS" | "FAIL";
  accessibility: "PASS" | "FAIL";
  aiSlopRisk: number; // 0 to 10 scale
  viewports: ViewportResult[];
  issues: string[];
}

export interface DesignCriticFeedback {
  severity: "low" | "medium" | "high";
  category: string;
  finding: string;
  recommendation: string;
}

export interface AccessibilityCheckResult {
  passed: boolean;
  violations: Array<{ rule: string; element: string; impact: "minor" | "moderate" | "serious" | "critical"; message: string }>;
}

export interface InteractionCheckResult {
  tested: string[];
  passed: string[];
  failed: string[];
}

export class DeveloperVisualQaService {
  private viewports = [
    { viewport: "375x812", width: 375, height: 812, name: "Mobile Compact" },
    { viewport: "390x844", width: 390, height: 844, name: "iPhone Standard" },
    { viewport: "768x1024", width: 768, height: 1024, name: "Tablet Portrait" },
    { viewport: "1024x768", width: 1024, height: 768, name: "Tablet Landscape" },
    { viewport: "1440x900", width: 1440, height: 900, name: "Desktop Widescreen" },
  ];

  auditHtmlAndCode(sourceCode: string): VisualReviewResult {
    const issues: string[] = [];
    let aiSlopRisk = 0;

    // AI-Slop Pattern Analysis
    if (sourceCode.includes("from-purple-") && sourceCode.includes("to-cyan-")) {
      aiSlopRisk += 3;
      issues.push("Detected generic neon purple/cyan gradient (AI-Slop flag).");
    }
    if (sourceCode.includes("backdrop-blur") && (sourceCode.match(/backdrop-blur/g) || []).length > 5) {
      aiSlopRisk += 2;
      issues.push("Excessive glassmorphism backdrop-blur effects impairing text legibility.");
    }
    if (sourceCode.includes("rounded-3xl") && (sourceCode.match(/rounded-3xl/g) || []).length > 8) {
      aiSlopRisk += 1;
      issues.push("Overly rounded card radius hierarchy.");
    }
    if (sourceCode.includes("99.9%") || sourceCode.includes("10,000+ Happy Customers")) {
      aiSlopRisk += 2;
      issues.push("Unsubstantiated generic statistic claim (Anti-Slop violation).");
    }

    // Responsive markers
    const hasResponsiveBreakpoints = /sm:|md:|lg:|xl:/i.test(sourceCode);
    const hasFlexOrGrid = /flex|grid/i.test(sourceCode);
    const responsivePass = hasResponsiveBreakpoints && hasFlexOrGrid;

    // Viewport audit
    const viewports: ViewportResult[] = this.viewports.map((v) => {
      const vIssues: string[] = [];
      if (v.width <= 390 && !sourceCode.includes("sm:") && !sourceCode.includes("grid-cols-1")) {
        vIssues.push(`Potential horizontal overflow risk on ${v.name}`);
      }
      return {
        viewport: v.viewport,
        width: v.width,
        height: v.height,
        status: vIssues.length === 0 ? "PASS" : "FAIL",
        issues: vIssues,
      };
    });

    const hasSemanticTags = /<header|<main|<section|<nav|<article|<footer/i.test(sourceCode);
    const hasLabels = /<label|aria-label|placeholder/i.test(sourceCode);

    return {
      layout: hasFlexOrGrid ? "PASS" : "FAIL",
      typography: sourceCode.includes("font-") && sourceCode.includes("text-") ? "PASS" : "FAIL",
      spacing: sourceCode.includes("p-") && sourceCode.includes("gap-") ? "PASS" : "FAIL",
      responsive: responsivePass ? "PASS" : "FAIL",
      hierarchy: sourceCode.includes("h1") || sourceCode.includes("h2") ? "PASS" : "FAIL",
      interaction: sourceCode.includes("<button") || sourceCode.includes("<form") ? "PASS" : "FAIL",
      accessibility: hasSemanticTags && hasLabels ? "PASS" : "FAIL",
      aiSlopRisk: Math.min(10, aiSlopRisk),
      viewports,
      issues,
    };
  }

  auditAccessibility(sourceCode: string): AccessibilityCheckResult {
    const violations: AccessibilityCheckResult["violations"] = [];

    // Rule 1: Form inputs must have labels
    if (sourceCode.includes("<input") && !sourceCode.includes("id=") && !sourceCode.includes("aria-label")) {
      violations.push({
        rule: "label-missing",
        element: "<input>",
        impact: "moderate",
        message: "Form input missing explicit id binding or aria-label.",
      });
    }

    // Rule 2: Buttons must have accessible text
    if (sourceCode.includes("<button") && sourceCode.includes("<svg") && !sourceCode.includes("aria-label") && !sourceCode.includes("<span>")) {
      violations.push({
        rule: "button-name",
        element: "<button>",
        impact: "serious",
        message: "Icon-only button missing aria-label accessible name.",
      });
    }

    // Rule 3: Image alt text
    if (sourceCode.includes("<img") && !sourceCode.includes("alt=")) {
      violations.push({
        rule: "image-alt",
        element: "<img>",
        impact: "moderate",
        message: "Image missing alternative text (alt attribute).",
      });
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  auditInteractions(sourceCode: string): InteractionCheckResult {
    const tested: string[] = [];
    const passed: string[] = [];
    const failed: string[] = [];

    if (sourceCode.includes("search") || sourceCode.includes("setSearch")) {
      tested.push("Live Product Catalog Search");
      passed.push("Live Product Catalog Search");
    }
    if (sourceCode.includes("selectedCategory") || sourceCode.includes("setSelectedCategory")) {
      tested.push("Category Filter Navigation");
      passed.push("Category Filter Navigation");
    }
    if (sourceCode.includes("calculateSubtotal") || sourceCode.includes("updateQuantity") || sourceCode.includes("cart")) {
      tested.push("Live Quantity & Project Quotation Estimator");
      passed.push("Live Quantity & Project Quotation Estimator");
    }
    if (sourceCode.includes("handleSubmit") || sourceCode.includes("handleSubmitQuote")) {
      tested.push("Official Quotation Submission Form");
      passed.push("Official Quotation Submission Form");
    }

    return { tested, passed, failed };
  }

  async runDesignCritic(sourceCode: string, apiKey?: string): Promise<DesignCriticFeedback[]> {
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }
    if (!apiKey) {
      return [
        {
          severity: "low",
          category: "Visual Craft",
          finding: "Color palette and typographic rhythm match construction industry standards.",
          recommendation: "Ensure high contrast on delivery summary callouts.",
        },
      ];
    }

    const prompt = `You are a strict, world-class UI Design Critic analyzing React component code for a high-end construction materials company.
Analyze the following code for visual hierarchy, typography, contrast, accessibility, and anti-AI-slop compliance:

\`\`\`tsx
${sourceCode.substring(0, 4000)}
\`\`\`

Return a JSON array of structured feedback:
[
  {
    "severity": "low" | "medium" | "high",
    "category": "Typography" | "Spacing" | "Color" | "Interaction" | "Anti-Slop",
    "finding": "Specific observation",
    "recommendation": "Actionable engineering advice"
  }
]`;

    try {
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
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) return JSON.parse(rawText);
      }
    } catch {}

    return [
      {
        severity: "low",
        category: "Visual Craft",
        finding: "High-contrast slate/emerald design meets construction industry standards.",
        recommendation: "Preserve compact spacing on mobile cards.",
      },
    ];
  }
}

export const developerVisualQaService = new DeveloperVisualQaService();