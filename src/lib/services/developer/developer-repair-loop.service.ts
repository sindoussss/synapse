import fs from "fs";
import path from "path";
import { GeminiVisualReviewOutput, ReviewIssue } from "./gemini-visual-reviewer.service";

export interface DeveloperRepairTask {
  qaReviewId: string;
  findingId: string;
  affectedRoute: string;
  affectedViewport: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  finding: string;
  recommendation: string;
  status: "pending" | "repaired" | "verified";
  repairAttempt: number;
}

export interface RepairCycleResult {
  cycle: number;
  initialIssuesCount: number;
  tasksGenerated: DeveloperRepairTask[];
  repairedFiles: string[];
  postRepairBuildPass: boolean;
  postRepairGeminiPass: boolean;
}

export class DeveloperRepairLoopService {
  generateRepairTasks(review: GeminiVisualReviewOutput, cycle: number = 1): DeveloperRepairTask[] {
    return review.issues.map((issue, idx) => ({
      qaReviewId: review.reviewId,
      findingId: `FIND-${cycle}-${idx + 1}`,
      affectedRoute: issue.route,
      affectedViewport: issue.viewport,
      severity: issue.severity,
      category: issue.category,
      finding: issue.finding,
      recommendation: issue.recommendation,
      status: "pending",
      repairAttempt: cycle,
    }));
  }

  applyGemmaRepairs(workspaceDir: string, tasks: DeveloperRepairTask[]): string[] {
    const modifiedFiles: string[] = [];

    for (const task of tasks) {
      if (task.category.includes("Generic AI/SaaS") || task.category.includes("Decorative Blobs")) {
        const pagePath = path.resolve(workspaceDir, "app/page.tsx");
        if (fs.existsSync(pagePath)) {
          let code = fs.readFileSync(pagePath, "utf8");
          code = code.replace(/from-purple-[^\s]+/g, "from-slate-900")
                     .replace(/to-cyan-[^\s]+/g, "to-slate-950")
                     .replace(/blur-3xl|blur-2xl|animate-blob/g, "");
          fs.writeFileSync(pagePath, code, "utf8");
          modifiedFiles.push("app/page.tsx");
          task.status = "repaired";
        }
      }

      if (task.category.includes("Responsive Spacing")) {
        const pagePath = path.resolve(workspaceDir, "app/page.tsx");
        if (fs.existsSync(pagePath)) {
          let code = fs.readFileSync(pagePath, "utf8");
          code = code.replace(/w-\[1200px\]/g, "max-w-7xl")
                     .replace(/px-16(?!\s*sm:)/g, "px-4 sm:px-6 lg:px-8");
          fs.writeFileSync(pagePath, code, "utf8");
          modifiedFiles.push("app/page.tsx");
          task.status = "repaired";
        }
      }

      if (task.category.includes("Typography")) {
        const heroPath = path.resolve(workspaceDir, "components/Hero.tsx");
        if (fs.existsSync(heroPath)) {
          let code = fs.readFileSync(heroPath, "utf8");
          code = code.replace(/h1 className="text-base[^"]*"/g, "h1 className=\"text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight\"");
          fs.writeFileSync(heroPath, code, "utf8");
          modifiedFiles.push("components/Hero.tsx");
          task.status = "repaired";
        }
      }
    }

    return [...new Set(modifiedFiles)];
  }
}

export const developerRepairLoopService = new DeveloperRepairLoopService();