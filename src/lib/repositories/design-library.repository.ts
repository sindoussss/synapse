import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ComponentCategory =
  | "LAYOUT"
  | "NAVIGATION"
  | "HERO"
  | "CONTENT"
  | "CARD"
  | "CATALOG"
  | "FORM"
  | "CALCULATOR"
  | "TABLE"
  | "FILTER"
  | "SEARCH"
  | "GALLERY"
  | "TESTIMONIAL"
  | "CTA"
  | "FOOTER"
  | "MODAL"
  | "DASHBOARD"
  | "AUTH"
  | "FEEDBACK"
  | "STATUS"
  | "UTILITY";

export type ComponentStatus =
  | "DRAFT"
  | "VALIDATING"
  | "VALIDATED"
  | "DEPRECATED"
  | "RETIRED";

export type ComponentScope =
  | "GLOBAL_INTERNAL"
  | "ORGANIZATION_INTERNAL"
  | "PROJECT_PRIVATE";

export type ComponentQuality =
  | "UNVALIDATED"
  | "VALIDATED"
  | "STABLE"
  | "REGRESSION_RISK"
  | "DEPRECATED";

export interface ComponentValidationRecord {
  validationId: string;
  componentId: string;
  version: number;
  typeScriptPassed: boolean;
  lintPassed: boolean;
  buildPassed: boolean;
  securityPassed: boolean;
  accessibilityPassed: boolean;
  responsivePassed: boolean;
  visualReviewPassed: boolean;
  codeReviewPassed: boolean;
  validatedBy: string;
  validatedAt: string;
  notes?: string;
}

export interface DesignComponentRecord {
  componentId: string;
  componentKey: string;
  name: string;
  description: string;
  category: ComponentCategory;
  version: number;
  status: ComponentStatus;
  quality: ComponentQuality;
  scope: ComponentScope;
  organizationId?: string;
  projectId?: string;
  sourceCode: string;
  sourceHash: string;
  manifestHash: string;
  designRationale: string;
  supportedIndustries: string[];
  incompatibleIndustries: string[];
  dependencies: string[]; // list of componentIds or libraries
  designTokens: Record<string, string>;
  accessibilityRequirements: string[];
  responsiveRequirements: string[];
  functionalRequirements: string[];
  allowedUsage: string[];
  forbiddenUsage: string[];
  validationHistory: ComponentValidationRecord[];
  usageCount: number;
  repairCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignPatternRecord {
  patternId: string;
  name: string;
  rationale: string;
  suitableIndustries: string[];
  unsuitableIndustries: string[];
  visualCharacteristics: string[];
  responsiveBehavior: string;
  accessibilityRequirements: string[];
  antiSlopRisk: string;
  validationEvidence: string;
}

export interface DesignTokenSetRecord {
  tokenSetId: string;
  name: string;
  industryTarget: string;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  color: Record<string, string>;
  grid: Record<string, string>;
  motion: Record<string, string>;
  version: number;
}

export interface ComponentAdaptationRecord {
  adaptationId: string;
  libraryComponentId: string;
  libraryVersion: number;
  targetProjectId: string;
  targetSnapshotId: string;
  sourceHash: string;
  adaptationReason: string;
  adaptedBy: string;
  createdAt: string;
}

export class DesignLibraryRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "design-library.json");

  private components: DesignComponentRecord[] = [];
  private patterns: DesignPatternRecord[] = [];
  private tokenSets: DesignTokenSetRecord[] = [];
  private adaptations: ComponentAdaptationRecord[] = [];

  constructor() {
    this.loadState();
    if (this.components.length === 0) {
      this.seedInitialLibrary();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.components = raw.components || [];
        this.patterns = raw.patterns || [];
        this.tokenSets = raw.tokenSets || [];
        this.adaptations = raw.adaptations || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        components: this.components,
        patterns: this.patterns,
        tokenSets: this.tokenSets,
        adaptations: this.adaptations,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialLibrary(): void {
    const quoteCalcSrc = `"use client"; import React from 'react'; export function QuoteCalculator() { return <div className="p-4 border">Quote Calculator</div>; }`;
    const quoteHash = crypto.createHash("sha256").update(quoteCalcSrc).digest("hex");

    const headerSrc = `export function Header() { return <header className="p-4 bg-slate-900">Header</header>; }`;
    const headerHash = crypto.createHash("sha256").update(headerSrc).digest("hex");

    const productGridSrc = `export function ProductGrid() { return <div className="grid grid-cols-3">Products</div>; }`;
    const productGridHash = crypto.createHash("sha256").update(productGridSrc).digest("hex");

    const specTableSrc = `export function SpecificationTable() { return <table><tbody><tr><td>Spec</td></tr></tbody></table>; }`;
    const specTableHash = crypto.createHash("sha256").update(specTableSrc).digest("hex");

    const initialComponents: DesignComponentRecord[] = [
      {
        componentId: "COMP-QUOTE-CALC-V1",
        componentKey: "QuoteCalculator",
        name: "Interactive Quote Calculator",
        description: "Dynamic material estimation and real-time project quote calculator.",
        category: "CALCULATOR",
        version: 1,
        status: "VALIDATED",
        quality: "STABLE",
        scope: "GLOBAL_INTERNAL",
        sourceCode: quoteCalcSrc,
        sourceHash: quoteHash,
        manifestHash: crypto.createHash("sha256").update(quoteHash + ":manifest").digest("hex"),
        designRationale: "Enables instant pricing feedback without waiting for manual quotes.",
        supportedIndustries: ["Construction & Building Materials", "Manufacturing", "Industrial Supply"],
        incompatibleIndustries: ["Fine Dining", "Luxury Apparel"],
        dependencies: ["Button", "Input"],
        designTokens: { radius: "rounded-lg", font: "font-mono" },
        accessibilityRequirements: ["ARIA live region for total updates", "Keyboard navigation on quantity steppers"],
        responsiveRequirements: ["Single column on mobile (375px)", "Two column layout on desktop (1024px+)"],
        functionalRequirements: ["Real-time math calculations", "Currency formatting in PHP"],
        allowedUsage: ["Interactive estimation pages", "Product quotation flows"],
        forbiddenUsage: ["Static read-only text displays"],
        validationHistory: [
          {
            validationId: "VAL-QC-01",
            componentId: "COMP-QUOTE-CALC-V1",
            version: 1,
            typeScriptPassed: true,
            lintPassed: true,
            buildPassed: true,
            securityPassed: true,
            accessibilityPassed: true,
            responsivePassed: true,
            visualReviewPassed: true,
            codeReviewPassed: true,
            validatedBy: "OPERATOR",
            validatedAt: new Date().toISOString(),
          },
        ],
        usageCount: 3,
        repairCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        componentId: "COMP-HEADER-V1",
        componentKey: "Header",
        name: "Structural Corporate Header",
        description: "Accessible responsive header with phone callout and quote CTA.",
        category: "NAVIGATION",
        version: 1,
        status: "VALIDATED",
        quality: "STABLE",
        scope: "GLOBAL_INTERNAL",
        sourceCode: headerSrc,
        sourceHash: headerHash,
        manifestHash: crypto.createHash("sha256").update(headerHash + ":manifest").digest("hex"),
        designRationale: "Immediate access to contact numbers and navigation hierarchy.",
        supportedIndustries: ["Construction & Building Materials", "B2B Services", "Hardware Supplies"],
        incompatibleIndustries: [],
        dependencies: [],
        designTokens: { padding: "px-6 py-4" },
        accessibilityRequirements: ["Semantic nav element", "ARIA expanded on mobile menu"],
        responsiveRequirements: ["Hamburger menu below 768px", "Full horizontal links on desktop"],
        functionalRequirements: ["Direct dial phone link"],
        allowedUsage: ["Top-level site navigation"],
        forbiddenUsage: ["Modal content headers"],
        validationHistory: [
          {
            validationId: "VAL-HD-01",
            componentId: "COMP-HEADER-V1",
            version: 1,
            typeScriptPassed: true,
            lintPassed: true,
            buildPassed: true,
            securityPassed: true,
            accessibilityPassed: true,
            responsivePassed: true,
            visualReviewPassed: true,
            codeReviewPassed: true,
            validatedBy: "OPERATOR",
            validatedAt: new Date().toISOString(),
          },
        ],
        usageCount: 5,
        repairCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        componentId: "COMP-PROD-GRID-V1",
        componentKey: "ProductGrid",
        name: "Filterable Product Grid",
        description: "Responsive card grid for showcasing categorized inventory and materials.",
        category: "CATALOG",
        version: 1,
        status: "VALIDATED",
        quality: "STABLE",
        scope: "GLOBAL_INTERNAL",
        sourceCode: productGridSrc,
        sourceHash: productGridHash,
        manifestHash: crypto.createHash("sha256").update(productGridHash + ":manifest").digest("hex"),
        designRationale: "Clear visual breakdown of product lines with quick inquiry action.",
        supportedIndustries: ["Construction & Building Materials", "Wholesale & Distribution", "E-Commerce"],
        incompatibleIndustries: ["Law Firms", "Personal Branding"],
        dependencies: ["Card", "StatusBadge"],
        designTokens: { gap: "gap-6" },
        accessibilityRequirements: ["Alt text on all product thumbnails", "Focus outline on inquiry buttons"],
        responsiveRequirements: ["1 column mobile", "2 column tablet", "3 column desktop"],
        functionalRequirements: ["Category filtering without page reload"],
        allowedUsage: ["Catalog pages", "Featured product sections"],
        forbiddenUsage: ["Single blog post view"],
        validationHistory: [
          {
            validationId: "VAL-PG-01",
            componentId: "COMP-PROD-GRID-V1",
            version: 1,
            typeScriptPassed: true,
            lintPassed: true,
            buildPassed: true,
            securityPassed: true,
            accessibilityPassed: true,
            responsivePassed: true,
            visualReviewPassed: true,
            codeReviewPassed: true,
            validatedBy: "OPERATOR",
            validatedAt: new Date().toISOString(),
          },
        ],
        usageCount: 4,
        repairCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        componentId: "COMP-SPEC-TABLE-V1",
        componentKey: "SpecificationTable",
        name: "Technical Specification Table",
        description: "Dense tabular layout for material grade, dimensions, and compliance specs.",
        category: "TABLE",
        version: 1,
        status: "VALIDATED",
        quality: "STABLE",
        scope: "GLOBAL_INTERNAL",
        sourceCode: specTableSrc,
        sourceHash: specTableHash,
        manifestHash: crypto.createHash("sha256").update(specTableHash + ":manifest").digest("hex"),
        designRationale: "Essential for technical buyers to verify structural compatibility.",
        supportedIndustries: ["Construction & Building Materials", "Heavy Equipment", "Chemicals"],
        incompatibleIndustries: ["Hospitality", "Fashion"],
        dependencies: [],
        designTokens: { border: "border-slate-800", font: "font-mono" },
        accessibilityRequirements: ["Proper th scope='col' headers", "Accessible caption"],
        responsiveRequirements: ["Horizontal scroll on narrow mobile screens"],
        functionalRequirements: ["Sortable columns"],
        allowedUsage: ["Technical specs tabs", "Engineering documentation"],
        forbiddenUsage: ["Marketing hero copy"],
        validationHistory: [
          {
            validationId: "VAL-ST-01",
            componentId: "COMP-SPEC-TABLE-V1",
            version: 1,
            typeScriptPassed: true,
            lintPassed: true,
            buildPassed: true,
            securityPassed: true,
            accessibilityPassed: true,
            responsivePassed: true,
            visualReviewPassed: true,
            codeReviewPassed: true,
            validatedBy: "OPERATOR",
            validatedAt: new Date().toISOString(),
          },
        ],
        usageCount: 2,
        repairCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const initialPatterns: DesignPatternRecord[] = [
      {
        patternId: "PAT-STRUCTURAL-12",
        name: "STRUCTURAL_12_COLUMN",
        rationale: "High-density, modular grid ideal for B2B industrial suppliers with large product lines.",
        suitableIndustries: ["Construction & Building Materials", "Manufacturing", "Logistics"],
        unsuitableIndustries: ["Art Gallery", "Fine Dining"],
        visualCharacteristics: ["Structured borders", "Monospace data tags", "High contrast headers"],
        responsiveBehavior: "Collapses from 12-col desktop grid to 1-col stacked cards on mobile.",
        accessibilityRequirements: ["High contrast ratios (> 4.5:1)", "Clear focus indicators"],
        antiSlopRisk: "Avoids generic generic floating gradients and empty whitespace.",
        validationEvidence: "Proven in PRJ-SINDOUS-01 with 100% visual QA score.",
      },
      {
        patternId: "PAT-EDITORIAL-MASONRY",
        name: "EDITORIAL_MASONRY",
        rationale: "Rich visual storytelling for hospitality, luxury venues, and culinary experiences.",
        suitableIndustries: ["Fine Dining", "Luxury Hospitality", "Architecture"],
        unsuitableIndustries: ["Industrial Raw Materials", "Bulk Hardware"],
        visualCharacteristics: ["Large imagery", "Serif typography", "Asymmetric photo offsets"],
        responsiveBehavior: "Flows smoothly from masonry layout to vertical storytelling feed.",
        accessibilityRequirements: ["Descriptive photo captions", "Subdued motion transitions"],
        antiSlopRisk: "Prevents corporate dashboard aesthetic on luxury lifestyle brands.",
        validationEvidence: "Visual review verified on premium restaurant portfolio.",
      },
    ];

    const initialTokenSets: DesignTokenSetRecord[] = [
      {
        tokenSetId: "TOK-INDUSTRIAL-V1",
        name: "Industrial Structural v1",
        industryTarget: "Construction & Building Materials",
        typography: { heading: "font-sans font-bold", mono: "font-mono", body: "font-sans" },
        spacing: { container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", sectionGap: "py-16" },
        radius: { card: "rounded-lg", button: "rounded-md" },
        color: { primary: "#2563EB", secondary: "#D97706", background: "#020617", surface: "#0F172A" },
        grid: { cols: "12" },
        motion: { transition: "transition-all duration-200" },
        version: 1,
      },
      {
        tokenSetId: "TOK-MINIMAL-LUXE-V1",
        name: "Minimal Luxe v1",
        industryTarget: "Fine Dining & Hospitality",
        typography: { heading: "font-serif tracking-wider", mono: "font-sans", body: "font-serif" },
        spacing: { container: "max-w-6xl mx-auto px-6", sectionGap: "py-24" },
        radius: { card: "rounded-none", button: "rounded-none" },
        color: { primary: "#D4AF37", secondary: "#1A1A1A", background: "#0A0A0A", surface: "#141414" },
        grid: { cols: "12" },
        motion: { transition: "transition-opacity duration-500" },
        version: 1,
      },
    ];

    this.components = initialComponents;
    this.patterns = initialPatterns;
    this.tokenSets = initialTokenSets;
    this.saveState();
  }

  // ── Component Queries ─────────────────────────────────────────
  getComponent(componentId: string, callingProjectId?: string, callingOrgId?: string): DesignComponentRecord | null {
    const comp = this.components.find((c) => c.componentId === componentId);
    if (!comp) return null;

    // Scope check: PROJECT_PRIVATE can only be accessed within matching project
    if (comp.scope === "PROJECT_PRIVATE" && callingProjectId && comp.projectId !== callingProjectId) {
      return null;
    }
    // Scope check: ORGANIZATION_INTERNAL can only be accessed within matching org
    if (comp.scope === "ORGANIZATION_INTERNAL" && callingOrgId && comp.organizationId !== callingOrgId) {
      return null;
    }

    return comp;
  }

  listComponents(filter?: { category?: ComponentCategory; status?: ComponentStatus; scope?: ComponentScope; projectId?: string; orgId?: string }): DesignComponentRecord[] {
    return this.components.filter((c) => {
      if (filter?.category && c.category !== filter.category) return false;
      if (filter?.status && c.status !== filter.status) return false;
      if (filter?.scope && c.scope !== filter.scope) return false;
      if (c.scope === "PROJECT_PRIVATE" && filter?.projectId && c.projectId !== filter.projectId) return false;
      if (c.scope === "ORGANIZATION_INTERNAL" && filter?.orgId && c.organizationId !== filter.orgId) return false;
      return true;
    });
  }

  saveComponent(comp: DesignComponentRecord, actorRole: "OPERATOR" | "AI_DEVELOPER_AGENT" | "SYSTEM"): DesignComponentRecord {
    if (actorRole === "AI_DEVELOPER_AGENT") {
      throw new Error("UNAUTHORIZED_LIBRARY_MUTATION: AI Developer Agent cannot directly create or publish library components.");
    }

    // Version Immutability Check: If existing version is VALIDATED, prevent in-place mutation
    const existing = this.components.find((c) => c.componentId === comp.componentId);
    if (existing && existing.status === "VALIDATED" && existing.sourceHash !== comp.sourceHash) {
      throw new Error(`IMMUTABLE_VERSION_VIOLATION: Cannot mutate validated version '${comp.componentId}' in-place. Create version ${existing.version + 1} instead.`);
    }

    const idx = this.components.findIndex((c) => c.componentId === comp.componentId);
    if (idx >= 0) {
      this.components[idx] = { ...comp, updatedAt: new Date().toISOString() };
    } else {
      this.components.push(comp);
    }
    this.saveState();
    return comp;
  }

  deprecateComponent(componentId: string, reason: string, operator: string, operatorRole: "OPERATOR" | "AI_DEVELOPER_AGENT"): DesignComponentRecord {
    if (operatorRole !== "OPERATOR") {
      throw new Error("UNAUTHORIZED_DEPRECATION: Only OPERATOR role can deprecate library components.");
    }
    const comp = this.components.find((c) => c.componentId === componentId);
    if (!comp) throw new Error(`Component ${componentId} not found.`);

    comp.status = "DEPRECATED";
    comp.quality = "DEPRECATED";
    comp.updatedAt = new Date().toISOString();

    // Propagate dependency review flag to any components that depend on this component
    for (const dependent of this.components) {
      if (dependent.dependencies.includes(comp.componentKey) || dependent.dependencies.includes(comp.componentId)) {
        dependent.quality = "REGRESSION_RISK";
      }
    }

    this.saveState();
    return comp;
  }

  // ── Patterns & Tokens ─────────────────────────────────────────
  listPatterns(): DesignPatternRecord[] {
    return this.patterns;
  }

  getPattern(patternId: string): DesignPatternRecord | null {
    return this.patterns.find((p) => p.patternId === patternId || p.name === patternId) || null;
  }

  listTokenSets(): DesignTokenSetRecord[] {
    return this.tokenSets;
  }

  // ── Adaptation Provenance ─────────────────────────────────────
  recordAdaptation(record: ComponentAdaptationRecord): ComponentAdaptationRecord {
    this.adaptations.push(record);
    const comp = this.components.find((c) => c.componentId === record.libraryComponentId);
    if (comp) {
      comp.usageCount++;
    }
    this.saveState();
    return record;
  }

  listAdaptations(projectId: string): ComponentAdaptationRecord[] {
    return this.adaptations.filter((a) => a.targetProjectId === projectId);
  }
}

export const designLibraryRepository = new DesignLibraryRepository();