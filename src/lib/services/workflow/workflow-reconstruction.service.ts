import { workflowEventRepository, WorkflowEventRecord } from "../../repositories/workflow-event.repository";
import { workflowSnapshotRepository, WorkflowSnapshotRecord } from "../../repositories/workflow-snapshot.repository";

export interface ReconstructedWorkflowState {
  workflowId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  environment: "production" | "staging" | "sandbox";
  currentState: string;
  reconstructedAtSequence: number;
  totalEventsProcessed: number;
  activeWorkItems: string[];
  blockedWorkItems: string[];
  pendingApprovals: string[];
  pendingPayments: string[];
  activeIncidents: string[];
  activeDeployments: string[];
  currentRelease?: string;
  lastEventId: string;
  isConsistentWithSnapshot: boolean;
  discrepancies: string[];
}

export class WorkflowReconstructionService {
  replayWorkflowUntil(workflowId: string, maxSequence?: number): ReconstructedWorkflowState | null {
    const allEvents = workflowEventRepository.listEvents({ workflowId });
    if (allEvents.length === 0) return null;

    const targetEvents = maxSequence
      ? allEvents.filter((e) => e.sequenceNumber <= maxSequence)
      : allEvents;

    if (targetEvents.length === 0) return null;

    const firstEvent = targetEvents[0];
    let currentState = "INTAKE";
    let activeWorkItems: string[] = [];
    let blockedWorkItems: string[] = [];
    let pendingApprovals: string[] = [];
    let pendingPayments: string[] = [];
    let activeIncidents: string[] = [];
    let activeDeployments: string[] = [];
    let currentRelease: string | undefined = undefined;

    for (const evt of targetEvents) {
      if (evt.nextState) {
        currentState = evt.nextState;
      }

      switch (evt.eventType) {
        case "WORK_READY":
          if (evt.workItemId && !activeWorkItems.includes(evt.workItemId)) {
            activeWorkItems.push(evt.workItemId);
          }
          break;
        case "WORK_COMPLETED":
          if (evt.workItemId) {
            activeWorkItems = activeWorkItems.filter((id) => id !== evt.workItemId);
          }
          break;
        case "WORK_FAILED":
          if (evt.workItemId && !blockedWorkItems.includes(evt.workItemId)) {
            blockedWorkItems.push(evt.workItemId);
            activeWorkItems = activeWorkItems.filter((id) => id !== evt.workItemId);
          }
          break;
        case "APPROVAL_REQUESTED":
          if (!pendingApprovals.includes("CLIENT_APPROVAL")) {
            pendingApprovals.push("CLIENT_APPROVAL");
          }
          break;
        case "CLIENT_APPROVED":
          pendingApprovals = pendingApprovals.filter((a) => a !== "CLIENT_APPROVAL");
          break;
        case "PAYMENT_CREATED":
          if (!pendingPayments.includes("INITIAL_DEPOSIT")) {
            pendingPayments.push("INITIAL_DEPOSIT");
          }
          break;
        case "PAYMENT_VERIFIED":
          pendingPayments = pendingPayments.filter((p) => p !== "INITIAL_DEPOSIT");
          break;
        case "INCIDENT_CREATED":
          if (evt.payloadReference && !activeIncidents.includes(evt.payloadReference)) {
            activeIncidents.push(evt.payloadReference);
          }
          break;
        case "INCIDENT_RESOLVED":
          if (evt.payloadReference) {
            activeIncidents = activeIncidents.filter((id) => id !== evt.payloadReference);
          }
          break;
        case "DEPLOYMENT_STARTED":
          if (evt.payloadReference && !activeDeployments.includes(evt.payloadReference)) {
            activeDeployments.push(evt.payloadReference);
          }
          break;
        case "DEPLOYMENT_COMPLETED":
          if (evt.payloadReference) {
            activeDeployments = activeDeployments.filter((id) => id !== evt.payloadReference);
          }
          break;
        case "RELEASE_CREATED":
          currentRelease = evt.payloadReference;
          break;
      }
    }

    const lastEvent = targetEvents[targetEvents.length - 1];

    // Check consistency with snapshot if available
    const snapshot = workflowSnapshotRepository.getLatestSnapshot(workflowId);
    const discrepancies: string[] = [];
    let isConsistent = true;

    if (snapshot && !maxSequence) {
      if (snapshot.currentState !== currentState) {
        isConsistent = false;
        discrepancies.push(
          `STATE_RECONSTRUCTION_MISMATCH: Replayed state '${currentState}' differs from snapshot state '${snapshot.currentState}'.`
        );
      }
    }

    return {
      workflowId,
      projectId: firstEvent.projectId,
      organizationId: firstEvent.organizationId,
      workspaceId: firstEvent.workspaceId,
      environment: firstEvent.environment,
      currentState,
      reconstructedAtSequence: lastEvent.sequenceNumber,
      totalEventsProcessed: targetEvents.length,
      activeWorkItems,
      blockedWorkItems,
      pendingApprovals,
      pendingPayments,
      activeIncidents,
      activeDeployments,
      currentRelease,
      lastEventId: lastEvent.eventId,
      isConsistentWithSnapshot: isConsistent,
      discrepancies,
    };
  }

  replayWorkflow(workflowId: string): ReconstructedWorkflowState | null {
    return this.replayWorkflowUntil(workflowId);
  }
}

export const workflowReconstructionService = new WorkflowReconstructionService();