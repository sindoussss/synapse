import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface MarketPilotRecord {
  id: string;
  pilotNumber: string;
  name: string;
  status: "draft" | "waiting_approval" | "approved" | "running" | "paused" | "completed" | "cancelled";
  targetLeadCount: number;
  maxOutboundMessages: number;
  liveSendCommittedCount: number;
  controlledTestSendCount: number;
  blockedAttemptCount: number;
  industryScope?: string;
  locationScope?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface MarketPilotSendRecord {
  id: string;
  pilotId: string;
  organizationId: string;
  contactId: string;
  approvalId: string;
  messageId: string;
  threadId?: string;
  sentAt: string;
  sourceClassification: "LIVE_REAL_OUTREACH" | "CONTROLLED_TEST_EXTERNAL_EFFECT" | "SYNTHETIC_TEST";
  recipientClassification: "OPERATOR_CONTROLLED_INBOX" | "VERIFIED_PUBLIC_BUSINESS_CONTACT" | "SYNTHETIC_INBOX";
}

export interface DncSuppressionRecord {
  id: string;
  entityType: "organization" | "contact" | "email" | "domain";
  entityValue: string;
  reason: string;
  source: string;
  sourceClassification: "LIVE_REAL" | "CONTROLLED_TEST";
  suppressedAt: string;
}

export class PilotRepository {
  private pilotsCacheFile = path.resolve(process.cwd(), ".market_pilots_cache.json");
  private sendsCacheFile = path.resolve(process.cwd(), ".market_pilot_sends_cache.json");
  private dncCacheFile = path.resolve(process.cwd(), ".dnc_suppressions_cache.json");

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

  // --- Pilots ---
  async createPilot(pilot: MarketPilotRecord): Promise<MarketPilotRecord> {
    const cache = this.readCache<MarketPilotRecord>(this.pilotsCacheFile);
    cache.unshift(pilot);
    this.writeCache(this.pilotsCacheFile, cache);
    return pilot;
  }

  async getPilotById(id: string): Promise<MarketPilotRecord | null> {
    const cache = this.readCache<MarketPilotRecord>(this.pilotsCacheFile);
    return cache.find((p) => p.id === id || p.pilotNumber === id) || null;
  }

  async getAllPilots(): Promise<MarketPilotRecord[]> {
    return this.readCache<MarketPilotRecord>(this.pilotsCacheFile);
  }

  async updatePilot(id: string, updates: Partial<MarketPilotRecord>): Promise<MarketPilotRecord | null> {
    const cache = this.readCache<MarketPilotRecord>(this.pilotsCacheFile);
    const idx = cache.findIndex((p) => p.id === id || p.pilotNumber === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.pilotsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  // --- Pilot Sends ---
  async recordSend(send: MarketPilotSendRecord): Promise<MarketPilotSendRecord> {
    const cache = this.readCache<MarketPilotSendRecord>(this.sendsCacheFile);
    cache.unshift(send);
    this.writeCache(this.sendsCacheFile, cache);
    return send;
  }

  async getSendsByPilot(pilotId: string): Promise<MarketPilotSendRecord[]> {
    const cache = this.readCache<MarketPilotSendRecord>(this.sendsCacheFile);
    return cache.filter((s) => s.pilotId === pilotId);
  }

  // --- DNC Suppressions ---
  async addDnc(suppression: DncSuppressionRecord): Promise<DncSuppressionRecord> {
    const cache = this.readCache<DncSuppressionRecord>(this.dncCacheFile);
    const existing = cache.find((d) => d.entityValue.toLowerCase() === suppression.entityValue.toLowerCase());
    if (!existing) {
      cache.unshift(suppression);
      this.writeCache(this.dncCacheFile, cache);
    }
    return suppression;
  }

  async isSuppressed(entityValue: string, scope: "LIVE_REAL" | "CONTROLLED_TEST" = "LIVE_REAL"): Promise<boolean> {
    const cache = this.readCache<DncSuppressionRecord>(this.dncCacheFile);
    return cache.some((d) => d.entityValue.toLowerCase() === entityValue.toLowerCase() && (d.sourceClassification === scope || d.sourceClassification === "LIVE_REAL"));
  }

  async getAllDnc(scope?: "LIVE_REAL" | "CONTROLLED_TEST"): Promise<DncSuppressionRecord[]> {
    const cache = this.readCache<DncSuppressionRecord>(this.dncCacheFile);
    if (scope) return cache.filter((d) => d.sourceClassification === scope);
    return cache;
  }
}

export const pilotRepository = new PilotRepository();