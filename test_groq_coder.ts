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

async function runGroqGeneration() {
  const apiKey = process.env.GROQ_API_KEY;
  console.log("================================================================================");
  console.log("⚡ TESTING LIVE GROQ AI CODER (Llama 3.3 70B / Qwen)");
  console.log("================================================================================\n");

  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const prompt = `
You are the elite Principal Frontend Software Engineer & Minimalist Design Architect of Synapse.
Generate a complete, production-ready, ultra-clean React component (Next.js 16 + React 19 + Tailwind CSS) for "Simulation With Daniel".

CLIENT & PROJECT SPECS:
- Company Name: "Simulation With Daniel"
- Industry: "Applied Computational Physics & Numerical Modeling"
- Primary Goal: "Showcase high-precision numerical simulations, interactive particle visualizer, and compute budget estimator"

STRICT DESIGN & AESTHETIC DIRECTIVES (NON-NEGOTIABLE):
1. COLOR PALETTE — STRICT MONOCHROME ONLY:
   - Light Mode: Pure solid white (#ffffff / bg-white) with sharp graphite/black text (#0a0a0a / text-neutral-900). Hairline borders (#e5e5e5 / border-neutral-200).
   - Dark Mode: Pure pitch black (#000000 / bg-black) with clean white text (#ffffff / text-white). Muted borders (#262626 / border-neutral-800).
   - Provide a working stateful Light/Dark theme toggle in the header.
   - ABSOLUTE PROHIBITION on colorful gradients (no purple/cyan/pink blobs, no neon glows, no gradient text, no rainbow borders).
2. TYPOGRAPHY IS THE HERO:
   - High-contrast, clean typographic hierarchy with tight tracking (tracking-tight).
   - Technical metadata & tags must use clean monospaced uppercase typography (font-mono text-xs uppercase tracking-widest text-neutral-500).
   - Use tabular figures (tabular-nums font-mono) for all numbers, pricing, and statistics.
   - Generous, disciplined whitespace and sharp architectural layout.
3. CONTENT & DECORATION RULES:
   - STRICTLY ZERO EMOJIS anywhere in the copy, headings, badges, or code.
   - Use only minimal geometric Lucide React icons (e.g. ArrowRight, Check, Sun, Moon, Plus, Minus, RotateCcw, Play, Pause).
   - Zero fake reviews, zero fake awards, and zero cheesy AI buzzwords. Use realistic, high-caliber industry terminology.
4. TECHNICAL EXECUTION:
   - Write a self-contained, valid "use client"; React component named "LandingPagePreview" that exports as default.
   - Include a working interactive physics canvas or numerical simulation visualizer.
   - Include an interactive compute hours & cluster pricing calculator with sliders.
   - Include a working consultation/inquiry form with clean input fields.
   - Return ONLY the complete, valid TypeScript JSX code within a \`\`\`tsx ... \`\`\` codeblock.
`;

  const model = "llama-3.3-70b-versatile";
  console.log(`⏳ Querying Groq (${model})...`);
  const startTime = Date.now();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 4096
    })
  });

  const data = await res.json();
  if (data.error) {
    console.error("❌ Groq Error:", data.error);
    return;
  }

  const raw = data.choices[0]?.message?.content || "";
  const match = raw.match(/```(?:tsx|jsx|typescript|javascript)?([\s\S]*?)```/i);
  const code = match ? match[1].trim() : raw.trim();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Groq AI generated ${code.length} characters of code in ${duration}s!`);

  const previewPath = path.resolve(process.cwd(), "src/app/preview/ai-generated-daniel/page.tsx");
  const previewDir = path.dirname(previewPath);
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(previewPath, code, "utf8");

  console.log(`✅ Saved live AI-generated code to: src/app/preview/ai-generated-daniel/page.tsx`);
  console.log("🌐 URL: http://localhost:3000/preview/ai-generated-daniel");
}

runGroqGeneration().catch(console.error);
