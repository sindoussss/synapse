import fs from "fs";
import path from "path";
import crypto from "crypto";

export type WorkflowEventType =
  | "PROJECT_CREATED"
  | "PROJECT_STATE_CHANGED"
  | "REQUIREMENT_CREATED"
  | "REQUIREMENT_VERIFIED"
  | "REQUIREMENT_CLARIFICATION_REQUIRED"
  | "DESIGN_CREATED"
  | "DESIGN_APPROVED"
  | "IMPLEMENTATION_STARTED"
  | "IMPLEMENTATION_COMPLETED"
  | "CODE_REVIEW_STARTED"
  | "CODE_REVIEW_COMPLETED"
  | "VISUAL_REVIEW_STARTED"
  | "VISUAL_REVIEW_COMPLETED"
  | "QA_STARTED"
  | "QA_COMPLETED"
  | "QA_FAILED"
  | "BUILD_STARTED"
  | "BUILD_COMPLETED"
  | "BUILD_FAILED"
  | "APPROVAL_REQUESTED"
  | "CLIENT_APPROVED"
  | "CLIENT_REJECTED"
  | "OPERATOR_APPROVED"
  | "RELEASE_CREATED"
  | "RELEASE_INVALIDATED"
  | "PAYMENT_CREATED"
  | "PAYMENT_VERIFICATION_STARTED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_REVERSED"
  | "PAYMENT_DISPUTED"
  | "DELIVERY_CREATED"
  | "DELIVERY_AUTHORIZED"
  | "DELIVERY_REVOKED"
  | "DOWNLOAD_COMPLETED"
  | "DEPLOYMENT_STARTED"
  | "DEPLOYMENT_COMPLETED"
  | "DEPLOYMENT_FAILED"
  | "ROLLBACK_STARTED"
  | "ROLLBACK_COMPLETED"
  | "INCIDENT_CREATED"
  | "INCIDENT_ESCALATED"
  | "INCIDENT_RESOLVED"
  | "CHANGE_REQUEST_CREATED"
  | "CHANGE_REQUEST_APPROVED"
  | "CHANGE_REQUEST_IMPLEMENTED"
  | "WORK_CREATED"
  | "WORK_READY"
  | "WORK_CLAIMED"
  | "WORK_STARTED"
  | "WORK_COMPLETED"
  | "WORK_FAILED"
  | "WORKER_STARTED"
  | "WORKER_STOPPED"
  | "WORKER_STALE"
  | "HUMAN_REVIEW_REQUIRED"
  | "SYSTEM_DEGRADED"
  | "SYSTEM_RECOVERED"
  | "EMERGENCY_STOP_ACTIVATED"
  | "EMERGENCY_STOP_RELEASED";

export interface WorkflowEventRecord {
  eventId: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  workflowId: string;
  executionId: string;
  workItemId?: string;
  eventType: WorkflowEventType;
  eventVersion: string;
  actorType: "OPERATOR" | "CLIENT" | "DEVELOPER_AGENT" | "QA_AGENT" | "SALES_AGENT" | "SYSTEM_DAEMON";
  actorId: string;
  previousState: string;
  nextState: string;
  payloadReference?: string;
  evidenceIds: string[];
  parentEventId?: string;
  correlationId: string;
  causationId: string;
  timestamp: string;
  sequenceNumber: number;
  eventHash: string;
  previousEventHash: string;
}

export class WorkflowEventRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "workflow-events.json");
  private events: WorkflowEventRecord[] = [];

  constructor() {
    this.loadState();
    if (this.events.length === 0) {
      this.seedInitialEvents();
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.events = raw.events || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        events: this.events,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  computeEventHash(payload: Omit<WorkflowEventRecord, "eventHash">): string {
    const canonical = JSON.stringify({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      workspaceId: payload.workspaceId,
      workflowId: payload.workflowId,
      eventType: payload.eventType,
      eventVersion: payload.eventVersion,
      actorType: payload.actorType,
      actorId: payload.actorId,
      previousState: payload.previousState,
      nextState: payload.nextState,
      sequenceNumber: payload.sequenceNumber,
      previousEventHash: payload.previousEventHash,
      timestamp: payload.timestamp,
    });
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }

  private seedInitialEvents(): void {
    const orgId = "ORG-CASILI-01";
    const projId = "PRJ-SINDOUS-01";
    const wfId = "WF-PRJ-SINDOUS-01";
    const now = "2026-08-30T08:00:00.000Z";

    const initialEventPayload: Omit<WorkflowEventRecord, "eventHash"> = {
      eventId: "EVT-0001",
      organizationId: orgId,
      projectId: projId,
      workspaceId: "WS-SINDOUS-01",
      environment: "production",
      workflowId: wfId,
      executionId: "EXEC-INIT-01",
      eventType: "PROJECT_CREATED",
      eventVersion: "v1.0.0",
      actorType: "OPERATOR",
      actorId: "operator_01",
      previousState: "NONE",
      nextState: "INTAKE",
      evidenceIds: ["EVID-PROJ-01"],
      correlationId: "CORR-0001",
      causationId: "ROOT",
      timestamp: now,
      sequenceNumber: 1,
      previousEventHash: "0".repeat(64),
    };

    const initialEvent: WorkflowEventRecord = {
      ...initialEventPayload,
      eventHash: this.computeEventHash(initialEventPayload),
    };

    this.events = [initialEvent];
    this.saveState();
  }

  appendEvent(eventData: Omit<WorkflowEventRecord, "eventId" | "sequenceNumber" | "eventHash" | "previousEventHash" | "timestamp">): WorkflowEventRecord {
    const projectEvents = this.events
      .filter((e) => e.workflowId === eventData.workflowId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const prevEvent = projectEvents.length > 0 ? projectEvents[projectEvents.length - 1] : null;
    const nextSeq = prevEvent ? prevEvent.sequenceNumber + 1 : 1;
    const prevHash = prevEvent ? prevEvent.eventHash : "0".repeat(64);
    const now = new Date().toISOString();
    const eventId = `EVT-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;

    const rawPayload: Omit<WorkflowEventRecord, "eventHash"> = {
      ...eventData,
      eventId,
      sequenceNumber: nextSeq,
      previousEventHash: prevHash,
      timestamp: now,
    };

    const eventHash = this.computeEventHash(rawPayload);
    const newEvent: WorkflowEventRecord = {
      ...rawPayload,
      eventHash,
    };

    this.events.push(newEvent);
    this.saveState();
    return { ...newEvent };
  }

  listEvents(filter?: {
    workflowId?: string;
    projectId?: string;
    organizationId?: string;
  }): WorkflowEventRecord[] {
    return this.events
      .filter((e) => {
        if (filter?.workflowId && e.workflowId !== filter.workflowId) return false;
        if (filter?.projectId && e.projectId !== filter.projectId) return false;
        if (filter?.organizationId && e.organizationId !== filter.organizationId) return false;
        return true;
      })
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((e) => ({ ...e }));
  }

  verifyChainIntegrity(workflowId: string): { valid: boolean; violationType?: string; details?: string } {
    const wfEvents = this.listEvents({ workflowId });
    if (wfEvents.length === 0) return { valid: true };

    let expectedPrevHash = "0".repeat(64);
    for (let i = 0; i < wfEvents.length; i++) {
      const evt = wfEvents[i];
      if (evt.sequenceNumber !== i + 1) {
        return {
          valid: false,
          violationType: "EVENT_SEQUENCE_VIOLATION",
          details: `Expected sequence ${i + 1} but got ${evt.sequenceNumber} at event ${evt.eventId}.`,
        };
      }
      if (evt.previousEventHash !== expectedPrevHash) {
        return {
          valid: false,
          violationType: "EVENT_CHAIN_INTEGRITY_VIOLATION",
          details: `Previous event hash mismatch at event ${evt.eventId}. Expected ${expectedPrevHash}, got ${evt.previousEventHash}.`,
        };
      }

      const { eventHash, ...payload } = evt;
      const recomputedHash = this.computeEventHash(payload);
      if (eventHash !== recomputedHash) {
        return {
          valid: false,
          violationType: "EVENT_CHAIN_INTEGRITY_VIOLATION",
          details: `Computed hash mismatch for event ${evt.eventId}. Expected ${recomputedHash}, got ${eventHash}.`,
        };
      }

      expectedPrevHash = evt.eventHash;
    }

    return { valid: true };
  }
}

export const workflowEventRepository = new WorkflowEventRepository();