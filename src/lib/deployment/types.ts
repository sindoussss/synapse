export type DeploymentStatus =
  | "pending_approval"
  | "approved"
  | "building"
  | "deploying"
  | "ready"
  | "failed"
  | "cancelled";

export interface ValidationResult {
  valid: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  errors?: string[];
  warnings?: string[];
}

export interface DeploymentMetadata {
  projectName: string;
  companyName: string;
  leadId?: string;
  redesignProjectId: string;
  disclaimer?: string;
}

export interface DeploymentResult {
  success: boolean;
  providerDeploymentId?: string;
  previewUrl?: string;
  status: DeploymentStatus;
  buildLogs: string[];
  validation: ValidationResult;
  error?: string;
}

export interface DeploymentStatusResult {
  status: DeploymentStatus;
  previewUrl?: string;
  readyAt?: string;
  error?: string;
}

export interface DeploymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  validateProject(projectDir: string): Promise<ValidationResult>;
  deployPreview(projectDir: string, metadata: DeploymentMetadata): Promise<DeploymentResult>;
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatusResult>;
}