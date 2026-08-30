import crypto from "crypto";
import { designLibraryRepository, DesignComponentRecord, ComponentAdaptationRecord } from "../../repositories/design-library.repository";

export interface AdaptedComponentResult {
  adaptationId: string;
  originalComponentId: string;
  originalVersion: number;
  targetProjectId: string;
  adaptedSourceCode: string;
  adaptedSourceHash: string;
  isLibraryUnchanged: boolean;
  provenance: ComponentAdaptationRecord;
}

export class ComponentAdaptationService {
  adaptComponentForProject(params: {
    libraryComponentId: string;
    targetProjectId: string;
    targetSnapshotId: string;
    clientBrandTokens: { primaryColor?: string; headingFont?: string; companyName?: string };
    adaptationReason: string;
    adaptedBy: string;
  }): AdaptedComponentResult {
    const original = designLibraryRepository.getComponent(params.libraryComponentId);
    if (!original) {
      throw new Error(`Library component '${params.libraryComponentId}' not found.`);
    }

    if (original.status !== "VALIDATED") {
      throw new Error(`ADAPTATION_BLOCKED: Component '${params.libraryComponentId}' is in status '${original.status}'. Only VALIDATED components may be adapted.`);
    }

    const originalHashBefore = original.sourceHash;

    // Apply project tokens to create adapted copy
    let adaptedCode = original.sourceCode;
    if (params.clientBrandTokens.companyName) {
      adaptedCode = adaptedCode.replace(/Quote Calculator/g, `${params.clientBrandTokens.companyName} Quote Calculator`);
    }

    const adaptedHash = crypto.createHash("sha256").update(adaptedCode).digest("hex");

    const provenanceRecord: ComponentAdaptationRecord = {
      adaptationId: `ADAPT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      libraryComponentId: original.componentId,
      libraryVersion: original.version,
      targetProjectId: params.targetProjectId,
      targetSnapshotId: params.targetSnapshotId,
      sourceHash: adaptedHash,
      adaptationReason: params.adaptationReason,
      adaptedBy: params.adaptedBy,
      createdAt: new Date().toISOString(),
    };

    designLibraryRepository.recordAdaptation(provenanceRecord);

    // Verify library original remained completely unchanged
    const originalAfter = designLibraryRepository.getComponent(params.libraryComponentId);
    const isLibraryUnchanged = originalAfter !== null && originalAfter.sourceHash === originalHashBefore;

    return {
      adaptationId: provenanceRecord.adaptationId,
      originalComponentId: original.componentId,
      originalVersion: original.version,
      targetProjectId: params.targetProjectId,
      adaptedSourceCode: adaptedCode,
      adaptedSourceHash: adaptedHash,
      isLibraryUnchanged,
      provenance: provenanceRecord,
    };
  }
}

export const componentAdaptationService = new ComponentAdaptationService();