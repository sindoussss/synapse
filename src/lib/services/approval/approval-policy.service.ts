export type ActionApprovalRequirement = "AUTO" | "HUMAN_APPROVAL" | "HUMAN_ONLY" | "FORBIDDEN";

export class ApprovalPolicyService {
  classifyAction(actionType: string): { requirement: ActionApprovalRequirement; reason: string } {
    switch (actionType) {
      case "TELEMETRY_COLLECTION":
      case "HEALTH_CHECK":
      case "TRANSIENT_RETRY":
      case "READ_SNAPSHOT":
      case "EVENT_REPLAY":
        return { requirement: "AUTO", reason: "Standard autonomous read-only or bounded operational task." };

      case "PRODUCTION_DEPLOYMENT":
      case "ROLLBACK":
      case "RELEASE_APPROVAL":
      case "MAINTENANCE":
      case "CONFIGURATION_CHANGE":
      case "DOMAIN_CHANGE":
      case "CHANGE_REQUEST":
        return { requirement: "HUMAN_APPROVAL", reason: "High-impact mutation requires authenticated human operator sign-off." };

      case "PAYMENT_MUTATION":
      case "PAYMENT_EXCEPTION":
      case "PAYMENT_RECONCILIATION":
      case "SOURCE_DELIVERY":
      case "FINANCIAL_AMBIGUITY":
      case "SECURITY_EXCEPTION":
      case "UNKNOWN_STATE":
      case "MANUAL_RECOVERY":
        return { requirement: "HUMAN_ONLY", reason: "Financial, source release, or security exception requires manual human authority." };

      case "CROSS_TENANT_ACCESS":
      case "CROSS_PROJECT_MUTATION":
      case "RAW_SECRET_EXPOSURE":
      case "UNVERIFIED_FINANCIAL_OVERRIDE":
      case "FORGED_APPROVAL":
        return { requirement: "FORBIDDEN", reason: "Action violates zero-trust boundary or core security invariants." };

      default:
        return { requirement: "HUMAN_APPROVAL", reason: "Unrecognized action defaults fail-closed to human approval requirement." };
    }
  }
}

export const approvalPolicyService = new ApprovalPolicyService();