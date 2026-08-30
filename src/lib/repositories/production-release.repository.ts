import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface ProductionReleaseRecord {
  id: string;
  releaseNumber: string;
  projectId: string;
  reviewSessionId: string;
  reviewNumber: string;
  snapshotId: string;
  manifestHash: string;
  qaRunId: string;
  deploymentProvider: string;
  providerDeploymentId?: string;
  productionUrl?: string;
  status: "draft" | "blocked" | "waiting_release_approval" | "approved" | "building" | "deployed" | "waiting_dns_approval" | "dns_updating" | "verifying" | "live" | "failed" | "rolled_back";
  buildEvidence: Record<string, any>;
  securityEvidence: Record<string, any>;
  configurationEvidence: Record<string, any>;
  dnsPlan: Record<string, any>;
  healthEvidence: Record<string, any>;
  rollbackEvidence: Record<string, any>;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  deployedAt?: string;
  cutoverAt?: string;
  verifiedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

export interface ProjectDomainRecord {
  id: string;
  projectId: string;
  domain: string;
  domainType: "apex" | "www" | "subdomain";
  provider: string;
  ownershipStatus: string;
  verificationStatus: string;
  currentDnsSnapshot: Array<{ type: string; name: string; value: string; ttl: number }>;
  desiredDnsPlan: Array<{ type: string; name: string; value: string; action: "create" | "update" | "delete" }>;
  status: "unverified" | "verified" | "planning" | "waiting_approval" | "updating" | "propagating" | "active" | "failed" | "rolled_back";
  createdAt: string;
  verifiedAt?: string;
  cutoverAt?: string;
}

export class ProductionReleaseRepository {
  private releasesCacheFile = path.resolve(process.cwd(), ".production_releases_cache.json");
  private domainsCacheFile = path.resolve(process.cwd(), ".project_domains_cache.json");

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

  async getNextReleaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REL-${year}-`;
    const releases = this.readCache<ProductionReleaseRecord>(this.releasesCacheFile);
    let maxSeq = 0;
    for (const r of releases) {
      if (r.releaseNumber && r.releaseNumber.startsWith(prefix)) {
        const seqStr = r.releaseNumber.replace(prefix, "");
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return `${prefix}${(maxSeq + 1).toString().padStart(6, "0")}`;
  }

  // --- Releases ---
  async createRelease(release: ProductionReleaseRecord): Promise<ProductionReleaseRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("production_releases").insert({
          id: release.id,
          release_number: release.releaseNumber,
          project_id: release.projectId,
          review_session_id: release.reviewSessionId,
          review_number: release.reviewNumber,
          snapshot_id: release.snapshotId,
          manifest_hash: release.manifestHash,
          qa_run_id: release.qaRunId,
          deployment_provider: release.deploymentProvider,
          provider_deployment_id: release.providerDeploymentId,
          production_url: release.productionUrl,
          status: release.status,
          build_evidence: release.buildEvidence,
          security_evidence: release.securityEvidence,
          configuration_evidence: release.configurationEvidence,
          dns_plan: release.dnsPlan,
          health_evidence: release.healthEvidence,
          rollback_evidence: release.rollbackEvidence,
          requested_by: release.requestedBy,
          requested_at: release.requestedAt,
        });
      } catch {}
    }

    const cache = this.readCache<ProductionReleaseRecord>(this.releasesCacheFile);
    cache.unshift(release);
    this.writeCache(this.releasesCacheFile, cache);
    return release;
  }

  async updateRelease(id: string, updates: Partial<ProductionReleaseRecord>): Promise<ProductionReleaseRecord | null> {
    const cache = this.readCache<ProductionReleaseRecord>(this.releasesCacheFile);
    const idx = cache.findIndex((r) => r.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.releasesCacheFile, cache);
      return cache[idx];
    }
    return null;
  }

  async getReleaseById(id: string): Promise<ProductionReleaseRecord | null> {
    const cache = this.readCache<ProductionReleaseRecord>(this.releasesCacheFile);
    return cache.find((r) => r.id === id) || null;
  }

  async getReleasesByProject(projectId: string): Promise<ProductionReleaseRecord[]> {
    const cache = this.readCache<ProductionReleaseRecord>(this.releasesCacheFile);
    return cache.filter((r) => r.projectId === projectId);
  }

  // --- Domains ---
  async createDomain(dom: ProjectDomainRecord): Promise<ProjectDomainRecord> {
    const cache = this.readCache<ProjectDomainRecord>(this.domainsCacheFile);
    cache.unshift(dom);
    this.writeCache(this.domainsCacheFile, cache);
    return dom;
  }

  async getDomainByProject(projectId: string): Promise<ProjectDomainRecord | null> {
    const cache = this.readCache<ProjectDomainRecord>(this.domainsCacheFile);
    return cache.find((d) => d.projectId === projectId) || null;
  }

  async updateDomain(id: string, updates: Partial<ProjectDomainRecord>): Promise<ProjectDomainRecord | null> {
    const cache = this.readCache<ProjectDomainRecord>(this.domainsCacheFile);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...updates };
      this.writeCache(this.domainsCacheFile, cache);
      return cache[idx];
    }
    return null;
  }
}

export const productionReleaseRepository = new ProductionReleaseRepository();