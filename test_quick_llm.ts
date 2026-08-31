import { GoogleGenAI } from "@google/genai";
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

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing with API Key:", apiKey?.substring(0, 10) + "...");
  const ai = new GoogleGenAI({ apiKey });
  
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];
  
  for (const m of models) {
    try {
      console.log(`Trying model: ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: "Respond with the word: READY",
      });
      console.log(`✅ Success with ${m}:`, res.text?.trim());
      break;
    } catch (e: any) {
      console.log(`❌ Failed with ${m}:`, e.message || e);
    }
  }
}

run();
