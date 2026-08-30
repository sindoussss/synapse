import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface PaymentRequestRecord {
  id: string;
  invoiceId: string;
  opportunityId: string;
  agreementId: string;
  provider: "paypal";
  providerRequestId?: string; // PayPal Order ID
  currency: string;
  amountMinorUnits: number; // in centavos
  status: "draft" | "pending_approval" | "approved" | "active" | "completed" | "expired" | "cancelled" | "failed";
  checkoutUrl?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  metadata: Record<string, any>;
}

export interface PaymentTransactionRecord {
  id: string;
  paymentRequestId: string;
  invoiceId: string;
  provider: "paypal";
  providerOrderId: string;
  providerTransactionId?: string; // PayPal Capture ID
  providerEventId?: string; // Webhook event ID for idempotency
  currency: string;
  amountMinorUnits: number; // in centavos
  status: "pending" | "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded" | "disputed";
  providerCreatedAt?: string;
  providerConfirmedAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class PaymentRequestRepository {
  private requestsCacheFile = path.resolve(process.cwd(), ".payment_requests_cache.json");
  private transactionsCacheFile = path.resolve(process.cwd(), ".payment_transactions_cache.json");

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

  // --- Payment Requests ---
  async createPaymentRequest(req: PaymentRequestRecord): Promise<PaymentRequestRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("payment_requests").insert({
          id: req.id,
          invoice_id: req.invoiceId,
          opportunity_id: req.opportunityId,
          agreement_id: req.agreementId,
          provider: req.provider,
          provider_request_id: req.providerRequestId,
          currency: req.currency,
          amount_minor_units: req.amountMinorUnits,
          status: req.status,
          checkout_url: req.checkoutUrl,
          expires_at: req.expiresAt,
          created_by: req.createdBy,
          created_at: req.createdAt,
          metadata: req.metadata,
        });
      } catch {}
    }

    const cache = this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
    cache.unshift(req);
    this.writeCache(this.requestsCacheFile, cache);
    return req;
  }

  async getPaymentRequestById(id: string): Promise<PaymentRequestRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_requests").select("*").eq("id", id).single();
        if (data) return this.mapRequestDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
    return cache.find((r) => r.id === id) || null;
  }

  async getPaymentRequestByOrderId(orderId: string): Promise<PaymentRequestRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_requests").select("*").eq("provider_request_id", orderId).single();
        if (data) return this.mapRequestDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
    return cache.find((r) => r.providerRequestId === orderId) || null;
  }

  async getPaymentRequestsByInvoice(invoiceId: string): Promise<PaymentRequestRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_requests").select("*").eq("invoice_id", invoiceId);
        if (data && data.length > 0) return data.map(this.mapRequestDbToRecord);
      } catch {}
    }

    const cache = this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
    return cache.filter((r) => r.invoiceId === invoiceId);
  }

  async getAllPaymentRequests(): Promise<PaymentRequestRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) return data.map(this.mapRequestDbToRecord);
      } catch {}
    }

    return this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
  }

  async updatePaymentRequest(id: string, updates: Partial<PaymentRequestRecord>): Promise<PaymentRequestRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("payment_requests").update({
          status: updates.status,
          provider_request_id: updates.providerRequestId,
          checkout_url: updates.checkoutUrl,
          approved_at: updates.approvedAt,
          completed_at: updates.completedAt,
          cancelled_at: updates.cancelledAt,
          failed_at: updates.failedAt,
          metadata: updates.metadata,
        }).eq("id", id);
      } catch {}
    }

    const cache = this.readCache<PaymentRequestRecord>(this.requestsCacheFile);
    const idx = cache.findIndex((r) => r.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.requestsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Payment Transactions ---
  async createPaymentTransaction(tx: PaymentTransactionRecord): Promise<PaymentTransactionRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("payment_transactions").insert({
          id: tx.id,
          payment_request_id: tx.paymentRequestId,
          invoice_id: tx.invoiceId,
          provider: tx.provider,
          provider_order_id: tx.providerOrderId,
          provider_transaction_id: tx.providerTransactionId,
          provider_event_id: tx.providerEventId,
          currency: tx.currency,
          amount_minor_units: tx.amountMinorUnits,
          status: tx.status,
          provider_created_at: tx.providerCreatedAt,
          provider_confirmed_at: tx.providerConfirmedAt,
          metadata: tx.metadata,
          created_at: tx.createdAt,
          updated_at: tx.updatedAt,
        });
      } catch {}
    }

    const cache = this.readCache<PaymentTransactionRecord>(this.transactionsCacheFile);
    cache.unshift(tx);
    this.writeCache(this.transactionsCacheFile, cache);
    return tx;
  }

  async getTransactionByEventId(eventId: string): Promise<PaymentTransactionRecord | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_transactions").select("*").eq("provider_event_id", eventId).single();
        if (data) return this.mapTransactionDbToRecord(data);
      } catch {}
    }

    const cache = this.readCache<PaymentTransactionRecord>(this.transactionsCacheFile);
    return cache.find((t) => t.providerEventId === eventId) || null;
  }

  async getTransactionsByInvoice(invoiceId: string): Promise<PaymentTransactionRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_transactions").select("*").eq("invoice_id", invoiceId);
        if (data && data.length > 0) return data.map(this.mapTransactionDbToRecord);
      } catch {}
    }

    const cache = this.readCache<PaymentTransactionRecord>(this.transactionsCacheFile);
    return cache.filter((t) => t.invoiceId === invoiceId);
  }

  async getAllTransactions(): Promise<PaymentTransactionRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) return data.map(this.mapTransactionDbToRecord);
      } catch {}
    }

    return this.readCache<PaymentTransactionRecord>(this.transactionsCacheFile);
  }

  private mapRequestDbToRecord(db: any): PaymentRequestRecord {
    return {
      id: db.id,
      invoiceId: db.invoice_id,
      opportunityId: db.opportunity_id,
      agreementId: db.agreement_id,
      provider: db.provider || "paypal",
      providerRequestId: db.provider_request_id,
      currency: db.currency || "PHP",
      amountMinorUnits: Number(db.amount_minor_units),
      status: db.status,
      checkoutUrl: db.checkout_url,
      expiresAt: db.expires_at,
      createdBy: db.created_by,
      createdAt: db.created_at,
      approvedAt: db.approved_at,
      completedAt: db.completed_at,
      cancelledAt: db.cancelled_at,
      failedAt: db.failed_at,
      metadata: db.metadata || {},
    };
  }

  private mapTransactionDbToRecord(db: any): PaymentTransactionRecord {
    return {
      id: db.id,
      paymentRequestId: db.payment_request_id,
      invoiceId: db.invoice_id,
      provider: db.provider || "paypal",
      providerOrderId: db.provider_order_id,
      providerTransactionId: db.provider_transaction_id,
      providerEventId: db.provider_event_id,
      currency: db.currency || "PHP",
      amountMinorUnits: Number(db.amount_minor_units),
      status: db.status,
      providerCreatedAt: db.provider_created_at,
      providerConfirmedAt: db.provider_confirmed_at,
      metadata: db.metadata || {},
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}

export const paymentRequestRepository = new PaymentRequestRepository();