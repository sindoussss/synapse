export type NotificationVisibility = "CLIENT_SAFE" | "OPERATOR_ONLY" | "INTERNAL_ONLY";

export interface NotificationRuleResult {
  recipientType: "CLIENT" | "OPERATOR" | "INTERNAL_SYSTEM";
  visibility: NotificationVisibility;
  channels: ("IN_APP" | "EMAIL")[];
  defaultPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  clientSafeTitle: string;
}

export class NotificationRuleService {
  evaluateEvent(eventType: string): NotificationRuleResult {
    switch (eventType) {
      case "CLIENT_REVIEW_READY":
      case "DESIGN_REVIEW_READY":
        return {
          recipientType: "CLIENT",
          visibility: "CLIENT_SAFE",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Website Preview Ready for Review",
        };

      case "CLIENT_APPROVAL_REQUIRED":
        return {
          recipientType: "CLIENT",
          visibility: "CLIENT_SAFE",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Your Review & Sign-Off is Requested",
        };

      case "PAYMENT_VERIFIED":
        return {
          recipientType: "CLIENT",
          visibility: "CLIENT_SAFE",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Payment Verified Successfully",
        };

      case "SOURCE_DELIVERY_READY":
      case "DOWNLOAD_AVAILABLE":
        return {
          recipientType: "CLIENT",
          visibility: "CLIENT_SAFE",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Source Code Package Ready for Download",
        };

      case "DEPLOYMENT_COMPLETED":
        return {
          recipientType: "CLIENT",
          visibility: "CLIENT_SAFE",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Website Successfully Deployed Live",
        };

      case "OPERATOR_APPROVAL_REQUIRED":
      case "PRODUCTION_DEPLOYMENT_APPROVAL":
        return {
          recipientType: "OPERATOR",
          visibility: "OPERATOR_ONLY",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "HIGH",
          clientSafeTitle: "Operator Approval Required",
        };

      case "PAYMENT_MISMATCH":
      case "PAYMENT_EXCEPTION":
        return {
          recipientType: "OPERATOR",
          visibility: "OPERATOR_ONLY",
          channels: ["IN_APP", "EMAIL"],
          defaultPriority: "CRITICAL",
          clientSafeTitle: "Payment Exception Diagnosed",
        };

      case "SECURITY_INCIDENT":
      case "SECURITY_REVIEW_REQUIRED":
        return {
          recipientType: "OPERATOR",
          visibility: "OPERATOR_ONLY",
          channels: ["IN_APP"],
          defaultPriority: "CRITICAL",
          clientSafeTitle: "Security Exception Detected",
        };

      case "INTERNAL_DIAGNOSTIC_TRACE":
      case "RAW_WEBHOOK_PAYLOAD":
        return {
          recipientType: "INTERNAL_SYSTEM",
          visibility: "INTERNAL_ONLY",
          channels: ["IN_APP"],
          defaultPriority: "LOW",
          clientSafeTitle: "Internal Diagnostic Log",
        };

      default:
        return {
          recipientType: "OPERATOR",
          visibility: "OPERATOR_ONLY",
          channels: ["IN_APP"],
          defaultPriority: "MEDIUM",
          clientSafeTitle: `System Event: ${eventType}`,
        };
    }
  }
}

export const notificationRuleService = new NotificationRuleService();