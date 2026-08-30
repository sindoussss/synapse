import {
  billingRepository,
  ReceiptRecord,
  PaymentLedgerEntryRecord,
  ReceiptStatus,
} from "../../repositories/billing.repository";

export class ReceiptService {
  generateReceipt(params: {
    ledgerEntryId: string;
    callerOrgId: string;
  }): { success: boolean; receipt?: ReceiptRecord; reason?: string } {
    const ledger = billingRepository
      .listLedgerEntries({ organizationId: params.callerOrgId })
      .find((l) => l.ledgerEntryId === params.ledgerEntryId);

    if (!ledger) {
      return { success: false, reason: "LEDGER_ENTRY_NOT_FOUND" };
    }

    if (ledger.verificationState !== "VERIFIED") {
      return {
        success: false,
        reason: `UNVERIFIED_PAYMENT: Cannot issue receipt for payment in state '${ledger.verificationState}'.`,
      };
    }

    const receipt = billingRepository.createReceipt({
      organizationId: ledger.organizationId,
      projectId: ledger.projectId,
      clientId: ledger.clientId,
      invoiceId: ledger.invoiceId,
      ledgerEntryId: ledger.ledgerEntryId,
      providerTransactionId: ledger.providerTransactionId,
      amountMinor: ledger.amountMinor,
      currency: ledger.currency,
      verificationState: ledger.verificationState,
      paymentDate: ledger.createdAt,
      status: "VERIFIED",
    });

    return { success: true, receipt };
  }

  revokeReceipt(receiptId: string, callerOrgId: string): { success: boolean; receipt?: ReceiptRecord; reason?: string } {
    const receipt = billingRepository.getReceipt(receiptId, callerOrgId);
    if (!receipt) {
      return { success: false, reason: "RECEIPT_NOT_FOUND" };
    }

    const updated = billingRepository.updateReceiptStatus(receiptId, "REVOKED");
    return { success: true, receipt: updated || undefined };
  }
}

export const receiptService = new ReceiptService();