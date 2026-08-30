import crypto from "crypto";

export interface ArtifactIntegrityRecord {
  artifactId: string;
  artifactType: "SNAPSHOT" | "RELEASE_CANDIDATE" | "DELIVERY_PACKAGE" | "AUDIT_LOG" | "SOURCE_FILE";
  expectedHash: string;
  projectId: string;
  registeredAt: string;
}

export interface IntegrityCheckResult {
  artifactId: string;
  status: "VERIFIED" | "INTEGRITY_VIOLATION" | "UNKNOWN" | "NOT_APPLICABLE";
  expectedHash: string;
  actualHash: string | "UNKNOWN";
  violation: boolean;
  escalation?: "HUMAN_REVIEW_REQUIRED";
}

export class IntegrityVerificationService {
  private registry: Map<string, ArtifactIntegrityRecord> = new Map();

  register(record: ArtifactIntegrityRecord): void {
    this.registry.set(record.artifactId, record);
  }

  computeHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  verify(artifactId: string, currentContent: string): IntegrityCheckResult {
    const registered = this.registry.get(artifactId);
    if (!registered) {
      return {
        artifactId,
        status: "UNKNOWN",
        expectedHash: "UNREGISTERED",
        actualHash: "UNKNOWN",
        violation: false,
      };
    }

    const actualHash = this.computeHash(currentContent);
    if (actualHash !== registered.expectedHash) {
      console.error(
        `[IntegrityVerification] INTEGRITY_VIOLATION: Artifact '${artifactId}' hash mismatch. Expected '${registered.expectedHash.slice(0, 16)}...' Got '${actualHash.slice(0, 16)}...'`
      );
      return {
        artifactId,
        status: "INTEGRITY_VIOLATION",
        expectedHash: registered.expectedHash,
        actualHash,
        violation: true,
        escalation: "HUMAN_REVIEW_REQUIRED",
      };
    }

    return {
      artifactId,
      status: "VERIFIED",
      expectedHash: registered.expectedHash,
      actualHash,
      violation: false,
    };
  }

  verifyHashPair(label: string, expectedHash: string, currentHash: string): IntegrityCheckResult {
    if (!expectedHash || !currentHash) {
      return { artifactId: label, status: "UNKNOWN", expectedHash: expectedHash || "MISSING", actualHash: currentHash || "MISSING", violation: false };
    }
    if (expectedHash !== currentHash) {
      return { artifactId: label, status: "INTEGRITY_VIOLATION", expectedHash, actualHash: currentHash, violation: true, escalation: "HUMAN_REVIEW_REQUIRED" };
    }
    return { artifactId: label, status: "VERIFIED", expectedHash, actualHash: currentHash, violation: false };
  }
}

export const integrityVerificationService = new IntegrityVerificationService();
