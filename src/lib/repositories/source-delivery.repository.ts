import fs from "fs";
import path from "path";

export type DeliveryStatus =
  | "DELIVERY_BLOCKED"
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFICATION_FAILED"
  | "ELIGIBILITY_CHECK_FAILED"
  | "PACKAGE_GENERATING"
  | "PACKAGE_READY"
  | "DELIVERY_AUTHORIZED"
  | "DOWNLOADED"
  | "DELIVERY_INVALIDATED"
  | "REVOKED";

export interface SourceDeliveryRecord {
  deliveryId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  clientId: string;
  invoiceId: string;
  paymentId: string;
  releaseCandidateId: string;
  snapshotId: string;
  sourceHash: string;
  manifestHash: string;
  packageHash: string;
  status: DeliveryStatus;
  createdAt: string;
  authorizedAt?: string;
  downloadedAt?: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  fileCount: number;
  totalSizeBytes: number;
}

export interface DeliveryAuditRecord {
  auditId: string;
  timestamp: string;
  actor: string;
  projectId: string;
  clientId: string;
  deliveryId?: string;
  action: string;
  result: "SUCCESS" | "BLOCKED" | "FAILED";
  reason?: string;
  evidenceId?: string;
}

export class SourceDeliveryRepository {
  private deliveriesFile = path.resolve(process.cwd(), ".source_deliveries_cache.json");
  private auditsFile = path.resolve(process.cwd(), ".source_delivery_audits_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }

  async saveDelivery(d: SourceDeliveryRecord): Promise<SourceDeliveryRecord> {
    const cache = this.readCache<SourceDeliveryRecord>(this.deliveriesFile);
    const idx = cache.findIndex((item) => item.deliveryId === d.deliveryId);
    if (idx >= 0) cache[idx] = d;
    else cache.unshift(d);
    this.writeCache(this.deliveriesFile, cache);
    return d;
  }

  async getDelivery(deliveryId: string): Promise<SourceDeliveryRecord | null> {
    const cache = this.readCache<SourceDeliveryRecord>(this.deliveriesFile);
    return cache.find((item) => item.deliveryId === deliveryId) || null;
  }

  async getDeliveryByProject(projectId: string): Promise<SourceDeliveryRecord | null> {
    const cache = this.readCache<SourceDeliveryRecord>(this.deliveriesFile);
    return cache.find((item) => item.projectId === projectId) || null;
  }

  async listDeliveriesByInvoice(invoiceId: string): Promise<SourceDeliveryRecord[]> {
    const cache = this.readCache<SourceDeliveryRecord>(this.deliveriesFile);
    return cache.filter((item) => item.invoiceId === invoiceId);
  }

  async recordAudit(audit: DeliveryAuditRecord): Promise<DeliveryAuditRecord> {
    const cache = this.readCache<DeliveryAuditRecord>(this.auditsFile);
    cache.unshift(audit);
    this.writeCache(this.auditsFile, cache);
    return audit;
  }

  async getAuditsByProject(projectId: string): Promise<DeliveryAuditRecord[]> {
    const cache = this.readCache<DeliveryAuditRecord>(this.auditsFile);
    return cache.filter((item) => item.projectId === projectId);
  }
}

export const sourceDeliveryRepository = new SourceDeliveryRepository();
