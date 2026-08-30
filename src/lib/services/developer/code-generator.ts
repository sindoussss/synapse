import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Lead } from "@/data/types";
import { WebsiteAuditRecord } from "../../repositories/audit.repository";
import { DesignBrief, GeneratedFileRecord, ValidationSummary } from "../../repositories/redesign.repository";
import { codeValidator } from "./code-validator";

export class CodeGenerator {
  async generateConceptProject(
    lead: Lead,
    audit: WebsiteAuditRecord | null,
    brief: DesignBrief,
    projectId: string,
    apiKey: string
  ): Promise<{
    files: GeneratedFileRecord[];
    validation: ValidationSummary;
    previewComponentCode: string;
    workspacePath: string;
  }> {
    const ai = new GoogleGenAI({ apiKey });

    // 1. Setup isolated workspace directory
    const cleanLeadId = (lead.id || "lead-unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const baseWorkspace = path.resolve(process.cwd(), "generated-sites", cleanLeadId, projectId);
    await fs.mkdir(baseWorkspace, { recursive: true });

    // 2. Generate Next.js / Tailwind TSX Concept Code
    const prompt = `
You are the expert Frontend Developer Agent of Synapse Ops.
Generate a complete, modern, interactive, production-ready React component (Next.js + Tailwind CSS) for this website redesign concept.

CLIENT & PROJECT SPECS:
- Company Name: "${lead.company}"
- Industry: "${lead.industry}"
- Location: "${lead.location || "Philippines"}"
- Target Website: "${lead.website}"
- Primary Redesign Goal: "${brief.primaryGoal}"
- Design Direction: "${brief.designDirection}"
- Deficiencies To Fix: ${brief.improve.join(", ")}
- Strengths To Preserve: ${brief.preserve.join(", ")}
- Key Page Sections: ${brief.pageSections.join(", ")}

TECHNICAL REQUIREMENTS:
1. Write a self-contained, valid "use client"; React component named "LandingPagePreview" that exports as default.
2. Use Tailwind CSS for all styling (modern typography, gradients, glassmorphism, responsive grid, accessible colors).
3. Include Lucide React icons (e.g. import { ArrowRight, CheckCircle2, Star, Phone, Mail, Globe, Shield, Sparkles, Building2, ChevronRight } from "lucide-react";).
4. Include an interactive component: e.g. a live Project Cost / Service Estimator calculator state, interactive FAQ accordions, or a tabbed solutions switcher.
5. Hero section must have a compelling value proposition headline, subtitle, primary CTA button ("Request Proposal" / "Explore Properties" / "Schedule Consultation"), and trust badges.
6. NO fabricated awards or fake executive names. Use professional, realistic industry copy.
7. Return ONLY the complete, valid TypeScript JSX code within a \`\`\`tsx ... \`\`\` codeblock.
`;

    let generatedCode = "";
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.7-flash"];

    for (const model of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });

        if (res.text) {
          const match = res.text.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
          generatedCode = match ? match[1].trim() : res.text.trim();
          if (generatedCode.length > 200) {
            break;
          }
        }
      } catch (e: any) {
        console.warn(`[CodeGenerator] Model ${model} failed, trying next:`, e.message);
      }
    }

    if (!generatedCode || generatedCode.length < 200) {
      // High quality fallback modern component
      generatedCode = this.generateFallbackComponent(lead, brief);
    }

    // 3. Write package.json
    const packageJsonContent = JSON.stringify(
      {
        name: `@synapse-ops/redesign-${cleanLeadId}`,
        version: "1.0.0",
        private: true,
        description: `Autonomous redesign concept for ${lead.company}`,
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "lucide-react": "^1.16.0",
        },
      },
      null,
      2
    );

    // 4. Write metadata.json
    const metadataContent = JSON.stringify(
      {
        projectId,
        leadId: lead.id,
        companyName: lead.company,
        website: lead.website,
        generatedAt: new Date().toISOString(),
        designBrief: brief,
      },
      null,
      2
    );

    // 5. Write files to isolated workspace
    const pagePath = path.join(baseWorkspace, "page.tsx");
    const pkgPath = path.join(baseWorkspace, "package.json");
    const metaPath = path.join(baseWorkspace, "metadata.json");

    await fs.writeFile(pagePath, generatedCode, "utf8");
    await fs.writeFile(pkgPath, packageJsonContent, "utf8");
    await fs.writeFile(metaPath, metadataContent, "utf8");

    // 6. Run validation
    const pageChecks = codeValidator.validateFileContent("page.tsx", generatedCode);
    const validationSummary = codeValidator.summarizeValidation(pageChecks, 0);

    const files: GeneratedFileRecord[] = [
      {
        path: `generated-sites/${cleanLeadId}/${projectId}/page.tsx`,
        size: Buffer.byteLength(generatedCode, "utf8"),
        type: "typescript/tsx",
        contentSnippet: generatedCode.substring(0, 400),
      },
      {
        path: `generated-sites/${cleanLeadId}/${projectId}/metadata.json`,
        size: Buffer.byteLength(metadataContent, "utf8"),
        type: "application/json",
      },
      {
        path: `generated-sites/${cleanLeadId}/${projectId}/package.json`,
        size: Buffer.byteLength(packageJsonContent, "utf8"),
        type: "application/json",
      },
    ];

    return {
      files,
      validation: validationSummary,
      previewComponentCode: generatedCode,
      workspacePath: baseWorkspace,
    };
  }

  private generateFallbackComponent(lead: Lead, brief: DesignBrief): string {
    return `"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Star, Phone, Mail, Globe, Shield, Sparkles, Building2, ChevronRight, Layers, Award } from "lucide-react";

export default function LandingPagePreview() {
  const [inquiryType, setInquiryType] = useState("Commercial Property");
  const [estimatedBudget, setEstimatedBudget] = useState(5000000);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#090a0f]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              ${lead.company.charAt(0)}
            </div>
            <span className="font-bold text-lg tracking-tight text-white">${lead.company}</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#solutions" className="hover:text-cyan-400 transition-colors">Developments</a>
            <a href="#calculator" className="hover:text-cyan-400 transition-colors">Estimator</a>
            <a href="#trust" className="hover:text-cyan-400 transition-colors">About Us</a>
            <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
            >
              Inquire Now
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-6">
            <Sparkles size={12} />
            <span>Modernized Digital Experience Concept</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Elevating <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">${lead.company}</span> with Seamless Digital Real Estate
          </h1>

          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ${brief.designDirection || "Masterplanned developments and premium commercial property investments in the Philippines."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#calculator"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <span>Explore Interactive Estimator</span>
              <ArrowRight size={16} />
            </a>
            <a
              href="#contact"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-all"
            >
              Direct Consultation
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Value Estimator */}
      <section id="calculator" className="py-16 bg-[#0f111a] border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Interactive Property & Investment Calculator</h2>
            <p className="text-slate-400 text-sm mt-2">Tailored for fast valuation and inquiry matching</p>
          </div>

          <div className="bg-[#151928] border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Select Asset Focus</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Commercial", "Residential", "Township", "Industrial"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setInquiryType(item)}
                        className={\`p-3 rounded-lg text-xs font-semibold border transition-all \${
                          inquiryType === item
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                        }\`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
                    <span>Target Budget / Scale</span>
                    <span className="text-cyan-400 font-bold">₱{(estimatedBudget / 1000000).toFixed(1)}M PHP</span>
                  </div>
                  <input
                    type="range"
                    min="1000000"
                    max="50000000"
                    step="1000000"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-[#0b0d14] rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 block uppercase">Projected Portfolio Match</span>
                  <h3 className="text-xl font-bold text-white mt-1">{inquiryType} Premier Opportunity</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Designed for high capital efficiency with verified zoning and prime infrastructure access in ${lead.location || "the Philippines"}.
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <a
                    href="#contact"
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm shadow-md shadow-cyan-500/20 transition-all"
                  >
                    <span>Request Dossier & Pricing</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 border-t border-slate-800 bg-[#07080c] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ${lead.company} · Concept Architecture by Synapse Ops Developer Agent</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-200">Modernized Next.js Concept</span>
            <span className="hover:text-slate-200">Tailwind CSS Responsive</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;
  }
}

export const codeGenerator = new CodeGenerator();