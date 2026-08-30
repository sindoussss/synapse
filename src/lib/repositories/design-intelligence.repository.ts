import fs from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface DesignBriefRecord {
  id: string; // e.g. DESIGN-2026-000001
  version: string; // e.g. DESIGN-VERSION-000001
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  businessIndustry: string;
  targetAudience: string;
  businessObjective: string;
  brandPersonality: string;
  visualDirection: string;
  colorStrategy: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
    rationales: string[];
  };
  typographyStrategy: {
    fontFamilies: string[];
    scale: Record<string, string>;
    hierarchyRules: string[];
  };
  spacingStrategy: {
    gridBase: number;
    containerMaxWidths: string[];
    sectionPaddings: string;
  };
  layoutStrategy: string;
  navigationStrategy: string;
  componentStrategy: string[];
  contentHierarchy: string[];
  responsiveStrategy: {
    mobileFirst: boolean;
    breakpoints: Record<string, string>;
    touchTargetMinPx: number;
  };
  interactionStrategy: string[];
  accessibilityRequirements: string[];
  forbiddenVisualPatterns: string[];
  evidenceSourceRequirements: string[];
  isImmutable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSystemRecord {
  id: string; // e.g. DS-2026-000001
  version: string; // e.g. DS-VERSION-000001
  designBriefId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  typographyScale: Record<string, string>;
  fontFamilies: { sans: string; mono: string; heading: string };
  headingHierarchy: { h1: string; h2: string; h3: string; h4: string };
  bodyHierarchy: { base: string; small: string; muted: string };
  spacingScale: Record<string, string>;
  borderRadiusPolicy: { card: string; button: string; input: string; badge: string };
  shadowPolicy: { card: string; dropdown: string; modal: string };
  colorTokens: Record<string, string>;
  surfaceTokens: Record<string, string>;
  buttonStyles: Record<string, string>;
  inputStyles: Record<string, string>;
  cardPolicy: { background: string; border: string; padding: string; radius: string };
  containerWidths: { sm: string; md: string; lg: string; xl: string; "2xl": string };
  responsiveBreakpoints: Record<string, string>;
  gridStrategy: string;
  isImmutable: boolean;
  createdAt: string;
}

export interface VisualIssue {
  findingId: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  route: string;
  viewport: string;
  evidence: string;
  explanation: string;
  recommendedRepair: string;
  confidence: number;
}

export interface ViewportAuditResult {
  viewport: string;
  width: number;
  height: number;
  status: "PASS" | "FAIL";
  horizontalOverflowPx: number;
  touchTargetViolations: number;
  issues: string[];
}

export interface VisualReviewRecord {
  id: string; // e.g. VIS-REV-2026-000001
  designBriefId: string;
  designSystemId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  route: string;
  overall: "PASS" | "PASS_WITH_WARNINGS" | "REPAIR_REQUIRED" | "CRITICAL_REPAIR_REQUIRED";
  visualQuality: number; // 0-100
  aiSlopRisk: number; // 0-10
  slopFlagsDetected: string[];
  issues: VisualIssue[];
  viewportResults: ViewportAuditResult[];
  briefAlignment: string[];
  responsiveFindings: string[];
  accessibilityVisualFindings: string[];
  repairPriority: string[];
  criticProvider: "Google Gemini Free Tier";
  criticModel: string;
  createdAt: string;
}

export interface VisualBaselineSnapshotRecord {
  id: string; // e.g. VIS-BASELINE-xxxx or VIS-REPAIR-xxxx
  reviewId?: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  viewportScores: Record<string, number>;
  manifestHash: string;
  filesContent: Record<string, string>;
  createdAt: string;
}

export interface VisualRegressionCheckResult {
  baselineId: string;
  repairSnapshotId: string;
  regressionDetected: boolean;
  viewportDelta: Record<string, { before: number; after: number; delta: number }>;
  status: "ACCEPTED" | "REJECTED_REGRESSION";
  reason: string;
  createdAt: string;
}

export class DesignIntelligenceRepository {
  private briefsCacheFile = path.resolve(process.cwd(), ".design_briefs_cache.json");
  private systemsCacheFile = path.resolve(process.cwd(), ".design_systems_cache.json");
  private reviewsCacheFile = path.resolve(process.cwd(), ".visual_reviews_cache.json");
  private baselinesCacheFile = path.resolve(process.cwd(), ".visual_baselines_cache.json");
  private regressionsCacheFile = path.resolve(process.cwd(), ".visual_regressions_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }

  // --- Design Briefs ---
  async saveDesignBrief(brief: DesignBriefRecord): Promise<DesignBriefRecord> {
    const cache = this.readCache<DesignBriefRecord>(this.briefsCacheFile);
    // Check immutability
    const existingIndex = cache.findIndex((b) => b.id === brief.id && b.version === brief.version);
    if (existingIndex >= 0) {
      if (cache[existingIndex].isImmutable) {
        throw new Error(`Immutability Violation: Design Brief ${brief.id} v${brief.version} is immutable. Create a new version.`);
      }
      cache[existingIndex] = brief;
    } else {
      cache.unshift(brief);
    }
    this.writeCache(this.briefsCacheFile, cache);
    return brief;
  }

  async getDesignBrief(id: string, version?: string): Promise<DesignBriefRecord | null> {
    const cache = this.readCache<DesignBriefRecord>(this.briefsCacheFile);
    if (version) {
      return cache.find((b) => b.id === id && b.version === version) || null;
    }
    return cache.find((b) => b.id === id) || null;
  }

  async getLatestBriefByProject(projectId: string): Promise<DesignBriefRecord | null> {
    const cache = this.readCache<DesignBriefRecord>(this.briefsCacheFile);
    return cache.find((b) => b.projectId === projectId) || null;
  }

  // --- Design Systems ---
  async saveDesignSystem(ds: DesignSystemRecord): Promise<DesignSystemRecord> {
    const cache = this.readCache<DesignSystemRecord>(this.systemsCacheFile);
    const existingIndex = cache.findIndex((d) => d.id === ds.id && d.version === ds.version);
    if (existingIndex >= 0 && cache[existingIndex].isImmutable) {
      throw new Error(`Immutability Violation: Design System ${ds.id} v${ds.version} is immutable. Create a new version.`);
    }
    if (existingIndex >= 0) cache[existingIndex] = ds;
    else cache.unshift(ds);
    this.writeCache(this.systemsCacheFile, cache);
    return ds;
  }

  async getDesignSystem(id: string, version?: string): Promise<DesignSystemRecord | null> {
    const cache = this.readCache<DesignSystemRecord>(this.systemsCacheFile);
    if (version) return cache.find((d) => d.id === id && d.version === version) || null;
    return cache.find((d) => d.id === id) || null;
  }

  // --- Visual Reviews ---
  async saveVisualReview(review: VisualReviewRecord): Promise<VisualReviewRecord> {
    const cache = this.readCache<VisualReviewRecord>(this.reviewsCacheFile);
    cache.unshift(review);
    this.writeCache(this.reviewsCacheFile, cache);
    return review;
  }

  async getVisualReviewsByProject(projectId: string): Promise<VisualReviewRecord[]> {
    const cache = this.readCache<VisualReviewRecord>(this.reviewsCacheFile);
    return cache.filter((r) => r.projectId === projectId);
  }

  // --- Baselines & Snapshots ---
  async saveBaselineSnapshot(snap: VisualBaselineSnapshotRecord): Promise<VisualBaselineSnapshotRecord> {
    const cache = this.readCache<VisualBaselineSnapshotRecord>(this.baselinesCacheFile);
    cache.unshift(snap);
    this.writeCache(this.baselinesCacheFile, cache);
    return snap;
  }

  async getBaselineSnapshot(id: string): Promise<VisualBaselineSnapshotRecord | null> {
    const cache = this.readCache<VisualBaselineSnapshotRecord>(this.baselinesCacheFile);
    return cache.find((s) => s.id === id) || null;
  }

  // --- Regressions ---
  async saveRegressionCheck(reg: VisualRegressionCheckResult): Promise<VisualRegressionCheckResult> {
    const cache = this.readCache<VisualRegressionCheckResult>(this.regressionsCacheFile);
    cache.unshift(reg);
    this.writeCache(this.regressionsCacheFile, cache);
    return reg;
  }
}

export const designIntelligenceRepository = new DesignIntelligenceRepository();