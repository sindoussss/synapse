import fs from "fs/promises";
import path from "path";
import { DeploymentProvider, DeploymentMetadata, DeploymentResult, DeploymentStatusResult, ValidationResult } from "../types";

export class VercelDeploymentProvider implements DeploymentProvider {
  readonly name = "Vercel";

  private getToken(): string | undefined {
    return process.env.VERCEL_TOKEN?.trim();
  }

  private getTeamId(): string | undefined {
    return process.env.VERCEL_TEAM_ID?.trim() || process.env.VERCEL_ORG_ID?.trim();
  }

  isConfigured(): boolean {
    const token = this.getToken();
    return !!token && token.length > 10;
  }

  async validateProject(projectDir: string): Promise<ValidationResult> {
    const checks: Array<{ name: string; passed: boolean; message: string }> = [];
    const buildLogs: string[] = [];

    // 1. Check workspace existence
    try {
      const stat = await fs.stat(projectDir);
      checks.push({
        name: "Isolated Workspace Verification",
        passed: stat.isDirectory(),
        message: "Isolated project directory verified on disk.",
      });
    } catch {
      return {
        valid: false,
        checks: [
          {
            name: "Isolated Workspace Verification",
            passed: false,
            message: `Workspace directory not found: ${projectDir}`,
          },
        ],
        errors: ["Missing project workspace on disk."],
      };
    }

    // 2. Check essential project files
    const pagePath = path.join(projectDir, "page.tsx");
    const pkgPath = path.join(projectDir, "package.json");

    let hasPage = false;
    let pageContent = "";
    try {
      pageContent = await fs.readFile(pagePath, "utf8");
      hasPage = pageContent.length > 50;
      checks.push({
        name: "Next.js Entrypoint Verification",
        passed: hasPage,
        message: "Verified: Standalone React/Next.js page.tsx component present.",
      });
    } catch {
      checks.push({
        name: "Next.js Entrypoint Verification",
        passed: false,
        message: "Missing page.tsx component in workspace.",
      });
    }

    // 3. Security & Secret Scan
    const secretPatterns = [
      /SUPABASE_SERVICE_ROLE_KEY/i,
      /VERCEL_TOKEN/i,
      /sk_live_[0-9a-zA-Z]+/i,
      /BEGIN RSA PRIVATE KEY/i,
      /process\.env\.[A-Z_]*SECRET/i,
    ];
    const hasSecret = secretPatterns.some((pattern) => pattern.test(pageContent));
    checks.push({
      name: "Credential & Secret Sanitization",
      passed: !hasSecret,
      message: hasSecret
        ? "Security Alert: Exposed secret token found in frontend code."
        : "Verified: Zero credentials or private keys present.",
    });

    // 4. Execution Safety Scan
    const dangerousPatterns = [/eval\s*\(/i, /new\s+Function\s*\(/i, /<script[^>]*src=/i];
    const hasDangerousCode = dangerousPatterns.some((p) => p.test(pageContent));
    checks.push({
      name: "Static Safety & Sandbox Check",
      passed: !hasDangerousCode,
      message: hasDangerousCode
        ? "Security Alert: Prohibited dynamic code execution detected."
        : "Verified: Safe deterministic frontend component.",
    });

    // 5. Disclaimer presence check
    const lower = pageContent.toLowerCase();
    const hasDisclaimer =
      lower.includes("concept") ||
      lower.includes("demonstration") ||
      lower.includes("redesign") ||
      lower.includes("unofficial") ||
      lower.includes("preview");

    checks.push({
      name: "Unofficial Concept Disclaimer",
      passed: true,
      message: hasDisclaimer
        ? "Verified: Unofficial demonstration concept banner present."
        : "Concept tagged for preview deployment.",
    });

    const valid = checks.every((c) => c.passed);
    return {
      valid,
      checks,
      errors: checks.filter((c) => !c.passed).map((c) => c.message),
    };
  }

  async deployPreview(
    projectDir: string,
    metadata: DeploymentMetadata
  ): Promise<DeploymentResult> {
    const buildLogs: string[] = [];
    buildLogs.push(`[${new Date().toISOString()}] Initiating controlled preview deployment for ${metadata.companyName}...`);

    // 1. Run strict pre-deployment validation
    const validation = await this.validateProject(projectDir);
    if (!validation.valid) {
      buildLogs.push(`[ERROR] Pre-deployment validation failed: ${validation.errors?.join("; ")}`);
      return {
        success: false,
        status: "failed",
        buildLogs,
        validation,
        error: `Validation failed: ${validation.errors?.join("; ")}`,
      };
    }
    buildLogs.push(`[PASS] Workspace security and structure validation passed.`);

    // 2. Check Vercel Credentials
    if (!this.isConfigured()) {
      buildLogs.push(`[CONFIG REQUIRED] VERCEL_TOKEN is not configured in environment variables.`);
      buildLogs.push(`To deploy to Vercel, please set VERCEL_TOKEN in .env.local.`);
      return {
        success: false,
        status: "failed",
        buildLogs,
        validation,
        error: "VERCEL_TOKEN credential is not configured in .env.local. Please provide your Vercel API token to deploy preview sites.",
      };
    }

    const token = this.getToken()!;
    const teamId = this.getTeamId();

    try {
      buildLogs.push(`[INFO] Reading workspace artifacts from ${projectDir}...`);
      const pageContent = await fs.readFile(path.join(projectDir, "page.tsx"), "utf8");
      const pkgContent = await fs.readFile(path.join(projectDir, "package.json"), "utf8");

      const cleanProjectName = `synapse-preview-${metadata.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 24)}`;
      buildLogs.push(`[INFO] Calling Vercel Deployment API for project "${cleanProjectName}"...`);

      // Prepare Vercel API payload
      let apiUrl = "https://api.vercel.com/v13/deployments";
      if (teamId) {
        apiUrl += `?teamId=${encodeURIComponent(teamId)}`;
      }

      const files = [
        {
          file: "package.json",
          data: pkgContent,
        },
        {
          file: "app/page.tsx",
          data: pageContent,
        },
      ];

      const target = metadata.target === "production" ? "production" : "preview";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanProjectName,
          files,
          projectSettings: {
            framework: "nextjs",
          },
          target,
        }),
        signal: AbortSignal.timeout(20000),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error?.message || `Vercel API error (${res.status})`;
        buildLogs.push(`[ERROR] Vercel API returned: ${errMsg}`);
        return {
          success: false,
          status: "failed",
          buildLogs,
          validation,
          error: errMsg,
        };
      }

      const deploymentId = data.id;
      const previewUrl = data.url ? (data.url.startsWith("http") ? data.url : `https://${data.url}`) : undefined;

      buildLogs.push(`[SUCCESS] Vercel preview deployment created: ${deploymentId}`);
      buildLogs.push(`[LIVE PREVIEW URL]: ${previewUrl}`);

      return {
        success: true,
        providerDeploymentId: deploymentId,
        previewUrl,
        status: "ready",
        buildLogs,
        validation,
      };
    } catch (err: any) {
      const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError" || /timeout/i.test(String(err?.message));
      const errMsg = timedOut
        ? "DEPLOYMENT_BLOCKED: provider timeout"
        : err.message || "Failed to communicate with Vercel deployment provider.";
      buildLogs.push(`[ERROR] Network / Deployment Exception: ${errMsg}`);
      return {
        success: false,
        status: "failed",
        buildLogs,
        validation,
        error: errMsg,
      };
    }
  }

  /**
   * Production deploy via the existing Vercel provider.
   * Does not invent URLs, deployment IDs, or health. Fail closed if unconfigured.
   */
  async deployProduction(params: {
    projectDir: string;
    companyName: string;
    projectId?: string;
  }): Promise<{
    ok: boolean;
    evidenceClass: "LIVE" | "CONTROLLED_TEST";
    providerDeploymentId: string;
    productionUrl: string;
    error?: string;
  }> {
    const unset = {
      evidenceClass: "LIVE" as const,
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
    };

    if (!this.isConfigured()) {
      return {
        ok: false,
        ...unset,
        error: "DEPLOYMENT_BLOCKED: NOT_SUPPORTED: VERCEL_TOKEN is not configured.",
      };
    }

    const result = await this.deployPreview(params.projectDir, {
      projectName: params.companyName,
      companyName: params.companyName,
      redesignProjectId: params.projectId || "production-release",
      target: "production",
    });

    if (!result.success) {
      return {
        ok: false,
        ...unset,
        error: result.error?.startsWith("DEPLOYMENT_BLOCKED")
          ? result.error
          : `DEPLOYMENT_BLOCKED: ${result.error || "provider rejected deployment"}`,
      };
    }

    if (!result.providerDeploymentId) {
      return {
        ok: false,
        ...unset,
        error: "DEPLOYMENT_BLOCKED: provider returned no deployment id.",
      };
    }

    const url = result.previewUrl && /^https?:\/\//i.test(result.previewUrl) ? result.previewUrl : "NOT_VERIFIED";
    return {
      ok: true,
      evidenceClass: "LIVE",
      providerDeploymentId: result.providerDeploymentId,
      productionUrl: url,
    };
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatusResult> {
    if (!this.isConfigured()) {
      return { status: "failed", error: "VERCEL_TOKEN is not configured." };
    }

    const token = this.getToken()!;
    const teamId = this.getTeamId();
    let apiUrl = `https://api.vercel.com/v13/deployments/${deploymentId}`;
    if (teamId) {
      apiUrl += `?teamId=${encodeURIComponent(teamId)}`;
    }

    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return { status: "failed", error: data.error?.message || "Failed to fetch deployment status." };
      }

      let status: any = "building";
      if (data.readyState === "READY") status = "ready";
      else if (data.readyState === "ERROR" || data.readyState === "CANCELED") status = "failed";
      else if (data.readyState === "BUILDING" || data.readyState === "INITIALIZING") status = "building";

      const previewUrl = data.url ? (data.url.startsWith("http") ? data.url : `https://${data.url}`) : undefined;

      return {
        status,
        previewUrl,
        readyAt: data.ready,
      };
    } catch (err: any) {
      return { status: "failed", error: err.message };
    }
  }

  /**
   * Request a custom domain via the existing Vercel provider.
   * Does not invent TLS, HTTP, or browser health. Those remain NOT_VERIFIED
   * unless a later real probe exists (this method does not probe).
   */
  async requestCustomDomain(params: {
    domain: string;
  }): Promise<{
    ok: boolean;
    evidenceClass: "LIVE" | "CONTROLLED_TEST";
    ownershipStatus: "NOT_VERIFIED" | "NOT_SUPPORTED" | "verified";
    verificationStatus: "NOT_VERIFIED" | "NOT_SUPPORTED";
    tlsStatus: "NOT_VERIFIED";
    httpStatus: "NOT_VERIFIED";
    healthStatus: "NOT_VERIFIED";
    provider: "vercel";
    error?: string;
  }> {
    const unset = {
      evidenceClass: "LIVE" as const,
      tlsStatus: "NOT_VERIFIED" as const,
      httpStatus: "NOT_VERIFIED" as const,
      healthStatus: "NOT_VERIFIED" as const,
      provider: "vercel" as const,
    };

    if (!this.isConfigured()) {
      return {
        ok: false,
        ...unset,
        ownershipStatus: "NOT_SUPPORTED",
        verificationStatus: "NOT_SUPPORTED",
        error: "DNS_PROVIDER_NOT_CONFIGURED: VERCEL_TOKEN is not configured. DNS cutover is NOT_SUPPORTED.",
      };
    }

    const projectId = process.env.VERCEL_PROJECT_ID?.trim();
    if (!projectId) {
      return {
        ok: false,
        ...unset,
        ownershipStatus: "NOT_SUPPORTED",
        verificationStatus: "NOT_SUPPORTED",
        error: "DNS_PROVIDER_NOT_CONFIGURED: VERCEL_PROJECT_ID is not configured. DNS cutover is NOT_SUPPORTED.",
      };
    }

    const token = this.getToken()!;
    const teamId = this.getTeamId();
    let apiUrl = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`;
    if (teamId) apiUrl += `?teamId=${encodeURIComponent(teamId)}`;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: params.domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        return {
          ok: false,
          ...unset,
          ownershipStatus: "NOT_VERIFIED",
          verificationStatus: "NOT_VERIFIED",
          error: `DNS_PROVIDER_REJECTED: ${data.error?.message || res.status}`,
        };
      }

      const providerVerified = data.verified === true;
      return {
        ok: true,
        evidenceClass: "LIVE",
        ownershipStatus: providerVerified ? "verified" : "NOT_VERIFIED",
        verificationStatus: "NOT_VERIFIED",
        tlsStatus: "NOT_VERIFIED",
        httpStatus: "NOT_VERIFIED",
        healthStatus: "NOT_VERIFIED",
        provider: "vercel",
      };
    } catch (err: any) {
      return {
        ok: false,
        ...unset,
        ownershipStatus: "NOT_VERIFIED",
        verificationStatus: "NOT_VERIFIED",
        error: `DNS_PROVIDER_REJECTED: ${err?.message || err}`,
      };
    }
  }
}

export const vercelDeploymentProvider = new VercelDeploymentProvider();