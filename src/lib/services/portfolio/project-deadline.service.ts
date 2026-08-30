import fs from "fs";
import path from "path";

export interface ProjectDeadlineRecord {
  projectId: string;
  milestoneType: string;
  deadlineIso?: string;
  status: "ON_TRACK" | "AT_RISK" | "BREACHED" | "UNKNOWN";
  source: "CLIENT_CONTRACT" | "OPERATOR_SCHEDULE" | "UNKNOWN";
}

export class ProjectDeadlineService {
  getProjectDeadlines(projectId: string, explicitDeadline?: string): ProjectDeadlineRecord {
    if (!explicitDeadline) {
      return {
        projectId,
        milestoneType: "CLIENT_DELIVERY",
        status: "UNKNOWN",
        source: "UNKNOWN",
      };
    }
    return {
      projectId,
      milestoneType: "CLIENT_DELIVERY",
      deadlineIso: explicitDeadline,
      status: "ON_TRACK",
      source: "CLIENT_CONTRACT",
    };
  }
}

export const projectDeadlineService = new ProjectDeadlineService();
