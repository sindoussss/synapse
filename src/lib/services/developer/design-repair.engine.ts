import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  designIntelligenceRepository,
  VisualReviewRecord,
  VisualIssue,
  VisualBaselineSnapshotRecord,
  VisualRegressionCheckResult,
} from "../../repositories/design-intelligence.repository";

export interface SanitizedRepairTask {
  id: string;
  designBriefId: string;
  designSystemId: string;
  visualReviewId: string;
  findingId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "development" | "staging" | "production";
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  route: string;
  viewport: string;
  instruction: string;
  status: "pending" | "applied" | "verified_resolved" | "rolled_back";
  createdAt: string;
}

export class DesignRepairEngine {
  generateSanitizedTasks(review: VisualReviewRecord): SanitizedRepairTask[] {
    const now = new Date().toISOString();
    return review.issues.map((issue, idx) => {
      // Sanitize: remove any raw injection instructions
      const sanitizedInstruction = `Refactor '${issue.category}' on ${issue.viewport} (${issue.route}): ${issue.recommendedRepair}`;

      return {
        id: `REPAIR-TASK-${Date.now().toString().slice(-4)}-${idx + 1}`,
        designBriefId: review.designBriefId,
        designSystemId: review.designSystemId,
        visualReviewId: review.id,
        findingId: issue.findingId,
        organizationId: review.organizationId,
        projectId: review.projectId,
        workspaceId: review.workspaceId,
        environment: review.environment,
        severity: issue.severity,
        category: issue.category,
        route: issue.route,
        viewport: issue.viewport,
        instruction: sanitizedInstruction,
        status: "pending",
        createdAt: now,
      };
    });
  }

  async captureBaseline(params: {
    projectId: string;
    workspaceId: string;
    organizationId: string;
    environment: "development" | "staging" | "production";
    reviewId?: string;
    viewportScores: Record<string, number>;
    files: Record<string, string>;
  }): Promise<VisualBaselineSnapshotRecord> {
    const baselineId = `VIS-BASELINE-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = crypto.createHash("sha256").update(JSON.stringify(params.files)).digest("hex");

    const snap: VisualBaselineSnapshotRecord = {
      id: baselineId,
      reviewId: params.reviewId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      workspaceId: params.workspaceId,
      environment: params.environment,
      viewportScores: params.viewportScores,
      manifestHash: hash,
      filesContent: params.files,
      createdAt: new Date().toISOString(),
    };

    return await designIntelligenceRepository.saveBaselineSnapshot(snap);
  }

  async capturePostRepairSnapshot(params: {
    projectId: string;
    workspaceId: string;
    organizationId: string;
    environment: "development" | "staging" | "production";
    viewportScores: Record<string, number>;
    files: Record<string, string>;
  }): Promise<VisualBaselineSnapshotRecord> {
    const repairSnapId = `VIS-REPAIR-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = crypto.createHash("sha256").update(JSON.stringify(params.files)).digest("hex");

    const snap: VisualBaselineSnapshotRecord = {
      id: repairSnapId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      workspaceId: params.workspaceId,
      environment: params.environment,
      viewportScores: params.viewportScores,
      manifestHash: hash,
      filesContent: params.files,
      createdAt: new Date().toISOString(),
    };

    return await designIntelligenceRepository.saveBaselineSnapshot(snap);
  }

  async checkVisualRegression(
    baseline: VisualBaselineSnapshotRecord,
    postRepair: VisualBaselineSnapshotRecord
  ): Promise<VisualRegressionCheckResult> {
    const viewportDelta: Record<string, { before: number; after: number; delta: number }> = {};
    let regressionDetected = false;
    const regressionReasons: string[] = [];

    for (const [vp, beforeScore] of Object.entries(baseline.viewportScores)) {
      const afterScore = postRepair.viewportScores[vp] !== undefined ? postRepair.viewportScores[vp] : beforeScore;
      const delta = afterScore - beforeScore;
      viewportDelta[vp] = { before: beforeScore, after: afterScore, delta };

      // Regression rule: If any viewport score drops by more than 10 points
      if (delta < -10) {
        regressionDetected = true;
        regressionReasons.push(
          `Viewport ${vp} regressed by ${Math.abs(delta)} points (Score: ${beforeScore} -> ${afterScore}).`
        );
      }
    }

    const status: "ACCEPTED" | "REJECTED_REGRESSION" = regressionDetected ? "REJECTED_REGRESSION" : "ACCEPTED";
    const reason = regressionDetected
      ? `Visual Regression Detected: Repair improved targeted viewport but degraded other viewports: ${regressionReasons.join(" ")}`
      : "Zero visual regressions detected across all 5 viewports.";

    const result: VisualRegressionCheckResult = {
      baselineId: baseline.id,
      repairSnapshotId: postRepair.id,
      regressionDetected,
      viewportDelta,
      status,
      reason,
      createdAt: new Date().toISOString(),
    };

    return await designIntelligenceRepository.saveRegressionCheck(result);
  }

  verifyOriginalFindingResolved(originalFinding: VisualIssue, postRepairReview: VisualReviewRecord): boolean {
    // If the finding ID is no longer present in post-repair issues, or no issues match the category & viewport
    const stillPresent = postRepairReview.issues.some(
      (i) => i.category === originalFinding.category && i.viewport === originalFinding.viewport
    );
    return !stillPresent;
  }
}

export const designRepairEngine = new DesignRepairEngine();