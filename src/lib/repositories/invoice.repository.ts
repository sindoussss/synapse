import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // minor units (centavos)
  amount: number; // minor units (centavos)
}

export interface BillingEntity {
  businessName: string;
  representativeName?: string;
  email: string;
  phone?: string;
  address?: string;
  tin?: string;
  registrationNumber?: string;
}

export interface ClientEntity {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  opportunityId: string;
  leadId: string;
  agreementId: string;
  agreementVersion: number;
  agreementDocumentId: string;
  status: "draft" | "waiting_approval" | "approved" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "superseded";
  currency: string;
  subtotal: number; // minor units
  taxAmount: number; // minor units
  discountAmount: number; // minor units
  totalAmount: number; // minor units
  amountPaid: number; // minor units
  balanceDue: number; // minor units
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  billingEntity: BillingEntity;
  clientEntity: ClientEntity;
  lineItems: InvoiceLineItem[];
  notes?: string;
  internalNotes?: string;
  taxStatus: "unconfigured" | "exclusive" | "inclusive" | "not_applicable" | "operator_confirmed";
  taxMetadata?: Record<string, any>;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  sentAt?: string;
  paidAt?: string;
  voidedAt?: string;
  supersededAt?: string;
}

export interface InvoiceInstallmentRecord {
  id: string;
  agreementId: string;
  invoiceId?: string;
  installmentType: "deposit" | "milestone" | "final" | "custom";
  sequence: number;
  percentage: number;
  amount: number; // minor units
  trigger: string;
  status: "pending" | "invoiced" | "paid" | "cancelled";
  dueDate?: string;
  createdAt: string;
}

export interface InvoiceDocumentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  version: number;
  status: "draft" | "waiting_approval" | "approved" | "superseded";
  pdfReference: string;
  renderedHtml?: string;
  contentHash: string;
  generatedAt: string;
  approvedAt?: string;
  supersededAt?: string;
}

export interface InvoiceDeliveryRecord {
  id: string;
  invoiceId: string;
  invoiceDocumentId: string;
  recipient: string;
  provider: string;
  status: "pending_approval" | "approved" | "sending" | "sent" | "failed" | "rejected";
  providerMessageId?: string;
  providerThreadId?: string;
  subject: string;
  body: string;
  requestedAt: string;
  approvedAt?: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  opportunityId: string;
  agreementId: string;
  amount: number; // minor units
  currency: string;
  paymentMethod: "bank_transfer" | "gcash" | "maya" | "paypal" | "cash" | "other";
  paymentReference: string;
  paymentDate: string;
  status: "reported" | "pending_verification" | "verified" | "rejected" | "reversed";
  evidenceType?: string;
  evidenceReference?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export class InvoiceRepository {
  private invoicesCacheFile = path.resolve(process.cwd(), ".invoices_cache.json");
  private installmentsCacheFile = path.resolve(process.cwd(), ".invoice_installments_cache.json");
  private documentsCacheFile = path.resolve(process.cwd(), ".invoice_documents_cache.json");
  private deliveriesCacheFile = path.resolve(process.cwd(), ".invoice_deliveries_cache.json");
  private paymentsCacheFile = path.resolve(process.cwd(), ".payment_records_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch {}
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const invoices = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    const count = invoices.length + 1;
    return `INV-${year}-${count.toString().padStart(6, "0")}`;
  }

  // --- Invoices ---
  async createInvoice(invoice: InvoiceRecord): Promise<InvoiceRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoices").insert({
          id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          opportunity_id: invoice.opportunityId,
          lead_id: invoice.leadId,
          agreement_id: invoice.agreementId,
          agreement_version: invoice.agreementVersion,
          agreement_document_id: invoice.agreementDocumentId,
          status: invoice.status,
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          tax_amount: invoice.taxAmount,
          discount_amount: invoice.discountAmount,
          total_amount: invoice.totalAmount,
          amount_paid: invoice.amountPaid,
          balance_due: invoice.balanceDue,
          issue_date: invoice.issueDate,
          due_date: invoice.dueDate,
          payment_terms: invoice.paymentTerms,
          billing_entity: invoice.billingEntity,
          client_entity: invoice.clientEntity,
          line_items: invoice.lineItems,
          notes: invoice.notes,
          internal_notes: invoice.internalNotes,
          tax_status: invoice.taxStatus,
          tax_metadata: invoice.taxMetadata,
          content_hash: invoice.contentHash,
          created_at: invoice.createdAt,
          updated_at: invoice.updatedAt,
        });
      } catch {}
    }

    const cache = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    cache.unshift(invoice);
    this.writeCache(this.invoicesCacheFile, cache);
    return invoice;
  }

  async getInvoiceById(id: string): Promise<InvoiceRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoices").select("*").eq("id", id).single();
        if (data) return this.mapInvoiceDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    return cache.find((i) => i.id === id) || null;
  }

  async getInvoicesByOpportunity(opportunityId: string): Promise<InvoiceRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoices").select("*").eq("opportunity_id", opportunityId);
        if (data && data.length > 0) return data.map(this.mapInvoiceDbToRecord);
      } catch {}
    }

    const cache = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    return cache.filter((i) => i.opportunityId === opportunityId);
  }

  async getInvoicesByAgreement(agreementId: string): Promise<InvoiceRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoices").select("*").eq("agreement_id", agreementId);
        if (data && data.length > 0) return data.map(this.mapInvoiceDbToRecord);
      } catch {}
    }

    const cache = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    return cache.filter((i) => i.agreementId === agreementId);
  }

  async getAllInvoices(): Promise<InvoiceRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) return data.map(this.mapInvoiceDbToRecord);
      } catch {}
    }

    return this.readCache<InvoiceRecord>(this.invoicesCacheFile);
  }

  async updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord | null> {
    const now = new Date().toISOString();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoices").update({
          status: updates.status,
          amount_paid: updates.amountPaid,
          balance_due: updates.balanceDue,
          approved_at: updates.approvedAt,
          sent_at: updates.sentAt,
          paid_at: updates.paidAt,
          voided_at: updates.voidedAt,
          superseded_at: updates.supersededAt,
          updated_at: now,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<InvoiceRecord>(this.invoicesCacheFile);
    const idx = cache.findIndex((i) => i.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates, updatedAt: now };
      this.writeCache(this.invoicesCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Documents ---
  async createInvoiceDocument(doc: InvoiceDocumentRecord): Promise<InvoiceDocumentRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoice_documents").insert({
          id: doc.id,
          invoice_id: doc.invoiceId,
          invoice_number: doc.invoiceNumber,
          version: doc.version,
          status: doc.status,
          pdf_reference: doc.pdfReference,
          rendered_html: doc.renderedHtml,
          content_hash: doc.contentHash,
          generated_at: doc.generatedAt,
        });
      } catch {}
    }

    const cache = this.readCache<InvoiceDocumentRecord>(this.documentsCacheFile);
    cache.unshift(doc);
    this.writeCache(this.documentsCacheFile, cache);
    return doc;
  }

  async getInvoiceDocumentById(id: string): Promise<InvoiceDocumentRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoice_documents").select("*").eq("id", id).single();
        if (data) return this.mapDocDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<InvoiceDocumentRecord>(this.documentsCacheFile);
    return cache.find((d) => d.id === id) || null;
  }

  async getDocumentsByInvoice(invoiceId: string): Promise<InvoiceDocumentRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoice_documents").select("*").eq("invoice_id", invoiceId);
        if (data && data.length > 0) return data.map(this.mapDocDbToRecord);
      } catch {}
    }

    const cache = this.readCache<InvoiceDocumentRecord>(this.documentsCacheFile);
    return cache.filter((d) => d.invoiceId === invoiceId);
  }

  async updateInvoiceDocument(id: string, updates: Partial<InvoiceDocumentRecord>): Promise<InvoiceDocumentRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoice_documents").update({
          status: updates.status,
          approved_at: updates.approvedAt,
          superseded_at: updates.supersededAt,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<InvoiceDocumentRecord>(this.documentsCacheFile);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.documentsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Deliveries ---
  async createInvoiceDelivery(delivery: InvoiceDeliveryRecord): Promise<InvoiceDeliveryRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoice_deliveries").insert({
          id: delivery.id,
          invoice_id: delivery.invoiceId,
          invoice_document_id: delivery.invoiceDocumentId,
          recipient: delivery.recipient,
          provider: delivery.provider,
          status: delivery.status,
          provider_message_id: delivery.providerMessageId,
          provider_thread_id: delivery.providerThreadId,
          subject: delivery.subject,
          body: delivery.body,
          requested_at: delivery.requestedAt,
          created_at: delivery.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<InvoiceDeliveryRecord>(this.deliveriesCacheFile);
    cache.unshift(delivery);
    this.writeCache(this.deliveriesCacheFile, cache);
    return delivery;
  }

  async getInvoiceDeliveryById(id: string): Promise<InvoiceDeliveryRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoice_deliveries").select("*").eq("id", id).single();
        if (data) return this.mapDeliveryDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<InvoiceDeliveryRecord>(this.deliveriesCacheFile);
    return cache.find((d) => d.id === id) || null;
  }

  async getDeliveriesByInvoice(invoiceId: string): Promise<InvoiceDeliveryRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("invoice_deliveries").select("*").eq("invoice_id", invoiceId);
        if (data && data.length > 0) return data.map(this.mapDeliveryDbToRecord);
      } catch {}
    }

    const cache = this.readCache<InvoiceDeliveryRecord>(this.deliveriesCacheFile);
    return cache.filter((d) => d.invoiceId === invoiceId);
  }

  async updateInvoiceDelivery(id: string, updates: Partial<InvoiceDeliveryRecord>): Promise<InvoiceDeliveryRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("invoice_deliveries").update({
          status: updates.status,
          provider_message_id: updates.providerMessageId,
          provider_thread_id: updates.providerThreadId,
          approved_at: updates.approvedAt,
          sent_at: updates.sentAt,
          failed_at: updates.failedAt,
          error: updates.error,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<InvoiceDeliveryRecord>(this.deliveriesCacheFile);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.deliveriesCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Payments ---
  async createPaymentRecord(payment: PaymentRecord): Promise<PaymentRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("payment_records").insert({
          id: payment.id,
          invoice_id: payment.invoiceId,
          opportunity_id: payment.opportunityId,
          agreement_id: payment.agreementId,
          amount: payment.amount,
          currency: payment.currency,
          payment_method: payment.paymentMethod,
          payment_reference: payment.paymentReference,
          payment_date: payment.paymentDate,
          status: payment.status,
          evidence_type: payment.evidenceType,
          evidence_reference: payment.evidenceReference,
          notes: payment.notes,
          recorded_by: payment.recordedBy,
          recorded_at: payment.recordedAt,
        });
      } catch {}
    }

    const cache = this.readCache<PaymentRecord>(this.paymentsCacheFile);
    cache.unshift(payment);
    this.writeCache(this.paymentsCacheFile, cache);
    return payment;
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_records").select("*").eq("id", id).single();
        if (data) return this.mapPaymentDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<PaymentRecord>(this.paymentsCacheFile);
    return cache.find((p) => p.id === id) || null;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_records").select("*").eq("invoice_id", invoiceId);
        if (data && data.length > 0) return data.map(this.mapPaymentDbToRecord);
      } catch {}
    }

    const cache = this.readCache<PaymentRecord>(this.paymentsCacheFile);
    return cache.filter((p) => p.invoiceId === invoiceId);
  }

  async getAllPayments(): Promise<PaymentRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_records").select("*").order("recorded_at", { ascending: false });
        if (data && data.length > 0) return data.map(this.mapPaymentDbToRecord);
      } catch {}
    }

    return this.readCache<PaymentRecord>(this.paymentsCacheFile);
  }

  async updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("payment_records").update({
          status: updates.status,
          verified_by: updates.verifiedBy,
          verified_at: updates.verifiedAt,
          rejected_at: updates.rejectedAt,
          rejection_reason: updates.rejectionReason,
          reversed_at: updates.reversedAt,
          reversal_reason: updates.reversalReason,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<PaymentRecord>(this.paymentsCacheFile);
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.paymentsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Mappers ---
  private mapInvoiceDbToRecord(db: any): InvoiceRecord {
    return {
      id: db.id,
      invoiceNumber: db.invoice_number,
      opportunityId: db.opportunity_id,
      leadId: db.lead_id,
      agreementId: db.agreement_id,
      agreementVersion: db.agreement_version,
      agreementDocumentId: db.agreement_document_id,
      status: db.status,
      currency: db.currency || "PHP",
      subtotal: Number(db.subtotal),
      taxAmount: Number(db.tax_amount || 0),
      discountAmount: Number(db.discount_amount || 0),
      totalAmount: Number(db.total_amount),
      amountPaid: Number(db.amount_paid || 0),
      balanceDue: Number(db.balance_due),
      issueDate: db.issue_date,
      dueDate: db.due_date,
      paymentTerms: db.payment_terms,
      billingEntity: db.billing_entity || {},
      clientEntity: db.client_entity || {},
      lineItems: db.line_items || [],
      notes: db.notes,
      internalNotes: db.internal_notes,
      taxStatus: db.tax_status,
      taxMetadata: db.tax_metadata,
      contentHash: db.content_hash,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      approvedAt: db.approved_at,
      sentAt: db.sent_at,
      paidAt: db.paid_at,
      voidedAt: db.voided_at,
      supersededAt: db.superseded_at,
    };
  }

  private mapDocDbToRecord(db: any): InvoiceDocumentRecord {
    return {
      id: db.id,
      invoiceId: db.invoice_id,
      invoiceNumber: db.invoice_number,
      version: db.version,
      status: db.status,
      pdfReference: db.pdf_reference,
      renderedHtml: db.rendered_html,
      contentHash: db.content_hash,
      generatedAt: db.generated_at,
      approvedAt: db.approved_at,
      supersededAt: db.superseded_at,
    };
  }

  private mapDeliveryDbToRecord(db: any): InvoiceDeliveryRecord {
    return {
      id: db.id,
      invoiceId: db.invoice_id,
      invoiceDocumentId: db.invoice_document_id,
      recipient: db.recipient,
      provider: db.provider,
      status: db.status,
      providerMessageId: db.provider_message_id,
      providerThreadId: db.provider_thread_id,
      subject: db.subject,
      body: db.body,
      requestedAt: db.requested_at,
      approvedAt: db.approved_at,
      sentAt: db.sent_at,
      failedAt: db.failed_at,
      error: db.error,
      createdAt: db.created_at,
    };
  }

  private mapPaymentDbToRecord(db: any): PaymentRecord {
    return {
      id: db.id,
      invoiceId: db.invoice_id,
      opportunityId: db.opportunity_id,
      agreementId: db.agreement_id,
      amount: Number(db.amount),
      currency: db.currency || "PHP",
      paymentMethod: db.payment_method,
      paymentReference: db.payment_reference,
      paymentDate: db.payment_date,
      status: db.status,
      evidenceType: db.evidence_type,
      evidenceReference: db.evidence_reference,
      notes: db.notes,
      recordedBy: db.recorded_by,
      recordedAt: db.recorded_at,
      verifiedBy: db.verified_by,
      verifiedAt: db.verified_at,
      rejectedAt: db.rejected_at,
      rejectionReason: db.rejection_reason,
      reversedAt: db.reversed_at,
      reversalReason: db.reversal_reason,
    };
  }
}

export const invoiceRepository = new InvoiceRepository();