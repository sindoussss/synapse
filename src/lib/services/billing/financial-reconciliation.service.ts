import {
  billingRepository,
  InvoiceRecord,
  PaymentLedgerEntryRecord,
} from "../../repositories/billing.repository";

export interface CurrencyFinancialSummary {
  currency: string;
  invoiceCount: number;
  totalInvoicedMinor: number;
  totalVerifiedReceivedMinor: number;
  totalOutstandingMinor: number;
  totalRefundedMinor: number;
  totalDisputedMinor: number;
}

export interface FinancialReconciliationReport {
  organizationId: string;
  reconciliationStatus: "MATCHED" | "MISMATCH" | "MISSING_EVIDENCE" | "UNKNOWN";
  summariesByCurrency: CurrencyFinancialSummary[];
  mismatchesDetected: {
    invoiceId: string;
    projectId: string;
    expectedBalanceMinor: number;
    recordedBalanceMinor: number;
    reason: string;
  }[];
  generatedAt: string;
}

export class FinancialReconciliationService {
  generateReconciliationReport(organizationId: string): FinancialReconciliationReport {
    const invoices = billingRepository.listInvoices({ organizationId });
    const ledger = billingRepository.listLedgerEntries({ organizationId });

    const currencyMap: Record<string, CurrencyFinancialSummary> = {};
    const mismatches: FinancialReconciliationReport["mismatchesDetected"] = [];

    for (const inv of invoices) {
      if (!currencyMap[inv.currency]) {
        currencyMap[inv.currency] = {
          currency: inv.currency,
          invoiceCount: 0,
          totalInvoicedMinor: 0,
          totalVerifiedReceivedMinor: 0,
          totalOutstandingMinor: 0,
          totalRefundedMinor: 0,
          totalDisputedMinor: 0,
        };
      }

      const summ = currencyMap[inv.currency];
      summ.invoiceCount += 1;
      summ.totalInvoicedMinor += inv.totalMinor;

      // Compute ledger values for this specific invoice
      const invLedger = ledger.filter((l) => l.invoiceId === inv.invoiceId);
      let invPaidMinor = 0;
      let invRefundedMinor = 0;
      let invDisputedMinor = 0;

      for (const entry of invLedger) {
        if (entry.entryType === "PAYMENT" && (entry.verificationState === "VERIFIED" || entry.verificationState === "PARTIALLY_VERIFIED")) {
          invPaidMinor += entry.amountMinor;
        } else if (entry.entryType === "REFUND") {
          invRefundedMinor += entry.amountMinor;
        } else if (entry.entryType === "DISPUTE") {
          invDisputedMinor += entry.amountMinor;
        }
      }

      summ.totalVerifiedReceivedMinor += invPaidMinor - invRefundedMinor;
      summ.totalOutstandingMinor += Math.max(0, inv.totalMinor - (invPaidMinor - invRefundedMinor));
      summ.totalRefundedMinor += invRefundedMinor;
      summ.totalDisputedMinor += invDisputedMinor;

      // Audit balance consistency
      const expectedBalance = inv.totalMinor - invPaidMinor + invRefundedMinor;
      if (inv.balanceDueMinor !== expectedBalance && inv.status !== "VOID" && inv.status !== "CANCELLED") {
        mismatches.push({
          invoiceId: inv.invoiceId,
          projectId: inv.projectId,
          expectedBalanceMinor: expectedBalance,
          recordedBalanceMinor: inv.balanceDueMinor,
          reason: `LEDGER_INVOICE_MISMATCH: Invoice balanceDueMinor (${inv.balanceDueMinor}) differs from ledger calculation (${expectedBalance}).`,
        });
      }
    }

    const reconciliationStatus =
      mismatches.length === 0 ? "MATCHED" : "MISMATCH";

    return {
      organizationId,
      reconciliationStatus,
      summariesByCurrency: Object.values(currencyMap),
      mismatchesDetected: mismatches,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const financialReconciliationService = new FinancialReconciliationService();