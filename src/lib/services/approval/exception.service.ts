import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExceptionRecord {
  exceptionId: string;
  type: string;
  severity: ExceptionSeverity;
  projectId: string;
  organizationId: string;
  evidence: string[];
  currentState: string;
  blockingCondition: string;
  safeNextAction: string;
  responsibleActor: "OPERATOR" | "ADMIN" | "CLIENT";
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export class ExceptionService {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "exceptions.json");
  private exceptions: ExceptionRecord[] = [];

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.exceptions = raw.exceptions || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        exceptions: this.exceptions,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  createException(exc: Omit<ExceptionRecord, "exceptionId" | "resolved" | "createdAt">): ExceptionRecord {
    const id = `EXC-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ExceptionRecord = {
      ...exc,
      exceptionId: id,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    this.exceptions.push(record);
    this.saveState();
    return { ...record };
  }

  listExceptions(filter?: { organizationId?: string; projectId?: string; resolved?: boolean }): ExceptionRecord[] {
    return this.exceptions
      .filter((e) => {
        if (filter?.organizationId && e.organizationId !== filter.organizationId) return false;
        if (filter?.projectId && e.projectId !== filter.projectId) return false;
        if (filter?.resolved !== undefined && e.resolved !== filter.resolved) return false;
        return true;
      })
      .map((e) => ({ ...e }));
  }

  resolveException(exceptionId: string): ExceptionRecord | null {
    const idx = this.exceptions.findIndex((e) => e.exceptionId === exceptionId);
    if (idx === -1) return null;
    this.exceptions[idx].resolved = true;
    this.exceptions[idx].resolvedAt = new Date().toISOString();
    this.saveState();
    return { ...this.exceptions[idx] };
  }
}

export const exceptionService = new ExceptionService();