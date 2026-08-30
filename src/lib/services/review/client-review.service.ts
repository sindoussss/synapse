import {
  clientReviewRepository,
  ClientReviewSessionRecord,
  ClientReviewCommentRecord,
  OperatorReviewNoteRecord,
} from "../../repositories/client-review.repository";
import { workOrchestrationRepository } from "../../repositories/work-orchestration.repository";

export class ClientReviewService {
  createSession(params: {
    organizationId: string;
    projectId: string;
    workspaceId: string;
    clientId: string;
    snapshotId: string;
    releaseCandidateId?: string;
    sourceHash?: string;
    manifestHash?: string;
    createdBy: string;
  }): ClientReviewSessionRecord {
    return clientReviewRepository.createSession({
      ...params,
      status: "OPEN",
    });
  }

  addComment(params: {
    reviewSessionId: string;
    organizationId: string;
    projectId: string;
    clientId: string;
    authorId: string;
    authorRole: "CLIENT" | "OPERATOR" | "ADMIN";
    body: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    category?: "DESIGN" | "CONTENT" | "FUNCTIONAL" | "RESPONSIVE" | "TYPOGRAPHY" | "ACCESSIBILITY" | "BUG" | "QUESTION" | "OTHER";
    pagePath?: string;
    elementReference?: string;
    viewport?: string;
    x?: number;
    y?: number;
    parentCommentId?: string;
  }): { success: boolean; comment?: ClientReviewCommentRecord; reason?: string } {
    const session = clientReviewRepository.getSession(params.reviewSessionId, params.organizationId);
    if (!session) {
      return { success: false, reason: "REVIEW_SESSION_NOT_FOUND" };
    }

    if (session.status === "SUPERSEDED" || session.status === "CLOSED") {
      return { success: false, reason: "REVIEW_SESSION_SUPERSEDED: Cannot comment on inactive review snapshot." };
    }

    const comment = clientReviewRepository.addComment({
      reviewSessionId: params.reviewSessionId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientId: params.clientId,
      authorId: params.authorId,
      authorRole: params.authorRole,
      body: params.body,
      status: "OPEN",
      severity: params.severity || "MEDIUM",
      category: params.category || "DESIGN",
      pagePath: params.pagePath || "/",
      elementReference: params.elementReference,
      viewport: params.viewport || "desktop",
      x: params.x,
      y: params.y,
      snapshotId: session.snapshotId,
      parentCommentId: params.parentCommentId,
    });

    return { success: true, comment };
  }

  replyComment(params: {
    parentCommentId: string;
    organizationId: string;
    authorId: string;
    authorRole: "CLIENT" | "OPERATOR" | "ADMIN";
    body: string;
  }): { success: boolean; comment?: ClientReviewCommentRecord; reason?: string } {
    const parent = clientReviewRepository.getComment(params.parentCommentId, params.organizationId);
    if (!parent) {
      return { success: false, reason: "PARENT_COMMENT_NOT_FOUND" };
    }

    const reply = clientReviewRepository.addComment({
      reviewSessionId: parent.reviewSessionId,
      organizationId: parent.organizationId,
      projectId: parent.projectId,
      clientId: parent.clientId,
      authorId: params.authorId,
      authorRole: params.authorRole,
      body: params.body,
      status: "REPLIED",
      severity: parent.severity,
      category: parent.category,
      snapshotId: parent.snapshotId,
      parentCommentId: parent.commentId,
    });

    clientReviewRepository.updateComment(parent.commentId, { status: "REPLIED" });

    return { success: true, comment: reply };
  }

  resolveComment(commentId: string, actorId: string, callerOrgId?: string): { success: boolean; reason?: string } {
    const comment = clientReviewRepository.getComment(commentId, callerOrgId);
    if (!comment) return { success: false, reason: "COMMENT_NOT_FOUND" };

    clientReviewRepository.updateComment(commentId, {
      status: "RESOLVED",
      resolvedAt: new Date().toISOString(),
      resolvedBy: actorId,
    });

    return { success: true };
  }

  convertToChangeRequest(params: {
    commentId: string;
    operatorId: string;
    callerOrgId: string;
    requiredChanges: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }): { success: boolean; workItemId?: string; reason?: string } {
    const comment = clientReviewRepository.getComment(params.commentId, params.callerOrgId);
    if (!comment) return { success: false, reason: "COMMENT_NOT_FOUND" };

    // 1. Mark comment converted
    clientReviewRepository.updateComment(comment.commentId, {
      status: "CONVERTED_TO_CHANGE_REQUEST",
    });

    // 2. Queue into Work Orchestration without direct production mutation
    const workItemId = `WORK-CR-${Date.now().toString().slice(-4)}`;
    workOrchestrationRepository.saveWorkItem(
      {
        workItemId,
        organizationId: comment.organizationId,
        projectId: comment.projectId,
        workspaceId: "WS-DEFAULT",
        environment: "production",
        workType: "CHANGE_REQUEST",
        status: "READY",
        priority: params.priority || "MEDIUM",
        dependencies: [],
        blockingReasons: [],
        eligibleActors: ["DEVELOPER_AGENT", "OPERATOR"],
        requiredApproval: false,
        createdAt: new Date().toISOString(),
      },
      "OPERATOR"
    );

    return { success: true, workItemId };
  }

  supersedeSession(reviewSessionId: string, callerOrgId?: string): boolean {
    const session = clientReviewRepository.getSession(reviewSessionId, callerOrgId);
    if (!session) return false;

    clientReviewRepository.updateSessionStatus(reviewSessionId, "SUPERSEDED");

    // Mark comments as superseded
    const comments = clientReviewRepository.listComments({ reviewSessionId });
    for (const c of comments) {
      if (c.status !== "RESOLVED") {
        clientReviewRepository.updateComment(c.commentId, { status: "SUPERSEDED" });
      }
    }

    return true;
  }

  detectContradictoryFeedback(comments: ClientReviewCommentRecord[]): { hasConflict: boolean; details?: string } {
    const bodies = comments.map((c) => c.body.toLowerCase());
    if (
      (bodies.some((b) => b.includes("dense") || b.includes("compact")) &&
        bodies.some((b) => b.includes("spacious") || b.includes("more space") || b.includes("too tight"))) ||
      (bodies.some((b) => b.includes("dark")) && bodies.some((b) => b.includes("light")))
    ) {
      return {
        hasConflict: true,
        details: "CONFLICTING_FEEDBACK: Client feedback contains contradictory aesthetic directives requiring clarification.",
      };
    }
    return { hasConflict: false };
  }
}

export const clientReviewService = new ClientReviewService();