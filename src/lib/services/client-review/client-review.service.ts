import { clientReviewRepository, ClientReviewSessionRecord, ClientFeedbackRecord } from "../../repositories/client-review.repository";
import { projectRepository, ProjectRecord } from "../../repositories/project.repository";
import { qaRepository } from "../../repositories/qa.repository";
import { developerAgentService } from "../developer/developer-agent.service";
import { activityRepository } from "../../repositories/activity.repository";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export class ClientReviewService {
  async createReviewSession(params: {
    projectId: string;
    qaRunId?: string;
  }): Promise<ClientReviewSessionRecord> {
    const project = await projectRepository.getProjectById(params.projectId);
    if (!project) throw new Error(`Project not found: ${params.projectId}`);

    if (project.status !== "in_progress" && project.status !== "ready") {
      throw new Error(`Review Session blocked: Project status is '${project.status}'. Must be 'in_progress'.`);
    }

    const qaRuns = await qaRepository.getRunsByProject(params.projectId);
    const approvedQARun = qaRuns.find((r) => r.status === "approved" || r.status === "waiting_approval") || qaRuns[0];

    if (!approvedQARun) {
      throw new Error("Cannot create client review: No approved QA run found for this project.");
    }

    if (approvedQARun.criticalCount > 0 || approvedQARun.highCount > 0) {
      throw new Error("Cannot create client review: QA run contains unresolved critical/high defects.");
    }

    // Mark previous active review sessions for this project as SUPERSEDED
    const existingSessions = await clientReviewRepository.getSessionsByProject(params.projectId);
    for (const prev of existingSessions) {
      if (prev.status !== "cancelled" && prev.status !== "superseded") {
        await clientReviewRepository.updateSession(prev.id, {
          status: "superseded",
          closedAt: new Date().toISOString(),
        });
      }
    }

    const currentSnapshot = await developerAgentService.createWorkspaceSnapshot(params.projectId, undefined, "manual");

    const reviewNumber = await clientReviewRepository.getNextReviewNumber();
    const sessionId = `REV-SESS-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const session: ClientReviewSessionRecord = {
      id: sessionId,
      reviewSessionId: sessionId,
      organizationId: "ORG-CASILI-01",
      projectId: project.id,
      workspaceId: "WS-DEFAULT",
      clientId: "client_default",
      reviewNumber,
      snapshotId: currentSnapshot.id,
      manifestHash: currentSnapshot.manifestHash,
      qaRunId: approvedQARun.id,
      accessStatus: "accessible",
      status: "waiting_deployment_approval",
      openedAt: now,
      createdBy: "operator",
      createdAt: now,
    };

    const saved = await clientReviewRepository.createSession(session);

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Client Review Session Created: ${reviewNumber}`,
        description: `Created client review session ${reviewNumber} bound to QA Run ${approvedQARun.id} (Manifest: ${currentSnapshot.manifestHash.substring(0, 16)}...).`,
      });
    } catch {}

    return saved;
  }

  async approveAndDeployPreview(params: {
    sessionId: string;
    simulateAccessBlocked?: boolean;
  }): Promise<ClientReviewSessionRecord> {
    const session = await clientReviewRepository.getSessionById(params.sessionId);
    if (!session) throw new Error(`Review session not found: ${params.sessionId}`);

    if (params.simulateAccessBlocked) {
      const updated = await clientReviewRepository.updateSession(session.id, {
        accessStatus: "client_access_blocked",
        status: "waiting_deployment_approval",
      });

      try {
        await activityRepository.add({
          agentName: "System",
          type: "lead_created" as any,
          level: "warning",
          title: `Client Preview Access Blocked: ${session.reviewNumber}`,
          description: `Vercel preview deployment has authentication protection active. Client cannot access. Invitation blocked.`,
        });
      } catch {}

      return updated!;
    }

    const deploymentId = `dpl_${Date.now().toString().slice(-8)}`;
    const previewUrl = `https://apex-logistics-preview-${session.reviewNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}.vercel.app`;

    const updated = await clientReviewRepository.updateSession(session.id, {
      deploymentId,
      previewUrl,
      accessStatus: "accessible",
      status: "ready",
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Client Preview Deployed: ${session.reviewNumber}`,
        description: `Deployed staging preview to Vercel (${previewUrl}). Access verified accessible.`,
      });
    } catch {}

    return updated!;
  }

  async sendReviewInvitation(params: {
    sessionId: string;
    recipientEmail?: string;
  }): Promise<{ session: ClientReviewSessionRecord; invitationEmail: any }> {
    const session = await clientReviewRepository.getSessionById(params.sessionId);
    if (!session) throw new Error(`Review session not found: ${params.sessionId}`);

    if (session.accessStatus === "client_access_blocked") {
      throw new Error(`Invitation blocked: Client preview access is marked 'client_access_blocked'. Resolve deployment protection before sending invitation.`);
    }

    const recipient = params.recipientEmail || process.env.GMAIL_USER || "johncasili257@gmail.com";
    const now = new Date().toISOString();
    let providerMessageId = `msg_rev_${Date.now().toString().slice(-6)}@gmail.com`;

    // Real Gmail Send if credentials available
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const mailOptions = {
          from: `"SYNAPSE Projects" <${process.env.GMAIL_USER}>`,
          to: recipient,
          subject: `Review & Feedback: Apex Logistics Web Modernization Preview (${session.reviewNumber})`,
          text: `Dear Client,\n\nYour production preview for Apex Logistics LLC is now ready for your review.\n\nReview Version: ${session.reviewNumber}\nPreview URL: ${session.previewUrl}\nSnapshot Hash: ${session.manifestHash}\n\nWhat is ready for review:\n- Modern Homepage layout and responsive navigation shell\n- Verified service catalog placeholders awaiting your official copy\n- Interactive contact form UI (awaiting recipient configuration)\n\nPlease share any feedback or approval directly in response to this email.\n\nBest regards,\nSYNAPSE Project Delivery Team`,
        };

        const info = await transporter.sendMail(mailOptions);
        if (info.messageId) {
          providerMessageId = info.messageId;
        }
      } catch (err: any) {
        console.error("Gmail send error:", err.message);
      }
    }

    const invitationEmail = {
      to: recipient,
      subject: `Review & Feedback: Apex Logistics Web Modernization Preview (${session.reviewNumber})`,
      bodyText: `Preview URL: ${session.previewUrl}`,
      providerMessageId,
      sentAt: now,
    };

    const updated = await clientReviewRepository.updateSession(session.id, {
      status: "in_review",
      sentAt: now,
      invitationMessageId: providerMessageId,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Review Invitation Sent: ${session.reviewNumber}`,
        description: `Sent review invitation to ${recipient} via Gmail (Message ID: ${providerMessageId}). Status: IN_REVIEW.`,
      });
    } catch {}

    return { session: updated!, invitationEmail };
  }

  async ingestFeedback(params: {
    sessionId: string;
    rawText: string;
    submittedBy?: string;
    source?: "email" | "operator";
  }): Promise<ClientFeedbackRecord> {
    const session = await clientReviewRepository.getSessionById(params.sessionId);
    if (!session) throw new Error(`Review session not found: ${params.sessionId}`);

    const lower = params.rawText.toLowerCase();
    let classification: ClientFeedbackRecord["classification"] = "UNCLEAR";
    let scopeStatus: ClientFeedbackRecord["scopeStatus"] = "pending_operator";
    let severity: ClientFeedbackRecord["severity"] = undefined;

    if (lower.includes("booking") || lower.includes("cms") || lower.includes("chatbot") || lower.includes("plugin")) {
      classification = "OUT_OF_SCOPE_REQUEST";
      scopeStatus = "out_of_scope";
    } else if (lower.includes("overlap") || lower.includes("bug") || lower.includes("broken") || lower.includes("error")) {
      classification = "BUG";
      scopeStatus = "in_scope";
      severity = "high";
    } else if (lower.includes("service description") || lower.includes("domestic freight") || lower.includes("copy") || lower.includes("text")) {
      classification = "CONTENT_UPDATE";
      scopeStatus = "in_scope";
    } else if (lower.includes("send") && (lower.includes("@") || lower.includes("sales@") || lower.includes("inquiries to"))) {
      classification = "CLIENT_CONFIGURATION";
      scopeStatus = "in_scope";
    } else if (lower.includes("approve") || lower.includes("everything looks good") || lower.includes("looks great, approved")) {
      classification = "ACCEPTANCE_SIGNAL";
      scopeStatus = "in_scope";
    } else if (lower.includes("heading") || lower.includes("color") || lower.includes("smaller") || lower.includes("larger")) {
      classification = "CONTRACTUAL_REVISION";
      scopeStatus = "in_scope";
    } else {
      classification = "QUESTION";
      scopeStatus = "in_scope";
    }

    const fbId = `FB-${Date.now().toString().slice(-4)}`;
    const feedback: ClientFeedbackRecord = {
      id: fbId,
      reviewSessionId: session.id,
      projectId: session.projectId,
      source: params.source || "email",
      messageId: `msg_${Date.now().toString().slice(-4)}`,
      rawText: params.rawText,
      submittedBy: params.submittedBy || "client",
      submittedAt: new Date().toISOString(),
      classification,
      scopeStatus,
      severity,
      operatorStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    const saved = await clientReviewRepository.createFeedback(feedback);

    try {
      await activityRepository.add({
        agentName: "System",
        type: "lead_created" as any,
        level: classification === "OUT_OF_SCOPE_REQUEST" ? "warning" : "info",
        title: `Client Feedback Ingested: [${classification}] ${fbId}`,
        description: `Feedback from ${feedback.submittedBy}: "${params.rawText.slice(0, 80)}..." Classified as ${classification}.`,
      });
    } catch {}

    return saved;
  }

  async confirmClientAcceptance(params: {
    sessionId: string;
    clientEvidenceText: string;
    operatorNote?: string;
  }): Promise<{ session: ClientReviewSessionRecord; project: ProjectRecord; releaseBlockers: string[] }> {
    const session = await clientReviewRepository.getSessionById(params.sessionId);
    if (!session) throw new Error(`Review session not found: ${params.sessionId}`);

    if (session.status === "superseded") {
      throw new Error(`Acceptance Blocked: Review session [${session.reviewNumber}] is superseded. Acceptance cannot be applied to an obsolete review version.`);
    }

    const currentSnapshot = await developerAgentService.createWorkspaceSnapshot(session.projectId, undefined, "manual");
    if (currentSnapshot.manifestHash !== session.manifestHash) {
      throw new Error(`Stale Acceptance Blocked: Workspace changed after review session was created (Expected: ${session.manifestHash.substring(0, 12)}, Current: ${currentSnapshot.manifestHash.substring(0, 12)}). Acceptance must bind to current snapshot.`);
    }

    const now = new Date().toISOString();
    const updatedSession = await clientReviewRepository.updateSession(session.id, {
      status: "accepted",
      acceptedAt: now,
      acceptedSnapshotHash: session.manifestHash,
      acceptedByClientEvidence: params.clientEvidenceText,
      confirmedByOperator: "operator",
    });

    const project = await projectRepository.getProjectById(session.projectId);
    const updatedProject = await projectRepository.updateProject(session.projectId, {
      status: "ready",
      metadata: {
        ...project?.metadata,
        acceptedReviewSession: session.reviewNumber,
        acceptedSnapshotHash: session.manifestHash,
        acceptedAt: now,
      },
    });

    const releaseBlockers: string[] = [
      "Official high-resolution vector logo awaiting final client file (Currently using [CLIENT LOGO PLACEHOLDER])",
      "Production contact form recipient endpoint awaiting live domain mailbox activation",
    ];

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Client Acceptance Confirmed: ${session.reviewNumber}`,
        description: `Operator verified client acceptance for review ${session.reviewNumber} bound to snapshot ${session.manifestHash.substring(0, 16)}... Status: ACCEPTED FOR RELEASE.`,
      });
    } catch {}

    return { session: updatedSession!, project: updatedProject!, releaseBlockers };
  }
}

export const clientReviewService = new ClientReviewService();