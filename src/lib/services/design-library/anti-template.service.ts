export interface ProjectDesignComposition {
  projectId: string;
  industry: string;
  patternId: string;
  tokenSetId: string;
  sectionOrder: string[];
  reusedComponentIds: string[];
}

export interface AntiTemplateAnalysisResult {
  classification: "LOW_REUSE" | "HEALTHY_REUSE" | "HIGH_REUSE" | "TEMPLATE_RISK";
  similarityScorePercent: number;
  repeatedSectionsCount: number;
  distinctFeatures: string[];
  templateRiskFindings: string[];
  isApprovedForGeneration: boolean;
}

export class AntiTemplateService {
  analyzeComposition(composition: ProjectDesignComposition, otherCompositions: ProjectDesignComposition[]): AntiTemplateAnalysisResult {
    const templateRiskFindings: string[] = [];
    const distinctFeatures: string[] = [];

    // Check against standard anti-pattern: Header -> Hero -> Cards -> CTA -> Footer
    const standardCookieCutter = ["Header", "Hero", "Cards", "CTA", "Footer"];
    const isExactCookieCutter = composition.sectionOrder.length === standardCookieCutter.length &&
      composition.sectionOrder.every((sec, idx) => sec.toLowerCase() === standardCookieCutter[idx].toLowerCase());

    if (isExactCookieCutter) {
      templateRiskFindings.push("EXACT_COOKIE_CUTTER_SECTIONS: The proposed section layout matches the generic 5-section boilerplate template.");
    }

    let maxSimilarity = 0;
    let repeatedSections = 0;

    for (const other of otherCompositions) {
      if (other.projectId === composition.projectId) continue;

      // 1. Check section sequence similarity
      const matchingSections = composition.sectionOrder.filter((s, idx) => other.sectionOrder[idx] === s).length;
      const sectionSim = matchingSections / Math.max(composition.sectionOrder.length, other.sectionOrder.length);

      // 2. Check token set collision across unrelated industries
      if (other.industry !== composition.industry && other.tokenSetId === composition.tokenSetId) {
        templateRiskFindings.push(`TOKEN_SET_COLLISION: Unrelated industry '${other.industry}' shares identical token set '${composition.tokenSetId}'.`);
      }

      // 3. Check layout pattern collision across unrelated industries
      if (other.industry !== composition.industry && other.patternId === composition.patternId && other.patternId.includes("12_COLUMN")) {
        // Warning if fine dining copies industrial 12 column
        if (composition.industry.includes("Dining") || composition.industry.includes("Hospitality")) {
          templateRiskFindings.push(`INAPPROPRIATE_PATTERN_REUSE: Hospitality project '${composition.projectId}' copying industrial layout '${composition.patternId}'.`);
        }
      }

      const totalSim = Math.round(sectionSim * 100);
      if (totalSim > maxSimilarity) {
        maxSimilarity = totalSim;
        repeatedSections = matchingSections;
      }
    }

    if (composition.sectionOrder.includes("QuoteCalculator") || composition.sectionOrder.includes("SpecificationTable")) {
      distinctFeatures.push("Interactive Engineering Calculation Tools");
    }
    if (composition.tokenSetId.includes("MINIMAL-LUXE")) {
      distinctFeatures.push("Editorial Serif Typography & Asymmetric Photo Spacing");
    }

    let classification: AntiTemplateAnalysisResult["classification"] = "HEALTHY_REUSE";
    if (templateRiskFindings.length > 0 || maxSimilarity >= 85) {
      classification = "TEMPLATE_RISK";
    } else if (maxSimilarity >= 60) {
      classification = "HIGH_REUSE";
    } else if (maxSimilarity <= 20) {
      classification = "LOW_REUSE";
    }

    return {
      classification,
      similarityScorePercent: maxSimilarity,
      repeatedSectionsCount: repeatedSections,
      distinctFeatures,
      templateRiskFindings,
      isApprovedForGeneration: classification !== "TEMPLATE_RISK",
    };
  }

  compareTwoProjects(projA: ProjectDesignComposition, projB: ProjectDesignComposition): { areDistinct: boolean; similarityPercent: number; differences: string[] } {
    const differences: string[] = [];

    if (projA.patternId !== projB.patternId) {
      differences.push(`Different Layout Patterns: ${projA.patternId} vs ${projB.patternId}`);
    }
    if (projA.tokenSetId !== projB.tokenSetId) {
      differences.push(`Distinct Token Sets: ${projA.tokenSetId} vs ${projB.tokenSetId}`);
    }
    if (projA.sectionOrder.join(",") !== projB.sectionOrder.join(",")) {
      differences.push(`Different Section Sequence: [${projA.sectionOrder.join(" -> ")}] vs [${projB.sectionOrder.join(" -> ")}]`);
    }

    const matching = projA.sectionOrder.filter((s, idx) => projB.sectionOrder[idx] === s).length;
    const similarityPercent = Math.round((matching / Math.max(projA.sectionOrder.length, projB.sectionOrder.length)) * 100);

    return {
      areDistinct: differences.length >= 2,
      similarityPercent,
      differences,
    };
  }
}

export const antiTemplateService = new AntiTemplateService();