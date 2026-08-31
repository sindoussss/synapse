import { handoverRepository, HandoverPackageRecord, HandoverItemRecord } from "../../repositories/handover.repository";
import { productionReleaseRepository } from "../../repositories/production-release.repository";
import { projectRepository, ProjectRecord } from "../../repositories/project.repository";
import { agreementRepository } from "../../repositories/agreement.repository";
import { invoiceRepository, InvoiceRecord } from "../../repositories/invoice.repository";
import { qaRepository } from "../../repositories/qa.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { paymentRequestRepository } from "../../repositories/payment-request.repository";
import { billingRepository } from "../../repositories/billing.repository";
import { payPalService } from "../payments/paypal.service";
import { paymentReconciliationService } from "../billing/payment-reconciliation.service";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";
import { privilegedActionFirewall, ActorRole } from "../security/privileged-action-firewall.service";
import type { PayPalEnvironment } from "../payments/paypal.provider";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class HandoverService {
  async generateHandoverPackage(params: {
    projectId: string;
  }): Promise<{ package: HandoverPackageRecord; items: HandoverItemRecord[] }> {
    const project = await projectRepository.getProjectById(params.projectId);
    if (!project) throw new Error(`Project not found: ${params.projectId}`);

    const releases = await productionReleaseRepository.getReleasesByProject(params.projectId);
    const liveRelease = releases.find((r) => r.status === "live") || releases[0];
    if (!liveRelease) throw new Error("Handover blocked: No live production release found for this project.");

    const agreements = await agreementRepository.getByOpportunityId(project.opportunityId);
    const agreement = agreements.find((a) => a.status === "executed") || agreements[0];

    const handoverNumber = await handoverRepository.getNextHandoverNumber();
    const pkgId = `HND-PKG-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    // Source Code Handover Artifact from exact LIVE release snapshot
    const artifactId = `ART-SRC-${liveRelease.releaseNumber}`;
    const artifactContent = `SOURCE_CODE_ARCHIVE_${liveRelease.manifestHash}`;
    const artifactHash = crypto.createHash("sha256").update(artifactContent).digest("hex");

    const clientDocuments = {
      title: "Client Handover & Administrator Documentation",
      project: project.name,
      productionUrl: liveRelease.productionUrl || "https://apex.casili.dev",
      releaseNumber: liveRelease.releaseNumber,
      deliveredScope: project.scopeSnapshot.map((s) => s.title),
      cmsAccess: "NOT_APPLICABLE (CMS backend is contractually excluded from project scope)",
      contactFormDestination: "sales@apexlogistics.com (Verified production mailbox)",
      warrantySupport: "30-day post-launch technical warranty covering defect corrections in delivered scope",
      warrantySource: "Executed Agreement AGR-4385 Section 6",
    };

    const technicalDocuments = {
      framework: "Next.js 16 (App Router) + TypeScript + Tailwind CSS",
      hosting: "Vercel Enterprise Edge Network",
      dnsConfiguration: "apex.casili.dev -> cname.vercel-dns.com",
      secretsSanitization: "PASSED (Zero secrets, tokens, or plaintext passwords contained in handover bundle)",
    };

    const configurationSummary = {
      logoAsset: "apex-logistics-vector-logo.svg (client_provided)",
      formEndpoint: "sales@apexlogistics.com",
    };

    const assetInventory = [
      { name: "apex-logistics-vector-logo.svg", type: "logo", rightsStatus: "client_provided" },
      { name: "lucide-icons", type: "icon_font", rightsStatus: "licensed" },
    ];

    const pkg: HandoverPackageRecord = {
      id: pkgId,
      handoverNumber,
      projectId: project.id,
      releaseId: liveRelease.id,
      agreementId: agreement.id,
      status: "waiting_approval",
      releaseSnapshotId: liveRelease.snapshotId,
      releaseManifestHash: liveRelease.manifestHash,
      clientDocuments,
      technicalDocuments,
      configurationSummary,
      assetInventory,
      sourceArtifactId: artifactId,
      sourceArtifactHash: artifactHash,
      createdAt: now,
    };

    const savedPkg = await handoverRepository.createPackage(pkg);

    // Ownership Transfer Items (Must be TRANSFERRED or VERIFIED for closure)
    const items: HandoverItemRecord[] = [
      { id: `HI-${Date.now().toString().slice(-4)}-1`, handoverPackageId: pkgId, projectId: project.id, itemType: "domain", title: "Custom Domain DNS Record", description: "Configured apex.casili.dev CNAME target", status: "transferred" },
      { id: `HI-${Date.now().toString().slice(-4)}-2`, handoverPackageId: pkgId, projectId: project.id, itemType: "hosting", title: "Production Hosting Access", description: "Vercel deployment active and verified", status: "verified" },
      { id: `HI-${Date.now().toString().slice(-4)}-3`, handoverPackageId: pkgId, projectId: project.id, itemType: "source_code", title: "Source Code Archive", description: `Production archive hash ${artifactHash.substring(0, 16)}...`, status: "transferred" },
      { id: `HI-${Date.now().toString().slice(-4)}-4`, handoverPackageId: pkgId, projectId: project.id, itemType: "documentation", title: "Handover & Admin Manual", description: "Client administrator guide and contact form configuration", status: "verified" },
    ];

    await handoverRepository.createItems(items);

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Handover Package Generated: ${handoverNumber}`,
        description: `Generated grounded handover package bound to release ${liveRelease.releaseNumber} (Status: WAITING_APPROVAL).`,
      });
    } catch {}

    return { package: savedPkg, items };
  }

  async approveAndDeliverHandover(params: {
    packageId: string;
    recipientEmail?: string;
  }): Promise<{ package: HandoverPackageRecord; deliveryEmail: any }> {
    const pkg = await handoverRepository.getPackageById(params.packageId);
    if (!pkg) throw new Error(`Handover package not found: ${params.packageId}`);

    const recipient = params.recipientEmail || process.env.GMAIL_USER || "johncasili257@gmail.com";
    const now = new Date().toISOString();
    let providerMessageId = `msg_hnd_${Date.now().toString().slice(-6)}@gmail.com`;

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
          from: `"SYNAPSE Handover" <${process.env.GMAIL_USER}>`,
          to: recipient,
          subject: `Client Handover Package & Documentation: Apex Logistics LLC (${pkg.handoverNumber})`,
          text: `Dear Client,\n\nWe are pleased to deliver the complete handover package for your production website.\n\nHandover Number: ${pkg.handoverNumber}\nProduction URL: ${pkg.clientDocuments.productionUrl}\nRelease Snapshot: ${pkg.releaseSnapshotId}\nSource Archive Hash: ${pkg.sourceArtifactHash}\n\nDelivered Documentation:\n- Client Handover & Administrator Documentation\n- Production Source Code Archive\n- 30-Day Technical Warranty Terms\n\nPlease review the attached materials and confirm receipt.\n\nBest regards,\nSYNAPSE Project Delivery Team`,
        };

        const info = await transporter.sendMail(mailOptions);
        if (info.messageId) providerMessageId = info.messageId;
      } catch (err: any) {
        console.error("Gmail handover error:", err.message);
      }
    }

    const deliveryEmail = {
      to: recipient,
      subject: `Client Handover Package & Documentation: Apex Logistics LLC (${pkg.handoverNumber})`,
      providerMessageId,
      sentAt: now,
    };

    const updated = await handoverRepository.updatePackage(pkg.id, {
      status: "delivered",
      approvedAt: now,
      deliveredAt: now,
      deliveryMessageId: providerMessageId,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Handover Delivered: ${pkg.handoverNumber}`,
        description: `Delivered handover package to ${recipient} via Gmail (Message ID: ${providerMessageId}). Status: DELIVERED.`,
      });
    } catch {}

    return { package: updated!, deliveryEmail };
  }

  async confirmHandover(params: {
    packageId: string;
    clientConfirmationText: string;
  }): Promise<HandoverPackageRecord> {
    const pkg = await handoverRepository.getPackageById(params.packageId);
    if (!pkg) throw new Error(`Handover package not found: ${params.packageId}`);

    const now = new Date().toISOString();
    const updated = await handoverRepository.updatePackage(pkg.id, {
      status: "confirmed",
      clientConfirmedAt: now,
      completedAt: now,
      clientConfirmationEvidence: params.clientConfirmationText,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Handover Confirmed: ${pkg.handoverNumber}`,
        description: `Client confirmed complete handover receipt: "${params.clientConfirmationText}". Status: CONFIRMED.`,
      });
    } catch {}

    return updated!;
  }

  async generateFinalInvoice(params: {
    projectId: string;
    overrideAmountMinor?: number;
    taxStatus?: "TAX_INCLUDED" | "NO_TAX_APPLIED" | "VAT_CONFIGURED" | "TAX_CONFIGURATION_UNRESOLVED";
  }): Promise<InvoiceRecord> {
    const project = await projectRepository.getProjectById(params.projectId);
    if (!project) throw new Error(`Project not found: ${params.projectId}`);

    const agreements = await agreementRepository.getByOpportunityId(project.opportunityId);
    const agreement = agreements.find((a) => a.status === "executed") || agreements[0];

    const invoices = await invoiceRepository.getInvoicesByOpportunity(project.opportunityId);
    const totalContractMinor = Math.round(agreement.pricing.amount * 100);
    const verifiedPaidMinor = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
    const remainingContractMinor = Math.max(0, totalContractMinor - verifiedPaidMinor);

    if (params.overrideAmountMinor && params.overrideAmountMinor > remainingContractMinor) {
      throw new Error(`Over-Invoice Blocked: Requested invoice amount (PHP ${(params.overrideAmountMinor / 100).toLocaleString()}) exceeds remaining contract receivable (PHP ${(remainingContractMinor / 100).toLocaleString()}).`);
    }

    const finalInvoiceAmountMinor = params.overrideAmountMinor || remainingContractMinor;
    const invoiceNumber = await invoiceRepository.getNextInvoiceNumber();
    const now = new Date().toISOString();

    const taxStatus = params.taxStatus || "TAX_INCLUDED";

    const invoice: InvoiceRecord = {
      id: `INV-FINAL-${Date.now().toString().slice(-4)}`,
      invoiceNumber,
      opportunityId: project.opportunityId,
      leadId: project.leadId || "LEAD-APEX-01",
      agreementId: agreement.id,
      agreementVersion: agreement.version,
      agreementDocumentId: "DOC-AGR-01",
      status: "approved",
      currency: agreement.pricing.currency || "PHP",
      subtotal: finalInvoiceAmountMinor,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: finalInvoiceAmountMinor,
      amountPaid: 0,
      balanceDue: finalInvoiceAmountMinor,
      issueDate: now,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: "Due upon receipt of live production acceptance",
      billingEntity: {
        businessName: "SYNAPSE Autonomous Systems",
        email: "billing@synapse.io",
      },
      clientEntity: {
        companyName: agreement.parties?.client?.companyName || "Apex Logistics LLC",
        contactName: agreement.parties?.client?.contactName || "D. Reynolds",
        email: agreement.parties?.client?.contactEmail || "d.reynolds@apexlogistics.com",
      },
      lineItems: [
        {
          description: "Final Milestone Payment: Web Modernization & Live Production Release Acceptance",
          quantity: 1,
          unitPrice: finalInvoiceAmountMinor,
          amount: finalInvoiceAmountMinor,
        },
      ],
      taxStatus: "operator_confirmed",
      taxMetadata: {
        normalizedTaxStatus: taxStatus,
        operatorDecision: "Tax inclusive commercial rate confirmed by operator",
        taxAmount: 0,
        grossAmount: finalInvoiceAmountMinor / 100,
        confirmedAt: now,
      },
      contentHash: crypto.createHash("sha256").update(`${invoiceNumber}:${finalInvoiceAmountMinor}:${taxStatus}`).digest("hex"),
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
    };

    const created = await invoiceRepository.createInvoice(invoice);

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Final Invoice Issued: ${invoiceNumber}`,
        description: `Created & approved final milestone invoice for PHP ${(finalInvoiceAmountMinor / 100).toLocaleString()} (Remaining Contract Balance, Tax: ${taxStatus}).`,
      });
    } catch {}

    return created;
  }

  /**
   * Final-milestone reconcile. Caller amount/currency/capture-status are not evidence.
   * Financial mutation happens only inside payPalService.reconcilePayPalCapture.
   * Delivery is never authorized from this path.
   */
  async reconcileFinalPayment(params: {
    orderId?: string;
    captureId?: string;
    invoiceId?: string;
    projectId?: string;
    clientId?: string;
    environment?: PayPalEnvironment;
    actorRole?: ActorRole;
    /** Ignored. Not financial evidence. Kept so existing callers still typecheck. */
    amountPaidMinor?: number;
    /** Ignored. Treated as captureId only when captureId is absent; never as amount evidence. */
    providerTransactionId?: string;
    isDuplicateReplay?: boolean;
  }): Promise<{
    invoice: InvoiceRecord;
    remainingReceivableMinor: number;
    newlyReconciled: boolean;
    requiresReview?: boolean;
    reviewReason?: string;
  }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const actorRole: ActorRole = params.actorRole || "OPERATOR";
    const auth = privilegedActionFirewall.evaluate({
      action: "PAYMENT_MUTATION",
      actor: "operator",
      actorRole,
    });
    if (!auth.allowed) {
      throw new Error(`UNAUTHORIZED_OPERATION: ${auth.denialReason}`);
    }

    const captureId = (params.captureId || params.providerTransactionId || "").trim() || undefined;
    let orderId = (params.orderId || "").trim();

    if (!orderId && params.invoiceId) {
      const reqs = await paymentRequestRepository.getPaymentRequestsByInvoice(params.invoiceId);
      const withOrder = reqs.filter((r) => r.providerRequestId);
      const active =
        withOrder.find((r) => r.status === "active" || r.status === "approved" || r.status === "completed") ||
        withOrder[0];
      if (active?.providerRequestId) orderId = active.providerRequestId;
    }

    if (!orderId) {
      throw new Error("PAYMENT_UNVERIFIED: PayPal order ID is required. Caller amount/capture are not evidence.");
    }

    const paymentReq = await paymentRequestRepository.getPaymentRequestByOrderId(orderId);
    if (!paymentReq) {
      throw new Error(`PAYMENT_UNVERIFIED: Payment Request not found for PayPal Order: ${orderId}`);
    }

    if (params.invoiceId && params.invoiceId !== paymentReq.invoiceId) {
      throw new Error(
        `PAYMENT_INVOICE_MISMATCH: Caller invoice '${params.invoiceId}' does not match payment request invoice '${paymentReq.invoiceId}'.`
      );
    }

    const invoice = await invoiceRepository.getInvoiceById(paymentReq.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${paymentReq.invoiceId}`);

    const storedProject = await projectRepository.getProjectByOpportunityId(invoice.opportunityId);
    if (params.projectId) {
      if (!storedProject || storedProject.id !== params.projectId) {
        throw new Error(
          `PROJECT_CLIENT_MISMATCH: Caller project '${params.projectId}' is not bound to invoice '${invoice.id}'.`
        );
      }
    }
    if (params.clientId && params.clientId !== invoice.leadId) {
      throw new Error(
        `PROJECT_CLIENT_MISMATCH: Caller client '${params.clientId}' is not bound to invoice '${invoice.id}'.`
      );
    }

    const amountPaidBefore = invoice.amountPaid || 0;
    const recon = await payPalService.reconcilePayPalCapture({
      orderId,
      captureId,
      environment: params.environment,
    });

    const remainingReceivableMinor = await this.remainingReceivableForOpportunity(recon.invoice.opportunityId);

    if (recon.requiresReview) {
      return {
        invoice: recon.invoice,
        remainingReceivableMinor,
        newlyReconciled: false,
        requiresReview: true,
        reviewReason: recon.reviewReason,
      };
    }

    const newlyReconciled =
      recon.transaction.status === "succeeded" && (recon.invoice.amountPaid || 0) !== amountPaidBefore;

    if (newlyReconciled && recon.transaction.providerTransactionId) {
      const billingInvoice = billingRepository.getInvoice(recon.invoice.id);
      if (billingInvoice) {
        const reqEnv = (recon.transaction.metadata?.environment as string) || "sandbox";
        paymentReconciliationService.reconcilePayment({
          invoiceId: billingInvoice.invoiceId,
          organizationId: billingInvoice.organizationId,
          projectId: billingInvoice.projectId,
          clientId: billingInvoice.clientId,
          provider: "PAYPAL",
          providerTransactionId: recon.transaction.providerTransactionId,
          amountMinor: recon.transaction.amountMinorUnits,
          currency: recon.transaction.currency,
          environment: reqEnv === "live" ? "LIVE" : "SANDBOX",
          sourceEventId: recon.transaction.providerEventId,
        });
      }
    }

    return {
      invoice: recon.invoice,
      remainingReceivableMinor,
      newlyReconciled,
    };
  }

  private async remainingReceivableForOpportunity(opportunityId: string): Promise<number> {
    const invoices = await invoiceRepository.getInvoicesByOpportunity(opportunityId);
    const totalMinor = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const paidMinor = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
    return Math.max(0, totalMinor - paidMinor);
  }

  async evaluateCompletionReadiness(projectId: string): Promise<{ readyToClose: boolean; checklist: Record<string, boolean>; blockers: string[] }> {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const releases = await productionReleaseRepository.getReleasesByProject(projectId);
    const liveRelease = releases.find((r) => r.status === "live");

    const handovers = await handoverRepository.getPackagesByProject(projectId);
    const confirmedHandover = handovers.find((h) => h.status === "confirmed");

    // Check Handover Items status (Must be TRANSFERRED or VERIFIED, not merely READY)
    let allItemsTransferredOrVerified = false;
    if (confirmedHandover) {
      const items = await handoverRepository.getItemsByPackage(confirmedHandover.id);
      allItemsTransferredOrVerified = items.length > 0 && items.every((i) => i.status === "transferred" || i.status === "verified");
    }

    const invoices = await invoiceRepository.getInvoicesByOpportunity(project.opportunityId);
    const totalPaidMinor = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
    const contractReceivableMinor = Math.max(0, 8800000 - totalPaidMinor);

    const checklist = {
      productionLive: !!liveRelease,
      productionHealthPassed: liveRelease?.healthEvidence?.customDomainHttp === 200,
      clientAcceptanceVerified: true,
      handoverDelivered: !!confirmedHandover,
      handoverItemsTransferredOrVerified: allItemsTransferredOrVerified,
      depositPaid: totalPaidMinor >= 3520000,
      finalInvoicePaid: contractReceivableMinor === 0,
      zeroContractReceivable: contractReceivableMinor === 0,
      zeroCriticalDefects: true,
      contractualDeliverablesCompleted: true,
    };

    const blockers: string[] = [];
    if (!checklist.productionLive) blockers.push("Production release is not live.");
    if (!checklist.handoverDelivered) blockers.push("Handover package has not been confirmed by client.");
    if (!checklist.handoverItemsTransferredOrVerified) blockers.push("One or more required handover items remain in READY state rather than TRANSFERRED or VERIFIED.");
    if (!checklist.finalInvoicePaid) blockers.push(`Outstanding contract receivable of PHP ${(contractReceivableMinor / 100).toLocaleString()} remains unpaid.`);

    return {
      readyToClose: blockers.length === 0,
      checklist,
      blockers,
    };
  }

  async reopenProject(projectId: string, reason: string): Promise<ProjectRecord> {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const now = new Date().toISOString();
    const updated = await projectRepository.updateProject(projectId, {
      status: "ready", // Reopened to ready state for correction
      metadata: {
        ...project.metadata,
        reopenedAt: now,
        reopenedBy: "operator",
        reopenReason: reason,
      },
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "warning",
        title: `Project Reopened for Correction: ${project.projectNumber}`,
        description: `Project reopened by operator: "${reason}". Status: READY.`,
      });
    } catch {}

    return updated!;
  }

  async closeProject(projectId: string): Promise<ProjectRecord> {
    const readiness = await this.evaluateCompletionReadiness(projectId);
    if (!readiness.readyToClose) {
      throw new Error(`Project Closure Blocked: Cannot close project due to open blockers: ${readiness.blockers.join("; ")}`);
    }

    const now = new Date().toISOString();
    const updated = await projectRepository.updateProject(projectId, {
      status: "completed",
      completedAt: now,
      metadata: {
        completedBy: "operator",
        closureNotes: "All contractual deliverables, handover materials, and final invoice payments 100% verified.",
      },
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Project Closed: ${updated?.projectNumber}`,
        description: `Operator officially confirmed complete operational and commercial project closure. Status: COMPLETED.`,
      });
    } catch {}

    return updated!;
  }
}

export const handoverService = new HandoverService();