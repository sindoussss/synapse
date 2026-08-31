import { paymentRequestRepository, PaymentRequestRecord, PaymentTransactionRecord } from "../../repositories/payment-request.repository";
import { invoiceRepository, InvoiceRecord } from "../../repositories/invoice.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { payPalProvider, PayPalEnvironment } from "./paypal.provider";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { ClientDeliveryResponse } from "../delivery/source-delivery.service";
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
    captureId?: string;
    eventId?: string;
    /** Ignored. Amount is taken from PayPal. Kept so existing callers still typecheck. */
    amountMinorUnits?: number;
    /** Ignored. Currency is taken from PayPal. */
    currency?: string;
    providerConfirmedAt?: string;
    environment?: PayPalEnvironment;
    /**
     * Ignored. Caller-supplied delivery unlock (project, files, approval flags)
     * must not mutate delivery eligibility. Authorize delivery through
     * sourceDeliveryService with stored evidence after payment is verified.
     */
    deliveryContext?: unknown;
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

    if (!params.orderId) {
      throw new Error("PAYMENT_UNVERIFIED: PayPal order ID is required.");
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

    // Event Idempotency Check (Handles Webhook Replay) — before provider I/O
    if (params.eventId) {
      const existingTx = await paymentRequestRepository.getTransactionByEventId(params.eventId);
      if (existingTx) {
        return { transaction: existingTx, invoice };
      }
    }

    // Authoritative PayPal lookup. Caller amount/currency/capture are not evidence.
    let providerOrder: Awaited<ReturnType<typeof payPalProvider.getPaymentStatus>>;
    try {
      providerOrder = await payPalProvider.getPaymentStatus(params.orderId, reqEnv);
    } catch (e: any) {
      throw new Error(
        `PAYMENT_UNVERIFIED: Unable to obtain authoritative PayPal order state for '${params.orderId}'. ${e?.message || e}`
      );
    }

    const orderCompleted = providerOrder.status === "COMPLETED" || providerOrder.status === "CAPTURED";
    if (!orderCompleted || !providerOrder.captureId) {
      throw new Error(
        `PAYMENT_UNVERIFIED: PayPal order '${params.orderId}' is not a completed capture (status='${providerOrder.status}').`
      );
    }

    if (params.captureId && params.captureId !== providerOrder.captureId) {
      throw new Error(
        `PAYMENT_CAPTURE_MISMATCH: Caller capture '${params.captureId}' does not match PayPal capture '${providerOrder.captureId}'.`
      );
    }

    let amountMinorUnits = providerOrder.amountMinorUnits;
    let currency = providerOrder.currency;
    const captureId = providerOrder.captureId;
    let providerConfirmedAt = providerOrder.completedAt;

    try {
      const capture = await payPalProvider.getTransaction(captureId, reqEnv);
      if (capture.status !== "COMPLETED") {
        throw new Error(
          `PAYMENT_UNVERIFIED: PayPal capture '${captureId}' status is '${capture.status}'.`
        );
      }
      amountMinorUnits = capture.amountMinorUnits;
      currency = capture.currency;
      providerConfirmedAt = capture.createTime || providerConfirmedAt;
    } catch (e: any) {
      if (typeof e?.message === "string" && e.message.startsWith("PAYMENT_UNVERIFIED")) {
        throw e;
      }
      throw new Error(
        `PAYMENT_UNVERIFIED: Unable to obtain authoritative PayPal capture '${captureId}'. ${e?.message || e}`
      );
    }

    // Capture ID Deduplication & Idempotency Check (Handles Webhook/Browser Race)
    const allTx = await paymentRequestRepository.getAllTransactions();
    const existingCap = allTx.find((t) => t.providerTransactionId === captureId);
    if (existingCap) {
      return { transaction: existingCap, invoice };
    }

    // Currency Safety — provider currency vs invoice, never caller currency
    if (currency.toUpperCase() !== invoice.currency.toUpperCase()) {
      throw new Error(
        `PAYMENT_CURRENCY_MISMATCH: PayPal payment currency (${currency}) does not match invoice currency (${invoice.currency}). Reconciliation blocked.`
      );
    }

    // Overpayment Protection / Review Required Flag
    if (amountMinorUnits > invoice.balanceDue) {
      return {
        transaction: {
          id: `PAY-TX-FLAGGED-${Date.now().toString().slice(-4)}`,
          paymentRequestId: req.id,
          invoiceId: invoice.id,
          provider: "paypal",
          providerOrderId: params.orderId,
          currency,
          amountMinorUnits,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { flagged: true, reason: "PAYMENT_AMOUNT_REVIEW_REQUIRED", captureId, source: "paypal_provider" },
        },
        invoice,
        requiresReview: true,
        reviewReason: `PAYMENT_AMOUNT_REVIEW_REQUIRED: Captured amount (${amountMinorUnits}) exceeds remaining balance (${invoice.balanceDue}). Silent unlock prevented.`,
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
      providerTransactionId: captureId,
      providerEventId: params.eventId || `PAYPAL-${captureId}`,
      currency,
      amountMinorUnits,
      status: "succeeded",
      providerCreatedAt: providerConfirmedAt || now,
      providerConfirmedAt: providerConfirmedAt || now,
      metadata: { orderId: params.orderId, captureId, environment: reqEnv, source: "paypal_provider" },
      createdAt: now,
      updatedAt: now,
    };

    const savedTx = await paymentRequestRepository.createPaymentTransaction(transaction);

    // Update Payment Request status
    await paymentRequestRepository.updatePaymentRequest(req.id, {
      status: "completed",
      completedAt: now,
    });

    // Deterministic Invoice Balance Update from PayPal amount
    const newAmountPaid = invoice.amountPaid + amountMinorUnits;
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
        title: `PayPal Payment Reconciled (${reqEnv.toUpperCase()}): ${captureId}`,
        description: `Reconciled ${currency} ${(amountMinorUnits / 100).toLocaleString()} via PayPal Capture ${captureId}. Invoice balance: ${invoice.currency} ${(newBalanceDue / 100).toLocaleString()} (Status: ${newStatus}).`,
        level: "info",
      });
    } catch {}

    // Delivery is not authorized from this path. Caller deliveryContext is not evidence.
    return { transaction: savedTx, invoice: updatedInvoice! };
  }

  async handleRefundWebhook(params: {
    captureId: string;
    refundId: string;
    projectId?: string;
    paymentRequestId?: string;
  }): Promise<{ status: "REFUNDED"; deliveryRevoked: boolean }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const allTx = await paymentRequestRepository.getAllTransactions();
    const existingComp = allTx.find((t) => t.metadata?.refundId === params.refundId);
    const original = existingComp
      ? allTx.find((t) => t.id === existingComp.metadata?.originalTransactionId) || this.findOriginalCapture(allTx, params)
      : this.findOriginalCapture(allTx, params);

    if (!existingComp && original) {
      const now = new Date().toISOString();
      await paymentRequestRepository.createPaymentTransaction({
        id: `PAY-TX-REF-${Date.now().toString().slice(-4)}`,
        paymentRequestId: original.paymentRequestId,
        invoiceId: original.invoiceId,
        provider: "paypal",
        providerOrderId: original.providerOrderId,
        providerTransactionId: original.providerTransactionId,
        providerEventId: `REFUND-${params.refundId}`,
        currency: original.currency,
        amountMinorUnits: original.amountMinorUnits,
        status: "refunded",
        createdAt: now,
        updatedAt: now,
        metadata: {
          role: "COMPENSATING",
          refundId: params.refundId,
          originalTransactionId: original.id,
          captureId: original.providerTransactionId,
        },
      });

      const invoice = await invoiceRepository.getInvoiceById(original.invoiceId);
      if (invoice && invoice.amountPaid > 0) {
        const newAmountPaid = Math.max(0, invoice.amountPaid - original.amountMinorUnits);
        const newBalanceDue = Math.min(invoice.totalAmount, invoice.totalAmount - newAmountPaid);
        const newStatus = newAmountPaid === 0 ? "sent" : "partially_paid";
        await invoiceRepository.updateInvoice(invoice.id, {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        });
      }
    }

    const invoiceId = original?.invoiceId || existingComp?.invoiceId;
    const deliveryRevoked = await this.revokeDeliveriesForFinancialEvent({
      invoiceId,
      projectId: params.projectId,
      reason: `PAYMENT_REFUNDED: PayPal Refund ${params.refundId} processed. Client download access revoked.`,
      status: "REVOKED",
    });

    return { status: "REFUNDED", deliveryRevoked };
  }

  async handleReversalWebhook(params: {
    captureId: string;
    disputeId: string;
    projectId?: string;
    paymentRequestId?: string;
    eventKind?: "DISPUTE" | "REVERSAL";
  }): Promise<{ status: "DISPUTED"; deliveryRevoked: boolean }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const kind = params.eventKind || "DISPUTE";
    const allTx = await paymentRequestRepository.getAllTransactions();
    const existingComp = allTx.find((t) => t.metadata?.disputeId === params.disputeId);
    const original = existingComp
      ? allTx.find((t) => t.id === existingComp.metadata?.originalTransactionId) || this.findOriginalCapture(allTx, params)
      : this.findOriginalCapture(allTx, params);

    if (!existingComp && original) {
      const now = new Date().toISOString();
      await paymentRequestRepository.createPaymentTransaction({
        id: `PAY-TX-DSP-${Date.now().toString().slice(-4)}`,
        paymentRequestId: original.paymentRequestId,
        invoiceId: original.invoiceId,
        provider: "paypal",
        providerOrderId: original.providerOrderId,
        providerTransactionId: original.providerTransactionId,
        providerEventId: `${kind}-${params.disputeId}`,
        currency: original.currency,
        amountMinorUnits: original.amountMinorUnits,
        status: kind === "REVERSAL" ? "refunded" : "disputed",
        createdAt: now,
        updatedAt: now,
        metadata: {
          role: "COMPENSATING",
          disputeId: params.disputeId,
          eventKind: kind,
          originalTransactionId: original.id,
          captureId: original.providerTransactionId,
        },
      });

      if (kind === "REVERSAL") {
        const invoice = await invoiceRepository.getInvoiceById(original.invoiceId);
        if (invoice && invoice.amountPaid > 0) {
          const newAmountPaid = Math.max(0, invoice.amountPaid - original.amountMinorUnits);
          const newBalanceDue = Math.min(invoice.totalAmount, invoice.totalAmount - newAmountPaid);
          const newStatus = newAmountPaid === 0 ? "sent" : "partially_paid";
          await invoiceRepository.updateInvoice(invoice.id, {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
          });
        }
      }
    }

    const invoiceId = original?.invoiceId || existingComp?.invoiceId;
    const deliveryRevoked = await this.revokeDeliveriesForFinancialEvent({
      invoiceId,
      projectId: params.projectId,
      reason:
        kind === "REVERSAL"
          ? `PAYMENT_REVERSED: PayPal capture reversal ${params.disputeId} received. Delivery invalidated.`
          : `PAYMENT_DISPUTED: PayPal dispute ${params.disputeId} received. Delivery invalidated.`,
      status: "DELIVERY_INVALIDATED",
    });

    return { status: "DISPUTED", deliveryRevoked };
  }

  private findOriginalCapture(
    allTx: PaymentTransactionRecord[],
    params: { captureId: string; paymentRequestId?: string }
  ): PaymentTransactionRecord | undefined {
    const byCapture = allTx.find(
      (t) => t.providerTransactionId === params.captureId && t.metadata?.role !== "COMPENSATING" && t.status === "succeeded"
    );
    if (byCapture) return byCapture;

    if (params.paymentRequestId) {
      const byReq = allTx.find(
        (t) => t.paymentRequestId === params.paymentRequestId && t.metadata?.role !== "COMPENSATING" && t.status === "succeeded"
      );
      if (byReq) return byReq;
    }

    return undefined;
  }

  private async revokeDeliveriesForFinancialEvent(params: {
    invoiceId?: string;
    projectId?: string;
    reason: string;
    status: "REVOKED" | "DELIVERY_INVALIDATED";
  }): Promise<boolean> {
    const now = new Date().toISOString();
    let revoked = false;
    const seen = new Set<string>();

    const candidates = params.invoiceId
      ? await sourceDeliveryRepository.listDeliveriesByInvoice(params.invoiceId)
      : [];

    if (params.projectId) {
      const byProject = await sourceDeliveryRepository.getDeliveryByProject(params.projectId);
      if (byProject) candidates.push(byProject);
    }

    for (const deliv of candidates) {
      if (seen.has(deliv.deliveryId)) continue;
      seen.add(deliv.deliveryId);
      if (
        deliv.status === "DELIVERY_AUTHORIZED" ||
        deliv.status === "DOWNLOADED" ||
        deliv.status === "REVOKED" ||
        deliv.status === "DELIVERY_INVALIDATED"
      ) {
        if (deliv.status !== params.status) {
          deliv.status = params.status;
          deliv.invalidatedAt = now;
          deliv.invalidationReason = params.reason;
          await sourceDeliveryRepository.saveDelivery(deliv);
          await sourceDeliveryRepository.recordAudit({
            auditId: `AUDIT-${Date.now().toString().slice(-4)}`,
            timestamp: now,
            actor: "PayPal Webhook",
            projectId: deliv.projectId,
            clientId: deliv.clientId,
            deliveryId: deliv.deliveryId,
            action: params.status === "REVOKED" ? "DELIVERY_REVOKED" : "DELIVERY_INVALIDATED",
            result: "SUCCESS",
            reason: params.reason,
          });
        }
        revoked = true;
      }
    }

    return revoked;
  }

  async sendPaymentLinkEmail(params: { paymentRequestId: string; recipientEmail?: string }): Promise<{ success: boolean; messageId?: string }> {
    const req = await paymentRequestRepository.getPaymentRequestById(params.paymentRequestId);
    if (!req) throw new Error(`Payment request ${params.paymentRequestId} not found.`);
    return { success: true, messageId: `MSG-${Date.now()}` };
  }
}

export const payPalService = new PayPalService();
