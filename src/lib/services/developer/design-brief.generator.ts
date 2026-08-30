import { GoogleGenAI } from "@google/genai";
import { Lead } from "@/data/types";
import { WebsiteAuditRecord } from "../../repositories/audit.repository";
import { DesignBrief } from "../../repositories/redesign.repository";

export class DesignBriefGenerator {
  async generateBrief(
    lead: Lead,
    audit: WebsiteAuditRecord | null,
    apiKey: string
  ): Promise<DesignBrief> {
    const ai = new GoogleGenAI({ apiKey });

    const auditSummary = audit
      ? `
Website Scores: Overall ${audit.scores.website}/100, Performance ${audit.scores.performance}, Mobile ${audit.scores.mobile}, Conversion ${audit.scores.conversion}, A11y ${audit.scores.accessibility}, Design ${audit.scores.design}
Identified Weaknesses: ${audit.weaknesses.join("; ")}
Observed Strengths: ${audit.strengths.join("; ")}
Audit Findings: ${audit.findings.map(f => `[${f.category.toUpperCase()}/${f.severity.toUpperCase()}] ${f.evidence} -> ${f.recommendation}`).join("\n")}
`
      : `Industry: ${lead.industry}. Opportunity Score: ${lead.opportunityScore}/100. Detected notes: ${lead.detectedIssues.join("; ")}`;

    const systemInstruction = `
You are the autonomous Developer Agent & Lead Solution Architect of Synapse Ops.
Your objective is to synthesize a high-converting, personalized, modern website redesign brief for a prospective client based on verified technical and UX audit findings.

STRATEGY RULES:
1. DO NOT generate generic AI layouts. The brief must address the SPECIFIC weaknesses found in the audit while preserving genuine brand strengths.
2. If the audit identified weak CTA conversion, focus the primary goal on friction-free conversion (e.g. interactive quote calculator, direct booking, streamlined inquiry).
3. If the audit identified poor mobile responsiveness, emphasize mobile-first layout and navigation.
4. DO NOT invent false awards, certifications, or statistics. Use realistic industry-standard value propositions.

OUTPUT JSON SCHEMA:
{
  "companyName": "${lead.company}",
  "designDirection": "Concise summary of the aesthetic and functional modernization strategy",
  "targetAudience": "Key commercial decision-makers and customers",
  "primaryGoal": "Specific business conversion objective (e.g. 3x mobile lead capture, sub-second load)",
  "preserve": ["Genuine strength 1", "Genuine strength 2"],
  "improve": ["Specific deficiency to fix 1", "Specific deficiency to fix 2", "Specific deficiency to fix 3"],
  "pageSections": ["Header Navigation", "Hero with High-Impact CTA", "Interactive Value Calculator", "Core Solutions", "Social Proof & Trust", "Lead Capture Inquiry Form", "Footer"],
  "visualDirection": {
    "style": "Modern Enterprise Clean / High-Tech Dark / Luxury Editorial",
    "typography": "Clean sans-serif hierarchy (Inter / Plus Jakarta Sans)",
    "layout": "Grid-based responsive containers with generous whitespace and clear visual focal points",
    "imagery": "High-fidelity professional contextual photography and crisp icons",
    "motion": "Subtle, performant micro-interactions and smooth accordion transitions"
  }
}
`;

    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.7-flash"];
    let brief: DesignBrief | null = null;
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: `Company: ${lead.company}\nWebsite: ${lead.website}\nIndustry: ${lead.industry}\nLocation: ${lead.location || "Philippines"}\n\nTechnical Audit Evidence:\n${auditSummary}\n\nGenerate the structured Design Brief in JSON.`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        if (res.text) {
          try {
            brief = JSON.parse(res.text);
          } catch {
            const cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
            brief = JSON.parse(cleaned);
          }
          if (brief && brief.companyName && Array.isArray(brief.improve)) {
            break;
          }
        }
      } catch (e: any) {
        lastErr = e;
        console.warn(`[DesignBriefGenerator] Model ${model} failed, trying next:`, e.message);
      }
    }

    if (!brief) {
      // Fallback structured brief
      return {
        companyName: lead.company,
        designDirection: `Modernized, high-performance responsive web experience for ${lead.company} optimized for mobile conversions.`,
        targetAudience: `Prospective clients, investors, and partners in ${lead.industry}.`,
        primaryGoal: `Increase mobile inquiry conversion and deliver sub-second page performance.`,
        preserve: audit?.strengths || ["Established industry presence", "Core service portfolio"],
        improve: audit?.weaknesses || ["Mobile viewport responsiveness", "Hero CTA conversion funnel", "Page load performance"],
        pageSections: [
          "Navigation Bar",
          "Hero & Value Proposition",
          "Interactive Solution Explorer",
          "Offerings & Portfolio",
          "Trust & Credentials",
          "Lead Capture Contact Section",
          "Footer",
        ],
        visualDirection: {
          style: "Modern High-Performance Corporate",
          typography: "Inter / Modern Sans-Serif",
          layout: "Fluid responsive grid with accessible contrast",
          imagery: "Clean contextual photography with optimized SVGs",
          motion: "Subtle CSS transitions and hover states",
        },
      };
    }

    return brief;
  }
}

export const designBriefGenerator = new DesignBriefGenerator();