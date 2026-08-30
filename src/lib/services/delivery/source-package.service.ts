import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface DeliveryPackageManifest {
  deliveryId: string;
  projectId: string;
  clientId: string;
  releaseCandidateId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  packageHash: string;
  createdAt: string;
  fileCount: number;
  totalSizeBytes: number;
  packageVersion: number;
  filesList: string[];
}

export interface PackageGenerationResult {
  success: boolean;
  manifest?: DeliveryPackageManifest;
  packageFiles: Record<string, string>;
  excludedSecretsCount: number;
  errorReason?: string;
}

export class SourcePackageService {
  private forbiddenPatterns = [
    /\.env/i,
    /secret/i,
    /credential/i,
    /token/i,
    /private_key/i,
    /id_rsa/i,
    /supabase\/.*key/i,
    /scripts\/deploy/i,
  ];

  generateDeliveryPackage(params: {
    deliveryId: string;
    projectId: string;
    clientId: string;
    releaseCandidateId: string;
    snapshotId: string;
    sourceHash: string;
    manifestHash: string;
    rawFiles: Record<string, string>;
  }): PackageGenerationResult {
    const cleanFiles: Record<string, string> = {};
    let excludedSecretsCount = 0;
    let totalSize = 0;

    for (const [filePath, content] of Object.entries(params.rawFiles)) {
      // 1. Path Traversal & Escape Check
      if (filePath.includes("..") || path.isAbsolute(filePath)) {
        return {
          success: false,
          packageFiles: {},
          excludedSecretsCount: 0,
          errorReason: `PATH_TRAVERSAL_DETECTED: Invalid path '${filePath}'.`,
        };
      }

      // 2. Secret & Internal Exclusion
      const isForbidden = this.forbiddenPatterns.some((p) => p.test(filePath) || p.test(content.slice(0, 100)));
      if (isForbidden) {
        excludedSecretsCount++;
        continue;
      }

      cleanFiles[filePath] = content;
      totalSize += Buffer.byteLength(content, "utf8");
    }

    const filesList = Object.keys(cleanFiles).sort();
    const manifestHashCalc = crypto.createHash("sha256").update(JSON.stringify(cleanFiles)).digest("hex");
    const packageHash = crypto.createHash("sha256").update(Object.values(cleanFiles).join("\n")).digest("hex");

    const manifest: DeliveryPackageManifest = {
      deliveryId: params.deliveryId,
      projectId: params.projectId,
      clientId: params.clientId,
      releaseCandidateId: params.releaseCandidateId,
      snapshotId: params.snapshotId,
      sourceHash: params.sourceHash,
      manifestHash: manifestHashCalc,
      packageHash,
      createdAt: new Date().toISOString(),
      fileCount: filesList.length,
      totalSizeBytes: totalSize,
      packageVersion: 1,
      filesList,
    };

    return {
      success: true,
      manifest,
      packageFiles: cleanFiles,
      excludedSecretsCount,
    };
  }

  verifyPackageIntegrity(manifest: DeliveryPackageManifest, files: Record<string, string>): boolean {
    const currentHash = crypto.createHash("sha256").update(Object.values(files).join("\n")).digest("hex");
    return currentHash === manifest.packageHash;
  }
}

export const sourcePackageService = new SourcePackageService();
