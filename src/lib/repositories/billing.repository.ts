import fs from "fs";
import path from "path";
import crypto from "crypto";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "OVERDUE"
  | "REFUNDED"
  | "DISPUTED"
  | "VOID"
  | "CANCELLED"
  | "SUPERSEDED"
  | "RECONCILIATION_REQUIRED";

export type MilestoneStatus =
  | "PLANNED"
  | "READY"
  | "INVOICED"
  | "PAID"
  | "BLOCKED"
  | "CANCELLED";

export type MilestoneTrigger =
  | "PROJECT_START"
  | "CLIENT_APPROVAL"
  | "DEVELOPMENT_COMPLETE"
  | "QA_COMPLETE"
  | "DEPLOYMENT"
  | "FINAL_DELIVERY";

export type LedgerEntryType = "PAYMENT" | "REFUND" | "REVERSAL" | "DISPUTE" | "ADJUSTMENT";

export type LedgerVerificationState =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "MISMATCH"
  | "REVERSED"
  | "REFUNDED"
  | "DISPUTED"
  | "UNKNOWN";

export type ReceiptStatus = "GENERATED" | "VERIFIED" | "REVOKED";

export interface InvoiceLineItemRecord {
  lineItemId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  subtotalMinor: number;
  source: "APPROVED_PROPOSAL" | "PRICING_CATALOGUE" | "OPERATOR_OVERRIDE";
  evidenceIds: string[];
}

export interface BillingMilestoneRecord {
  milestoneId: string;
  projectId: string;
  invoiceId?: string;
  name: string;
  amountMinor: number;
  sequence: number;
  status: MilestoneStatus;
  triggerType: MilestoneTrigger;
  evidenceIds: string[];
  dueAt?: string;
}

export interface InvoiceRecord {
  invoiceId: string;
  organizationId: string;
  projectId: string;
  clientId: string;
  opportunityId?: string;
  proposalId?: string;
  agreementId?: string;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  paidMinor: number;
  refundedMinor: number;
  balanceDueMinor: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItemRecord[];
  dueAt?: string;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLedgerEntryRecord {
  ledgerEntryId: string;
  organizationId: string;
  projectId: string;
  clientId: string;
  invoiceId: string;
  provider: "PAYPAL" | "BANK_TRANSFER" | "STRIPE" | "MANUAL";
  providerTransactionId: string;
  entryType: LedgerEntryType;
  amountMinor: number;
  currency: string;
  environment: "LIVE" | "SANDBOX" | "CONTROLLED_TEST";
  verificationState: LedgerVerificationState;
  sourceEventId?: string;
  createdAt: string;
}

export interface ReceiptRecord {
  receiptId: string;
  organizationId: string;
  projectId: string;
  clientId: string;
  invoiceId: string;
  ledgerEntryId: string;
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  verificationState: LedgerVerificationState;
  paymentDate: string;
  status: ReceiptStatus;
  createdAt: string;
}

export class BillingRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "billing-ledger.json");

  private invoices: InvoiceRecord[] = [];
  private milestones: BillingMilestoneRecord[] = [];
  private ledger: PaymentLedgerEntryRecord[] = [];
  private receipts: ReceiptRecord[] = [];

  constructor() {
    this.loadState();
    if (this.invoices.length === 0) {
      this.seedInitialBilling();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.invoices = raw.invoices || [];
        this.milestones = raw.milestones || [];
        this.ledger = raw.ledger || [];
        this.receipts = raw.receipts || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        invoices: this.invoices,
        milestones: this.milestones,
        ledger: this.ledger,
        receipts: this.receipts,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  private seedInitialBilling(): void {
    const orgId = "ORG-CASILI-01";
    const projId = "PRJ-SINDOUS-01";
    const clientId = "client_sindous";
    const now = "2026-08-30T08:00:00.000Z";

    const invId = "INV-2026-001";
    const lineItem1: InvoiceLineItemRecord = {
      lineItemId: "LI-001",
      invoiceId: invId,
      description: "Full Web Modernization + AI Architecture",
      quantity: 1,
      unitPriceMinor: 8800000, // PHP 88,000.00
      subtotalMinor: 8800000,
      source: "APPROVED_PROPOSAL",
      evidenceIds: ["PROP-EV-001"],
    };

    const invoice: InvoiceRecord = {
      invoiceId: invId,
      organizationId: orgId,
      projectId: projId,
      clientId,
      opportunityId: "OPP-SINDOUS-01",
      proposalId: "PROP-SINDOUS-01",
      agreementId: "AGR-SINDOUS-01",
      currency: "PHP",
      subtotalMinor: 8800000,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor: 8800000,
      paidMinor: 8800000,
      refundedMinor: 0,
      balanceDueMinor: 0,
      status: "FULLY_PAID",
      lineItems: [lineItem1],
      issuedAt: now,
      dueAt: "2026-09-15T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    };

    const milestoneDeposit: BillingMilestoneRecord = {
      milestoneId: "MS-001",
      projectId: projId,
      invoiceId: invId,
      name: "Deposit (40%)",
      amountMinor: 3520000, // PHP 35,200.00
      sequence: 1,
      status: "PAID",
      triggerType: "PROJECT_START",
      evidenceIds: ["PAY-DEP-EV-01"],
    };

    const milestoneFinal: BillingMilestoneRecord = {
      milestoneId: "MS-002",
      projectId: projId,
      invoiceId: invId,
      name: "Final Balance (60%)",
      amountMinor: 5280000, // PHP 52,800.00
      sequence: 2,
      status: "PAID",
      triggerType: "FINAL_DELIVERY",
      evidenceIds: ["PAY-FIN-EV-01"],
    };

    const ledgerDeposit: PaymentLedgerEntryRecord = {
      ledgerEntryId: "LEDG-001",
      organizationId: orgId,
      projectId: projId,
      clientId,
      invoiceId: invId,
      provider: "PAYPAL",
      providerTransactionId: "TXN-PP-DEP-001",
      entryType: "PAYMENT",
      amountMinor: 3520000,
      currency: "PHP",
      environment: "LIVE",
      verificationState: "VERIFIED",
      createdAt: now,
    };

    const ledgerFinal: PaymentLedgerEntryRecord = {
      ledgerEntryId: "LEDG-002",
      organizationId: orgId,
      projectId: projId,
      clientId,
      invoiceId: invId,
      provider: "PAYPAL",
      providerTransactionId: "TXN-PP-FIN-002",
      entryType: "PAYMENT",
      amountMinor: 5280000,
      currency: "PHP",
      environment: "LIVE",
      verificationState: "VERIFIED",
      createdAt: now,
    };

    const receipt: ReceiptRecord = {
      receiptId: "REC-2026-001",
      organizationId: orgId,
      projectId: projId,
      clientId,
      invoiceId: invId,
      ledgerEntryId: "LEDG-002",
      providerTransactionId: "TXN-PP-FIN-002",
      amountMinor: 8800000,
      currency: "PHP",
      verificationState: "VERIFIED",
      paymentDate: now,
      status: "VERIFIED",
      createdAt: now,
    };

    this.invoices = [invoice];
    this.milestones = [milestoneDeposit, milestoneFinal];
    this.ledger = [ledgerDeposit, ledgerFinal];
    this.receipts = [receipt];

    this.saveState();
  }

  // --- Invoices ---
  createInvoice(inv: Omit<InvoiceRecord, "createdAt" | "updatedAt">): InvoiceRecord {
    const now = new Date().toISOString();
    const record: InvoiceRecord = {
      ...inv,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.push(record);
    this.saveState();
    return { ...record };
  }

  getInvoice(invoiceId: string, callerOrgId?: string): InvoiceRecord | null {
    const inv = this.invoices.find((i) => i.invoiceId === invoiceId);
    if (!inv) return null;
    if (callerOrgId && inv.organizationId !== callerOrgId) return null;
    return { ...inv };
  }

  listInvoices(filter?: {
    organizationId?: string;
    projectId?: string;
    clientId?: string;
    status?: InvoiceStatus;
    currency?: string;
  }): InvoiceRecord[] {
    return this.invoices
      .filter((i) => {
        if (filter?.organizationId && i.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && i.projectId !== filter.projectId) return false;
        if (filter?.clientId && i.clientId !== filter.clientId) return false;
        if (filter?.status && i.status !== filter.status) return false;
        if (filter?.currency && i.currency !== filter.currency) return false;
        return true;
      })
      .map((i) => ({ ...i }));
  }

  updateInvoice(invoiceId: string, updates: Partial<InvoiceRecord>, actorRole: string): InvoiceRecord {
    if (actorRole === "AI_AGENT") {
      throw new Error("UNAUTHORIZED_AI_MUTATION: Autonomous AI cannot modify authoritative billing records.");
    }
    const idx = this.invoices.findIndex((i) => i.invoiceId === invoiceId);
    if (idx === -1) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Invoice immutability rule: Once ISSUED, critical commercial amounts cannot be changed directly
    if (
      this.invoices[idx].status === "ISSUED" &&
      (updates.totalMinor !== undefined || updates.subtotalMinor !== undefined)
    ) {
      throw new Error("INVOICE_IMMUTABILITY_VIOLATION: Issued invoices cannot modify commercial amounts. Issue a revision.");
    }

    this.invoices[idx] = {
      ...this.invoices[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return { ...this.invoices[idx] };
  }

  // --- Milestones ---
  addMilestone(m: BillingMilestoneRecord): BillingMilestoneRecord {
    this.milestones.push({ ...m });
    this.saveState();
    return { ...m };
  }

  listMilestones(projectId: string): BillingMilestoneRecord[] {
    return this.milestones.filter((m) => m.projectId === projectId).map((m) => ({ ...m }));
  }

  // --- Ledger (Append-Only) ---
  addLedgerEntry(entry: Omit<PaymentLedgerEntryRecord, "ledgerEntryId" | "createdAt">): PaymentLedgerEntryRecord {
    const now = new Date().toISOString();
    const id = `LEDG-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: PaymentLedgerEntryRecord = {
      ...entry,
      ledgerEntryId: id,
      createdAt: now,
    };
    this.ledger.push(record);
    this.saveState();
    return { ...record };
  }

  listLedgerEntries(filter?: {
    organizationId?: string;
    projectId?: string;
    clientId?: string;
    invoiceId?: string;
  }): PaymentLedgerEntryRecord[] {
    return this.ledger
      .filter((l) => {
        if (filter?.organizationId && l.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && l.projectId !== filter.projectId) return false;
        if (filter?.clientId && l.clientId !== filter.clientId) return false;
        if (filter?.invoiceId && l.invoiceId !== filter.invoiceId) return false;
        return true;
      })
      .map((l) => ({ ...l }));
  }

  // --- Receipts ---
  createReceipt(r: Omit<ReceiptRecord, "receiptId" | "createdAt">): ReceiptRecord {
    const now = new Date().toISOString();
    const id = `REC-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ReceiptRecord = {
      ...r,
      receiptId: id,
      createdAt: now,
    };
    this.receipts.push(record);
    this.saveState();
    return { ...record };
  }

  getReceipt(receiptId: string, callerOrgId?: string): ReceiptRecord | null {
    const r = this.receipts.find((x) => x.receiptId === receiptId);
    if (!r) return null;
    if (callerOrgId && r.organizationId !== callerOrgId) return null;
    return { ...r };
  }

  listReceipts(filter?: { organizationId?: string; projectId?: string; invoiceId?: string }): ReceiptRecord[] {
    return this.receipts
      .filter((r) => {
        if (filter?.organizationId && r.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && r.projectId !== filter.projectId) return false;
        if (filter?.invoiceId && r.invoiceId !== filter.invoiceId) return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }

  updateReceiptStatus(receiptId: string, status: ReceiptStatus): ReceiptRecord | null {
    const idx = this.receipts.findIndex((r) => r.receiptId === receiptId);
    if (idx === -1) return null;
    this.receipts[idx].status = status;
    this.saveState();
    return { ...this.receipts[idx] };
  }
}

export const billingRepository = new BillingRepository();