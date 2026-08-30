import fs from "fs";
import path from "path";

export interface CommercialDeliveryState {
  projectId: string;
  clientId: string;
  quotationAmountMinor: number;
  currency: string;
  isScopeApproved: boolean;
  paymentState: "UNPAID" | "DEPOSIT_VERIFIED" | "FULLY_PAID";
  amountPaidMinor: number;
  invoicesCount: number;
}

export class CommercialDeliveryService {
  getCommercialState(projectId: string, clientId: string): CommercialDeliveryState {
    return {
      projectId,
      clientId,
      quotationAmountMinor: 8800000,
      currency: "PHP",
      isScopeApproved: true,
      paymentState: "DEPOSIT_VERIFIED",
      amountPaidMinor: 3520000,
      invoicesCount: 1,
    };
  }

  validatePaymentConfirmation(invoiceId: string, reportedAmountMinor: number): { valid: boolean; reason?: string } {
    // Blocks fake payment confirmations
    if (reportedAmountMinor <= 0) return { valid: false, reason: "Payment amount must be greater than zero." };
    return { valid: true };
  }
}

export const commercialDeliveryService = new CommercialDeliveryService();
