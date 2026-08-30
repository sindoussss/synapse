import fs from "fs";
import path from "path";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type OpportunityStage =
  | "new"
  | "discovery"
  | "qualified"
  | "proposal_ready"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "closed_won"
  | "closed_lost"
  | "lost";

export type OpportunityStatus = "open" | "won" | "lost" | "archived";

export interface GroundedRequirement {
  id: string;
  requirement: string;
  category?: string;
  sourceMessageId?: string;
  sourceQuote?: string;
  status: "active" | "superseded";
  isClientExplicit: boolean;
  addedAt: string;
  supersededAt?: string;
  supersededReason?: string;
}

export interface QualificationMatrix {
  need: "unknown" | "weak" | "medium" | "strong";
  authority: "unknown" | "weak" | "medium" | "strong";
  budget: "unknown" | "weak" | "medium" | "strong";
  timeline: "unknown" | "weak" | "medium" | "strong";
  engagement: "unknown" | "weak" | "medium" | "strong";
  summary: string;
}

export interface OpportunityHistoryEntry {
  timestamp: string;
  actor: string;
  action: string;
  previousStage?: OpportunityStage;
  newStage?: OpportunityStage;
  notes?: string;
}

export interface OpportunityRecord {
  id: string;
  leadId: string;
  primaryContactEmail?: string;
  status: OpportunityStatus;
  stage: OpportunityStage;
  title: string;
  summary: string;
  projectType: string;
  requestedScope: GroundedRequirement[];
  requiredFeatures: GroundedRequirement[];
  optionalFeatures: GroundedRequirement[];
  prospectQuestions: string[];
  unresolvedQuestions: string[];
  commercialSignals: string[];
  budgetSignal: string;
  budgetLiteral?: string;
  timelineSignal: string;
  authoritySignal: string;
  qualification: QualificationMatrix;
  nextRecommendedAction: string;
  proposalReadiness: number; // 0 - 100
  sourceReplyAnalysisId?: string;
  history: OpportunityHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  qualifiedAt?: string | null;
  closedAt?: string | null;
}

export interface IOpportunityRepository {
  create(input: Omit<OpportunityRecord, "id" | "createdAt" | "updatedAt">): Promise<OpportunityRecord>;
  getById(id: string): Promise<OpportunityRecord | null>;
  getByLeadId(leadId: string): Promise<OpportunityRecord | null>;
  getAll(): Promise<OpportunityRecord[]>;
  update(id: string, updates: Partial<OpportunityRecord>): Promise<OpportunityRecord>;
  updateStage(id: string, stage: OpportunityStage, actor?: string, notes?: string): Promise<OpportunityRecord>;
}

const CACHE_FILE = path.resolve(process.cwd(), ".opportunities_cache.json");

export class SupabaseOpportunityRepository implements IOpportunityRepository {
  private getLocalOpportunities(): OpportunityRecord[] {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalOpportunities(items: OpportunityRecord[]): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), "utf8");
    } catch {}
  }

  async create(input: Omit<OpportunityRecord, "id" | "createdAt" | "updatedAt">): Promise<OpportunityRecord> {
    const nextId = `OPP-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: OpportunityRecord = {
      ...input,
      id: nextId,
      createdAt: now,
      updatedAt: now,
      history: input.history || [
        {
          timestamp: now,
          actor: "System / Sales Agent",
          action: "Opportunity Created",
          newStage: input.stage || "new",
          notes: "Initial opportunity structured from conversation intelligence.",
        },
      ],
    };

    const cached = this.getLocalOpportunities();
    const existingIndex = cached.findIndex((o) => o.leadId === input.leadId);
    if (existingIndex >= 0) {
      cached[existingIndex] = record;
    } else {
      cached.unshift(record);
    }
    this.saveLocalOpportunities(cached);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const insertPayload: any = {
        id: nextId,
        lead_id: input.leadId,
        primary_contact_email: input.primaryContactEmail || null,
        status: input.status || "open",
        stage: input.stage || "new",
        title: input.title,
        summary: input.summary,
        project_type: input.projectType || "website_redesign",
        requested_scope: input.requestedScope || [],
        required_features: input.requiredFeatures || [],
        optional_features: input.optionalFeatures || [],
        prospect_questions: input.prospectQuestions || [],
        unresolved_questions: input.unresolvedQuestions || [],
        commercial_signals: input.commercialSignals || [],
        budget_signal: input.budgetSignal || "unknown",
        budget_literal: input.budgetLiteral || null,
        timeline_signal: input.timelineSignal || "unknown",
        authority_signal: input.authoritySignal || "unknown",
        qualification: input.qualification || {},
        next_recommended_action: input.nextRecommendedAction || "ask_scope_question",
        proposal_readiness: input.proposalReadiness || 0,
        source_reply_analysis_id: input.sourceReplyAnalysisId || null,
        history: record.history,
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase.from("opportunities").insert(insertPayload);
      if (error) {
        console.warn("[SupabaseOpportunityRepository.create] Supabase table not ready, saved in cache:", error.message);
      }
    }

    return record;
  }

  async getById(id: string): Promise<OpportunityRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalOpportunities().find((o) => o.id === id) || null;
  }

  async getByLeadId(leadId: string): Promise<OpportunityRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        return this.mapFromDb(data);
      }
    }
    return this.getLocalOpportunities().find((o) => o.leadId === leadId) || null;
  }

  async getAll(): Promise<OpportunityRecord[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(this.mapFromDb);
      }
    }
    return this.getLocalOpportunities();
  }

  async update(id: string, updates: Partial<OpportunityRecord>): Promise<OpportunityRecord> {
    const now = new Date().toISOString();
    const cached = this.getLocalOpportunities();
    const match = cached.find((o) => o.id === id);
    if (match) {
      Object.assign(match, updates, { updatedAt: now });
      this.saveLocalOpportunities(cached);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient()!;
      const payload: any = { updated_at: now };
      if (updates.stage !== undefined) payload.stage = updates.stage;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.summary !== undefined) payload.summary = updates.summary;
      if (updates.projectType !== undefined) payload.project_type = updates.projectType;
      if (updates.requestedScope !== undefined) payload.requested_scope = updates.requestedScope;
      if (updates.requiredFeatures !== undefined) payload.required_features = updates.requiredFeatures;
      if (updates.optionalFeatures !== undefined) payload.optional_features = updates.optionalFeatures;
      if (updates.prospectQuestions !== undefined) payload.prospect_questions = updates.prospectQuestions;
      if (updates.unresolvedQuestions !== undefined) payload.unresolved_questions = updates.unresolvedQuestions;
      if (updates.commercialSignals !== undefined) payload.commercial_signals = updates.commercialSignals;
      if (updates.budgetSignal !== undefined) payload.budget_signal = updates.budgetSignal;
      if (updates.budgetLiteral !== undefined) payload.budget_literal = updates.budgetLiteral;
      if (updates.timelineSignal !== undefined) payload.timeline_signal = updates.timelineSignal;
      if (updates.authoritySignal !== undefined) payload.authority_signal = updates.authoritySignal;
      if (updates.qualification !== undefined) payload.qualification = updates.qualification;
      if (updates.nextRecommendedAction !== undefined) payload.next_recommended_action = updates.nextRecommendedAction;
      if (updates.proposalReadiness !== undefined) payload.proposal_readiness = updates.proposalReadiness;
      if (updates.history !== undefined) payload.history = updates.history;
      if (updates.qualifiedAt !== undefined) payload.qualified_at = updates.qualifiedAt;
      if (updates.closedAt !== undefined) payload.closed_at = updates.closedAt;

      await supabase.from("opportunities").update(payload).eq("id", id);
    }

    const res = (await this.getById(id)) || (match as OpportunityRecord);
    if (!res) throw new Error(`Opportunity record ${id} not found.`);
    return res;
  }

  async updateStage(
    id: string,
    newStage: OpportunityStage,
    actor: string = "Human Operator",
    notes?: string
  ): Promise<OpportunityRecord> {
    const opp = await this.getById(id);
    if (!opp) throw new Error(`Opportunity ${id} not found.`);

    const now = new Date().toISOString();
    const historyEntry: OpportunityHistoryEntry = {
      timestamp: now,
      actor,
      action: "Stage Updated",
      previousStage: opp.stage,
      newStage,
      notes,
    };

    const history = [...(opp.history || []), historyEntry];
    const updates: Partial<OpportunityRecord> = {
      stage: newStage,
      history,
    };

    if (newStage === "qualified" && !opp.qualifiedAt) {
      updates.qualifiedAt = now;
    }
    if ((newStage === "won" || newStage === "lost") && !opp.closedAt) {
      updates.closedAt = now;
      updates.status = newStage === "won" ? "won" : "lost";
    }

    return this.update(id, updates);
  }

  private mapFromDb(d: any): OpportunityRecord {
    return {
      id: d.id,
      leadId: d.lead_id,
      primaryContactEmail: d.primary_contact_email || undefined,
      status: d.status as OpportunityStatus,
      stage: d.stage as OpportunityStage,
      title: d.title,
      summary: d.summary || "",
      projectType: d.project_type || "website_redesign",
      requestedScope: d.requested_scope || [],
      requiredFeatures: d.required_features || [],
      optionalFeatures: d.optional_features || [],
      prospectQuestions: d.prospect_questions || [],
      unresolvedQuestions: d.unresolved_questions || [],
      commercialSignals: d.commercial_signals || [],
      budgetSignal: d.budget_signal || "unknown",
      budgetLiteral: d.budget_literal || undefined,
      timelineSignal: d.timeline_signal || "unknown",
      authoritySignal: d.authority_signal || "unknown",
      qualification: d.qualification || {
        need: "unknown",
        authority: "unknown",
        budget: "unknown",
        timeline: "unknown",
        engagement: "unknown",
        summary: "Pending discovery.",
      },
      nextRecommendedAction: d.next_recommended_action || "ask_scope_question",
      proposalReadiness: d.proposal_readiness || 0,
      sourceReplyAnalysisId: d.source_reply_analysis_id || undefined,
      history: d.history || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      qualifiedAt: d.qualified_at,
      closedAt: d.closed_at,
    };
  }
}

export const opportunityRepository: IOpportunityRepository = new SupabaseOpportunityRepository();