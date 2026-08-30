import { getSupabaseClient } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export interface OrganizationRecord {
  id: string;
  name: string;
  legalName?: string;
  status: "prospect" | "active_client" | "past_client" | "archived";
  primaryContactId?: string;
  createdAt: string;
  archivedAt?: string;
}

export interface OrganizationContactRecord {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
  source: string;
  verificationStatus: "verified" | "unverified" | "bounced";
  doNotContact: boolean;
  createdAt: string;
}

export interface ExecutionLeaseRecord {
  id: string;
  taskId: string;
  agentId: string;
  organizationId: string;
  projectId?: string;
  claimedAt: string;
  expiresAt: string;
  heartbeatAt: string;
}

export interface WorkspaceLockRecord {
  projectId: string;
  organizationId: string;
  lockedByExecutionId: string;
  lockedAt: string;
  expiresAt: string;
}

export interface IsolationIncidentRecord {
  id: string;
  incidentType: string;
  actor: string;
  executionId?: string;
  sourceOrganizationId: string;
  targetOrganizationId?: string;
  targetProjectId?: string;
  actionAttempted: string;
  blockedAt: string;
}

export class OrganizationRepository {
  private orgsCacheFile = path.resolve(process.cwd(), ".organizations_cache.json");
  private contactsCacheFile = path.resolve(process.cwd(), ".organization_contacts_cache.json");
  private leasesCacheFile = path.resolve(process.cwd(), ".execution_leases_cache.json");
  private locksCacheFile = path.resolve(process.cwd(), ".workspace_locks_cache.json");
  private incidentsCacheFile = path.resolve(process.cwd(), ".isolation_incidents_cache.json");

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

  // --- Organizations ---
  async createOrganization(org: OrganizationRecord): Promise<OrganizationRecord> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("organizations").insert({
          id: org.id,
          name: org.name,
          legal_name: org.legalName,
          status: org.status,
          primary_contact_id: org.primaryContactId,
          created_at: org.createdAt,
        });
      } catch {}
    }

    const cache = this.readCache<OrganizationRecord>(this.orgsCacheFile);
    cache.unshift(org);
    this.writeCache(this.orgsCacheFile, cache);
    return org;
  }

  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    const cache = this.readCache<OrganizationRecord>(this.orgsCacheFile);
    return cache.find((o) => o.id === id) || null;
  }

  async getAllOrganizations(): Promise<OrganizationRecord[]> {
    return this.readCache<OrganizationRecord>(this.orgsCacheFile);
  }

  // --- Contacts ---
  async createContact(contact: OrganizationContactRecord): Promise<OrganizationContactRecord> {
    const cache = this.readCache<OrganizationContactRecord>(this.contactsCacheFile);
    cache.unshift(contact);
    this.writeCache(this.contactsCacheFile, cache);
    return contact;
  }

  async getContactsByOrg(organizationId: string): Promise<OrganizationContactRecord[]> {
    const cache = this.readCache<OrganizationContactRecord>(this.contactsCacheFile);
    return cache.filter((c) => c.organizationId === organizationId);
  }

  async getContactById(id: string): Promise<OrganizationContactRecord | null> {
    const cache = this.readCache<OrganizationContactRecord>(this.contactsCacheFile);
    return cache.find((c) => c.id === id) || null;
  }

  // --- Leases ---
  async claimExecutionLease(lease: ExecutionLeaseRecord): Promise<{ success: boolean; lease?: ExecutionLeaseRecord; conflict?: ExecutionLeaseRecord }> {
    const cache = this.readCache<ExecutionLeaseRecord>(this.leasesCacheFile);
    const existing = cache.find((l) => l.taskId === lease.taskId && new Date(l.expiresAt).getTime() > Date.now());
    if (existing) {
      return { success: false, conflict: existing };
    }

    cache.unshift(lease);
    this.writeCache(this.leasesCacheFile, cache);
    return { success: true, lease };
  }

  async releaseExecutionLease(taskId: string): Promise<void> {
    let cache = this.readCache<ExecutionLeaseRecord>(this.leasesCacheFile);
    cache = cache.filter((l) => l.taskId !== taskId);
    this.writeCache(this.leasesCacheFile, cache);
  }

  // --- Workspace Locks ---
  async acquireWorkspaceLock(lock: WorkspaceLockRecord): Promise<{ acquired: boolean; existingLock?: WorkspaceLockRecord }> {
    const cache = this.readCache<WorkspaceLockRecord>(this.locksCacheFile);
    const existing = cache.find((l) => l.projectId === lock.projectId && new Date(l.expiresAt).getTime() > Date.now());
    if (existing && existing.lockedByExecutionId !== lock.lockedByExecutionId) {
      return { acquired: false, existingLock: existing };
    }

    const filtered = cache.filter((l) => l.projectId !== lock.projectId);
    filtered.unshift(lock);
    this.writeCache(this.locksCacheFile, filtered);
    return { acquired: true };
  }

  async releaseWorkspaceLock(projectId: string): Promise<void> {
    let cache = this.readCache<WorkspaceLockRecord>(this.locksCacheFile);
    cache = cache.filter((l) => l.projectId !== projectId);
    this.writeCache(this.locksCacheFile, cache);
  }

  // --- Incidents ---
  async logIncident(incident: IsolationIncidentRecord): Promise<IsolationIncidentRecord> {
    const cache = this.readCache<IsolationIncidentRecord>(this.incidentsCacheFile);
    cache.unshift(incident);
    this.writeCache(this.incidentsCacheFile, cache);
    return incident;
  }

  async getAllIncidents(): Promise<IsolationIncidentRecord[]> {
    return this.readCache<IsolationIncidentRecord>(this.incidentsCacheFile);
  }
}

export const organizationRepository = new OrganizationRepository();