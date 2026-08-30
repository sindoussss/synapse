import fs from "fs";
import path from "path";
import { FrameworkType, RuntimeType } from "../../repositories/build-profile.repository";

export interface FrameworkDetectionResult {
  framework: FrameworkType;
  frameworkVersion: string;
  runtime: RuntimeType;
  evidenceFiles: string[];
  isSupported: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  details: string;
}

export class FrameworkDetectionService {
  detectFramework(projectDir: string): FrameworkDetectionResult {
    const evidenceFiles: string[] = [];

    if (!fs.existsSync(projectDir)) {
      return {
        framework: "FRAMEWORK_UNKNOWN",
        frameworkVersion: "UNKNOWN",
        runtime: "STATIC_BROWSER",
        evidenceFiles: [],
        isSupported: false,
        confidence: "LOW",
        details: `Project directory '${projectDir}' does not exist on disk.`,
      };
    }

    const pkgJsonPath = path.join(projectDir, "package.json");
    const nextConfigJs = path.join(projectDir, "next.config.js");
    const nextConfigMjs = path.join(projectDir, "next.config.mjs");
    const viteConfigTs = path.join(projectDir, "vite.config.ts");
    const viteConfigJs = path.join(projectDir, "vite.config.js");
    const indexHtml = path.join(projectDir, "index.html");

    // 1. Check for Next.js
    if (fs.existsSync(nextConfigJs) || fs.existsSync(nextConfigMjs)) {
      if (fs.existsSync(nextConfigJs)) evidenceFiles.push("next.config.js");
      if (fs.existsSync(nextConfigMjs)) evidenceFiles.push("next.config.mjs");
    }

    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        evidenceFiles.push("package.json");

        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps["next"]) {
          return {
            framework: "NEXT_JS",
            frameworkVersion: deps["next"].replace(/[\^~]/g, ""),
            runtime: "NODE_JS",
            evidenceFiles,
            isSupported: true,
            confidence: "HIGH",
            details: `Detected Next.js ${deps["next"]} via package.json dependencies.`,
          };
        }

        if (deps["vite"]) {
          return {
            framework: "VITE",
            frameworkVersion: deps["vite"].replace(/[\^~]/g, ""),
            runtime: "STATIC_BROWSER",
            evidenceFiles,
            isSupported: true,
            confidence: "HIGH",
            details: `Detected Vite ${deps["vite"]} via package.json dependencies.`,
          };
        }
      } catch {}
    }

    // 2. Check for Static Vite config
    if (fs.existsSync(viteConfigTs) || fs.existsSync(viteConfigJs)) {
      return {
        framework: "VITE",
        frameworkVersion: "5.x",
        runtime: "STATIC_BROWSER",
        evidenceFiles: [fs.existsSync(viteConfigTs) ? "vite.config.ts" : "vite.config.js"],
        isSupported: true,
        confidence: "HIGH",
        details: "Detected Vite framework via configuration file.",
      };
    }

    // 3. Check for Static HTML
    if (fs.existsSync(indexHtml)) {
      return {
        framework: "STATIC_HTML",
        frameworkVersion: "HTML5",
        runtime: "STATIC_BROWSER",
        evidenceFiles: ["index.html"],
        isSupported: true,
        confidence: "HIGH",
        details: "Detected static HTML website via root index.html.",
      };
    }

    return {
      framework: "FRAMEWORK_UNKNOWN",
      frameworkVersion: "UNKNOWN",
      runtime: "STATIC_BROWSER",
      evidenceFiles,
      isSupported: false,
      confidence: "LOW",
      details: "No supported framework markers or configuration files found in repository tree.",
    };
  }
}

export const frameworkDetectionService = new FrameworkDetectionService();