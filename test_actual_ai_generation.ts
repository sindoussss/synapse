import { CodeGenerator } from "./src/lib/services/developer/code-generator";
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

async function runAIGenerationTest() {
  console.log("================================================================================");
  console.log("🤖 RUNNING LIVE AI MODEL (GEMINI) WITH MINIMALIST TYPOGRAPHY PROMPT");
  console.log("================================================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in .env.local");
  }

  const codeGen = new CodeGenerator();

  const testLead: Lead = {
    id: "lead-simdaniel",
    company: "Simulation With Daniel",
    website: "https://simulationwithdaniel.com",
    industry: "Applied Computational Physics & Numerical Modeling",
    location: "Global / Remote",
    status: "Discovered",
    websiteScore: 40,
    opportunityScore: 95,
    detectedIssues: ["No interactive simulation demo", "Outdated layout", "Lacks compute calculator"],
    contactEmail: "simulationwithdaniel784@gmail.com",
    estimatedDealValue: "PHP 85,000",
    discoveredAt: new Date().toISOString(),
    sourceType: "web_search",
    discoveredByAgentId: "agent-research",
  };

  const testBrief: DesignBrief = {
    leadId: testLead.id,
    primaryGoal: "Showcase high-precision numerical simulations, interactive particle visualizer, and compute budget estimator",
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
    preserve: [
      "Domain authority",
      "Rigorous mathematical accuracy"
    ],
    heroHeadline: "Numerical Simulation & Interactive Physics Pipelines",
    heroSubheadline: "High-performance mathematical modeling, dynamic particle solvers, and custom digital twin architectures.",
    callToAction: "Explore Workbench",
    features: [
      { title: "Fluid & Kinetic Modeling", description: "Navier-Stokes solvers and finite element kinetic simulations." },
      { title: "Digital Twin Architecture", description: "Continuous data ingestion mapped into real-time state estimation." },
      { title: "Monte Carlo Optimization", description: "Large-scale multi-variable stochastic distributions." }
    ],
    suggestedPalette: {
      primary: "#000000",
      secondary: "#ffffff",
      accent: "#262626",
      neutral: "#737373"
    },
    suggestedFonts: {
      heading: "Inter / Helvetica Neue",
      body: "Inter / system-ui",
      mono: "JetBrains Mono"
    }
  };

  console.log("⏳ Sending prompt to Gemini API...");
  const startTime = Date.now();

  const result = await codeGen.generateConceptProject(
    testLead,
    null,
    testBrief,
    "PRJ-AI-DANIEL-01",
    apiKey
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ AI Model generation completed in ${duration}s!`);
  console.log(`   Generated code length: ${result.previewComponentCode.length} characters`);
  console.log(`   Validation: Syntax valid = ${result.validation.valid}`);

  // Save the pure AI output to a dedicated preview route
  const previewPath = path.resolve(process.cwd(), "src/app/preview/ai-generated-daniel/page.tsx");
  const previewDir = path.dirname(previewPath);
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(previewPath, result.previewComponentCode, "utf8");

  console.log(`   Saved live AI output to: src/app/preview/ai-generated-daniel/page.tsx`);
  console.log("\n================================================================================");
  console.log("🌐 Preview URL: http://localhost:3000/preview/ai-generated-daniel");
  console.log("================================================================================");
}

runAIGenerationTest().catch((err) => {
  console.error("❌ AI Generation Error:", err);
  process.exit(1);
});
