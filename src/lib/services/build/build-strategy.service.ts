import { BuildProfileRecord, FrameworkType, ArtifactType, DeploymentTargetType } from "../../repositories/build-profile.repository";

export interface BuildStrategyPlan {
  framework: FrameworkType;
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  artifactType: ArtifactType;
  compatibleDeploymentTargets: DeploymentTargetType[];
  isExecutable: boolean;
  blockReason?: string;
}

const ALLOWED_BUILD_COMMANDS: Record<string, string[]> = {
  NEXT_JS: ["npm run build", "npx next build", "pnpm build", "yarn build"],
  VITE: ["npm run build", "npx vite build", "pnpm build", "yarn build"],
  STATIC_HTML: ["echo 'Static asset validation passed'", "none"],
};

export class BuildStrategyService {
  resolveStrategy(profile: BuildProfileRecord): BuildStrategyPlan {
    if (profile.framework === "FRAMEWORK_UNKNOWN") {
      return {
        framework: "FRAMEWORK_UNKNOWN",
        installCommand: "none",
        buildCommand: "none",
        outputDirectory: "none",
        artifactType: "SOURCE_PACKAGE",
        compatibleDeploymentTargets: [],
        isExecutable: false,
        blockReason: "BUILD_BLOCKED: Unknown framework cannot be compiled without explicit configuration review.",
      };
    }

    const allowedCmds = ALLOWED_BUILD_COMMANDS[profile.framework] || [];
    const isCommandAllowed = allowedCmds.includes(profile.buildCommand);

    if (!isCommandAllowed && profile.buildCommand !== "none") {
      return {
        framework: profile.framework,
        installCommand: profile.installCommand,
        buildCommand: profile.buildCommand,
        outputDirectory: profile.outputDirectory,
        artifactType: profile.artifactType,
        compatibleDeploymentTargets: [],
        isExecutable: false,
        blockReason: `UNAUTHORIZED_BUILD_COMMAND: Command '${profile.buildCommand}' is not in the verified allowlist for framework '${profile.framework}'.`,
      };
    }

    let compatibleTargets: DeploymentTargetType[] = [];
    if (profile.framework === "NEXT_JS") {
      compatibleTargets = ["LOCAL_STAGING", "VERCEL"];
    } else if (profile.framework === "STATIC_HTML" || profile.framework === "VITE") {
      compatibleTargets = ["LOCAL_STAGING", "STATIC_HOSTING"];
    }

    return {
      framework: profile.framework,
      installCommand: profile.installCommand,
      buildCommand: profile.buildCommand,
      outputDirectory: profile.outputDirectory,
      artifactType: profile.artifactType,
      compatibleDeploymentTargets: compatibleTargets,
      isExecutable: true,
    };
  }
}

export const buildStrategyService = new BuildStrategyService();