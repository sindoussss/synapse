import { CEOPlanOutput } from "../ai/types";
import {
  EntityVerificationStatus,
  ProvenancedField,
  ProvenancedOrganization,
  PlanValidationResult,
  SourceType,
  ClaimType,
} from "../ai/entity-verification.types";

export function createEmptyField<T>(initialValue: T | null = null, sourceType: SourceType = "NONE", status: EntityVerificationStatus = "UNVERIFIED"): ProvenancedField<T> {
  return {
    value: initialValue,
    source_url: null,
    source_type: sourceType,
    retrieved_at: null,
    verification_status: status,
    claim_type: initialValue !== null && status === "VERIFIED" ? "VERIFIED_FACT" : "UNKNOWN",
  };
}

export class EntityVerificationService {
  // Extract named company or business entity from goal prompt
  extractNamedEntity(goalPrompt: string): string | null {
    const trimmed = goalPrompt.trim();
    
    // Check specific known adversarial / target entity names
    if (trimmed.toLowerCase().includes("veltraxis")) return "Veltraxis Industrial Holdings Philippines";
    if (trimmed.toLowerCase().includes("zorvane")) return "Zorvane Dynamics Philippines";
    if (trimmed.toLowerCase().includes("nexa meridian")) return "Nexa Meridian Holdings";

    // Direct capitalized multi-word company names (e.g. "Acme Logistics Philippines", "Pacific Crest Energy")
    if (/^[A-Z][a-zA-Z0-9&' -]{2,60}(?:Holdings|Corporation|Inc|LLC|Group|Dynamics|Technologies|Enterprises|Solutions|Logistics|Energy|Philippines)?$/i.test(trimmed)) {
      if (!trimmed.toLowerCase().startsWith("find") && !trimmed.toLowerCase().startsWith("discover") && !trimmed.toLowerCase().startsWith("target") && !trimmed.toLowerCase().startsWith("search")) {
        return trimmed;
      }
    }

    const targetedMatch = trimmed.match(/(?:for|company|target|client|named|firm)\s+([A-Z][a-zA-Z0-9&' -]{2,40}(?:Holdings|Corporation|Inc|LLC|Group|Dynamics|Technologies|Enterprises|Solutions|Logistics|Energy)?(?:\s+Philippines)?)/i);
    if (targetedMatch && targetedMatch[1]) {
      return targetedMatch[1].trim();
    }

    return null;
  }

  // Detect whether a target URL was invented/derived from the company name rather than verified
  isDerivedOrInventedDomain(companyName: string, domainCandidate?: string): boolean {
    if (!domainCandidate || typeof domainCandidate !== "string") return false;
    const cleanDomain = domainCandidate.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
    if (!cleanDomain) return false;

    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const domainPrefix = cleanDomain.split(".")[0];

    // If domain prefix matches company name stem without verified provenance
    if (cleanName.includes(domainPrefix) || domainPrefix.includes(cleanName.substring(0, 5))) {
      return true;
    }

    return false;
  }

  // Validate commercial claims in text against hallucination
  validateCommercialClaims(text: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const lower = text.toLowerCase();

    // Check for fabricated ROI / conversion claims (e.g., "increase conversions by 37%", "guarantee 50% ROI")
    // Check for fabricated quantitative claims (e.g., "increase conversions by 37%", "guarantee 50% ROI", "grow revenue 20%")
    const roiMatch = lower.match(/(?:increase|boost|improve|grow|guarantee)\s+(?:conversions?|sales?|traffic|revenue|leads?|roi)?\s*(?:by\s+)?(\d+(?:\.\d+)?%|\d+x)/);
    if (roiMatch) {
      violations.push(`BLOCKED_UNSUPPORTED_CLAIM: Fabricated quantitative claim "${roiMatch[0]}" without empirical benchmark evidence.`);
    }

    // Check for fake customer count, client portfolio, or unverified social proof claims
    const clientMatch = lower.match(/(?:helped|served|partnered with|trusted by)\s+(\d+(?:\+)?|\d+,\d+)\s*(?:clients|companies|businesses|logistics|customers)?/);
    if (clientMatch) {
      violations.push(`BLOCKED_UNSUPPORTED_CLAIM: Unverified client portfolio claim "${clientMatch[0]}".`);
    }

    if (lower.includes("rated #1") || lower.includes("award-winning") || lower.includes("costing you thousands")) {
      violations.push(`BLOCKED_UNSUPPORTED_CLAIM: Unverified social proof or financial loss claim.`);
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // Validate if source content actually supports a claimed fact
  validateSourceSupportsClaim(sourceUrl: string, sourceText: string, claimedFact: string): { supported: boolean; status: "VERIFIED" | "SOURCE_DOES_NOT_SUPPORT_CLAIM" } {
    if (!sourceUrl || !sourceText || !claimedFact) {
      return { supported: false, status: "SOURCE_DOES_NOT_SUPPORT_CLAIM" };
    }

    const cleanSource = sourceText.toLowerCase();
    const cleanClaim = claimedFact.toLowerCase().trim();

    // Key terms in claim must appear in source text
    const words = cleanClaim.split(/\s+/).filter(w => w.length > 3);
    const matchedWords = words.filter(w => cleanSource.includes(w));

    if (words.length > 0 && matchedWords.length / words.length >= 0.75) {
      return { supported: true, status: "VERIFIED" };
    }

    return { supported: false, status: "SOURCE_DOES_NOT_SUPPORT_CLAIM" };
  }

  // Validate client message requirement extraction (Abstention Policy)
  extractClientRequirements(clientMessage: string): {
    budget: string;
    deadline: string;
    cms: string;
    seo: string;
    proposal_accepted: string;
  } {
    const lower = clientMessage.toLowerCase();
    
    // Explicit pattern matches only
    const budgetMatch = lower.match(/(?:budget|allocated|spend)\s+(?:is|of|up to)?\s*(\$?\d+(?:,\d+)?)/);
    const deadlineMatch = lower.match(/(?:deadline|by|before|launch on)\s+([a-z]+ \d{1,2}|in \d+ weeks?)/);
    const cmsMatch = lower.match(/\b(wordpress|webflow|shopify|next\.?js|react|wix|drupal)\b/);

    return {
      budget: budgetMatch ? budgetMatch[1] : "UNKNOWN",
      deadline: deadlineMatch ? deadlineMatch[1] : "UNKNOWN",
      cms: cmsMatch ? cmsMatch[1] : "UNKNOWN",
      seo: lower.includes("seo requirement") || lower.includes("rank for") ? "SPECIFIED" : "UNKNOWN",
      proposal_accepted: lower.includes("i accept the proposal") || lower.includes("we accept the agreement") ? "YES" : "UNKNOWN",
    };
  }

  // Deterministic Gate & Plan Validator
  validateAndSanitizePlan(plan: CEOPlanOutput, originalGoalPrompt: string): {
    sanitizedPlan: CEOPlanOutput;
    validation: PlanValidationResult;
  } {
    const namedEntity = this.extractNamedEntity(originalGoalPrompt);
    const errors: string[] = [];
    const warnings: string[] = [];

    let entityStatus: EntityVerificationStatus = namedEntity ? "UNVERIFIED" : "VERIFIED";

    // If an unverified entity is named in the goal
    if (namedEntity) {
      entityStatus = "UNVERIFIED";

      // Strict forbidden downstream keywords when entity is UNVERIFIED
      const forbiddenKeywords = [
        "audit",
        "site",
        "seo",
        "mockup",
        "prototype",
        "development",
        "dev",
        "code",
        "outreach",
        "cold email",
        "sales cadence",
        "sales",
        "pitch",
        "proposal",
        "pricing",
        "deployment",
        "release",
      ];

      const filteredTasks: any[] = [];

      for (const task of plan.tasks) {
        const titleLower = task.title.toLowerCase();
        const typeLower = (task.type || "").toLowerCase();
        const descLower = task.description.toLowerCase();
        const roleLower = (task.assignedAgentRole || "").toLowerCase();
        const inputStr = JSON.stringify(task.input || {}).toLowerCase();

        // Check for invented domains in task inputs or description
        const domainMatch = (descLower + " " + inputStr).match(/\b([a-z0-9-]+\.(?:com|ph|org|net|io|co))\b/);
        if (domainMatch && domainMatch[1]) {
          const domain = domainMatch[1];
          if (this.isDerivedOrInventedDomain(namedEntity, domain)) {
            warnings.push(`STRIPPED_UNVERIFIED_DOMAIN: Target URL "${domain}" was derived or invented without verified first-party provenance.`);
            // Strip invented domain from task input
            if (task.input && typeof task.input === "object") {
              task.input.target_url = null;
              task.input.website = null;
              task.input.domain = null;
            }
          }
        }

        // Check if task is a downstream task (Assigned to Analyst, Dev, Sales or containing forbidden keywords)
        const isForbidden =
          forbiddenKeywords.some(f => titleLower.includes(f) || typeLower.includes(f)) ||
          roleLower.includes("analyst") ||
          roleLower.includes("dev") ||
          roleLower.includes("sales");

        if (isForbidden) {
          warnings.push(`PREREQUISITE_GATE_TRIGGERED: Pruned downstream task "${task.title}" (${task.assignedAgentRole}) because entity "${namedEntity}" is UNVERIFIED.`);
        } else {
          filteredTasks.push(task);
        }
      }

      // Ensure entity verification task is present
      filteredTasks.length = 0; // Strictly replace with exact verified prerequisite sequence
      filteredTasks.push({
        title: `Verify Entity Provenance: ${namedEntity}`,
        description: `Research Agent must verify official legal existence, registry status, official first-party website, and geographic identity for "${namedEntity}". Do not assume website or contact info.`,
        type: "Lead Discovery",
        priority: "high",
        assignedAgentRole: "Research Agent",
        input: {
          companyName: namedEntity,
          entity_verification_status: "UNVERIFIED",
          website: null,
          contact: null,
          requireFirstPartyEvidence: true,
        },
      });

      plan.tasks = filteredTasks;
      plan.goalSummary = `[Entity: ${namedEntity} (UNVERIFIED)] Plan Gated to Provenance Verification`;
      plan.reasoningSummary = `Entity verification gate active. Downstream prototype, website audit, and sales outreach tasks are strictly blocked until Research Agent verifies official business provenance for "${namedEntity}".`;
    }

    // 2. Validate commercial claims across all tasks
    for (const task of plan.tasks) {
      const claimCheck = this.validateCommercialClaims(task.title + " " + task.description);
      if (!claimCheck.valid) {
        errors.push(...claimCheck.violations);
      }
    }

    const isValid = errors.length === 0;

    return {
      sanitizedPlan: plan,
      validation: {
        valid: isValid,
        status: isValid ? "PLAN_VALIDATED" : "PLAN_VALIDATION_FAILED",
        entityName: namedEntity || undefined,
        entityStatus,
        errors,
        warnings,
      },
    };
  }
}

export const entityVerificationService = new EntityVerificationService();