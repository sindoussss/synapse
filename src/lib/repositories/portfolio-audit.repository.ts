import fs from "fs";
import path from "path";

export interface PortfolioAuditRecord {
  auditId: string;
  portfolioId?: string;
  projectId?: string;
  organizationId: string;
  workspaceId: string;
  actor: string;
  action: string;
  result: "SUCCESS" | "BLOCKED" | "FAILED";
  reason?: string;
  timestamp: string;
  evidenceId?: string;
}

export class PortfolioAuditRepository {
  private auditsFile = path.resolve(process.cwd(), ".portfolio_audits_cache.json");

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

  async recordAudit(audit: PortfolioAuditRecord): Promise<PortfolioAuditRecord> {
    const cache = this.readCache<PortfolioAuditRecord>(this.auditsFile);
    cache.unshift(audit);
    this.writeCache(this.auditsFile, cache);
    return audit;
  }

  async getAuditsByPortfolio(portfolioId: string): Promise<PortfolioAuditRecord[]> {
    const cache = this.readCache<PortfolioAuditRecord>(this.auditsFile);
    return cache.filter((item) => item.portfolioId === portfolioId);
  }

  async getAuditsByProject(projectId: string): Promise<PortfolioAuditRecord[]> {
    const cache = this.readCache<PortfolioAuditRecord>(this.auditsFile);
    return cache.filter((item) => item.projectId === projectId);
  }
}

export const portfolioAuditRepository = new PortfolioAuditRepository();
