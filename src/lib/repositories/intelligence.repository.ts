import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface BusinessEventRecord {
  id: string;
  eventType: string;
  organizationId?: string;
  leadId?: string;
  opportunityId?: string;
  projectId?: string;
  agentId?: string;
  executionId?: string;
  sourceClassification: "LIVE_REAL" | "CONTROLLED_TEST" | "SYNTHETIC" | "SIMULATION";
  occurredAt: string;
  numericValue?: number;
  currency?: string;
  dimensions: Record<string, any>;
  sourceRecordType: string;
  sourceRecordId: string;
  createdAt: string;
}

export interface BusinessCostEventRecord {
  id: string;
  costType: "llm_api" | "hosting" | "deployment" | "email" | "signature_provider" | "payment_processing" | "domain" | "software_subscription" | "contractor" | "labor" | "marketing" | "other";
  amount: number;
  currency: string;
  source: string;
  verified: boolean;
  allocationMethod: string;
  organizationId?: string;
  projectId?: string;
  period?: string;
  evidence: Record<string, any>;
  createdAt: string;
}

export interface BusinessExperimentRecord {
  id: string;
  name: string;
  hypothesis: string;
  variantA: Record<string, any>;
  variantB: Record<string, any>;
  status: "draft" | "running" | "completed" | "cancelled";
  assignments: Array<{ entityId: string; variant: "A" | "B"; assignedAt: string; outcome?: string }>;
  results: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

export interface BusinessDecisionRecord {
  id: string;
  recommendationId: string;
  operatorDecision: "accepted" | "rejected" | "deferred";
  reason?: string;
  configurationChange?: Record<string, any>;
  createdAt: string;
}

export interface FxRateSnapshotRecord {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  effectiveAt: string;
  source: string;
  operatorVerified: boolean;
  createdAt: string;
}

export class IntelligenceRepository {
  private eventsCacheFile = path.resolve(process.cwd(), ".business_events_cache.json");
  private costsCacheFile = path.resolve(process.cwd(), ".business_costs_cache.json");
  private experimentsCacheFile = path.resolve(process.cwd(), ".business_experiments_cache.json");
  private decisionsCacheFile = path.resolve(process.cwd(), ".business_decisions_cache.json");
  private fxCacheFile = path.resolve(process.cwd(), ".fx_rate_snapshots_cache.json");

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

  // --- Events ---
  async recordEvent(event: BusinessEventRecord): Promise<BusinessEventRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("business_events").insert({
          id: event.id,
          event_type: event.eventType,
          organization_id: event.organizationId,
          lead_id: event.leadId,
          opportunity_id: event.opportunityId,
          project_id: event.projectId,
          agent_id: event.agentId,
          execution_id: event.executionId,
          source_classification: event.sourceClassification,
          occurred_at: event.occurredAt,
          numeric_value: event.numericValue,
          currency: event.currency,
          dimensions: event.dimensions,
          source_record_type: event.sourceRecordType,
          source_record_id: event.sourceRecordId,
          created_at: event.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<BusinessEventRecord>(this.eventsCacheFile);
    cache.unshift(event);
    this.writeCache(this.eventsCacheFile, cache);
    return event;
  }

  async getEvents(filter?: {
    sourceClassification?: string;
    organizationId?: string;
    projectId?: string;
    eventType?: string;
  }): Promise<BusinessEventRecord[]> {
    let cache = this.readCache<BusinessEventRecord>(this.eventsCacheFile);
    if (filter?.sourceClassification) {
      cache = cache.filter((e) => e.sourceClassification === filter.sourceClassification);
    }
    if (filter?.organizationId) {
      cache = cache.filter((e) => e.organizationId === filter.organizationId);
    }
    if (filter?.projectId) {
      cache = cache.filter((e) => e.projectId === filter.projectId);
    }
    if (filter?.eventType) {
      cache = cache.filter((e) => e.eventType === filter.eventType);
    }
    return cache;
  }

  // --- Costs ---
  async recordCost(cost: BusinessCostEventRecord): Promise<BusinessCostEventRecord> {
    const cache = this.readCache<BusinessCostEventRecord>(this.costsCacheFile);
    cache.unshift(cost);
    this.writeCache(this.costsCacheFile, cache);
    return cost;
  }

  async getCosts(projectId?: string): Promise<BusinessCostEventRecord[]> {
    let cache = this.readCache<BusinessCostEventRecord>(this.costsCacheFile);
    if (projectId) cache = cache.filter((c) => c.projectId === projectId);
    return cache;
  }

  // --- Experiments ---
  async createExperiment(exp: BusinessExperimentRecord): Promise<BusinessExperimentRecord> {
    const cache = this.readCache<BusinessExperimentRecord>(this.experimentsCacheFile);
    cache.unshift(exp);
    this.writeCache(this.experimentsCacheFile, cache);
    return exp;
  }

  async getExperiments(): Promise<BusinessExperimentRecord[]> {
    return this.readCache<BusinessExperimentRecord>(this.experimentsCacheFile);
  }

  async updateExperiment(id: string, updates: Partial<BusinessExperimentRecord>): Promise<BusinessExperimentRecord | null> {
    const cache = this.readCache<BusinessExperimentRecord>(this.experimentsCacheFile);
    const idx = cache.findIndex((e) => e.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.experimentsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Decisions ---
  async recordDecision(decision: BusinessDecisionRecord): Promise<BusinessDecisionRecord> {
    const cache = this.readCache<BusinessDecisionRecord>(this.decisionsCacheFile);
    cache.unshift(decision);
    this.writeCache(this.decisionsCacheFile, cache);
    return decision;
  }

  async getDecisions(): Promise<BusinessDecisionRecord[]> {
    return this.readCache<BusinessDecisionRecord>(this.decisionsCacheFile);
  }

  // --- FX Rate Snapshots ---
  async recordFxSnapshot(snapshot: FxRateSnapshotRecord): Promise<FxRateSnapshotRecord> {
    const cache = this.readCache<FxRateSnapshotRecord>(this.fxCacheFile);
    cache.unshift(snapshot);
    this.writeCache(this.fxCacheFile, cache);
    return snapshot;
  }

  async getLatestFxSnapshot(baseCurrency: string, quoteCurrency: string): Promise<FxRateSnapshotRecord | null> {
    const cache = this.readCache<FxRateSnapshotRecord>(this.fxCacheFile);
    return cache.find((s) => s.baseCurrency === baseCurrency && s.quoteCurrency === quoteCurrency) || null;
  }
}

export const intelligenceRepository = new IntelligenceRepository();