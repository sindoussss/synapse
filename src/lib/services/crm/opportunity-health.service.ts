import { crmRepository, CRMOpportunity, CRMProposal } from "../../repositories/crm.repository";

export interface HealthCheckFinding {
  code: string;
  category: "REQUIREMENTS" | "PROPOSAL" | "AGREEMENT" | "PAYMENT" | "ENGAGEMENT";
  severity: "INFO" | "WARNING" | "BLOCKING";
  description: string;
}

export interface OpportunityHealthAssessment {
  opportunityId: string;
  organizationId: string;
  health: "HEALTHY" | "AT_RISK" | "BLOCKED" | "UNKNOWN";
  findings: HealthCheckFinding[];
  recommendedAction: string;
  evaluatedAt: string;
}

export class OpportunityHealthService {
  assessHealth(opportunityId: string, organizationId: string): OpportunityHealthAssessment {
    const opp = crmRepository.getOpportunity(opportunityId, organizationId);
    if (!opp) {
      return {
        opportunityId,
        organizationId,
        health: "UNKNOWN",
        findings: [{ code: "OPP_NOT_FOUND", category: "ENGAGEMENT", severity: "BLOCKING", description: "Opportunity record not found." }],
        recommendedAction: "Verify opportunity identifier.",
        evaluatedAt: new Date().toISOString(),
      };
    }

    const findings: HealthCheckFinding[] = [];
    const proposals = crmRepository.listProposals(organizationId).filter((p) => p.opportunityId === opportunityId);

    // 1. Stage-based checks
    if (opp.stage === "DISCOVERY") {
      findings.push({
        code: "DISCOVERY_INCOMPLETE",
        category: "REQUIREMENTS",
        severity: "INFO",
        description: "Opportunity is in early discovery. Requirements must be confirmed before quoting.",
      });
    }

    // 2. Proposal status checks
    if (opp.stage === "PROPOSAL_PENDING" && proposals.length === 0) {
      findings.push({
        code: "PROPOSAL_DRAFT_PENDING",
        category: "PROPOSAL",
        severity: "WARNING",
        description: "Commercial intent expressed, but proposal has not yet been drafted.",
      });
    }

    // 3. Stale proposal checks
    const sentProposal = proposals.find((p) => p.status === "SENT");
    if (sentProposal && sentProposal.sentAt) {
      const sentTime = new Date(sentProposal.sentAt).getTime();
      const ageDays = (Date.now() - sentTime) / (1000 * 60 * 60 * 24);
      if (ageDays > 7) {
        findings.push({
          code: "PROPOSAL_AGING",
          category: "PROPOSAL",
          severity: "WARNING",
          description: `Proposal '${sentProposal.title}' sent ${Math.floor(ageDays)} days ago with no response.`,
        });
      }
    }

    // 4. Closed / Agreement checks
    if (opp.stage === "CLOSED_LOST") {
      findings.push({
        code: "DEAL_CLOSED_LOST",
        category: "ENGAGEMENT",
        severity: "BLOCKING",
        description: "Opportunity closed as lost.",
      });
    }

    // Determine overall health
    const hasBlocking = findings.some((f) => f.severity === "BLOCKING");
    const hasWarning = findings.some((f) => f.severity === "WARNING");

    let health: OpportunityHealthAssessment["health"] = "HEALTHY";
    let recommendedAction = "Proceed with scheduled next sales actions.";

    if (hasBlocking) {
      health = "BLOCKED";
      recommendedAction = "Review blocking findings and resolve with client or archive opportunity.";
    } else if (hasWarning) {
      health = "AT_RISK";
      recommendedAction = "Execute operator follow-up task to address open warnings.";
    }

    return {
      opportunityId,
      organizationId,
      health,
      findings,
      recommendedAction,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const opportunityHealthService = new OpportunityHealthService();