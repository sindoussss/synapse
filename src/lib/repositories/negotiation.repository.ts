import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type NegotiationStatus =
  | "open"
  | "awaiting_operator"
  | "awaiting_client"
  | "agreement_in_principle"
  | "closed_won"
  | "closed_lost";

export type NegotiationEventType =
  | "proposal_reply"
  | "scope_change"
  | "price_objection"
  | "discount_request"
  | "timeline_question"
  | "terms_question"
  | "client_acceptance_signal"
  | "client_rejection"
  | "operator_decision";

export interface RequestedChangeItem {
  id?: string;
  type: "add_scope" | "remove_scope" | "modify_scope" | "price_adjustment" | "timeline_adjustment" | "terms_adjustment";
  target: string;
  action?: string;
  clientProposedValue?: string | number;
  sourceMessageId?: string;
  sourceQuote?: string;
  status: "pending_operator_decision" | "accepted" | "rejected" | "modified";
  operatorNotes?: string;
}

export interface NegotiationEventRecord {
  id: string;
  negotiationSessionId: string;
  emailMessageId?: string;
  eventType: NegotiationEventType;
  summary: string;
  requestedChanges?: RequestedChangeItem[];
  objections?: string[];
  commercialSignals?: string[];
  sourceGrounding?: any;
  createdAt: string;
}

export interface NegotiationSessionRecord {
  id: string;
  opportunityId: string;
  proposalId: string;
  proposalDocumentId?: string;
  status: NegotiationStatus;
  currentProposalVersion: number;
  startedAt: string;
  lastActivityAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: NegotiationEventRecord[];
}

export interface INegotiationRepository {
  createSession(input: Omit<NegotiationSessionRecord, "id" | "createdAt" | "updatedAt">): Promise<NegotiationSessionRecord>;
  getSessionById(id: string): Promise<NegotiationSessionRecord | null>;
  getSessionByOpportunityId(opportunityId: string): Promise<NegotiationSessionRecord | null>;
  getAllSessions(): Promise<NegotiationSessionRecord[]>;
  updateSession(id: string, updates: Partial<NegotiationSessionRecord>): Promise<NegotiationSessionRecord>;
  addEvent(input: Omit<NegotiationEventRecord, "id" | "createdAt">): Promise<NegotiationEventRecord>;
  getEventsBySessionId(sessionId: string): Promise<NegotiationEventRecord[]>;
}

const SESSIONS_CACHE_FILE = path.resolve(process.cwd(), ".negotiation_sessions_cache.json");
const EVENTS_CACHE_FILE = path.resolve(process.cwd(), ".negotiation_events_cache.json");

export class SupabaseNegotiationRepository implements INegotiationRepository {
  private getLocalSessions(): NegotiationSessionRecord[] {
    try {
      if (fs.existsSync(SESSIONS_CACHE_FILE)) {
        const raw = fs.readFileSync(SESSIONS_CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalSessions(items: NegotiationSessionRecord[]): void {
    try {
      fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  private getLocalEvents(): NegotiationEventRecord[] {
    try {
      if (fs.existsSync(EVENTS_CACHE_FILE)) {
        const raw = fs.readFileSync(EVENTS_CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalEvents(items: NegotiationEventRecord[]): void {
    try {
      fs.writeFileSync(EVENTS_CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async createSession(input: Omit<NegotiationSessionRecord, "id" | "createdAt" | "updatedAt">): Promise<NegotiationSessionRecord> {
    const nextId = `NEG-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: NegotiationSessionRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    const cached = this.getLocalSessions();
    cached.unshift(record);
    this.saveLocalSessions(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        opportunity_id: input.opportunityId,
        proposal_id: input.proposalId,
        proposal_document_id: input.proposalDocumentId,
        status: input.status || "open",
        current_proposal_version: input.currentProposalVersion || 1,
        started_at: input.startedAt || now,
        last_activity_at: input.lastActivityAt || now,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("negotiation_sessions").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseNegotiationRepository.createSession] Supabase insert warning, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getSessionById(id: string): Promise<NegotiationSessionRecord | null> {
    let session: NegotiationSessionRecord | null = null;
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("negotiation_sessions").select("*").eq("id", id).single();
      if (!error && data) {
        session = this.mapSessionFromDb(data);
      }
    }
    if (!session) {
      session = this.getLocalSessions().find((s) => s.id === id) || null;
    }

    if (session) {
      session.events = await this.getEventsBySessionId(session.id);
    }
    return session;
  }

  async getSessionByOpportunityId(opportunityId: string): Promise<NegotiationSessionRecord | null> {
    let session: NegotiationSessionRecord | null = null;
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        session = this.mapSessionFromDb(data);
      }
    }
    if (!session) {
      session = this.getLocalSessions().find((s) => s.opportunityId === opportunityId) || null;
    }

    if (session) {
      session.events = await this.getEventsBySessionId(session.id);
    }
    return session;
  }

  async getAllSessions(): Promise<NegotiationSessionRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("negotiation_sessions").select("*").order("last_activity_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapSessionFromDb);
      }
    }
    return this.getLocalSessions();
  }

  async updateSession(id: string, updates: Partial<NegotiationSessionRecord>): Promise<NegotiationSessionRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalSessions();
    const match = cached.find((s) => s.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now, lastActivityAt: updates.lastActivityAt || now });
      this.saveLocalSessions(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now, last_activity_at: updates.lastActivityAt || now };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.currentProposalVersion !== undefined) payload.current_proposal_version = updates.currentProposalVersion;
      if (updates.proposalId !== undefined) payload.proposal_id = updates.proposalId;
      if (updates.proposalDocumentId !== undefined) payload.proposal_document_id = updates.proposalDocumentId;
      if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;

      await supabase.from("negotiation_sessions").update(payload).eq("id", id);
    }

    const res = await this.getSessionById(id);
    if (!res) throw new Error(`Negotiation session ${id} not found.`);
    return res;
  }

  async addEvent(input: Omit<NegotiationEventRecord, "id" | "createdAt">): Promise<NegotiationEventRecord> {
    const nextId = `NEVT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: NegotiationEventRecord = {
      ...input,
      id: nextId,
      createdAt: now,
    };

    const cached = this.getLocalEvents();
    cached.unshift(record);
    this.saveLocalEvents(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        negotiation_session_id: input.negotiationSessionId,
        email_message_id: input.emailMessageId,
        event_type: input.eventType,
        summary: input.summary,
        requested_changes: input.requestedChanges,
        objections: input.objections,
        commercial_signals: input.commercialSignals,
        source_grounding: input.sourceGrounding,
        created_at: now,
      };

      const { error } = await supabase.from("negotiation_events").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseNegotiationRepository.addEvent] Supabase insert warning, saved in cache:", error.message);
      }
    }

    // Touch session last_activity_at
    await this.updateSession(input.negotiationSessionId, { lastActivityAt: now });

    return record;
  }

  async getEventsBySessionId(sessionId: string): Promise<NegotiationEventRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("negotiation_events")
        .select("*")
        .eq("negotiation_session_id", sessionId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(this.mapEventFromDb);
      }
    }
    return this.getLocalEvents().filter((e) => e.negotiationSessionId === sessionId);
  }

  private mapSessionFromDb(d: any): NegotiationSessionRecord {
    return {
      id: d.id,
      opportunityId: d.opportunity_id,
      proposalId: d.proposal_id,
      proposalDocumentId: d.proposal_document_id,
      status: d.status as NegotiationStatus,
      currentProposalVersion: d.current_proposal_version || 1,
      startedAt: d.started_at,
      lastActivityAt: d.last_activity_at,
      resolvedAt: d.resolved_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private mapEventFromDb(d: any): NegotiationEventRecord {
    return {
      id: d.id,
      negotiationSessionId: d.negotiation_session_id,
      emailMessageId: d.email_message_id,
      eventType: d.event_type as NegotiationEventType,
      summary: d.summary,
      requestedChanges: d.requested_changes,
      objections: d.objections,
      commercialSignals: d.commercial_signals,
      sourceGrounding: d.source_grounding,
      createdAt: d.created_at,
    };
  }
}

export const negotiationRepository: INegotiationRepository = new SupabaseNegotiationRepository();