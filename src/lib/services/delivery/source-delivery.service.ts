import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  sourceDeliveryRepository,
  SourceDeliveryRecord,
  DeliveryStatus,
} from "../../repositories/source-delivery.repository";
import { paymentVerificationService, PaymentVerificationResult } from "./payment-verification.service";
import { sourcePackageService, PackageGenerationResult } from "./source-package.service";
import { notificationService } from "../operations/notification.service";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";
import { privilegedActionFirewall } from "../security/privileged-action-firewall.service";

export interface DeliveryEligibilityCheck {
  eligible: boolean;
  blockers: string[];
  evidenceIds: string[];
}

export interface ClientDeliveryResponse {
  deliveryId: string;
  projectId: string;
  clientId: string;
  status: DeliveryStatus;
  isDownloadAvailable: boolean;
  packageHash?: string;
  fileCount?: number;
  totalSizeBytes?: number;
  blockReason?: string;
  downloadPayload?: Record<string, string>;
}

export class SourceDeliveryService {
  async processPaymentAndAuthorizeDelivery(params: {
    projectId: string;
    organizationId: string;
    workspaceId: string;
    clientId: string;
    invoiceId: string;
    paymentId: string;
    releaseCandidateId: string;
    snapshotId: string;
    sourceHash: string;
    manifestHash: string;
    expectedAmountMinor: number;
    paidAmountMinor: number;
    currency: string;
    files: Record<string, string>;
    clientApprovalExists: boolean;
    operatorApprovalExists: boolean;
    isRefunded?: boolean;
    isReversed?: boolean;
    incomingSnapshotId?: string;
    incomingSourceHash?: string;
  }): Promise<ClientDeliveryResponse> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("SOURCE_DELIVERY");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const deliveryId = `DELIV-${Date.now().toString().slice(-4)}`;

    // 1. Audit Start
    await sourceDeliveryRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `Client ${params.clientId}`,
      projectId: params.projectId,
      clientId: params.clientId,
      deliveryId,
      action: "DELIVERY_ELIGIBILITY_CHECKED",
      result: "SUCCESS",
    });

    // 2. Client & Operator Approval Check
    if (!params.clientApprovalExists) {
      await this.recordFailure(params, deliveryId, "CLIENT_APPROVAL_REQUIRED", "Client approval missing.");
      return { deliveryId, projectId: params.projectId, clientId: params.clientId, status: "DELIVERY_BLOCKED", isDownloadAvailable: false, blockReason: "CLIENT_APPROVAL_REQUIRED: Client must approve final website release." };
    }

    if (!params.operatorApprovalExists) {
      await this.recordFailure(params, deliveryId, "OPERATOR_APPROVAL_REQUIRED", "Operator deployment approval missing.");
      return { deliveryId, projectId: params.projectId, clientId: params.clientId, status: "DELIVERY_BLOCKED", isDownloadAvailable: false, blockReason: "OPERATOR_APPROVAL_REQUIRED: Operator sign-off required." };
    }

    // 3. Exact Snapshot & Hash Binding Verification
    const currentSnap = params.incomingSnapshotId || params.snapshotId;
    const currentSourceHash = params.incomingSourceHash || params.sourceHash;

    if (currentSnap !== params.snapshotId || currentSourceHash !== params.sourceHash) {
      await this.recordFailure(params, deliveryId, "SNAPSHOT_MUTATION_DETECTED", "APPROVAL_SNAPSHOT_MISMATCH: Source files or snapshot mutated after approval.");
      return { deliveryId, projectId: params.projectId, clientId: params.clientId, status: "DELIVERY_INVALIDATED", isDownloadAvailable: false, blockReason: "DELIVERY_INVALIDATED: Source code changed after approval." };
    }

    // 4. Payment Verification Gate
    const payRes: PaymentVerificationResult = paymentVerificationService.verifyProjectPayment({
      paymentId: params.paymentId,
      invoiceId: params.invoiceId,
      projectId: params.projectId,
      clientId: params.clientId,
      expectedAmountMinor: params.expectedAmountMinor,
      paidAmountMinor: params.paidAmountMinor,
      currency: params.currency,
      isRefunded: params.isRefunded,
      isReversed: params.isReversed,
    });

    if (!payRes.isFullyPaid) {
      await this.recordFailure(params, deliveryId, "PAYMENT_NOT_SATISFIED", payRes.blockReason || "Payment verification failed.");
      return {
        deliveryId,
        projectId: params.projectId,
        clientId: params.clientId,
        status: payRes.state === "PARTIALLY_PAID" ? "PAYMENT_PENDING" : payRes.state === "REFUNDED" ? "REVOKED" : "PAYMENT_VERIFICATION_FAILED",
        isDownloadAvailable: false,
        blockReason: payRes.blockReason,
      };
    }

    // 5. Generate Delivery Package from Exact Approved Snapshot
    const pkgRes: PackageGenerationResult = sourcePackageService.generateDeliveryPackage({
      deliveryId,
      projectId: params.projectId,
      clientId: params.clientId,
      releaseCandidateId: params.releaseCandidateId,
      snapshotId: params.snapshotId,
      sourceHash: params.sourceHash,
      manifestHash: params.manifestHash,
      rawFiles: params.files,
    });

    if (!pkgRes.success || !pkgRes.manifest) {
      await this.recordFailure(params, deliveryId, "PACKAGE_GENERATION_FAILED", pkgRes.errorReason || "Failed to generate package.");
      return { deliveryId, projectId: params.projectId, clientId: params.clientId, status: "ELIGIBILITY_CHECK_FAILED", isDownloadAvailable: false, blockReason: pkgRes.errorReason };
    }

    // Mark payment consumed to prevent duplicate/replay
    paymentVerificationService.markPaymentConsumed(params.paymentId);

    // 6. Persist Delivery Record
    const deliveryRecord: SourceDeliveryRecord = {
      deliveryId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      paymentId: params.paymentId,
      releaseCandidateId: params.releaseCandidateId,
      snapshotId: params.snapshotId,
      sourceHash: params.sourceHash,
      manifestHash: pkgRes.manifest.manifestHash,
      packageHash: pkgRes.manifest.packageHash,
      status: "DELIVERY_AUTHORIZED",
      createdAt: new Date().toISOString(),
      authorizedAt: new Date().toISOString(),
      fileCount: pkgRes.manifest.fileCount,
      totalSizeBytes: pkgRes.manifest.totalSizeBytes,
    };
    await sourceDeliveryRepository.saveDelivery(deliveryRecord);

    // 7. Draft Outbound Notification (Operator Approval Required)
    notificationService.draftNotification({
      intent: "HANDOFF_READY",
      recipient: "sindousbuilding@gmail.com",
      subject: "Sindous Building Supplies — Your Approved Source Code Package is Ready",
      body: `Full payment verified. Access your package: ${deliveryId} (SHA-256: ${pkgRes.manifest.packageHash}).`,
    });

    await sourceDeliveryRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: "Source Delivery Service",
      projectId: params.projectId,
      clientId: params.clientId,
      deliveryId,
      action: "DELIVERY_AUTHORIZED",
      result: "SUCCESS",
      evidenceId: `PKG-HASH-${pkgRes.manifest.packageHash.slice(0, 8)}`,
    });

    return {
      deliveryId,
      projectId: params.projectId,
      clientId: params.clientId,
      status: "DELIVERY_AUTHORIZED",
      isDownloadAvailable: true,
      packageHash: pkgRes.manifest.packageHash,
      fileCount: pkgRes.manifest.fileCount,
      totalSizeBytes: pkgRes.manifest.totalSizeBytes,
      downloadPayload: pkgRes.packageFiles,
    };
  }

  async downloadSourcePackage(params: {
    deliveryId: string;
    requestingClientId: string;
    requestingOrganizationId: string;
    files: Record<string, string>;
  }): Promise<{ success: boolean; files?: Record<string, string>; blockReason?: string }> {
    const delivery = await sourceDeliveryRepository.getDelivery(params.deliveryId);
    if (!delivery) {
      return { success: false, blockReason: "DELIVERY_NOT_FOUND: Invalid delivery ID." };
    }

    // Client and Tenant Scope Enforcement
    if (delivery.clientId !== params.requestingClientId || delivery.organizationId !== params.requestingOrganizationId) {
      return { success: false, blockReason: "CROSS_TENANT_ACCESS_BLOCKED: Requesting client is not authorized for this delivery." };
    }

    if (delivery.status !== "DELIVERY_AUTHORIZED" && delivery.status !== "DOWNLOADED") {
      return { success: false, blockReason: `DOWNLOAD_BLOCKED: Delivery is in status '${delivery.status}'.` };
    }

    await sourceDeliveryRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `Client ${params.requestingClientId}`,
      projectId: delivery.projectId,
      clientId: delivery.clientId,
      deliveryId: delivery.deliveryId,
      action: "DOWNLOAD_STARTED",
      result: "SUCCESS",
    });

    // Verify Package Hash
    const currentHash = crypto.createHash("sha256").update(Object.values(params.files).join("\n")).digest("hex");
    if (currentHash !== delivery.packageHash) {
      delivery.status = "DELIVERY_INVALIDATED";
      delivery.invalidatedAt = new Date().toISOString();
      delivery.invalidationReason = "PACKAGE_INTEGRITY_COMPROMISED: Package hash mismatch.";
      await sourceDeliveryRepository.saveDelivery(delivery);
      return { success: false, blockReason: "PACKAGE_INTEGRITY_COMPROMISED: Modified package detected. Download blocked." };
    }

    delivery.status = "DOWNLOADED";
    delivery.downloadedAt = new Date().toISOString();
    await sourceDeliveryRepository.saveDelivery(delivery);

    await sourceDeliveryRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `Client ${params.requestingClientId}`,
      projectId: delivery.projectId,
      clientId: delivery.clientId,
      deliveryId: delivery.deliveryId,
      action: "DOWNLOAD_COMPLETED",
      result: "SUCCESS",
    });

    return { success: true, files: params.files };
  }

  private async recordFailure(params: any, deliveryId: string, action: string, reason: string) {
    await sourceDeliveryRepository.recordAudit({
      auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `Client ${params.clientId}`,
      projectId: params.projectId,
      clientId: params.clientId,
      deliveryId,
      action,
      result: "BLOCKED",
      reason,
    });
  }
}

export const sourceDeliveryService = new SourceDeliveryService();
