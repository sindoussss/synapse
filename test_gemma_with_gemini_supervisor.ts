import { gemmaGeminiCollaborativeService } from "./src/lib/services/developer/gemma-gemini-collaborative.service";
import { Lead } from "./src/data/types";
import { DesignBrief } from "./src/lib/repositories/redesign.repository";
import fs from "fs";
import path from "path";

// Load environment
const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

async function runGemmaSupervisedTest() {
  console.log("================================================================================");
  console.log("👥 MULTI-AGENT COLLABORATION: GEMMA (PROGRAMMER) + GEMINI (SUPERVISOR)");
  console.log("================================================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const lead: Lead = {
    id: "lead-daniel-01",
    company: "Simulation With Daniel",
    website: "https://simulationwithdaniel.com",
    industry: "Applied Numerical Simulation & Computational Systems",
    location: "Global",
    status: "Discovered",
    websiteScore: 45,
    opportunityScore: 96,
    detectedIssues: ["Needs interactive physics demo", "Needs compute estimator"],
    contactEmail: "simulationwithdaniel784@gmail.com",
    estimatedDealValue: "PHP 85,000",
    discoveredAt: new Date().toISOString(),
    sourceType: "web_search",
    discoveredByAgentId: "agent-research",
  };

  const brief: DesignBrief = {
    leadId: lead.id,
    primaryGoal: "Showcase custom physics simulations, high-throughput numerical modeling, and compute cluster estimation.",
    designDirection: "Strict Swiss monochrome minimalism, high typographic hierarchy, zero emojis, zero colorful gradients, pure black/white palette with stateful light/dark mode",
    pageSections: [
      "Header with minimal Light/Dark toggle",
      "Editorial Hero with clean typography and technical metadata",
      "Interactive Physics Workbench Simulator",
      "Core Capabilities Grid",
      "Tabular Compute Estimator & Pricing Calculator",
      "Consultation Inquiry Form"
    ],
    improve: [
      "Remove all colorful sci-fi gradients",
      "Eliminate all emojis and fake badges",
      "Implement high-contrast typography and monospaced technical figures",
      "Provide clean light mode (#ffffff) and dark mode (#000000)"
    ],
    preserve: ["Scientific rigor", "Mathematical clarity"],
    heroHeadline: "Numerical Simulation & Interactive Physics Pipelines",
    heroSubheadline: "High-performance mathematical modeling, dynamic particle solvers, and custom digital twin architectures.",
    callToAction: "Explore Workbench",
    features: [
      { title: "Fluid & Kinetic Modeling", description: "Navier-Stokes solvers and finite element kinetic simulations." },
      { title: "Digital Twin Architecture", description: "Continuous data ingestion mapped into real-time state estimation." },
      { title: "Monte Carlo Optimization", description: "Large-scale multi-variable stochastic distributions." }
    ],
    suggestedPalette: { primary: "#000000", secondary: "#ffffff", accent: "#262626", neutral: "#737373" },
    suggestedFonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" }
  };

  const result = await gemmaGeminiCollaborativeService.buildWithGemmaUnderGeminiSupervision({
    lead,
    brief,
    geminiApiKey: apiKey,
  });

  const previewPath = path.resolve(process.cwd(), "src/app/preview/gemma-coded-daniel/page.tsx");
  const previewDir = path.dirname(previewPath);
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(previewPath, result.finalCode, "utf8");

  console.log(`\n✅ Saved Gemma-coded deliverable to: src/app/preview/gemma-coded-daniel/page.tsx`);
  console.log("\n================================================================================");
  console.log("🌐 URL: http://localhost:3000/preview/gemma-coded-daniel");
  console.log("================================================================================");
}

runGemmaSupervisedTest().catch(console.error);
