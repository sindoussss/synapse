import fs from "fs";
import path from "path";
import crypto from "crypto";

export type MetricType =
  | "VISUAL_QA"
  | "RESPONSIVE_QA"
  | "ACCESSIBILITY_QA"
  | "CODE_QA"
  | "FUNCTIONAL_QA"
  | "CHANGE_REQUEST"
  | "MAINTENANCE_INCIDENT"
  | "PRODUCTION_INCIDENT"
  | "ROLLBACK"
  | "REGRESSION";

export type LearningStatus =
  | "OBSERVATION"
  | "HYPOTHESIS"
  | "SUPPORTED"
  | "REJECTED"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICTING_EVIDENCE";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface DesignUsageRecord {
  usageId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  componentId: string;
  componentVersion: number;
  adaptationId?: string;
  designPatternId: string;
  snapshotId: string;
  releaseCandidateId: string;
  environment: "PRODUCTION" | "STAGING" | "SANDBOX";
  createdAt: string;
}

export interface DesignOutcomeRecord {
  outcomeId: string;
  usageId: string;
  projectId: string;
  organizationId: string;
  metricType: MetricType;
  value: string | number | boolean;
  status: "SUCCESS" | "FAILURE" | "UNKNOWN";
  evidenceId: string;
  sampleSize: number;
  sourceClassification: "LIVE_REAL" | "CONTROLLED_TEST" | "SYNTHETIC_BENCHMARK";
  createdAt: string;
}

export interface DesignLearningRecord {
  learningId: string;
  subjectType: "COMPONENT" | "PATTERN" | "ADAPTATION" | "TOKEN_SET";
  subjectId: string;
  organizationId?: string;
  projectId?: string; // If project-private
  evidenceIds: string[];
  observation: string;
  hypothesis: string;
  confidence: ConfidenceLevel;
  sampleSize: number;
  status: LearningStatus;
  contradictionDetected: boolean;
  operatorReviewStatus: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "REQUEST_MORE_EVIDENCE";
  createdAt: string;
}

export interface ExperimentAssignment {
  projectId: string;
  variant: "A" | "B";
  assignedAt: string;
}

export interface DesignExperimentRecord {
  experimentId: string;
  name: string;
  patternA: string;
  patternB: string;
  assignments: ExperimentAssignment[];
  status: "ACTIVE" | "COMPLETED" | "HALTED";
  createdAt: string;
}

export interface OperatorLearningReviewRecord {
  reviewId: string;
  learningId: string;
  action: "ACCEPT" | "REJECT" | "REQUEST_MORE_EVIDENCE";
  operatorId: string;
  notes: string;
  versionedPolicyId?: string;
  reviewedAt: string;
}

export class DesignLearningRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "design-learning.json");

  private usages: DesignUsageRecord[] = [];
  private outcomes: DesignOutcomeRecord[] = [];
  private learnings: DesignLearningRecord[] = [];
  private experiments: DesignExperimentRecord[] = [];
  private reviews: OperatorLearningReviewRecord[] = [];

  constructor() {
    this.loadState();
    if (this.usages.length === 0) {
      this.seedInitialLearning();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.usages = raw.usages || [];
        this.outcomes = raw.outcomes || [];
        this.learnings = raw.learnings || [];
        this.experiments = raw.experiments || [];
        this.reviews = raw.reviews || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        usages: this.usages,
        outcomes: this.outcomes,
        learnings: this.learnings,
        experiments: this.experiments,
        reviews: this.reviews,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialLearning(): void {
    const initialUsages: DesignUsageRecord[] = [
      {
        usageId: "USE-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        componentId: "COMP-QUOTE-CALC-V1",
        componentVersion: 1,
        adaptationId: "ADAPT-SINDOUS-01",
        designPatternId: "PAT-STRUCTURAL-12",
        snapshotId: "SNAP-SINDOUS-FINAL-2026",
        releaseCandidateId: "RC-FINAL-P49-SINDOUS",
        environment: "PRODUCTION",
        createdAt: "2026-08-29T10:00:00.000Z",
      },
      {
        usageId: "USE-P53-01",
        projectId: "PRJ-P53-E2E",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        componentId: "COMP-QUOTE-CALC-V1",
        componentVersion: 1,
        adaptationId: "ADAPT-P53-01",
        designPatternId: "PAT-STRUCTURAL-12",
        snapshotId: "SNAP-P53-E2E",
        releaseCandidateId: "RC-P53-E2E",
        environment: "PRODUCTION",
        createdAt: "2026-08-29T10:00:00.000Z",
      },
      {
        usageId: "USE-SINDOUS-02",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-SINDOUS-01",
        componentId: "COMP-HEADER-V1",
        componentVersion: 1,
        designPatternId: "PAT-STRUCTURAL-12",
        snapshotId: "SNAP-SINDOUS-FINAL-2026",
        releaseCandidateId: "RC-FINAL-P49-SINDOUS",
        environment: "PRODUCTION",
        createdAt: "2026-08-29T10:00:00.000Z",
      },
      {
        usageId: "USE-LUXE-01",
        projectId: "PRJ-LUXE-01",
        organizationId: "ORG-CASILI-01",
        workspaceId: "WS-LUXE-01",
        componentId: "COMP-HEADER-V1",
        componentVersion: 1,
        adaptationId: "ADAPT-LUXE-01",
        designPatternId: "PAT-EDITORIAL-MASONRY",
        snapshotId: "SNAP-LUXE-01",
        releaseCandidateId: "RC-LUXE-01",
        environment: "PRODUCTION",
        createdAt: "2026-08-29T14:00:00.000Z",
      },
    ];

    const initialOutcomes: DesignOutcomeRecord[] = [
      {
        outcomeId: "OUT-SINDOUS-VIS",
        usageId: "USE-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        metricType: "VISUAL_QA",
        value: 100,
        status: "SUCCESS",
        evidenceId: "EVID-VIS-P50-01",
        sampleSize: 1,
        sourceClassification: "LIVE_REAL",
        createdAt: "2026-08-29T10:15:00.000Z",
      },
      {
        outcomeId: "OUT-SINDOUS-RESP",
        usageId: "USE-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        metricType: "RESPONSIVE_QA",
        value: 0,
        status: "SUCCESS",
        evidenceId: "EVID-RESP-P50-01",
        sampleSize: 5,
        sourceClassification: "LIVE_REAL",
        createdAt: "2026-08-29T10:20:00.000Z",
      },
      {
        outcomeId: "OUT-SINDOUS-A11Y",
        usageId: "USE-SINDOUS-01",
        projectId: "PRJ-SINDOUS-01",
        organizationId: "ORG-CASILI-01",
        metricType: "ACCESSIBILITY_QA",
        value: 100,
        status: "SUCCESS",
        evidenceId: "EVID-A11Y-P50-01",
        sampleSize: 1,
        sourceClassification: "LIVE_REAL",
        createdAt: "2026-08-29T10:25:00.000Z",
      },
    ];

    const initialLearnings: DesignLearningRecord[] = [
      {
        learningId: "LRN-QUOTE-CALC-01",
        subjectType: "COMPONENT",
        subjectId: "COMP-QUOTE-CALC-V1",
        evidenceIds: ["EVID-VIS-P50-01", "EVID-RESP-P50-01", "EVID-A11Y-P50-01"],
        observation: "QuoteCalculator v1 completed QA across N=2 validation suites with 0 responsive regressions and 100% accessibility score.",
        hypothesis: "QuoteCalculator v1 meets high responsiveness standards across desktop and mobile viewports.",
        confidence: "HIGH",
        sampleSize: 2,
        status: "SUPPORTED",
        contradictionDetected: false,
        operatorReviewStatus: "ACCEPTED",
        createdAt: "2026-08-29T11:00:00.000Z",
      },
    ];

    this.usages = initialUsages;
    this.outcomes = initialOutcomes;
    this.learnings = initialLearnings;
    this.saveState();
  }

  // ── Usage & Outcomes ──────────────────────────────────────────
  recordUsage(usage: DesignUsageRecord): DesignUsageRecord {
    const idx = this.usages.findIndex((u) => u.usageId === usage.usageId);
    if (idx >= 0) {
      this.usages[idx] = usage;
    } else {
      this.usages.push(usage);
    }
    this.saveState();
    return usage;
  }

  recordOutcome(outcome: DesignOutcomeRecord): DesignOutcomeRecord {
    const idx = this.outcomes.findIndex((o) => o.outcomeId === outcome.outcomeId);
    if (idx >= 0) {
      this.outcomes[idx] = outcome;
    } else {
      this.outcomes.push(outcome);
    }
    this.saveState();
    return outcome;
  }

  listUsages(filter?: { componentId?: string; projectId?: string; orgId?: string }): DesignUsageRecord[] {
    return this.usages.filter((u) => {
      if (filter?.componentId && u.componentId !== filter.componentId) return false;
      if (filter?.projectId && u.projectId !== filter.projectId) return false;
      if (filter?.orgId && u.organizationId !== filter.orgId) return false;
      return true;
    });
  }

  listOutcomes(filter?: { usageId?: string; projectId?: string; orgId?: string; metricType?: MetricType }): DesignOutcomeRecord[] {
    return this.outcomes.filter((o) => {
      if (filter?.usageId && o.usageId !== filter.usageId) return false;
      if (filter?.projectId && o.projectId !== filter.projectId) return false;
      if (filter?.orgId && o.organizationId !== filter.orgId) return false;
      if (filter?.metricType && o.metricType !== filter.metricType) return false;
      return true;
    });
  }

  // ── Learnings ─────────────────────────────────────────────────
  recordLearning(learning: DesignLearningRecord, actorRole: "OPERATOR" | "SYSTEM" | "AI_DEVELOPER_AGENT"): DesignLearningRecord {
    if (actorRole === "AI_DEVELOPER_AGENT") {
      throw new Error("UNAUTHORIZED_MUTATION: AI Developer Agent cannot directly modify learning records or policy.");
    }
    const idx = this.learnings.findIndex((l) => l.learningId === learning.learningId);
    if (idx >= 0) {
      this.learnings[idx] = learning;
    } else {
      this.learnings.push(learning);
    }
    this.saveState();
    return learning;
  }

  listLearnings(filter?: { subjectId?: string; status?: LearningStatus; projectId?: string; orgId?: string }): DesignLearningRecord[] {
    return this.learnings.filter((l) => {
      if (filter?.subjectId && l.subjectId !== filter.subjectId) return false;
      if (filter?.status && l.status !== filter.status) return false;
      if (l.projectId && filter?.projectId && l.projectId !== filter.projectId) return false;
      if (l.organizationId && filter?.orgId && l.organizationId !== filter.orgId) return false;
      return true;
    });
  }

  // ── Experiments ───────────────────────────────────────────────
  createExperiment(exp: DesignExperimentRecord, actorRole: "OPERATOR" | "AI_DEVELOPER_AGENT"): DesignExperimentRecord {
    if (actorRole !== "OPERATOR") {
      throw new Error("UNAUTHORIZED_EXPERIMENT_CREATION: Only OPERATOR can create controlled design experiments.");
    }
    this.experiments.push(exp);
    this.saveState();
    return exp;
  }

  assignExperimentVariant(experimentId: string, projectId: string, variant: "A" | "B"): ExperimentAssignment {
    const exp = this.experiments.find((e) => e.experimentId === experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found.`);
    if (exp.status !== "ACTIVE") throw new Error(`Experiment ${experimentId} is not ACTIVE.`);

    const existingOutcome = this.outcomes.find((o) => o.projectId === projectId);
    if (existingOutcome) {
      throw new Error("RETROACTIVE_ASSIGNMENT_BLOCKED: Cannot assign variant after project outcomes have already occurred.");
    }

    const assignment: ExperimentAssignment = {
      projectId,
      variant,
      assignedAt: new Date().toISOString(),
    };
    exp.assignments.push(assignment);
    this.saveState();
    return assignment;
  }

  listExperiments(): DesignExperimentRecord[] {
    return this.experiments;
  }

  // ── Operator Review ───────────────────────────────────────────
  recordOperatorReview(review: OperatorLearningReviewRecord, actorRole: "OPERATOR" | "AI_DEVELOPER_AGENT"): OperatorLearningReviewRecord {
    if (actorRole !== "OPERATOR") {
      throw new Error("UNAUTHORIZED_REVIEW_MUTATION: Only human OPERATOR can review or adopt learning records.");
    }
    this.reviews.push(review);
    const learning = this.learnings.find((l) => l.learningId === review.learningId);
    if (learning) {
      learning.operatorReviewStatus = review.action === "ACCEPT" ? "ACCEPTED" : review.action === "REJECT" ? "REJECTED" : "REQUEST_MORE_EVIDENCE";
    }
    this.saveState();
    return review;
  }
}

export const designLearningRepository = new DesignLearningRepository();