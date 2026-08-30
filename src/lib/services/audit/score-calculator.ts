import { RawHtmlSignals } from "./html-analyzer";

export interface AuditScores {
  performance: number;
  mobile: number;
  seo: number;
  accessibility: number;
  conversion: number;
  design: number;
  website: number;
  redesignOpportunity: number;
}

export type RecommendedAction = "pursue" | "review" | "skip";

export class ScoreCalculator {
  calculateScores(signals: RawHtmlSignals, designScoreFromLLM: number): {
    scores: AuditScores;
    recommendedAction: RecommendedAction;
  } {
    // 1. Performance Score (0 - 100)
    let performance = 100;
    // Response time penalties
    if (signals.responseTimeMs > 3000) {
      performance -= 45;
    } else if (signals.responseTimeMs > 1500) {
      performance -= 25;
    } else if (signals.responseTimeMs > 800) {
      performance -= 12;
    }

    // Page weight penalties (HTML size)
    const sizeKb = signals.contentLengthBytes / 1024;
    if (sizeKb > 500) {
      performance -= 25;
    } else if (sizeKb > 250) {
      performance -= 15;
    } else if (sizeKb > 120) {
      performance -= 8;
    }

    // Heavy script tags penalty
    if (signals.scriptCount > 30) {
      performance -= 15;
    } else if (signals.scriptCount > 15) {
      performance -= 8;
    }
    performance = Math.max(15, Math.min(100, performance));

    // 2. Mobile Score (0 - 100)
    let mobile = 15;
    if (signals.metaViewport) {
      mobile += 50;
      if (signals.metaViewport.includes("width=device-width")) {
        mobile += 20;
      }
      if (signals.metaViewport.includes("initial-scale=1")) {
        mobile += 15;
      }
    }
    if (signals.stylesheetCount > 0 || signals.hasInlineStyles) {
      mobile = Math.min(100, mobile + (signals.metaViewport ? 0 : 15));
    }
    mobile = Math.max(10, Math.min(100, mobile));

    // 3. SEO Score (0 - 100)
    let seo = 10;
    if (signals.isHttps) seo += 15;
    if (signals.title && signals.title.length > 5) {
      seo += 25;
      if (signals.title.length >= 15 && signals.title.length <= 70) {
        seo += 5;
      }
    }
    if (signals.metaDescription && signals.metaDescription.length > 10) {
      seo += 20;
    }
    if (signals.h1Count === 1) {
      seo += 15;
    } else if (signals.h1Count > 1) {
      seo += 8;
    }
    if (signals.canonicalUrl) seo += 10;
    seo = Math.max(10, Math.min(100, seo));

    // 4. Accessibility Score (0 - 100)
    let accessibility = 20;
    if (signals.totalImages > 0) {
      const altRatio = signals.imagesWithAlt / signals.totalImages;
      accessibility += Math.round(altRatio * 40);
    } else {
      accessibility += 30;
    }
    if (signals.h1Count > 0 && (signals.h2Count > 0 || signals.h3Count > 0)) {
      accessibility += 25;
    }
    if (signals.hasForms) {
      accessibility += 15;
    }
    accessibility = Math.max(15, Math.min(100, accessibility));

    // 5. Conversion Score (0 - 100)
    let conversion = 15;
    if (signals.ctaButtonTexts.length > 0) {
      conversion += Math.min(40, signals.ctaButtonTexts.length * 15);
    }
    if (signals.hasForms || signals.hasEmailInputs) {
      conversion += 25;
    }
    if (signals.hasPhoneLink || signals.hasTelInputs) {
      conversion += 10;
    }
    if (signals.hasMailtoLink) {
      conversion += 10;
    }
    conversion = Math.max(15, Math.min(100, conversion));

    // 6. Design / Modernity Score (from LLM evidence evaluation)
    const design = Math.max(10, Math.min(100, Math.round(designScoreFromLLM)));

    // 7. Aggregate Website Score (Weighted)
    // Weights: Performance 15%, Mobile 15%, SEO 15%, Accessibility 10%, Conversion 20%, Design 25%
    const website = Math.round(
      performance * 0.15 +
      mobile * 0.15 +
      seo * 0.15 +
      accessibility * 0.10 +
      conversion * 0.20 +
      design * 0.25
    );

    // 8. Redesign Opportunity Score
    const redesignOpportunity = Math.max(0, Math.min(100, 100 - website));

    // 9. Recommended Action based on deterministic thresholds
    let recommendedAction: RecommendedAction = "review";
    if (redesignOpportunity >= 70) {
      recommendedAction = "pursue";
    } else if (redesignOpportunity >= 40) {
      recommendedAction = "review";
    } else {
      recommendedAction = "skip";
    }

    return {
      scores: {
        performance,
        mobile,
        seo,
        accessibility,
        conversion,
        design,
        website,
        redesignOpportunity,
      },
      recommendedAction,
    };
  }
}

export const scoreCalculator = new ScoreCalculator();