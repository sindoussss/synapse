import fs from "fs";
import path from "path";

export type WorkItemType =
  | "APPROVAL_REQUIRED"
  | "CLIENT_REVIEW_REQUIRED"
  | "CLARIFICATION_REQUIRED"
  | "SECURITY_REVIEW_REQUIRED"
  | "INCIDENT_RESPONSE_REQUIRED"
  | "ROLLBACK_REVIEW_REQUIRED"
  | "CHANGE_AUTHORIZATION_REQUIRED"
  | "DEPLOYMENT_READY"
  | "HANDOFF_READY"
  | "MAINTENANCE_REVIEW_REQUIRED";

export interface OperatorWorkItem {
  itemId: string;
  projectId: string;
  organizationId: string;
  type: WorkItemType;
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
  description: string;
  evidenceId: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
}

export class OperatorWorkQueueService {
  private queue: OperatorWorkItem[] = [];

  createItem(item: Omit<OperatorWorkItem, "itemId" | "status" | "createdAt">): OperatorWorkItem {
    const fullItem: OperatorWorkItem = {
      ...item,
      itemId: `WORK-${Date.now().toString().slice(-4)}`,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    this.queue.unshift(fullItem);
    return fullItem;
  }

  getItemsByTenant(orgId: string): OperatorWorkItem[] {
    return this.queue.filter((item) => item.organizationId === orgId);
  }
}

export const operatorWorkQueueService = new OperatorWorkQueueService();
