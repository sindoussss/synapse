export type EntityVerificationStatus =
  | "UNVERIFIED"
  | "VERIFYING"
  | "VERIFIED"
  | "CONFLICTING"
  | "NOT_FOUND"
  | "BLOCKED";

export type ClaimType =
  | "VERIFIED_FACT"
  | "SUPPORTED_INFERENCE"
  | "UNVERIFIED_INFERENCE"
  | "UNKNOWN";

export type SourceType =
  | "OFFICIAL_REGISTRY"
  | "FIRST_PARTY_WEBSITE"
  | "OPERATOR_SUPPLIED"
  | "OPERATOR_SUPPLIED_UNVERIFIED"
  | "NONE";

export interface ProvenancedField<T> {
  value: T | null;
  source_url: string | null;
  source_type: SourceType;
  retrieved_at: string | null;
  verification_status: EntityVerificationStatus;
  claim_type: ClaimType;
}

export interface ProvenancedOrganization {
  id: string;
  name: ProvenancedField<string>;
  official_name: ProvenancedField<string>;
  website: ProvenancedField<string>;
  country: ProvenancedField<string>;
  industry: ProvenancedField<string>;
  public_contact: ProvenancedField<string>;
  headquarters: ProvenancedField<string>;
  source_classification: string;
  entity_verification_status: EntityVerificationStatus;
}

export interface PlanValidationResult {
  valid: boolean;
  status: "PLAN_VALIDATED" | "PLAN_VALIDATION_FAILED";
  entityName?: string;
  entityStatus: EntityVerificationStatus;
  errors: string[];
  warnings: string[];
}