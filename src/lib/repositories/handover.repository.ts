import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface HandoverPackageRecord {
  id: string;
  handoverNumber: string;
  projectId: string;
  releaseId: string;
  agreementId: string;
  status: "draft" | "waiting_approval" | "approved" | "delivery_pending" | "delivered" | "client_review" | "confirmed" | "superseded";
  releaseSnapshotId: string;
  releaseManifestHash: string;
  clientDocuments: Record<string, any>;
  technicalDocuments: Record<string, any>;
  configurationSummary: Record<string, any>;
  assetInventory: Array<{ name: string; type: string; rightsStatus: string }>;
  sourceArtifactId?: string;
  sourceArtifactHash?: string;
  deliveryMessageId?: string;
  clientConfirmationEvidence?: string;
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
  clientConfirmedAt?: string;
  completedAt?: string;
}

export interface HandoverItemRecord {
  id: string;
  handoverPackageId: string;
  projectId: string;
  itemType: "domain" | "hosting" | "repository" | "source_code" | "assets" | "analytics" | "form_configuration" | "documentation" | "credentials" | "other";
  title: string;
  description: string;
  status: "not_required" | "pending" | "ready" | "transferred" | "verified" | "blocked";
  transferredAt?: string;
  verifiedAt?: string;
}

export class HandoverRepository {
  private packagesCacheFile = path.resolve(process.cwd(), ".handover_packages_cache.json");
  private itemsCacheFile = path.resolve(process.cwd(), ".handover_items_cache.json");

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

  async getNextHandoverNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HND-${year}-`;
    const pkgs = this.readCache<HandoverPackageRecord>(this.packagesCacheFile);
    let maxSeq = 0;
    for (const p of pkgs) {
      if (p.handoverNumber && p.handoverNumber.startsWith(prefix)) {
        const seqStr = p.handoverNumber.replace(prefix, "");
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return `${prefix}${(maxSeq + 1).toString().padStart(6, "0")}`;
  }

  // --- Packages ---
  async createPackage(pkg: HandoverPackageRecord): Promise<HandoverPackageRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("handover_packages").insert({
          id: pkg.id,
          handover_number: pkg.handoverNumber,
          project_id: pkg.projectId,
          release_id: pkg.releaseId,
          agreement_id: pkg.agreementId,
          status: pkg.status,
          release_snapshot_id: pkg.releaseSnapshotId,
          release_manifest_hash: pkg.releaseManifestHash,
          client_documents: pkg.clientDocuments,
          technical_documents: pkg.technicalDocuments,
          configuration_summary: pkg.configurationSummary,
          asset_inventory: pkg.assetInventory,
          source_artifact_id: pkg.sourceArtifactId,
          source_artifact_hash: pkg.sourceArtifactHash,
          created_at: pkg.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<HandoverPackageRecord>(this.packagesCacheFile);
    cache.unshift(pkg);
    this.writeCache(this.packagesCacheFile, cache);
    return pkg;
  }

  async updatePackage(id: string, updates: Partial<HandoverPackageRecord>): Promise<HandoverPackageRecord | null> {
    const cache = this.readCache<HandoverPackageRecord>(this.packagesCacheFile);
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.packagesCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  async getPackageById(id: string): Promise<HandoverPackageRecord | null> {
    const cache = this.readCache<HandoverPackageRecord>(this.packagesCacheFile);
    return cache.find((p) => p.id === id) || null;
  }

  async getPackagesByProject(projectId: string): Promise<HandoverPackageRecord[]> {
    const cache = this.readCache<HandoverPackageRecord>(this.packagesCacheFile);
    return cache.filter((p) => p.projectId === projectId);
  }

  // --- Items ---
  async createItems(items: HandoverItemRecord[]): Promise<HandoverItemRecord[]> {
    const cache = this.readCache<HandoverItemRecord>(this.itemsCacheFile);
    for (const item of items) {
      cache.unshift(item);
    }
    this.writeCache(this.itemsCacheFile, cache);
    return items;
  }

  async getItemsByPackage(packageId: string): Promise<HandoverItemRecord[]> {
    const cache = this.readCache<HandoverItemRecord>(this.itemsCacheFile);
    return cache.filter((i) => i.handoverPackageId === packageId);
  }

  async updateItem(id: string, updates: Partial<HandoverItemRecord>): Promise<HandoverItemRecord | null> {
    const cache = this.readCache<HandoverItemRecord>(this.itemsCacheFile);
    const idx = cache.findIndex((i) => i.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.itemsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }
}

export const handoverRepository = new HandoverRepository();