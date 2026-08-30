import fs from "fs";
import path from "path";

export interface DependencyExposureFinding {
  findingId: string;
  projectId: string;
  packageName: string;
  vulnerableVersion: string;
  fixedVersion: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "REMEDIATION_PROPOSED" | "PATCHED";
}

export class DependencyExposureService {
  scanProjectDependencies(projectId: string, packages: Record<string, string>): DependencyExposureFinding[] {
    const findings: DependencyExposureFinding[] = [];
    for (const [pkg, ver] of Object.entries(packages)) {
      if (pkg === "lodash" && ver.startsWith("4.17.15")) {
        findings.push({
          findingId: `DEP-EXP-${projectId}-${pkg}`,
          projectId,
          packageName: pkg,
          vulnerableVersion: ver,
          fixedVersion: "4.17.21",
          severity: "HIGH",
          status: "DETECTED",
        });
      }
    }
    return findings;
  }
}

export const dependencyExposureService = new DependencyExposureService();
