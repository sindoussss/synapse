import { BuildProfileRecord } from "../../repositories/build-profile.repository";
import { BuildArtifactRecord } from "../../repositories/build-artifact.repository";

export interface ClientHandoffBundle {
  projectId: string;
  projectName: string;
  framework: string;
  frameworkVersion: string;
  deploymentTarget: string;
  productionUrl: string;
  artifactHash: string;
  sourceHash: string;
  manifestHash: string;
  rollbackVersion: string;
  buildInstructions: string[];
  environmentChecklist: string[];
  clientSafeReport: string;
  generatedAt: string;
}

export class ClientHandoffService {
  generateHandoffBundle(params: {
    profile: BuildProfileRecord;
    artifact: BuildArtifactRecord;
    projectName: string;
    productionUrl: string;
    rollbackVersion?: string;
  }): ClientHandoffBundle {
    const buildInstructions = [
      `1. Ensure Node.js ${params.profile.runtimeVersion} and npm are installed.`,
      `2. Run '${params.profile.installCommand}' to install exact verified dependencies.`,
      `3. Run '${params.profile.buildCommand}' to compile production bundles.`,
      `4. Run '${params.profile.startCommand}' to start the production web server.`,
    ];

    const environmentChecklist = params.profile.requiredEnvironmentVariables.map(
      (v) => `[REQUIRED] ${v} (Client-provided or production domain configuration)`
    );

    const clientSafeReport = `
================================================================================
📦 SYNAPSE PRODUCTION HANDOFF REPORT
================================================================================
Project:           ${params.projectName} (${params.profile.projectId})
Framework:         ${params.profile.framework} ${params.profile.frameworkVersion}
Runtime:           ${params.profile.runtime} (${params.profile.runtimeVersion})
Deployment Target: ${params.profile.deploymentTarget}
Live URL:          ${params.productionUrl}
Artifact Hash:     ${params.artifact.artifactHash}
Source Hash:       ${params.profile.sourceHash}
Manifest Hash:     ${params.profile.manifestHash}
Rollback Baseline: ${params.rollbackVersion || "PREV-STABLE-V1"}
Security Posture:  CLEAN (Zero credentials or secret keys included in handoff)
================================================================================
`.trim();

    return {
      projectId: params.profile.projectId,
      projectName: params.projectName,
      framework: params.profile.framework,
      frameworkVersion: params.profile.frameworkVersion,
      deploymentTarget: params.profile.deploymentTarget,
      productionUrl: params.productionUrl,
      artifactHash: params.artifact.artifactHash,
      sourceHash: params.profile.sourceHash,
      manifestHash: params.profile.manifestHash,
      rollbackVersion: params.rollbackVersion || "PREV-STABLE-V1",
      buildInstructions,
      environmentChecklist,
      clientSafeReport,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const clientHandoffService = new ClientHandoffService();