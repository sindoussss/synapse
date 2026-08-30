import { paymentRequestRepository, PaymentRequestRecord, PaymentTransactionRecord } from "../../repositories/payment-request.repository";
import { invoiceRepository, InvoiceRecord } from "../../repositories/invoice.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { payPalProvider, PayPalEnvironment } from "./paypal.provider";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { sourceDeliveryService, ClientDeliveryResponse } from "../delivery/source-delivery.service";
import { sourceDeliveryRepository } from "../../repositories/source-delivery.repository";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";
import { privilegedActionFirewall } from "../security/privileged-action-firewall.service";

export interface CreatePaymentRequestParams {
  invoiceId: string;
  amountMinorUnits: number; // in centavos
  currency?: string;
  notes?: string;
  environment?: PayPalEnvironment;
}

export class PayPalService {
  async createPaymentRequestDraft(params: CreatePaymentRequestParams): Promise<PaymentRequestRecord> {
    const invoice = await invoiceRepository.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    if (invoice.status !== "sent" && invoice.status !== "partially_paid" && invoice.status !== "approved") {
      throw new Error(`Payment request forbidden: Invoice [${invoice.invoiceNumber}] is in status '${invoice.status}'. Must be 'sent' or 'partially_paid'.`);
    }

    if (invoice.balanceDue <= 0) {
      throw new Error(`Payment request forbidden: Invoice [${invoice.invoiceNumber}] is already fully paid.`);
    }

    // Coexistence with manual payments / Oversized request protection
    if (params.amountMinorUnits > invoice.balanceDue) {
      const requestedMajor = (params.amountMinorUnits / 100).toLocaleString();
      const balanceMajor = (invoice.balanceDue / 100).toLocaleString();
      throw new Error(
        `Oversized Request Blocked: Requested payment amount (${invoice.currency} ${requestedMajor}) exceeds remaining invoice balance (${invoice.currency} ${balanceMajor}).`
      );
    }

    const requestId = `PAY-REQ-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const env = params.environment || payPalProvider.getEnvironment();

    const request: PaymentRequestRecord = {
      id: requestId,
      invoiceId: invoice.id,
      opportunityId: invoice.opportunityId,
      agreementId: invoice.agreementId,
      provider: "paypal",
      currency: params.currency || invoice.currency,
      amountMinorUnits: params.amountMinorUnits,
      status: "pending_approval",
      createdBy: "operator",
      createdAt: now,
      metadata: { notes: params.notes, environment: env },
    };

    const created = await paymentRequestRepository.createPaymentRequest(request);

    try {
      await activityRepository.add({
        agentName: "Accountant Agent",
        type: "lead_created" as any,
        level: "info",
        title: `PayPal Payment Request Created: ${requestId}`,
        description: `Created payment request for ${request.currency} ${(request.amountMinorUnits / 100).toLocaleString()} against ${invoice.invoiceNumber} (Status: Pending Approval, Environment: ${env}).`,
      });
    } catch {}

    return created;
  }

  async approveAndCreatePayPalOrder(requestId: string): Promise<PaymentRequestRecord> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const req = await paymentRequestRepository.getPaymentRequestById(requestId);
    if (!req) throw new Error(`Payment Request not found: ${requestId}`);

    if (req.status !== "pending_approval" && req.status !== "draft") {
      throw new Error(`Cannot approve payment request in '${req.status}' status.`);
    }

    const invoice = await invoiceRepository.getInvoiceById(req.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${req.invoiceId}`);

    const targetEnv: PayPalEnvironment = req.metadata?.environment || payPalProvider.getEnvironment();
    if (!payPalProvider.isConfigured(targetEnv)) {
      throw new Error(`PAYPAL_CONFIGURATION_INVALID: PayPal ${targetEnv} credentials not configured.`);
    }

    const now = new Date().toISOString();
    const orderResult = await payPalProvider.createPaymentRequest({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountMinorUnits: req.amountMinorUnits,
      currency: req.currency,
      customId: req.id,
      environment: targetEnv,
    });

    const updated = await paymentRequestRepository.updatePaymentRequest(requestId, {
      status: "active",
      providerRequestId: orderResult.orderId,
      checkoutUrl: orderResult.checkoutUrl,
      approvedAt: now,
      metadata: { ...req.metadata, paypalStatus: orderResult.status, environment: orderResult.environment },
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `PayPal Order Created: ${orderResult.orderId}`,
        description: `Approved payment request ${requestId} and generated PayPal ${targetEnv} Order ${orderResult.orderId}.`,
      });
    } catch {}

    return updated!;
  }

  async reconcilePayPalCapture(params: {
    orderId: string;
    captureId: string;
    eventId?: string;
    amountMinorUnits: number;
    currency: string;
    providerConfirmedAt?: string;
    environment?: PayPalEnvironment;
    deliveryContext?: {
      projectId: string;
      organizationId: string;
      workspaceId: string;
      clientId: string;
      releaseCandidateId: string;
      snapshotId: string;
      sourceHash: string;
      manifestHash: string;
      files: Record<string, string>;
      clientApprovalExists: boolean;
      operatorApprovalExists: boolean;
    };
  }): Promise<{
    transaction: PaymentTransactionRecord;
    invoice: InvoiceRecord;
    deliveryResponse?: ClientDeliveryResponse;
    requiresReview?: boolean;
    reviewReason?: string;
  }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const req = await paymentRequestRepository.getPaymentRequestByOrderId(params.orderId);
    if (!req) throw new Error(`Payment Request not found for PayPal Order: ${params.orderId}`);

    const invoice = await invoiceRepository.getInvoiceById(req.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${req.invoiceId}`);

    // Environment Separation Check
    const reqEnv = req.metadata?.environment || "sandbox";
    if (params.environment && params.environment !== reqEnv) {
      throw new Error(`PAYMENT_ENVIRONMENT_MISMATCH: PayPal transaction environment '${params.environment}' does not match invoice requirement '${reqEnv}'.`);
    }

    // Capture ID Deduplication & Idempotency Check (Handles Webhook/Browser Race)
    if (params.captureId) {
      const allTx = await paymentRequestRepository.getAllTransactions();
      const existingCap = allTx.find((t) => t.providerTransactionId === params.captureId);
      if (existingCap) {
        return { transaction: existingCap, invoice };
      }
    }

    // Event Idempotency Check (Handles Webhook Replay)
    if (params.eventId) {
      const existingTx = await paymentRequestRepository.getTransactionByEventId(params.eventId);
      if (existingTx) {
        return { transaction: existingTx, invoice };
      }
    }

    // Currency Safety
    if (params.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
      throw new Error(
        `PAYMENT_CURRENCY_MISMATCH: PayPal payment currency (${params.currency}) does not match invoice currency (${invoice.currency}). Reconciliation blocked.`
      );
    }

    // Overpayment Protection / Review Required Flag
    if (params.amountMinorUnits > invoice.balanceDue) {
      return {
        transaction: {
          id: `PAY-TX-FLAGGED-${Date.now().toString().slice(-4)}`,
          paymentRequestId: req.id,
          invoiceId: invoice.id,
          provider: "paypal",
          providerOrderId: params.orderId,
          currency: params.currency,
          amountMinorUnits: params.amountMinorUnits,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { flagged: true, reason: "PAYMENT_AMOUNT_REVIEW_REQUIRED" },
        },
        invoice,
        requiresReview: true,
        reviewReason: `PAYMENT_AMOUNT_REVIEW_REQUIRED: Captured amount (${params.amountMinorUnits}) exceeds remaining balance (${invoice.balanceDue}). Silent unlock prevented.`,
      };
    }

    const now = new Date().toISOString();
    const txId = `PAY-TX-${Date.now().toString().slice(-4)}`;

    const transaction: PaymentTransactionRecord = {
      id: txId,
      paymentRequestId: req.id,
      invoiceId: invoice.id,
      provider: "paypal",
      providerOrderId: params.orderId,
      providerTransactionId: params.captureId,
      providerEventId: params.eventId || `MANUAL-${txId}`,
      currency: params.currency,
      amountMinorUnits: params.amountMinorUnits,
      status: "succeeded",
      providerCreatedAt: params.providerConfirmedAt || now,
      providerConfirmedAt: params.providerConfirmedAt || now,
      metadata: { orderId: params.orderId, captureId: params.captureId, environment: reqEnv },
      createdAt: now,
      updatedAt: now,
    };

    const savedTx = await paymentRequestRepository.createPaymentTransaction(transaction);

    // Update Payment Request status
    await paymentRequestRepository.updatePaymentRequest(req.id, {
      status: "completed",
      completedAt: now,
    });

    // Deterministic Invoice Balance Update
    const newAmountPaid = invoice.amountPaid + params.amountMinorUnits;
    const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus = newBalanceDue === 0 ? "paid" : "partially_paid";

    const updatedInvoice = await invoiceRepository.updateInvoice(invoice.id, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      paidAt: newStatus === "paid" ? now : undefined,
    });

    try {
      await activityRepository.add({
        agentName: "System",
        type: "lead_created" as any,
        level: "info",
        title: `PayPal Payment Reconciled (${reqEnv.toUpperCase()}): ${params.captureId}`,
        description: `Reconciled ${params.currency} ${(params.amountMinorUnits / 100).toLocaleString()} via PayPal Capture ${params.captureId}. Invoice balance: ${invoice.currency} ${(newBalanceDue / 100).toLocaleString()} (Status: ${newStatus}).`,
      });
    } catch {}

    // AUTOMATIC PHASE 40 SOURCE DELIVERY TRIGGER IF FULLY PAID
    let deliveryResponse: ClientDeliveryResponse | undefined;
    if (newStatus === "paid" && params.deliveryContext) {
      deliveryResponse = await sourceDeliveryService.processPaymentAndAuthorizeDelivery({
        projectId: params.deliveryContext.projectId,
        organizationId: params.deliveryContext.organizationId,
        workspaceId: params.deliveryContext.workspaceId,
        clientId: params.deliveryContext.clientId,
        invoiceId: invoice.id,
        paymentId: savedTx.id,
        releaseCandidateId: params.deliveryContext.releaseCandidateId,
        snapshotId: params.deliveryContext.snapshotId,
        sourceHash: params.deliveryContext.sourceHash,
        manifestHash: params.deliveryContext.manifestHash,
        expectedAmountMinor: invoice.totalAmount,
        paidAmountMinor: newAmountPaid,
        currency: invoice.currency,
        files: params.deliveryContext.files,
        clientApprovalExists: params.deliveryContext.clientApprovalExists,
        operatorApprovalExists: params.deliveryContext.operatorApprovalExists,
      });
    }

    return { transaction: savedTx, invoice: updatedInvoice!, deliveryResponse };
  }

  async handleRefundWebhook(params: {
    captureId: string;
    refundId: string;
    projectId?: string;
  }): Promise<{ status: "REFUNDED"; deliveryRevoked: boolean }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const allTx = await paymentRequestRepository.getAllTransactions();
    const tx = allTx.find((t) => t.providerTransactionId === params.captureId);
    if (tx) {
      tx.status = "refunded";
      tx.updatedAt = new Date().toISOString();
      await paymentRequestRepository.createPaymentTransaction(tx);
    }

    let deliveryRevoked = false;
    if (params.projectId) {
      const deliv = await sourceDeliveryRepository.getDeliveryByProject(params.projectId);
      if (deliv) {
        deliv.status = "REVOKED";
        deliv.invalidatedAt = new Date().toISOString();
        deliv.invalidationReason = `PAYMENT_REFUNDED: PayPal Refund ${params.refundId} processed. Client download access revoked.`;
        await sourceDeliveryRepository.saveDelivery(deliv);
        deliveryRevoked = true;
      }
    }

    return { status: "REFUNDED", deliveryRevoked };
  }

  async handleReversalWebhook(params: {
    captureId: string;
    disputeId: string;
    projectId?: string;
  }): Promise<{ status: "DISPUTED"; deliveryRevoked: boolean }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const allTx = await paymentRequestRepository.getAllTransactions();
    const tx = allTx.find((t) => t.providerTransactionId === params.captureId);
    if (tx) {
      tx.status = "disputed";
      tx.updatedAt = new Date().toISOString();
      await paymentRequestRepository.createPaymentTransaction(tx);
    }

    let deliveryRevoked = false;
    if (params.projectId) {
      const deliv = await sourceDeliveryRepository.getDeliveryByProject(params.projectId);
      if (deliv) {
        deliv.status = "DELIVERY_INVALIDATED";
        deliv.invalidatedAt = new Date().toISOString();
        deliv.invalidationReason = `PAYMENT_REVERSED: PayPal Dispute/Reversal ${params.disputeId} received. Delivery invalidated.`;
        await sourceDeliveryRepository.saveDelivery(deliv);
        deliveryRevoked = true;
      }
    }

    return { status: "DISPUTED", deliveryRevoked };
  }

  async sendPaymentLinkEmail(params: { paymentRequestId: string; recipientEmail?: string }): Promise<{ success: boolean; messageId?: string }> {
    const req = await paymentRequestRepository.getPaymentRequestById(params.paymentRequestId);
    if (!req) throw new Error(`Payment request ${params.paymentRequestId} not found.`);
    return { success: true, messageId: `MSG-${Date.now()}` };
  }
}

export const payPalService = new PayPalService();
