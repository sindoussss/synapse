import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type AgreementDocumentStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "signing_active"
  | "completed"
  | "superseded";

export interface AgreementDocumentRecord {
  id: string;
  agreementId: string;
  agreementVersion: number;
  opportunityId: string;
  leadId: string;
  documentVersion: number;
  status: AgreementDocumentStatus;
  renderedHtml?: string;
  pdfReference: string;
  contentHash: string;
  generatedAt: string;
  approvedAt?: string | null;
  signingStartedAt?: string | null;
  supersededAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AgreementDeliveryStatus =
  | "pending_approval"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "rejected";

export interface AgreementDeliveryRecord {
  id: string;
  agreementId: string;
  agreementDocumentId: string;
  opportunityId: string;
  leadId: string;
  provider: string;
  recipient: string;
  subject: string;
  message: string;
  status: AgreementDeliveryStatus;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SigningSessionStatus =
  | "draft"
  | "pending_delivery"
  | "awaiting_client"
  | "awaiting_operator"
  | "completed"
  | "declined"
  | "expired"
  | "cancelled"
  | "failed";

export interface SignerInfo {
  role: "client" | "operator";
  name: string;
  email: string;
  company: string;
  signedAt?: string | null;
  status: "pending" | "viewed" | "signed" | "declined";
}

export interface SigningSessionRecord {
  id: string;
  agreementId: string;
  agreementDocumentId: string;
  opportunityId: string;
  provider: string;
  providerRequestId: string;
  status: SigningSessionStatus;
  documentHash: string;
  requiredSigners: SignerInfo[];
  completedSigners: SignerInfo[];
  signingUrlReference?: string | null;
  clientSignedAt?: string | null;
  operatorSignedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureEventRecord {
  id: string;
  signingSessionId: string;
  agreementId: string;
  agreementDocumentId: string;
  signerEmail: string;
  signerRole: string;
  eventType: "signing_request_sent" | "viewed" | "signed" | "declined" | "expired" | "completed";
  providerEventId: string;
  providerTimestamp: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const DOCS_CACHE = path.resolve(process.cwd(), ".agreement_documents_cache.json");
const DELIVERIES_CACHE = path.resolve(process.cwd(), ".agreement_deliveries_cache.json");
const SIGNING_CACHE = path.resolve(process.cwd(), ".signing_sessions_cache.json");
const EVENTS_CACHE = path.resolve(process.cwd(), ".signature_events_cache.json");

export class SupabaseAgreementDeliveryRepository {
  // Helper loaders
  private getCached<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch {}
    return [];
  }

  private saveCached<T>(file: string, items: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  // --- Document Operations ---
  async createDocument(input: Omit<AgreementDocumentRecord, "id" | "createdAt" | "updatedAt">): Promise<AgreementDocumentRecord> {
    const nextId = `AGR-DOC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: AgreementDocumentRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getCached<AgreementDocumentRecord>(DOCS_CACHE);
    cached.unshift(record);
    this.saveCached(DOCS_CACHE, cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      await supabase.from("agreement_documents").insert({
        id: nextId,
        agreement_id: input.agreementId,
        agreement_version: input.agreementVersion,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        document_version: input.documentVersion,
        status: input.status,
        rendered_html: input.renderedHtml,
        pdf_reference: input.pdfReference,
        content_hash: input.contentHash,
        generated_at: input.generatedAt,
        created_at: now,
        updated_at: now,
      });
    }

    return record;
  }

  async getDocumentById(id: string): Promise<AgreementDocumentRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("agreement_documents").select("*").eq("id", id).single();
      if (!error && data) return this.mapDocFromDb(data);
    }
    return this.getCached<AgreementDocumentRecord>(DOCS_CACHE).find((d) => d.id === id) || null;
  }

  async getDocumentsByAgreementId(agreementId: string): Promise<AgreementDocumentRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("agreement_documents")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("document_version", { ascending: false });
      if (!error && data && data.length > 0) return data.map(this.mapDocFromDb);
    }
    return this.getCached<AgreementDocumentRecord>(DOCS_CACHE).filter((d) => d.agreementId === agreementId);
  }

  async updateDocument(id: string, updates: Partial<AgreementDocumentRecord>): Promise<AgreementDocumentRecord> {
    const now = new Date().toISOString();
    const cached = this.getCached<AgreementDocumentRecord>(DOCS_CACHE);
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveCached(DOCS_CACHE, cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.signingStartedAt !== undefined) payload.signing_started_at = updates.signingStartedAt;
      if (updates.supersededAt !== undefined) payload.superseded_at = updates.supersededAt;

      await supabase.from("agreement_documents").update(payload).eq("id", id);
    }

    const doc = await this.getDocumentById(id);
    if (!doc) throw new Error(`Agreement Document ${id} not found.`);
    return doc;
  }

  // --- Delivery Operations ---
  async createDelivery(input: Omit<AgreementDeliveryRecord, "id" | "createdAt" | "updatedAt">): Promise<AgreementDeliveryRecord> {
    const nextId = `AGR-DEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: AgreementDeliveryRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getCached<AgreementDeliveryRecord>(DELIVERIES_CACHE);
    cached.unshift(record);
    this.saveCached(DELIVERIES_CACHE, cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      await supabase.from("agreement_deliveries").insert({
        id: nextId,
        agreement_id: input.agreementId,
        agreement_document_id: input.agreementDocumentId,
        opportunity_id: input.opportunityId,
        lead_id: input.leadId,
        provider: input.provider,
        recipient: input.recipient,
        subject: input.subject,
        message: input.message,
        status: input.status,
        requested_at: input.requestedAt,
        created_at: now,
        updated_at: now,
      });
    }

    return record;
  }

  async getDeliveryById(id: string): Promise<AgreementDeliveryRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("agreement_deliveries").select("*").eq("id", id).single();
      if (!error && data) return this.mapDeliveryFromDb(data);
    }
    return this.getCached<AgreementDeliveryRecord>(DELIVERIES_CACHE).find((d) => d.id === id) || null;
  }

  async getDeliveriesByAgreementId(agreementId: string): Promise<AgreementDeliveryRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("agreement_deliveries")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data.map(this.mapDeliveryFromDb);
    }
    return this.getCached<AgreementDeliveryRecord>(DELIVERIES_CACHE).filter((d) => d.agreementId === agreementId);
  }

  async updateDelivery(id: string, updates: Partial<AgreementDeliveryRecord>): Promise<AgreementDeliveryRecord> {
    const now = new Date().toISOString();
    const cached = this.getCached<AgreementDeliveryRecord>(DELIVERIES_CACHE);
    const match = cached.find((d) => d.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveCached(DELIVERIES_CACHE, cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.sentAt !== undefined) payload.sent_at = updates.sentAt;
      if (updates.failedAt !== undefined) payload.failed_at = updates.failedAt;
      if (updates.providerMessageId !== undefined) payload.provider_message_id = updates.providerMessageId;
      if (updates.providerThreadId !== undefined) payload.provider_thread_id = updates.providerThreadId;
      if (updates.error !== undefined) payload.error = updates.error;

      await supabase.from("agreement_deliveries").update(payload).eq("id", id);
    }

    const del = await this.getDeliveryById(id);
    if (!del) throw new Error(`Agreement Delivery ${id} not found.`);
    return del;
  }

  // --- Signing Session Operations ---
  async createSigningSession(input: Omit<SigningSessionRecord, "id" | "createdAt" | "updatedAt">): Promise<SigningSessionRecord> {
    const nextId = `SIGN-SESS-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: SigningSessionRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getCached<SigningSessionRecord>(SIGNING_CACHE);
    cached.unshift(record);
    this.saveCached(SIGNING_CACHE, cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      await supabase.from("signing_sessions").insert({
        id: nextId,
        agreement_id: input.agreementId,
        agreement_document_id: input.agreementDocumentId,
        opportunity_id: input.opportunityId,
        provider: input.provider,
        provider_request_id: input.providerRequestId,
        status: input.status,
        document_hash: input.documentHash,
        required_signers: input.requiredSigners,
        completed_signers: input.completedSigners,
        signing_url_reference: input.signingUrlReference,
        sent_at: input.sentAt,
        created_at: now,
        updated_at: now,
      });
    }

    return record;
  }

  async getSigningSessionById(id: string): Promise<SigningSessionRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("signing_sessions").select("*").eq("id", id).single();
      if (!error && data) return this.mapSigningFromDb(data);
    }
    return this.getCached<SigningSessionRecord>(SIGNING_CACHE).find((s) => s.id === id) || null;
  }

  async getSigningSessionsByAgreementId(agreementId: string): Promise<SigningSessionRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("signing_sessions")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data.map(this.mapSigningFromDb);
    }
    return this.getCached<SigningSessionRecord>(SIGNING_CACHE).filter((s) => s.agreementId === agreementId);
  }

  async updateSigningSession(id: string, updates: Partial<SigningSessionRecord>): Promise<SigningSessionRecord> {
    const now = new Date().toISOString();
    const cached = this.getCached<SigningSessionRecord>(SIGNING_CACHE);
    const match = cached.find((s) => s.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveCached(SIGNING_CACHE, cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.completedSigners !== undefined) payload.completed_signers = updates.completedSigners;
      if (updates.clientSignedAt !== undefined) payload.client_signed_at = updates.clientSignedAt;
      if (updates.operatorSignedAt !== undefined) payload.operator_signed_at = updates.operatorSignedAt;
      if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
      if (updates.cancelledAt !== undefined) payload.cancelled_at = updates.cancelledAt;

      await supabase.from("signing_sessions").update(payload).eq("id", id);
    }

    const sess = await this.getSigningSessionById(id);
    if (!sess) throw new Error(`Signing session ${id} not found.`);
    return sess;
  }

  // --- Signature Events ---
  async addSignatureEvent(input: Omit<SignatureEventRecord, "id" | "createdAt">): Promise<SignatureEventRecord> {
    const nextId = `SIG-EVT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: SignatureEventRecord = {
      ...input,
      id: nextId,
      createdAt: now,
    };

    const cached = this.getCached<SignatureEventRecord>(EVENTS_CACHE);
    cached.unshift(record);
    this.saveCached(EVENTS_CACHE, cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      await supabase.from("signature_events").insert({
        id: nextId,
        signing_session_id: input.signingSessionId,
        agreement_id: input.agreementId,
        agreement_document_id: input.agreementDocumentId,
        signer_email: input.signerEmail,
        signer_role: input.signerRole,
        event_type: input.eventType,
        provider_event_id: input.providerEventId,
        provider_timestamp: input.providerTimestamp,
        metadata: input.metadata,
        created_at: now,
      });
    }

    return record;
  }

  async getSignatureEvents(signingSessionId: string): Promise<SignatureEventRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("signature_events")
        .select("*")
        .eq("signing_session_id", signingSessionId)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) return data.map(this.mapEventFromDb);
    }
    return this.getCached<SignatureEventRecord>(EVENTS_CACHE).filter((e) => e.signingSessionId === signingSessionId);
  }

  // Mappers
  private mapDocFromDb(d: any): AgreementDocumentRecord {
    return {
      id: d.id,
      agreementId: d.agreement_id,
      agreementVersion: d.agreement_version || 1,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      documentVersion: d.document_version || 1,
      status: d.status as AgreementDocumentStatus,
      renderedHtml: d.rendered_html,
      pdfReference: d.pdf_reference,
      contentHash: d.content_hash,
      generatedAt: d.generated_at,
      approvedAt: d.approved_at,
      signingStartedAt: d.signing_started_at,
      supersededAt: d.superseded_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private mapDeliveryFromDb(d: any): AgreementDeliveryRecord {
    return {
      id: d.id,
      agreementId: d.agreement_id,
      agreementDocumentId: d.agreement_document_id,
      opportunityId: d.opportunity_id,
      leadId: d.lead_id,
      provider: d.provider || "gmail",
      recipient: d.recipient,
      subject: d.subject,
      message: d.message,
      status: d.status as AgreementDeliveryStatus,
      providerMessageId: d.provider_message_id,
      providerThreadId: d.provider_thread_id,
      requestedAt: d.requested_at,
      approvedAt: d.approved_at,
      sentAt: d.sent_at,
      failedAt: d.failed_at,
      error: d.error,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private mapSigningFromDb(d: any): SigningSessionRecord {
    return {
      id: d.id,
      agreementId: d.agreement_id,
      agreementDocumentId: d.agreement_document_id,
      opportunityId: d.opportunity_id,
      provider: d.provider || "internal_esign",
      providerRequestId: d.provider_request_id,
      status: d.status as SigningSessionStatus,
      documentHash: d.document_hash,
      requiredSigners: d.required_signers || [],
      completedSigners: d.completed_signers || [],
      signingUrlReference: d.signing_url_reference,
      clientSignedAt: d.client_signed_at,
      operatorSignedAt: d.operator_signed_at,
      completedAt: d.completed_at,
      cancelledAt: d.cancelled_at,
      sentAt: d.sent_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private mapEventFromDb(d: any): SignatureEventRecord {
    return {
      id: d.id,
      signingSessionId: d.signing_session_id,
      agreementId: d.agreement_id,
      agreementDocumentId: d.agreement_document_id,
      signerEmail: d.signer_email,
      signerRole: d.signer_role,
      eventType: d.event_type,
      providerEventId: d.provider_event_id,
      providerTimestamp: d.provider_timestamp,
      metadata: d.metadata,
      createdAt: d.created_at,
    };
  }
}

export const agreementDeliveryRepository = new SupabaseAgreementDeliveryRepository();