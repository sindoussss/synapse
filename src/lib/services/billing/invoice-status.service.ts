import {
  billingRepository,
  InvoiceRecord,
  InvoiceStatus,
  PaymentLedgerEntryRecord,
} from "../../repositories/billing.repository";

export class InvoiceStatusService {
  calculateAuthoritativeStatus(invoiceId: string, callerOrgId?: string): InvoiceStatus {
    const invoice = billingRepository.getInvoice(invoiceId, callerOrgId);
    if (!invoice) return "RECONCILIATION_REQUIRED";

    if (invoice.status === "VOID" || invoice.status === "CANCELLED" || invoice.status === "SUPERSEDED") {
      return invoice.status;
    }

    const ledger = billingRepository.listLedgerEntries({ invoiceId });

    // Check for open disputes
    if (ledger.some((l) => l.entryType === "DISPUTE" || l.verificationState === "DISPUTED")) {
      return "DISPUTED";
    }

    // Check for reversals
    if (ledger.some((l) => l.entryType === "REVERSAL" || l.verificationState === "REVERSED")) {
      return "RECONCILIATION_REQUIRED";
    }

    // Compute net verified amount from ledger
    let verifiedPaidMinor = 0;
    let verifiedRefundedMinor = 0;

    for (const entry of ledger) {
      if (entry.entryType === "PAYMENT" && (entry.verificationState === "VERIFIED" || entry.verificationState === "PARTIALLY_VERIFIED")) {
        verifiedPaidMinor += entry.amountMinor;
      } else if (entry.entryType === "REFUND" && entry.verificationState === "REFUNDED") {
        verifiedRefundedMinor += entry.amountMinor;
      }
    }

    if (verifiedRefundedMinor > 0 && verifiedRefundedMinor >= verifiedPaidMinor) {
      return "REFUNDED";
    }

    const netPaid = verifiedPaidMinor - verifiedRefundedMinor;
    const balanceDue = invoice.totalMinor - netPaid;

    if (balanceDue <= 0 && verifiedPaidMinor > 0) {
      return "FULLY_PAID";
    }

    if (netPaid > 0 && balanceDue > 0) {
      return "PARTIALLY_PAID";
    }

    // Overdue evaluation (only if known due date exists and is in the past)
    if (invoice.dueAt) {
      const dueDate = new Date(invoice.dueAt).getTime();
      const now = Date.now();
      if (now > dueDate && balanceDue > 0) {
        return "OVERDUE";
      }
    }

    return invoice.issuedAt ? "ISSUED" : "DRAFT";
  }
}

export const invoiceStatusService = new InvoiceStatusService();