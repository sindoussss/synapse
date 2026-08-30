import fs from "fs";
import path from "path";

export type PaymentVerificationState =
  | "FULLY_PAID"
  | "PARTIALLY_PAID"
  | "REFUNDED"
  | "REVERSED"
  | "INVALID"
  | "DUPLICATE"
  | "UNVERIFIED";

export interface PaymentVerificationResult {
  paymentId: string;
  invoiceId: string;
  projectId: string;
  clientId: string;
  amountExpectedMinor: number;
  amountPaidMinor: number;
  currency: string;
  state: PaymentVerificationState;
  isFullyPaid: boolean;
  blockReason?: string;
  verificationEvidenceId?: string;
}

export class PaymentVerificationService {
  private consumedPaymentIds: string[] = [];

  verifyProjectPayment(params: {
    paymentId: string;
    invoiceId: string;
    projectId: string;
    clientId: string;
    expectedAmountMinor: number;
    paidAmountMinor: number;
    currency: string;
    isRefunded?: boolean;
    isReversed?: boolean;
    clientProvidedState?: string;
  }): PaymentVerificationResult {
    // 1. Replay / Duplicate Check
    if (this.consumedPaymentIds.includes(params.paymentId)) {
      return {
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        projectId: params.projectId,
        clientId: params.clientId,
        amountExpectedMinor: params.expectedAmountMinor,
        amountPaidMinor: params.paidAmountMinor,
        currency: params.currency,
        state: "DUPLICATE",
        isFullyPaid: false,
        blockReason: "DUPLICATE_PAYMENT: Payment transaction ID has already been consumed.",
      };
    }

    // 2. Refund / Chargeback Check
    if (params.isRefunded) {
      return {
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        projectId: params.projectId,
        clientId: params.clientId,
        amountExpectedMinor: params.expectedAmountMinor,
        amountPaidMinor: params.paidAmountMinor,
        currency: params.currency,
        state: "REFUNDED",
        isFullyPaid: false,
        blockReason: "PAYMENT_REFUNDED: Transaction has been refunded/reversed.",
      };
    }

    if (params.isReversed) {
      return {
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        projectId: params.projectId,
        clientId: params.clientId,
        amountExpectedMinor: params.expectedAmountMinor,
        amountPaidMinor: params.paidAmountMinor,
        currency: params.currency,
        state: "REVERSED",
        isFullyPaid: false,
        blockReason: "PAYMENT_REVERSED: Transaction under chargeback dispute or reversed.",
      };
    }

    // 3. Amount & Currency Verification
    if (params.paidAmountMinor <= 0) {
      return {
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        projectId: params.projectId,
        clientId: params.clientId,
        amountExpectedMinor: params.expectedAmountMinor,
        amountPaidMinor: params.paidAmountMinor,
        currency: params.currency,
        state: "UNVERIFIED",
        isFullyPaid: false,
        blockReason: `UNPAID: No payment received. Paid: ${params.paidAmountMinor}, Expected: ${params.expectedAmountMinor}.`,
      };
    }

    if (params.paidAmountMinor < params.expectedAmountMinor) {
      return {
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        projectId: params.projectId,
        clientId: params.clientId,
        amountExpectedMinor: params.expectedAmountMinor,
        amountPaidMinor: params.paidAmountMinor,
        currency: params.currency,
        state: "PARTIALLY_PAID",
        isFullyPaid: false,
        blockReason: `PARTIALLY_PAID: Balance due. Paid: ${params.paidAmountMinor}, Expected: ${params.expectedAmountMinor}.`,
      };
    }

    return {
      paymentId: params.paymentId,
      invoiceId: params.invoiceId,
      projectId: params.projectId,
      clientId: params.clientId,
      amountExpectedMinor: params.expectedAmountMinor,
      amountPaidMinor: params.paidAmountMinor,
      currency: params.currency,
      state: "FULLY_PAID",
      isFullyPaid: true,
      verificationEvidenceId: `VERIF-PAY-${params.paymentId}`,
    };
  }

  markPaymentConsumed(paymentId: string): void {
    if (!this.consumedPaymentIds.includes(paymentId)) {
      this.consumedPaymentIds.push(paymentId);
    }
  }
}

export const paymentVerificationService = new PaymentVerificationService();
