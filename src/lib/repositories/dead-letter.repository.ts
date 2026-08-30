import fs from "fs";
import path from "path";

export interface DeadLetterRecord {
  deadLetterId: string;
  workItemId: string;
  projectId: string;
  organizationId: string;
  failureChain: string[];
  retryAttempts: number;
  provider: string;
  error: string;
  evidence: string;
  lastWorkerId: string;
  createdAt: string;
}

export class DeadLetterRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "dead-letter.json");
  private records: DeadLetterRecord[] = [];

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

  addDeadLetter(record: Omit<DeadLetterRecord, "deadLetterId" | "createdAt">): DeadLetterRecord {
    const dl: DeadLetterRecord = {
      deadLetterId: `DLQ-${Date.now().toString().slice(-4)}`,
      ...record,
      createdAt: new Date().toISOString(),
    };
    this.records.push({ ...dl });
    this.saveState();
    return { ...dl };
  }

  listDeadLetters(filter?: { organizationId?: string; projectId?: string }): DeadLetterRecord[] {
    return this.records
      .filter((r) => {
        if (filter?.organizationId && r.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && r.projectId !== filter.projectId) return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }
}

export const deadLetterRepository = new DeadLetterRepository();