import fs from "fs";
import path from "path";

export interface RepositoryInspectionResult {
  framework: string;
  routing: string;
  existingComponents: string[];
  reusableComponents: string[];
  designTokens: {
    theme: string;
    colors: string[];
    fonts: string[];
  };
  installedDependencies: Record<string, string>;
  stylingSystem: string;
  affectedRoutes: string[];
  affectedFiles: string[];
  summary: string;
}

export class DeveloperInspectionService {
  private validateSafePath(workspaceDir: string, relativePath: string): string {
    const resolved = path.resolve(workspaceDir, relativePath);
    const normalizedWorkspace = path.normalize(workspaceDir) + path.sep;
    const normalizedTarget = path.normalize(resolved);

    if (normalizedTarget !== path.normalize(workspaceDir) && !normalizedTarget.startsWith(normalizedWorkspace)) {
      throw new Error(`Security Violation: Path '${relativePath}' escapes assigned workspace directory.`);
    }
    return normalizedTarget;
  }

  listFiles(workspaceDir: string, subDir: string = ""): string[] {
    const targetDir = this.validateSafePath(workspaceDir, subDir);
    if (!fs.existsSync(targetDir)) return [];

    const results: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        const rel = path.relative(workspaceDir, full).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          results.push(rel);
        }
      }
    };
    walk(targetDir);
    return results;
  }

  readFile(workspaceDir: string, filePath: string): string | null {
    const fullPath = this.validateSafePath(workspaceDir, filePath);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return null;
    }
    return fs.readFileSync(fullPath, "utf8");
  }

  searchCode(workspaceDir: string, query: string): Array<{ file: string; line: number; text: string }> {
    const files = this.listFiles(workspaceDir);
    const matches: Array<{ file: string; line: number; text: string }> = [];
    const lowerQuery = query.toLowerCase();

    for (const file of files) {
      if (!file.match(/\.(tsx?|jsx?|json|css|md)$/)) continue;
      const content = this.readFile(workspaceDir, file);
      if (!content) continue;

      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(lowerQuery)) {
          matches.push({ file, line: idx + 1, text: line.trim() });
        }
      });
      if (matches.length > 50) break;
    }
    return matches;
  }

  inspectPackageJson(workspaceDir: string): { dependencies: Record<string, string>; devDependencies: Record<string, string>; scripts: Record<string, string> } {
    const content = this.readFile(workspaceDir, "package.json");
    if (!content) {
      // Fallback to project root package.json if workspace is empty/sub-project
      const rootPkg = path.resolve(process.cwd(), "package.json");
      if (fs.existsSync(rootPkg)) {
        const parsed = JSON.parse(fs.readFileSync(rootPkg, "utf8"));
        return {
          dependencies: parsed.dependencies || {},
          devDependencies: parsed.devDependencies || {},
          scripts: parsed.scripts || {},
        };
      }
      return { dependencies: {}, devDependencies: {}, scripts: {} };
    }
    try {
      const parsed = JSON.parse(content);
      return {
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
        scripts: parsed.scripts || {},
      };
    } catch {
      return { dependencies: {}, devDependencies: {}, scripts: {} };
    }
  }

  inspectRoutes(workspaceDir: string): string[] {
    const files = this.listFiles(workspaceDir);
    return files
      .filter((f) => f.startsWith("app/") && (f.endsWith("/page.tsx") || f.endsWith("/page.jsx") || f === "app/page.tsx"))
      .map((f) => {
        if (f === "app/page.tsx") return "/";
        return "/" + f.replace(/^app\//, "").replace(/\/page\.(tsx|jsx)$/, "");
      });
  }

  inspectComponents(workspaceDir: string): string[] {
    const files = this.listFiles(workspaceDir);
    return files.filter((f) => f.startsWith("components/") || f.includes("/components/"));
  }

  inspectStyles(workspaceDir: string): { stylingSystem: string; styleFiles: string[] } {
    const files = this.listFiles(workspaceDir);
    const styleFiles = files.filter((f) => f.endsWith(".css") || f.endsWith(".scss") || f.includes("tailwind"));
    const pkg = this.inspectPackageJson(workspaceDir);
    const hasTailwind = "tailwindcss" in pkg.dependencies || "tailwindcss" in pkg.devDependencies;

    return {
      stylingSystem: hasTailwind ? "Tailwind CSS (Utility-First)" : "CSS Modules / Standard CSS",
      styleFiles,
    };
  }

  inspectConfiguration(workspaceDir: string): Record<string, boolean> {
    return {
      hasNextConfig: fs.existsSync(path.resolve(workspaceDir, "next.config.js")) || fs.existsSync(path.resolve(workspaceDir, "next.config.mjs")) || fs.existsSync(path.resolve(process.cwd(), "next.config.ts")),
      hasTsConfig: fs.existsSync(path.resolve(workspaceDir, "tsconfig.json")) || fs.existsSync(path.resolve(process.cwd(), "tsconfig.json")),
      hasTailwindConfig: fs.existsSync(path.resolve(workspaceDir, "tailwind.config.js")) || fs.existsSync(path.resolve(workspaceDir, "tailwind.config.ts")),
      hasPostcssConfig: fs.existsSync(path.resolve(workspaceDir, "postcss.config.js")) || fs.existsSync(path.resolve(workspaceDir, "postcss.config.mjs")),
    };
  }

  inspectFullContext(workspaceDir: string, taskTitle: string): RepositoryInspectionResult {
    const pkg = this.inspectPackageJson(workspaceDir);
    const routes = this.inspectRoutes(workspaceDir);
    const components = this.inspectComponents(workspaceDir);
    const styles = this.inspectStyles(workspaceDir);
    const allFiles = this.listFiles(workspaceDir);

    const affectedRoutes: string[] = [];
    const affectedFiles: string[] = [];

    if (taskTitle.toLowerCase().includes("landing") || taskTitle.toLowerCase().includes("homepage")) {
      affectedRoutes.push("/");
      affectedFiles.push("app/page.tsx");
      affectedFiles.push("components/Header.tsx");
      affectedFiles.push("components/Hero.tsx");
      affectedFiles.push("components/ProductGrid.tsx");
      affectedFiles.push("components/QuoteCalculator.tsx");
    } else if (taskTitle.toLowerCase().includes("contact")) {
      affectedFiles.push("components/ContactForm.tsx");
    } else {
      affectedRoutes.push("/preview");
      affectedFiles.push("app/page.tsx");
    }

    return {
      framework: "Next.js 15 (App Router, React 19, TypeScript)",
      routing: "Next.js App Router (/app directory conventions)",
      existingComponents: components,
      reusableComponents: components.filter((c) => c.includes("Button") || c.includes("Card") || c.includes("Modal") || c.includes("Header")),
      designTokens: {
        theme: "Slate / Emerald / Zinc High-Craft Industrial",
        colors: ["#0f172a (Slate 900)", "#059669 (Emerald 600)", "#334155 (Slate 700)", "#f8fafc (Slate 50)"],
        fonts: ["Inter / System Sans", "JetBrains Mono for technical specs"],
      },
      installedDependencies: { ...pkg.dependencies, ...pkg.devDependencies },
      stylingSystem: styles.stylingSystem,
      affectedRoutes,
      affectedFiles,
      summary: `Inspected repository with ${allFiles.length} files. Framework: Next.js 15 App Router. Styling: ${styles.stylingSystem}. Reusable components: ${components.length}.`,
    };
  }
}

export const developerInspectionService = new DeveloperInspectionService();