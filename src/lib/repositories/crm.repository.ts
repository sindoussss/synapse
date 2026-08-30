import fs from "fs";
import path from "path";
import crypto from "crypto";

export type LeadLifecycleStage =
  | "DISCOVERED"
  | "VERIFIED"
  | "QUALIFIED"
  | "CONTACTED"
  | "ENGAGED"
  | "OPPORTUNITY"
  | "PROPOSAL"
  | "AGREEMENT"
  | "CUSTOMER"
  | "PROJECT";

export type OpportunityStage =
  | "DISCOVERY"
  | "QUALIFIED"
  | "PROPOSAL_PENDING"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "AGREEMENT_PENDING"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type ContactClassification =
  | "PUBLIC_BUSINESS"
  | "CONTROLLED_TEST"
  | "PRIVATE"
  | "UNVERIFIED";

export type DataEnvironment =
  | "LIVE_REAL"
  | "CONTROLLED_TEST"
  | "SYNTHETIC"
  | "SIMULATION";

export interface CRMContact {
  contactId: string;
  organizationId: string;
  name?: string;
  email: string;
  phone?: string;
  sourceUrl?: string;
  verificationState: "VERIFIED" | "UNVERIFIED" | "SUSPICIOUS";
  contactType: ContactClassification;
  dncStatus: boolean;
  dncReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMLead {
  leadId: string;
  organizationId: string;
  companyName: string;
  industry: string;
  website?: string;
  domain?: string;
  source: string;
  sourceUrl?: string;
  contactId?: string;
  lifecycleStage: LeadLifecycleStage;
  verificationState: "VERIFIED" | "UNVERIFIED" | "REJECTED";
  qualificationState: "QUALIFIED" | "UNQUALIFIED" | "PENDING";
  owner: string;
  environment: DataEnvironment;
  verificationEvidence?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMOpportunity {
  opportunityId: string;
  organizationId: string;
  leadId: string;
  projectId?: string;
  stage: OpportunityStage;
  expectedValue: number | "UNKNOWN";
  currency: string;
  probability: number | "UNKNOWN";
  evidence: string;
  environment: DataEnvironment;
  createdAt: string;
  updatedAt: string;
}

export interface CRMProposal {
  proposalId: string;
  organizationId: string;
  opportunityId: string;
  leadId: string;
  version: number;
  status: "DRAFT" | "VALIDATING" | "OPERATOR_REVIEW" | "APPROVED" | "SENT" | "VIEWED" | "ACCEPTED" | "SUPERSEDED" | "REJECTED";
  title: string;
  scopeItems: string[];
  exclusions: string[];
  basePriceMinor: number;
  currency: string;
  paymentTerms: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMAgreementReference {
  agreementId: string;
  organizationId: string;
  proposalId: string;
  opportunityId: string;
  clientId: string;
  projectId?: string;
  status: "DRAFT" | "PENDING_SIGNATURE" | "EXECUTED" | "SUPERSEDED" | "CANCELLED";
  executedAt?: string;
  createdAt: string;
}

export interface CRMActivityRecord {
  activityId: string;
  organizationId: string;
  leadId?: string;
  opportunityId?: string;
  actor: string;
  actorRole: "OPERATOR" | "AI_ASSISTANT" | "CLIENT" | "SYSTEM";
  type: string;
  description: string;
  evidenceId?: string;
  timestamp: string;
}

export class CRMRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private crmFile = path.resolve(this.dataDir, "crm-database.json");

  private leads: CRMLead[] = [];
  private contacts: CRMContact[] = [];
  private opportunities: CRMOpportunity[] = [];
  private proposals: CRMProposal[] = [];
  private agreements: CRMAgreementReference[] = [];
  private activities: CRMActivityRecord[] = [];
  private dncRegistry: Set<string> = new Set(); // Global permanent DNC email registry

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.crmFile)) {
        const raw = JSON.parse(fs.readFileSync(this.crmFile, "utf8"));
        this.leads = raw.leads || [];
        this.contacts = raw.contacts || [];
        this.opportunities = raw.opportunities || [];
        this.proposals = raw.proposals || [];
        this.agreements = raw.agreements || [];
        this.activities = raw.activities || [];
        if (raw.dncList && Array.isArray(raw.dncList)) {
          this.dncRegistry = new Set(raw.dncList);
        }
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        leads: this.leads,
        contacts: this.contacts,
        opportunities: this.opportunities,
        proposals: this.proposals,
        agreements: this.agreements,
        activities: this.activities,
        dncList: Array.from(this.dncRegistry),
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.crmFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  // ── DNC Management ──────────────────────────────────────────
  registerDNC(email: string, reason: string = "User unsubscribed"): void {
    const cleanEmail = email.toLowerCase().trim();
    this.dncRegistry.add(cleanEmail);
    // Mark any existing contact record matching this email
    for (const c of this.contacts) {
      if (c.email.toLowerCase().trim() === cleanEmail) {
        c.dncStatus = true;
        c.dncReason = reason;
        c.updatedAt = new Date().toISOString();
      }
    }
    this.saveState();
  }

  isDNC(email: string): boolean {
    return this.dncRegistry.has(email.toLowerCase().trim());
  }

  // ── Contact Operations ──────────────────────────────────────
  saveContact(contact: CRMContact): CRMContact {
    if (this.isDNC(contact.email)) {
      contact.dncStatus = true;
      contact.dncReason = contact.dncReason || "Permanently registered on global DNC registry";
    }
    const idx = this.contacts.findIndex((c) => c.contactId === contact.contactId && c.organizationId === contact.organizationId);
    if (idx >= 0) {
      this.contacts[idx] = { ...contact, updatedAt: new Date().toISOString() };
    } else {
      this.contacts.push(contact);
    }
    this.saveState();
    return contact;
  }

  getContact(contactId: string, organizationId: string): CRMContact | null {
    const contact = this.contacts.find((c) => c.contactId === contactId && c.organizationId === organizationId);
    if (!contact) return null;
    if (this.isDNC(contact.email)) {
      contact.dncStatus = true;
    }
    return contact;
  }

  // ── Lead Operations ─────────────────────────────────────────
  saveLead(lead: CRMLead): CRMLead {
    const idx = this.leads.findIndex((l) => l.leadId === lead.leadId && l.organizationId === lead.organizationId);
    if (idx >= 0) {
      this.leads[idx] = { ...lead, updatedAt: new Date().toISOString() };
    } else {
      this.leads.push(lead);
    }
    this.saveState();
    return lead;
  }

  getLead(leadId: string, organizationId: string): CRMLead | null {
    return this.leads.find((l) => l.leadId === leadId && l.organizationId === organizationId) || null;
  }

  listLeads(organizationId: string, env?: DataEnvironment): CRMLead[] {
    return this.leads.filter((l) => l.organizationId === organizationId && (!env || l.environment === env));
  }

  // ── Opportunity Operations ──────────────────────────────────
  saveOpportunity(opp: CRMOpportunity): CRMOpportunity {
    const idx = this.opportunities.findIndex((o) => o.opportunityId === opp.opportunityId && o.organizationId === opp.organizationId);
    if (idx >= 0) {
      this.opportunities[idx] = { ...opp, updatedAt: new Date().toISOString() };
    } else {
      this.opportunities.push(opp);
    }
    this.saveState();
    return opp;
  }

  getOpportunity(opportunityId: string, organizationId: string): CRMOpportunity | null {
    return this.opportunities.find((o) => o.opportunityId === opportunityId && o.organizationId === organizationId) || null;
  }

  listOpportunities(organizationId: string, env?: DataEnvironment): CRMOpportunity[] {
    return this.opportunities.filter((o) => o.organizationId === organizationId && (!env || o.environment === env));
  }

  // ── Proposal Operations ─────────────────────────────────────
  saveProposal(proposal: CRMProposal): CRMProposal {
    const idx = this.proposals.findIndex((p) => p.proposalId === proposal.proposalId && p.organizationId === proposal.organizationId);
    if (idx >= 0) {
      this.proposals[idx] = { ...proposal, updatedAt: new Date().toISOString() };
    } else {
      this.proposals.push(proposal);
    }
    this.saveState();
    return proposal;
  }

  getProposal(proposalId: string, organizationId: string): CRMProposal | null {
    return this.proposals.find((p) => p.proposalId === proposalId && p.organizationId === organizationId) || null;
  }

  listProposals(organizationId: string): CRMProposal[] {
    return this.proposals.filter((p) => p.organizationId === organizationId);
  }

  // ── Agreement Operations ────────────────────────────────────
  saveAgreement(ag: CRMAgreementReference): CRMAgreementReference {
    const idx = this.agreements.findIndex((a) => a.agreementId === ag.agreementId && a.organizationId === ag.organizationId);
    if (idx >= 0) {
      this.agreements[idx] = ag;
    } else {
      this.agreements.push(ag);
    }
    this.saveState();
    return ag;
  }

  getAgreement(agreementId: string, organizationId: string): CRMAgreementReference | null {
    return this.agreements.find((a) => a.agreementId === agreementId && a.organizationId === organizationId) || null;
  }

  // ── Activity Operations ─────────────────────────────────────
  recordActivity(activity: CRMActivityRecord): CRMActivityRecord {
    this.activities.push(activity);
    this.saveState();
    return activity;
  }

  listActivities(organizationId: string, filter?: { leadId?: string; opportunityId?: string }): CRMActivityRecord[] {
    return this.activities.filter((a) => {
      if (a.organizationId !== organizationId) return false;
      if (filter?.leadId && a.leadId !== filter.leadId) return false;
      if (filter?.opportunityId && a.opportunityId !== filter.opportunityId) return false;
      return true;
    });
  }
}

export const crmRepository = new CRMRepository();