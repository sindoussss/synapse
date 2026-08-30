import path from "path";
import { ValidationSummary, ValidationCheckResult } from "../../repositories/redesign.repository";

export class CodeValidator {
  validatePathSafety(baseDir: string, relativeFilePath: string): boolean {
    // 1. Rejects path traversal
    if (relativeFilePath.includes("..") || path.isAbsolute(relativeFilePath)) {
      return false;
    }
    const resolved = path.resolve(baseDir, relativeFilePath);
    return resolved.startsWith(path.resolve(baseDir));
  }

  validateFileContent(filePath: string, content: string): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];

    // Check 1: No secret exposure
    const secretPatterns = [
      /SUPABASE_SERVICE_ROLE_KEY/i,
      /process\.env\.[A-Z_]*SECRET/i,
      /sk_live_[0-9a-zA-Z]+/i,
      /BEGIN RSA PRIVATE KEY/i,
    ];
    const hasSecret = secretPatterns.some((pattern) => pattern.test(content));
    results.push({
      name: "Secret Sanitization Check",
      passed: !hasSecret,
      message: hasSecret
        ? "Exposed private API secret or environment credential pattern detected."
        : "Clean: No API secrets or private tokens detected.",
    });

    // Check 2: No dangerous script execution
    const dangerousPatterns = [/eval\s*\(/i, /new\s+Function\s*\(/i, /<script[^>]*src=/i];
    const hasDangerousCode = dangerousPatterns.some((p) => p.test(content));
    results.push({
      name: "Execution Safety Check",
      passed: !hasDangerousCode,
      message: hasDangerousCode
        ? "Potentially unsafe dynamic execution (eval/script injection) found."
        : "Clean: Safe deterministic React/JSX code.",
    });

    // Check 3: Responsive Design Markers
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
      const hasResponsiveClasses = /md:|sm:|lg:|xl:|flex-col|grid-cols-/i.test(content);
      results.push({
        name: "Responsive Viewport Structure",
        passed: hasResponsiveClasses,
        message: hasResponsiveClasses
          ? "Verified: Tailwind mobile-first and responsive breakpoints present."
          : "Warning: Limited responsive breakpoint classes detected.",
      });

      // Check 4: Interactive Components (Buttons / Forms)
      const hasInteraction = /<button|<form|<input|<select|onClick|onChange/i.test(content);
      results.push({
        name: "Interactive Component Verification",
        passed: hasInteraction,
        message: hasInteraction
          ? "Verified: Interactive CTAs and lead capture elements present."
          : "Missing interactive CTA or form elements.",
      });
    }

    return results;
  }

  summarizeValidation(checks: ValidationCheckResult[], repairAttempts: number = 0): ValidationSummary {
    const criticalFails = checks.filter(
      (c) => !c.passed && (c.name.includes("Secret") || c.name.includes("Safety"))
    );
    const valid = criticalFails.length === 0;

    return {
      valid,
      checks,
      repairAttempts,
      warnings: checks.filter((c) => !c.passed).map((c) => c.message),
    };
  }
}

export const codeValidator = new CodeValidator();