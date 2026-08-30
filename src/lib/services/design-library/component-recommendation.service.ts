import { designLibraryRepository, DesignComponentRecord, DesignPatternRecord } from "../../repositories/design-library.repository";

export interface ComponentRecommendationItem {
  componentId: string;
  name: string;
  category: string;
  version: number;
  recommendation: "RECOMMENDED" | "OPTIONAL" | "INCOMPATIBLE" | "UNKNOWN";
  reason: string;
  requiredAdaptations: string[];
}

export interface DesignSystemRecommendation {
  recommendedPattern: DesignPatternRecord | null;
  recommendedTokenSet: string;
  components: ComponentRecommendationItem[];
  rationale: string;
}

export class ComponentRecommendationService {
  recommendForBrief(params: {
    industry: string;
    targetAudience: string;
    requirements: string[];
    exclusions: string[];
    technicalConstraints?: string[];
  }): DesignSystemRecommendation {
    const allComponents = designLibraryRepository.listComponents();
    const allPatterns = designLibraryRepository.listPatterns();
    const recommendations: ComponentRecommendationItem[] = [];

    const indLower = params.industry.toLowerCase();
    const reqText = params.requirements.join(" ").toLowerCase();

    // 1. Select Pattern
    let recommendedPattern: DesignPatternRecord | null = null;
    if (indLower.includes("construction") || indLower.includes("hardware") || indLower.includes("industrial")) {
      recommendedPattern = allPatterns.find((p) => p.name === "STRUCTURAL_12_COLUMN") || null;
    } else if (indLower.includes("dining") || indLower.includes("restaurant") || indLower.includes("hospitality")) {
      recommendedPattern = allPatterns.find((p) => p.name === "EDITORIAL_MASONRY") || null;
    } else {
      recommendedPattern = allPatterns[0] || null;
    }

    const recommendedTokenSet = indLower.includes("dining") ? "TOK-MINIMAL-LUXE-V1" : "TOK-INDUSTRIAL-V1";

    // 2. Evaluate Components
    for (const comp of allComponents) {
      // Never recommend deprecated components for new projects
      if (comp.status === "DEPRECATED" || comp.status === "RETIRED") {
        continue;
      }

      // Check incompatibility
      const isIncompatible = comp.incompatibleIndustries.some((ind) => indLower.includes(ind.toLowerCase()));
      if (isIncompatible) {
        recommendations.push({
          componentId: comp.componentId,
          name: comp.name,
          category: comp.category,
          version: comp.version,
          recommendation: "INCOMPATIBLE",
          reason: `Component '${comp.name}' is explicitly incompatible with the ${params.industry} industry.`,
          requiredAdaptations: [],
        });
        continue;
      }

      // Check supported industry & requirement match
      const isSupportedIndustry = comp.supportedIndustries.some((ind) => indLower.includes(ind.toLowerCase()));
      const matchesRequirement = reqText.includes(comp.category.toLowerCase()) || reqText.includes(comp.componentKey.toLowerCase());

      if (comp.status !== "VALIDATED") {
        recommendations.push({
          componentId: comp.componentId,
          name: comp.name,
          category: comp.category,
          version: comp.version,
          recommendation: "UNKNOWN",
          reason: `Component is currently in status '${comp.status}' and must complete validation gates before production use.`,
          requiredAdaptations: [],
        });
      } else if (isSupportedIndustry && matchesRequirement) {
        recommendations.push({
          componentId: comp.componentId,
          name: comp.name,
          category: comp.category,
          version: comp.version,
          recommendation: "RECOMMENDED",
          reason: `Validated for ${params.industry} and matches stated requirement for ${comp.name}.`,
          requiredAdaptations: ["Bind client design tokens", "Configure local inventory / pricing datasets"],
        });
      } else if (comp.category === "NAVIGATION" || isSupportedIndustry) {
        recommendations.push({
          componentId: comp.componentId,
          name: comp.name,
          category: comp.category,
          version: comp.version,
          recommendation: "OPTIONAL",
          reason: `Compatible with ${params.industry} design language; available for optional scope expansion.`,
          requiredAdaptations: ["Adapt layout hierarchy"],
        });
      } else {
        recommendations.push({
          componentId: comp.componentId,
          name: comp.name,
          category: comp.category,
          version: comp.version,
          recommendation: "UNKNOWN",
          reason: "No strong positive or negative evidence for this industry context.",
          requiredAdaptations: [],
        });
      }
    }

    return {
      recommendedPattern,
      recommendedTokenSet,
      components: recommendations,
      rationale: `Design system customized for ${params.industry} under ${recommendedPattern?.name || "Standard Layout"} pattern.`,
    };
  }
}

export const componentRecommendationService = new ComponentRecommendationService();