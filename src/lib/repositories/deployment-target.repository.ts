import { DeploymentTargetType, FrameworkType, ArtifactType } from "./build-profile.repository";

export interface DeploymentTargetRecord {
  targetId: string;
  provider: DeploymentTargetType;
  environment: "production" | "staging" | "sandbox";
  projectId: string;
  deploymentMode: "SERVER_RUNTIME" | "STATIC_OUTPUT";
  domain: string;
  supportedFrameworks: FrameworkType[];
  supportedArtifactTypes: ArtifactType[];
  status: "ACTIVE" | "MAINTENANCE" | "DEPRECATED";
}

export class DeploymentTargetRepository {
  private targets: DeploymentTargetRecord[] = [
    {
      targetId: "TGT-LOCAL-STAGING",
      provider: "LOCAL_STAGING",
      environment: "staging",
      projectId: "GLOBAL",
      deploymentMode: "SERVER_RUNTIME",
      domain: "http://127.0.0.1:3005",
      supportedFrameworks: ["NEXT_JS", "STATIC_HTML", "VITE"],
      supportedArtifactTypes: ["BUILD_OUTPUT", "STATIC_EXPORT", "SOURCE_PACKAGE"],
      status: "ACTIVE",
    },
    {
      targetId: "TGT-VERCEL-PROD",
      provider: "VERCEL",
      environment: "production",
      projectId: "GLOBAL",
      deploymentMode: "SERVER_RUNTIME",
      domain: "https://sindous.ph",
      supportedFrameworks: ["NEXT_JS"],
      supportedArtifactTypes: ["BUILD_OUTPUT", "SOURCE_PACKAGE"],
      status: "ACTIVE",
    },
    {
      targetId: "TGT-STATIC-HOSTING",
      provider: "STATIC_HOSTING",
      environment: "production",
      projectId: "GLOBAL",
      deploymentMode: "STATIC_OUTPUT",
      domain: "https://static.sindous.ph",
      supportedFrameworks: ["STATIC_HTML", "VITE"],
      supportedArtifactTypes: ["STATIC_EXPORT"],
      status: "ACTIVE",
    },
  ];

  getTarget(provider: DeploymentTargetType): DeploymentTargetRecord | null {
    return this.targets.find((t) => t.provider === provider) || null;
  }

  validateCompatibility(params: {
    framework: FrameworkType;
    artifactType: ArtifactType;
    targetProvider: DeploymentTargetType;
  }): { isCompatible: boolean; reason: string } {
    const target = this.getTarget(params.targetProvider);
    if (!target) {
      return {
        isCompatible: false,
        reason: `DEPLOYMENT_TARGET_INCOMPATIBLE: Unrecognized deployment target provider '${params.targetProvider}'.`,
      };
    }

    if (!target.supportedFrameworks.includes(params.framework)) {
      return {
        isCompatible: false,
        reason: `DEPLOYMENT_TARGET_INCOMPATIBLE: Target '${params.targetProvider}' does not support framework '${params.framework}'.`,
      };
    }

    if (!target.supportedArtifactTypes.includes(params.artifactType)) {
      return {
        isCompatible: false,
        reason: `DEPLOYMENT_TARGET_INCOMPATIBLE: Target '${params.targetProvider}' does not support artifact type '${params.artifactType}'.`,
      };
    }

    return {
      isCompatible: true,
      reason: `Target '${params.targetProvider}' fully compatible with ${params.framework} (${params.artifactType}).`,
    };
  }
}

export const deploymentTargetRepository = new DeploymentTargetRepository();