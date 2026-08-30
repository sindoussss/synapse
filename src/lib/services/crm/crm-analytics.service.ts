import { crmRepository, CRMLead, CRMOpportunity, DataEnvironment } from "../../repositories/crm.repository";

export interface MetricFraction {
  numerator: number;
  denominator: number;
  ratePercent: number | "N/A" | "INSUFFICIENT_EVIDENCE";
  sampleSizeN: number;
  timeWindow: string;
  evidenceClassification: DataEnvironment;
  observationOnly: true;
}

export interface CRMAnalyticsReport {
  organizationId: string;
  environment: DataEnvironment;
  generatedAt: string;
  funnelCounts: Record<string, number>;
  conversionRates: {
    discoveryToVerification: MetricFraction;
    verificationToOpportunity: MetricFraction;
    opportunityToProposal: MetricFraction;
    proposalToWon: MetricFraction;
  };
  pipelineValueMinorUnits: number;
  supportedOpportunitiesCount: number;
  unsupportedValueOpportunitiesCount: number;
}

export class CRMAnalyticsService {
  computeMetricFraction(numerator: number, denominator: number, timeWindow: string, env: DataEnvironment): MetricFraction {
    if (denominator === 0) {
      return {
        numerator: 0,
        denominator: 0,
        ratePercent: "N/A",
        sampleSizeN: 0,
        timeWindow,
        evidenceClassification: env,
        observationOnly: true,
      };
    }

    if (denominator === 1) {
      return {
        numerator,
        denominator: 1,
        ratePercent: "INSUFFICIENT_EVIDENCE",
        sampleSizeN: 1,
        timeWindow,
        evidenceClassification: env,
        observationOnly: true,
      };
    }

    const rate = Math.round((numerator / denominator) * 10000) / 100;
    return {
      numerator,
      denominator,
      ratePercent: rate,
      sampleSizeN: denominator,
      timeWindow,
      evidenceClassification: env,
      observationOnly: true,
    };
  }

  generateReport(organizationId: string, env: DataEnvironment = "LIVE_REAL"): CRMAnalyticsReport {
    const leads = crmRepository.listLeads(organizationId, env);
    const opps = crmRepository.listOpportunities(organizationId, env);
    const props = crmRepository.listProposals(organizationId);

    const funnelCounts: Record<string, number> = {
      DISCOVERED: 0,
      VERIFIED: 0,
      QUALIFIED: 0,
      CONTACTED: 0,
      ENGAGED: 0,
      OPPORTUNITY: 0,
      PROPOSAL: 0,
      AGREEMENT: 0,
      CUSTOMER: 0,
      PROJECT: 0,
    };

    for (const lead of leads) {
      if (funnelCounts[lead.lifecycleStage] !== undefined) {
        funnelCounts[lead.lifecycleStage]++;
      }
    }

    const discoveredCount = leads.length;
    const verifiedCount = leads.filter((l) => l.verificationState === "VERIFIED").length;
    const oppsCount = opps.length;
    const propsCount = props.length;
    const wonCount = opps.filter((o) => o.stage === "CLOSED_WON").length;

    let totalValueMinor = 0;
    let supportedCount = 0;
    let unsupportedCount = 0;

    for (const opp of opps) {
      if (typeof opp.expectedValue === "number") {
        totalValueMinor += opp.expectedValue;
        supportedCount++;
      } else {
        unsupportedCount++;
      }
    }

    const timeWindow = "All-Time (Tenant Bound)";

    return {
      organizationId,
      environment: env,
      generatedAt: new Date().toISOString(),
      funnelCounts,
      conversionRates: {
        discoveryToVerification: this.computeMetricFraction(verifiedCount, discoveredCount, timeWindow, env),
        verificationToOpportunity: this.computeMetricFraction(oppsCount, verifiedCount, timeWindow, env),
        opportunityToProposal: this.computeMetricFraction(propsCount, oppsCount, timeWindow, env),
        proposalToWon: this.computeMetricFraction(wonCount, propsCount, timeWindow, env),
      },
      pipelineValueMinorUnits: totalValueMinor,
      supportedOpportunitiesCount: supportedCount,
      unsupportedValueOpportunitiesCount: unsupportedCount,
    };
  }
}

export const crmAnalyticsService = new CRMAnalyticsService();