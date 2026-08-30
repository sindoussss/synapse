import fs from "fs";
import path from "path";

export interface PortfolioRecord {
  portfolioId: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPortfolioMembershipRecord {
  membershipId: string;
  portfolioId: string;
  projectId: string;
  clientId: string;
  organizationId: string;
  workspaceId: string;
  role: "PRIMARY" | "SECONDARY" | "ARCHIVED_MEMBER";
  joinedAt: string;
}

export class PortfolioRepository {
  private portfoliosFile = path.resolve(process.cwd(), ".portfolios_cache.json");
  private membershipsFile = path.resolve(process.cwd(), ".portfolio_memberships_cache.json");

  private readCache<T>(file: string): T[] {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
    return [];
  }

  private writeCache<T>(file: string, data: T[]): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }

  async savePortfolio(p: PortfolioRecord): Promise<PortfolioRecord> {
    const cache = this.readCache<PortfolioRecord>(this.portfoliosFile);
    const idx = cache.findIndex((item) => item.portfolioId === p.portfolioId);
    if (idx >= 0) cache[idx] = p;
    else cache.unshift(p);
    this.writeCache(this.portfoliosFile, cache);
    return p;
  }

  async getPortfolio(portfolioId: string): Promise<PortfolioRecord | null> {
    const cache = this.readCache<PortfolioRecord>(this.portfoliosFile);
    return cache.find((item) => item.portfolioId === portfolioId) || null;
  }

  async saveMembership(m: ProjectPortfolioMembershipRecord): Promise<ProjectPortfolioMembershipRecord> {
    const cache = this.readCache<ProjectPortfolioMembershipRecord>(this.membershipsFile);
    const idx = cache.findIndex((item) => item.membershipId === m.membershipId);
    if (idx >= 0) cache[idx] = m;
    else cache.unshift(m);
    this.writeCache(this.membershipsFile, cache);
    return m;
  }

  async getMembershipsByPortfolio(portfolioId: string): Promise<ProjectPortfolioMembershipRecord[]> {
    const cache = this.readCache<ProjectPortfolioMembershipRecord>(this.membershipsFile);
    return cache.filter((item) => item.portfolioId === portfolioId);
  }

  async getMembershipsByProject(projectId: string): Promise<ProjectPortfolioMembershipRecord[]> {
    const cache = this.readCache<ProjectPortfolioMembershipRecord>(this.membershipsFile);
    return cache.filter((item) => item.projectId === projectId);
  }
}

export const portfolioRepository = new PortfolioRepository();
