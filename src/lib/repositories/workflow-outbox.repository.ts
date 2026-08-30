import fs from "fs";
import path from "path";
import crypto from "crypto";

export type OutboxStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "DEAD_LETTER";

export interface OutboxEventRecord {
  outboxId: string;
  eventId: string;
  eventType: string;
  destination: string;
  payloadReference?: string;
  status: OutboxStatus;
  retryCount: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowOutboxRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "workflow-outbox.json");
  private records: OutboxEventRecord[] = [];

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.records = raw.records || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        records: this.records,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  addOutboxEvent(event: Omit<OutboxEventRecord, "outboxId" | "createdAt" | "updatedAt">): OutboxEventRecord {
    const existing = this.records.find((r) => r.idempotencyKey === event.idempotencyKey);
    if (existing) {
      return { ...existing };
    }

    const now = new Date().toISOString();
    const record: OutboxEventRecord = {
      ...event,
      outboxId: `OUTBOX-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    this.saveState();
    return { ...record };
  }

  updateOutboxStatus(outboxId: string, status: OutboxStatus): OutboxEventRecord | null {
    const idx = this.records.findIndex((r) => r.outboxId === outboxId);
    if (idx === -1) return null;
    this.records[idx].status = status;
    this.records[idx].updatedAt = new Date().toISOString();
    this.saveState();
    return { ...this.records[idx] };
  }

  listOutboxEvents(filter?: { status?: OutboxStatus }): OutboxEventRecord[] {
    return this.records
      .filter((r) => {
        if (filter?.status && r.status !== filter.status) return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }
}

export const workflowOutboxRepository = new WorkflowOutboxRepository();