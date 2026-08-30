export interface TemplateVariables {
  projectName?: string;
  clientName?: string;
  version?: string;
  previewUrl?: string;
  reviewUrl?: string;
  amount?: number;
  currency?: string;
  invoiceId?: string;
  deliveryUrl?: string;
}

export class MessageTemplateService {
  sanitizeText(input: string): string {
    if (!input) return "";
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/javascript:/gi, "")
      .trim();
  }

  validateAiDraft(draftText: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const lower = draftText.toLowerCase();

    if (
      lower.includes("guarantee 100%") ||
      lower.includes("guaranteed 100%") ||
      lower.includes("100% guarantee") ||
      lower.includes("100% guaranteed")
    ) {
      violations.push("UNSUPPORTED_GUARANTEE: AI cannot promise 100% guarantees.");
    }
    if (
      lower.includes("free of charge") ||
      lower.includes("$0.00") ||
      lower.includes("no cost forever") ||
      lower.includes("free hosting") ||
      lower.includes("free forever")
    ) {
      violations.push("UNAUTHORIZED_PRICING_PROMISE: AI cannot grant free pricing overrides.");
    }
    if (
      lower.includes("within 1 hour guaranteed") ||
      lower.includes("immediate 10 minute deployment") ||
      lower.includes("guaranteed within")
    ) {
      violations.push("UNAUTHORIZED_SLA_COMMITMENT: AI cannot offer unapproved SLAs.");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  renderTemplate(templateType: string, vars: TemplateVariables): { title: string; body: string } {
    const proj = this.sanitizeText(vars.projectName || "Your Project");
    const ver = this.sanitizeText(vars.version || "v1.0.0");

    switch (templateType) {
      case "CLIENT_REVIEW_READY":
        return {
          title: `${proj} — Website Preview Ready for Review`,
          body: `Your verified website preview (${ver}) is now available for review at: ${vars.previewUrl || "Client Portal"}.`,
        };

      case "PAYMENT_VERIFIED":
        return {
          title: `${proj} — Payment Confirmed`,
          body: `Payment for invoice ${vars.invoiceId || "INV-001"} (${vars.currency || "USD"} ${vars.amount || 0}) has been verified.`,
        };

      case "SOURCE_DELIVERY_READY":
        return {
          title: `${proj} — Source Code Package Ready`,
          body: `Your verified source code package is ready for download. Please access your delivery portal.`,
        };

      case "DEPLOYMENT_COMPLETED":
        return {
          title: `${proj} — Website Successfully Deployed Live`,
          body: `Congratulations! Your website is live and fully operational at ${vars.previewUrl || "https://sindous.ph"}.`,
        };

      default:
        return {
          title: `${proj} Notification`,
          body: `System update for ${proj}.`,
        };
    }
  }
}

export const messageTemplateService = new MessageTemplateService();