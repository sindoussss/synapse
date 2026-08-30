export type EnvVarScope = "CLIENT_PUBLIC" | "SERVER_ONLY" | "SECRET" | "SYSTEM_GENERATED" | "CLIENT_PROVIDED";
export type EnvVarNecessity = "REQUIRED" | "OPTIONAL" | "UNKNOWN";

export interface EnvVarMetadata {
  key: string;
  necessity: EnvVarNecessity;
  scope: EnvVarScope;
  isSet: boolean;
  maskedValue?: string;
  sourceProjectId: string;
}

export interface EnvPreflightResult {
  status: "COMPLETE" | "MISSING_REQUIRED" | "UNVERIFIED" | "CONFLICTING";
  variables: EnvVarMetadata[];
  missingRequiredKeys: string[];
  isDeploymentEligible: boolean;
  reason: string;
}

const SECRET_KEYWORDS = ["SECRET", "PASSWORD", "KEY", "TOKEN", "CREDENTIAL", "AUTH"];

export class EnvironmentConfigurationService {
  classifyVariable(key: string, value?: string, projectId: string = "default"): EnvVarMetadata {
    const keyUpper = key.toUpperCase();
    const isSecret = SECRET_KEYWORDS.some((kw) => keyUpper.includes(kw));
    const isPublic = key.startsWith("NEXT_PUBLIC_") || key.startsWith("VITE_");

    let scope: EnvVarScope = "SERVER_ONLY";
    if (isSecret) scope = "SECRET";
    else if (isPublic) scope = "CLIENT_PUBLIC";
    else if (keyUpper.includes("SITE_URL") || keyUpper.includes("PORT")) scope = "SYSTEM_GENERATED";
    else if (keyUpper.includes("CONTACT") || keyUpper.includes("EMAIL")) scope = "CLIENT_PROVIDED";

    let necessity: EnvVarNecessity = "OPTIONAL";
    if (keyUpper.includes("SITE_URL") || keyUpper.includes("RECIPIENT_EMAIL") || keyUpper.includes("DATABASE_URL")) {
      necessity = "REQUIRED";
    }

    let maskedValue: string | undefined = undefined;
    if (value !== undefined) {
      if (scope === "SECRET") {
        maskedValue = "[REDACTED_SECRET]";
      } else {
        maskedValue = value;
      }
    }

    return {
      key,
      necessity,
      scope,
      isSet: value !== undefined && value.trim().length > 0,
      maskedValue,
      sourceProjectId: projectId,
    };
  }

  runPreflight(params: {
    projectId: string;
    requiredKeys: string[];
    providedEnv: Record<string, string>;
  }): EnvPreflightResult {
    const variables: EnvVarMetadata[] = [];
    const missingRequired: string[] = [];

    for (const reqKey of params.requiredKeys) {
      const val = params.providedEnv[reqKey];
      const meta = this.classifyVariable(reqKey, val, params.projectId);
      meta.necessity = "REQUIRED";
      variables.push(meta);

      if (!meta.isSet) {
        missingRequired.push(reqKey);
      }
    }

    for (const [key, val] of Object.entries(params.providedEnv)) {
      if (!params.requiredKeys.includes(key)) {
        variables.push(this.classifyVariable(key, val, params.projectId));
      }
    }

    if (missingRequired.length > 0) {
      return {
        status: "MISSING_REQUIRED",
        variables,
        missingRequiredKeys: missingRequired,
        isDeploymentEligible: false,
        reason: `DEPLOYMENT_BLOCKED: Missing required environment variables: [${missingRequired.join(", ")}]`,
      };
    }

    return {
      status: "COMPLETE",
      variables,
      missingRequiredKeys: [],
      isDeploymentEligible: true,
      reason: "All required environment variables verified and safely configured.",
    };
  }
}

export const environmentConfigurationService = new EnvironmentConfigurationService();