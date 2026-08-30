import fs from "fs";
import path from "path";

export type OperationalState = "NORMAL" | "DEGRADED" | "READ_ONLY" | "EMERGENCY_STOP";

export interface KillSwitchRecord {
  state: OperationalState;
  activatedAt?: string;
  activatedBy?: string;
  reason?: string;
  auditTrail: Array<{ timestamp: string; from: OperationalState; to: OperationalState; actor: string; reason: string }>;
}

const STATE_FILE = path.resolve(process.cwd(), ".data", "operational-state.json");

export const ALLOWED_IN_EMERGENCY_STOP: string[] = [
  "HEALTH_CHECK",
  "AUDIT_INSPECTION",
  "INCIDENT_CREATION",
  "EVIDENCE_COLLECTION",
  "OPERATOR_RECOVERY_ACTION",
];

export const BLOCKED_IN_EMERGENCY_STOP: string[] = [
  "DEPLOYMENT",
  "SOURCE_MUTATION",
  "MAINTENANCE_MUTATION",
  "PAYMENT_MUTATION",
  "SOURCE_DELIVERY",
  "AUTONOMOUS_REPAIR",
];

export const BLOCKED_IN_READ_ONLY: string[] = [
  "DEPLOYMENT",
  "SOURCE_MUTATION",
  "PAYMENT_MUTATION",
];

export class EmergencyKillSwitchService {
  private record: KillSwitchRecord;

  constructor() {
    this.record = this.load();
  }

  private load(): KillSwitchRecord {
    const dataDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(STATE_FILE)) {
      try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { /* fall through */ }
    }
    return { state: "NORMAL", auditTrail: [] };
  }

  private persist(): void {
    const dataDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.record, null, 2), "utf8");
  }

  getState(): OperationalState {
    return this.record.state;
  }

  /** Operator-authorized state transition. Audited and persisted. */
  transition(to: OperationalState, actor: string, reason: string): { success: boolean; from: OperationalState; to: OperationalState } {
    const from = this.record.state;
    this.record.auditTrail.push({ timestamp: new Date().toISOString(), from, to, actor, reason });
    this.record.state = to;
    if (to !== "NORMAL") {
      this.record.activatedAt = new Date().toISOString();
      this.record.activatedBy = actor;
      this.record.reason = reason;
    }
    this.persist();
    return { success: true, from, to };
  }

  /** Check whether an operation is allowed in the current state. */
  isOperationAllowed(operationType: string): { allowed: boolean; blockedReason?: string } {
    const state = this.record.state;

    if (state === "EMERGENCY_STOP") {
      if (!ALLOWED_IN_EMERGENCY_STOP.includes(operationType)) {
        return { allowed: false, blockedReason: `EMERGENCY_STOP active. Operation '${operationType}' is blocked. Only health/audit/incident/recovery actions allowed.` };
      }
      return { allowed: true };
    }

    if (state === "READ_ONLY") {
      if (BLOCKED_IN_READ_ONLY.includes(operationType)) {
        return { allowed: false, blockedReason: `READ_ONLY mode active. Mutation operation '${operationType}' is blocked.` };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }

  getAuditTrail(): KillSwitchRecord["auditTrail"] {
    return [...this.record.auditTrail];
  }
}

export const emergencyKillSwitch = new EmergencyKillSwitchService();
