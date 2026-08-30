import { designIntelligenceRepository, DesignBriefRecord } from "../../repositories/design-intelligence.repository";

export interface GenerateBriefParams {
  projectId: string;
  organizationId?: string;
  workspaceId?: string;
  environment?: "development" | "staging" | "production";
  businessIndustry: string;
  companyName: string;
  targetAudience: string;
  businessObjective: string;
  brandPersonality: string;
  visualDirection?: string;
}

export class DesignBriefEngine {
  async createDesignBrief(params: GenerateBriefParams): Promise<DesignBriefRecord> {
    const briefId = `DESIGN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const version = "DESIGN-VERSION-000001";
    const now = new Date().toISOString();

    const brief: DesignBriefRecord = {
      id: briefId,
      version,
      organizationId: params.organizationId || "ORG-DEFAULT",
      projectId: params.projectId,
      workspaceId: params.workspaceId || `WS-${params.projectId}`,
      environment: params.environment || "development",
      businessIndustry: params.businessIndustry,
      targetAudience: params.targetAudience,
      businessObjective: params.businessObjective,
      brandPersonality: params.brandPersonality,
      visualDirection:
        params.visualDirection ||
        "High-craft structural industrial design with slate-950 neutrals, crisp emerald accents, and dense scannable specification tables.",
      colorStrategy: {
        primary: "#059669 (Emerald 600 - Verified PNS/Structural Grade)",
        secondary: "#0284c7 (Sky 600 - Fleet Logistics & Delivery)",
        background: "#020617 (Slate 950 Deep Foundation)",
        surface: "#0f172a (Slate 900 Structural Cards)",
        text: "#f8fafc (Slate 50 High Contrast Text)",
        accent: "#d97706 (Amber 600 - Volume Pricing Notice)",
        rationales: [
          "Dark industrial slate grounds heavy building materials and machinery.",
          "High-contrast emerald signifies certified PNS structural safety.",
          "Zero glowing neon purple/cyan AI gradients to preserve contractor authenticity.",
        ],
      },
      typographyStrategy: {
        fontFamilies: ["Inter", "system-ui", "sans-serif", "JetBrains Mono for structural specs"],
        scale: {
          h1: "text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight",
          h2: "text-xl sm:text-2xl font-bold text-white tracking-tight",
          h3: "text-sm sm:text-base font-semibold text-slate-100",
          body: "text-xs sm:text-sm text-slate-400 leading-relaxed",
          spec: "font-mono text-xs font-semibold text-emerald-400",
        },
        hierarchyRules: [
          "H1 must establish immediate commercial category & contractor value prop.",
          "H2 must demarcate interactive functional tools (catalog vs live estimator).",
          "Data cards must use JetBrains Mono for exact dimensions, rebar grades, and prices.",
        ],
      },
      spacingStrategy: {
        gridBase: 8,
        containerMaxWidths: ["max-w-7xl", "max-w-5xl", "max-w-lg"],
        sectionPaddings: "py-12 px-4 sm:px-6 lg:px-8",
      },
      layoutStrategy:
        "12-column responsive layout on desktop with 8-column product catalog and 4-column sticky quotation estimator. Fluid vertical stacking on mobile.",
      navigationStrategy:
        "Sticky 64px header with branding, PNS structural badge, emergency contractor contact, and instant inquiry action.",
      componentStrategy: [
        "Header with compliance badges",
        "Hero with instant contractor delivery & tier value propositions",
        "ProductGrid with live search and category pills",
        "QuoteCalculator with real-time math and form submission",
        "Footer with corporate licensing attribution",
      ],
      contentHierarchy: [
        "1. Brand & Structural Verification Badge",
        "2. Core Contractor Value Props (Speed, Grade, Fleet Delivery)",
        "3. Live Material Catalog & Unit Prices",
        "4. Live Quantity & Cost Calculation Engine",
        "5. Direct Quotation Lead Capture Form",
      ],
      responsiveStrategy: {
        mobileFirst: true,
        breakpoints: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
        },
        touchTargetMinPx: 44,
      },
      interactionStrategy: [
        "Instant catalog search filter on keypress",
        "Category tabs without full page reloads",
        "Real-time quantity increment/decrement with subtotal recalculation",
        "Client-side quote request dispatch with instant feedback",
      ],
      accessibilityRequirements: [
        "WCAG 2.1 AA compliant color contrast (minimum 4.5:1 for all text)",
        "All interactive buttons and inputs must possess explicit aria-label or visible label binding",
        "Visible focus rings (focus-visible:ring-2 focus-visible:ring-emerald-500) on all tabbable elements",
      ],
      forbiddenVisualPatterns: [
        "Generic SaaS purple/cyan gradients",
        "Decorative glowing background blobs (blur-3xl animate-blob)",
        "Excessive glassmorphism backdrop-blur cards (> 4 instances)",
        "Pill-shaped containers on rectangular data tables",
        "Fake testimonials or synthesized customer quotes",
        "Unsubstantiated generic statistics (e.g. '99.9% Happy Clients')",
        "Horizontal scrolling layout traps on mobile viewports",
      ],
      evidenceSourceRequirements: [
        "Actual PNS / ASTM Philippine structural standards",
        "Real unit denominations (₱ / bag, ₱ / pc, ₱ / cu.m)",
        "Verified company address & phone format",
      ],
      isImmutable: true,
      createdAt: now,
      updatedAt: now,
    };

    return await designIntelligenceRepository.saveDesignBrief(brief);
  }

  async createNewVersion(existingId: string, updates: Partial<DesignBriefRecord>): Promise<DesignBriefRecord> {
    const existing = await designIntelligenceRepository.getDesignBrief(existingId);
    if (!existing) throw new Error(`Design Brief ${existingId} not found.`);

    const versionNum = parseInt(existing.version.replace("DESIGN-VERSION-", "")) + 1;
    const newVersion = `DESIGN-VERSION-${versionNum.toString().padStart(6, "0")}`;

    const newBrief: DesignBriefRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      version: newVersion,
      isImmutable: true,
      updatedAt: new Date().toISOString(),
    };

    return await designIntelligenceRepository.saveDesignBrief(newBrief);
  }
}

export const designBriefEngine = new DesignBriefEngine();