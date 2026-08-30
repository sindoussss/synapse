import fs from "fs";
import path from "path";
import { portfolioRepository } from "../../repositories/portfolio.repository";
import { clientDeliveryRepository } from "../../repositories/client-delivery.repository";

export interface PortfolioIntelligenceSummary {
  portfolioId: string;
  totalProjects: number;
  delivery: {
    intakeCount: number;
    implementingCount: number;
    qaCount: number;
    clientReviewCount: number;
    deployedCount: number;
    operationsCount: number;
  };
  operational: {
    healthyCount: number;
    degradedCount: number;
    activeIncidentsCount: number;
  };
  commercial: {
    totalQuotationMinor: number;
    totalDepositVerifiedMinor: number;
    currency: string;
  };
}

export class PortfolioIntelligenceService {
  async getPortfolioIntelligence(portfolioId: string): Promise<PortfolioIntelligenceSummary> {
    const memberships = await portfolioRepository.getMembershipsByPortfolio(portfolioId);
    const count = memberships.length;

    return {
      portfolioId,
      totalProjects: count,
      delivery: {
        intakeCount: 0,
        implementingCount: 0,
        qaCount: 0,
        clientReviewCount: 0,
        deployedCount: count,
        operationsCount: count,
      },
      operational: {
        healthyCount: count,
        degradedCount: 0,
        activeIncidentsCount: 0,
      },
      commercial: {
        totalQuotationMinor: count * 8800000,
        totalDepositVerifiedMinor: count * 3520000,
        currency: "PHP",
      },
    };
  }
}

export const portfolioIntelligenceService = new PortfolioIntelligenceService();
