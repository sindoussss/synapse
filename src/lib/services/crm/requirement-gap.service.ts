import { CRMLead, CRMOpportunity } from "../../repositories/crm.repository";

export interface RequirementGapItem {
  field: string;
  category: "PAGES" | "FUNCTIONALITY" | "BRANDING" | "CONTENT" | "INTEGRATION" | "DEADLINE" | "PAYMENT_TERMS" | "HOSTING";
  importance: "CRITICAL" | "OPTIONAL";
  status: "CONFIRMED" | "UNKNOWN" | "CONFLICTING";
  evidence?: string;
  clarificationQuestion?: string;
}

export interface RequirementGapAnalysis {
  opportunityId: string;
  organizationId: string;
  status: "READY_FOR_PROPOSAL" | "CLARIFICATION_REQUIRED";
  summary: string;
  criticalGapsCount: number;
  optionalGapsCount: number;
  conflictsCount: number;
  items: RequirementGapItem[];
  generatedAt: string;
}

export class RequirementGapService {
  analyzeGaps(params: {
    opportunityId: string;
    organizationId: string;
    lead: CRMLead;
    statedRequirements?: string[];
    statedExclusions?: string[];
    timelineConstraint?: string;
  }): RequirementGapAnalysis {
    const items: RequirementGapItem[] = [];
    const stated = (params.statedRequirements || []).join(" ").toLowerCase();
    const exclusions = (params.statedExclusions || []).join(" ").toLowerCase();

    // 1. Required Pages / Catalog
    if (stated.includes("catalog") || stated.includes("products") || stated.includes("grid")) {
      items.push({
        field: "Product Grid / Catalog",
        category: "PAGES",
        importance: "CRITICAL",
        status: "CONFIRMED",
        evidence: "Prospect requested product catalog / grid for building supplies.",
      });
    } else {
      items.push({
        field: "Product Catalog Requirements",
        category: "PAGES",
        importance: "CRITICAL",
        status: "UNKNOWN",
        clarificationQuestion: "How many product categories or items need to be displayed in the initial release?",
      });
    }

    // 2. Interactive Calculator / Quote Builder
    if (stated.includes("quote") || stated.includes("calculator") || stated.includes("estimate")) {
      items.push({
        field: "Quote Calculator",
        category: "FUNCTIONALITY",
        importance: "CRITICAL",
        status: "CONFIRMED",
        evidence: "Interactive pricing / construction quote calculator requested.",
      });
    } else {
      items.push({
        field: "Interactive Quote Tool",
        category: "FUNCTIONALITY",
        importance: "OPTIONAL",
        status: "UNKNOWN",
        clarificationQuestion: "Do you require customers to calculate materials and request instant quotes online?",
      });
    }

    // 3. Branding & Assets
    if (stated.includes("logo") || stated.includes("branding") || stated.includes("photos")) {
      items.push({
        field: "Branding Assets & Photography",
        category: "BRANDING",
        importance: "OPTIONAL",
        status: "CONFIRMED",
        evidence: "Existing branding and photography assets available.",
      });
    } else {
      items.push({
        field: "High-Resolution Branding & Media Assets",
        category: "BRANDING",
        importance: "OPTIONAL",
        status: "UNKNOWN",
        clarificationQuestion: "Do you have existing vector logos, brand colors, and photography available for the website?",
      });
    }

    // 4. Payment Terms & Milestone Acceptance
    if (stated.includes("50%") || stated.includes("deposit") || stated.includes("milestone")) {
      items.push({
        field: "Payment Terms",
        category: "PAYMENT_TERMS",
        importance: "CRITICAL",
        status: "CONFIRMED",
        evidence: "Standard 50% deposit / 50% completion agreed.",
      });
    } else {
      items.push({
        field: "Standard Payment Terms",
        category: "PAYMENT_TERMS",
        importance: "CRITICAL",
        status: "CONFIRMED",
        evidence: "Default commercial policy applied (50% upfront, 50% upon source code handoff).",
      });
    }

    // 5. Conflict Detection
    if (stated.includes("custom backend erp") && exclusions.includes("no backend development")) {
      items.push({
        field: "ERP Integration Scope",
        category: "INTEGRATION",
        importance: "CRITICAL",
        status: "CONFLICTING",
        evidence: "CONFLICT: Stated need mentions ERP integration, but project exclusions disallow backend development.",
        clarificationQuestion: "Please confirm whether third-party ERP integration is strictly in scope or deferred to Phase 2.",
      });
    }

    const criticalGaps = items.filter((i) => i.importance === "CRITICAL" && (i.status === "UNKNOWN" || i.status === "CONFLICTING"));
    const optionalGaps = items.filter((i) => i.importance === "OPTIONAL" && i.status === "UNKNOWN");
    const conflicts = items.filter((i) => i.status === "CONFLICTING");

    const status = criticalGaps.length === 0 ? "READY_FOR_PROPOSAL" : "CLARIFICATION_REQUIRED";
    const summary = status === "READY_FOR_PROPOSAL"
      ? "Core requirements are sufficiently confirmed. Ready for authoritative proposal drafting."
      : `${criticalGaps.length} critical requirement gap(s) or conflict(s) identified. Discovery clarification recommended.`;

    return {
      opportunityId: params.opportunityId,
      organizationId: params.organizationId,
      status,
      summary,
      criticalGapsCount: criticalGaps.length,
      optionalGapsCount: optionalGaps.length,
      conflictsCount: conflicts.length,
      items,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const requirementGapService = new RequirementGapService();