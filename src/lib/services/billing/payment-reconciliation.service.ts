import {
  billingRepository,
  PaymentLedgerEntryRecord,
  InvoiceRecord,
  LedgerVerificationState,
} from "../../repositories/billing.repository";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";

export interface PaymentReconciliationResult {
  status: "VERIFIED" | "PARTIALLY_VERIFIED" | "MISMATCH" | "REVERSED" | "REFUNDED" | "DISPUTED" | "UNKNOWN";
  paymentClassification: "EXACT_PAYMENT" | "PARTIAL_PAYMENT" | "OVERPAYMENT" | "DUPLICATE_PAYMENT" | "INVALID_PAYMENT";
  ledgerEntry?: PaymentLedgerEntryRecord;
  updatedInvoice?: InvoiceRecord;
  requiresHumanReview: boolean;
  reviewReason?: string;
}

export class PaymentReconciliationService {
  reconcilePayment(params: {
    invoiceId: string;
    organizationId: string;
    projectId: string;
    clientId: string;
    provider: "PAYPAL" | "BANK_TRANSFER" | "STRIPE" | "MANUAL";
    providerTransactionId: string;
    amountMinor: number;
    currency: string;
    environment: "LIVE" | "SANDBOX" | "CONTROLLED_TEST";
    sourceEventId?: string;
  }): PaymentReconciliationResult {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = billingRepository.getInvoice(params.invoiceId, params.organizationId);
    if (!invoice) {
      return {
        status: "MISMATCH",
        paymentClassification: "INVALID_PAYMENT",
        requiresHumanReview: true,
        reviewReason: "INVOICE_NOT_FOUND: Payment references a non-existent or inaccessible invoice.",
      };
    }

    // 1. Cross-project / Cross-client validation
    if (invoice.projectId !== params.projectId || invoice.clientId !== params.clientId) {
      return {
        status: "MISMATCH",
        paymentClassification: "INVALID_PAYMENT",
        requiresHumanReview: true,
        reviewReason: "PROJECT_CLIENT_MISMATCH: Payment project/client metadata does not match invoice binding.",
      };
    }

    // 2. Currency check
    if (invoice.currency !== params.currency) {
      return {
        status: "MISMATCH",
        paymentClassification: "INVALID_PAYMENT",
        requiresHumanReview: true,
        reviewReason: `CURRENCY_MISMATCH: Invoice expects '${invoice.currency}', received '${params.currency}'.`,
      };
    }

    // 3. Duplicate payment check on ledger
    const existingEntries = billingRepository.listLedgerEntries({ invoiceId: params.invoiceId });
    if (existingEntries.some((e) => e.providerTransactionId === params.providerTransactionId)) {
      return {
        status: "MISMATCH",
        paymentClassification: "DUPLICATE_PAYMENT",
        requiresHumanReview: true,
        reviewReason: "DUPLICATE_TRANSACTION_DETECTED: Transaction ID has already been recorded on the ledger.",
      };
    }

    // 4. Amount Evaluation
    const currentBalanceDue = invoice.totalMinor - invoice.paidMinor + invoice.refundedMinor;
    let paymentClassification: PaymentReconciliationResult["paymentClassification"];
    let verificationState: LedgerVerificationState;
    let requiresHumanReview = false;
    let reviewReason: string | undefined;

    if (params.amountMinor === currentBalanceDue) {
      paymentClassification = "EXACT_PAYMENT";
      verificationState = "VERIFIED";
    } else if (params.amountMinor < currentBalanceDue) {
      paymentClassification = "PARTIAL_PAYMENT";
      verificationState = "PARTIALLY_VERIFIED";
    } else {
      paymentClassification = "OVERPAYMENT";
      verificationState = "MISMATCH";
      requiresHumanReview = true;
      reviewReason = "PAYMENT_AMOUNT_REVIEW_REQUIRED: Received payment exceeds invoice balance due. Human review required.";
    }

    // 5. Append-only ledger record
    const ledgerEntry = billingRepository.addLedgerEntry({
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      provider: params.provider,
      providerTransactionId: params.providerTransactionId,
      entryType: "PAYMENT",
      amountMinor: params.amountMinor,
      currency: params.currency,
      environment: params.environment,
      verificationState,
      sourceEventId: params.sourceEventId,
    });

    // 6. Update authoritative invoice paid and balance amounts
    const newPaidMinor = invoice.paidMinor + params.amountMinor;
    const newBalanceDueMinor = Math.max(0, invoice.totalMinor - newPaidMinor + invoice.refundedMinor);
    const newStatus = requiresHumanReview
      ? "RECONCILIATION_REQUIRED"
      : newBalanceDueMinor === 0
      ? "FULLY_PAID"
      : "PARTIALLY_PAID";

    const updatedInvoice = billingRepository.updateInvoice(
      invoice.invoiceId,
      {
        paidMinor: newPaidMinor,
        balanceDueMinor: newBalanceDueMinor,
        status: newStatus,
      },
      "OPERATOR"
    );

    return {
      status: verificationState,
      paymentClassification,
      ledgerEntry,
      updatedInvoice,
      requiresHumanReview,
      reviewReason,
    };
  }

  processRefund(params: {
    invoiceId: string;
    organizationId: string;
    projectId: string;
    clientId: string;
    provider: "PAYPAL" | "BANK_TRANSFER" | "STRIPE" | "MANUAL";
    providerTransactionId: string;
    amountMinor: number;
    currency: string;
    environment: "LIVE" | "SANDBOX" | "CONTROLLED_TEST";
    sourceEventId?: string;
  }): { ledgerEntry: PaymentLedgerEntryRecord; updatedInvoice: InvoiceRecord } {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = billingRepository.getInvoice(params.invoiceId, params.organizationId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const ledgerEntry = billingRepository.addLedgerEntry({
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      provider: params.provider,
      providerTransactionId: params.providerTransactionId,
      entryType: "REFUND",
      amountMinor: params.amountMinor,
      currency: params.currency,
      environment: params.environment,
      verificationState: "REFUNDED",
      sourceEventId: params.sourceEventId,
    });

    const newRefundedMinor = invoice.refundedMinor + params.amountMinor;
    const newBalanceDueMinor = invoice.totalMinor - (invoice.paidMinor - newRefundedMinor);
    const newStatus = newRefundedMinor >= invoice.paidMinor ? "REFUNDED" : "PARTIALLY_PAID";

    const updatedInvoice = billingRepository.updateInvoice(
      invoice.invoiceId,
      {
        refundedMinor: newRefundedMinor,
        balanceDueMinor: newBalanceDueMinor,
        status: newStatus,
      },
      "OPERATOR"
    );

    return { ledgerEntry, updatedInvoice };
  }

  processReversal(params: {
    invoiceId: string;
    organizationId: string;
    projectId: string;
    clientId: string;
    providerTransactionId: string;
    amountMinor: number;
    currency: string;
    environment: "LIVE" | "SANDBOX" | "CONTROLLED_TEST";
    sourceEventId?: string;
  }): { ledgerEntry: PaymentLedgerEntryRecord; updatedInvoice: InvoiceRecord } {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = billingRepository.getInvoice(params.invoiceId, params.organizationId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const ledgerEntry = billingRepository.addLedgerEntry({
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      provider: "PAYPAL",
      providerTransactionId: params.providerTransactionId,
      entryType: "REVERSAL",
      amountMinor: params.amountMinor,
      currency: params.currency,
      environment: params.environment,
      verificationState: "REVERSED",
      sourceEventId: params.sourceEventId,
    });

    const newRefundedMinor = invoice.refundedMinor + params.amountMinor;
    const newBalanceDueMinor = invoice.totalMinor - (invoice.paidMinor - newRefundedMinor);

    const updatedInvoice = billingRepository.updateInvoice(
      invoice.invoiceId,
      {
        refundedMinor: newRefundedMinor,
        balanceDueMinor: newBalanceDueMinor,
        status: "RECONCILIATION_REQUIRED",
      },
      "OPERATOR"
    );

    return { ledgerEntry, updatedInvoice };
  }

  processDispute(params: {
    invoiceId: string;
    organizationId: string;
    projectId: string;
    clientId: string;
    providerTransactionId: string;
    amountMinor: number;
    currency: string;
    environment: "LIVE" | "SANDBOX" | "CONTROLLED_TEST";
    disputeStatus: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "LOST" | "WON";
  }): { ledgerEntry: PaymentLedgerEntryRecord; updatedInvoice: InvoiceRecord } {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = billingRepository.getInvoice(params.invoiceId, params.organizationId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const ledgerEntry = billingRepository.addLedgerEntry({
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      provider: "PAYPAL",
      providerTransactionId: params.providerTransactionId,
      entryType: "DISPUTE",
      amountMinor: params.amountMinor,
      currency: params.currency,
      environment: params.environment,
      verificationState: "DISPUTED",
    });

    const updatedInvoice = billingRepository.updateInvoice(
      invoice.invoiceId,
      {
        status: "DISPUTED",
      },
      "OPERATOR"
    );

    return { ledgerEntry, updatedInvoice };
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();