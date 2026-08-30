import { crmRepository, CRMActivityRecord } from "../../repositories/crm.repository";

export class ActivityService {
  record(params: {
    organizationId: string;
    leadId?: string;
    opportunityId?: string;
    actor: string;
    actorRole: "OPERATOR" | "AI_ASSISTANT" | "CLIENT" | "SYSTEM";
    type: string;
    description: string;
    evidenceId?: string;
  }): CRMActivityRecord {
    const activity: CRMActivityRecord = {
      activityId: `ACT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      organizationId: params.organizationId,
      leadId: params.leadId,
      opportunityId: params.opportunityId,
      actor: params.actor,
      actorRole: params.actorRole,
      type: params.type,
      description: params.description,
      evidenceId: params.evidenceId,
      timestamp: new Date().toISOString(),
    };
    return crmRepository.recordActivity(activity);
  }

  getTimeline(organizationId: string, filter?: { leadId?: string; opportunityId?: string }): CRMActivityRecord[] {
    return crmRepository.listActivities(organizationId, filter).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export const activityService = new ActivityService();