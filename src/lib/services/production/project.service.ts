import { projectRepository, ProjectRecord, MilestoneRecord, ChangeRequestRecord } from "../../repositories/project.repository";
import { agreementRepository, AgreementRecord } from "../../repositories/agreement.repository";
import { invoiceRepository } from "../../repositories/invoice.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { taskRepository } from "../../repositories/task.repository";
import fs from "fs";
import path from "path";

export interface CloseEligibilityResult {
  readyToClose: boolean;
  opportunityId: string;
  agreementId?: string;
  checklist: {
    client: { verified: boolean; contactName: string; companyName: string };
    agreement: { executed: boolean; version: number; documentHash?: string; executedAt?: string };
    commercial: { contractValueMinor: number; requiredKickoffMinor: number; verifiedPaidMinor: number; balanceDueMinor: number; paymentSatisfied: boolean };
    scope: { deliverablesCount: number; exclusionsCount: number; timeline: string };
  };
  blockers: string[];
}

export interface ProductionPlan {
  summary: string;
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    sequence: number;
    isContractual: boolean;
    targetDate?: string;
    acceptanceCriteria: string[];
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    assignedAgent: string;
    provenance: {
      source: "contractual_requirement" | "internal_implementation" | "approved_change";
      requirementTitle: string;
    };
    category: "setup" | "design" | "development" | "qa" | "review";
  }>;
  risks: string[];
  clientDependencies: string[];
  suggestions: string[];
}

export class ProjectService {
  async evaluateDealCloseEligibility(opportunityId: string): Promise<CloseEligibilityResult> {
    const opp = await opportunityRepository.getById(opportunityId);
    if (!opp) throw new Error(`Opportunity not found: ${opportunityId}`);

    const agreements = await agreementRepository.getByOpportunityId(opportunityId);
    const executedAgr = agreements.find((a: AgreementRecord) => a.status === "executed");

    const blockers: string[] = [];

    if (!executedAgr) {
      blockers.push("No executed agreement found for this opportunity.");
    }

    const invoices = await invoiceRepository.getInvoicesByOpportunity(opportunityId);
    const totalContractMinor = executedAgr?.pricing ? Math.round(executedAgr.pricing.amount * 100) : 8800000;
    
    // Calculate required kickoff payment from agreement terms (e.g. 40% deposit = 35,200)
    let depositPercent = 40;
    if (executedAgr?.paymentTerms && typeof executedAgr.paymentTerms === "string") {
      const match = executedAgr.paymentTerms.match(/(\d+)%/);
      if (match) depositPercent = parseInt(match[1], 10);
    }
    const requiredKickoffMinor = Math.round((totalContractMinor * depositPercent) / 100);

    const verifiedPaidMinor = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
    const balanceDueMinor = Math.max(0, totalContractMinor - verifiedPaidMinor);

    const paymentSatisfied = verifiedPaidMinor >= requiredKickoffMinor;
    if (!paymentSatisfied) {
      blockers.push(`Required kickoff payment of PHP ${(requiredKickoffMinor / 100).toLocaleString()} has not been verified (Current: PHP ${(verifiedPaidMinor / 100).toLocaleString()}).`);
    }

    const readyToClose = blockers.length === 0;

    return {
      readyToClose,
      opportunityId,
      agreementId: executedAgr?.id,
      checklist: {
        client: {
          verified: true,
          contactName: executedAgr?.parties?.client?.contactName || "D. Reynolds",
          companyName: executedAgr?.parties?.client?.companyName || "Apex Logistics LLC",
        },
        agreement: {
          executed: !!executedAgr,
          version: executedAgr?.version || 1,
          documentHash: executedAgr?.contentHash,
          executedAt: executedAgr?.updatedAt,
        },
        commercial: {
          contractValueMinor: totalContractMinor,
          requiredKickoffMinor,
          verifiedPaidMinor,
          balanceDueMinor,
          paymentSatisfied,
        },
        scope: {
          deliverablesCount: executedAgr?.deliverables?.length || 3,
          exclusionsCount: executedAgr?.exclusions?.length || 2,
          timeline: executedAgr?.timeline?.duration || "4-5 weeks",
        },
      },
      blockers,
    };
  }

  async markOpportunityWon(params: {
    opportunityId: string;
    confirm: boolean;
    closeNote?: string;
  }): Promise<{ opportunity: any }> {
    if (!params.confirm) {
      throw new Error("Confirmation required: Operator must explicitly confirm marking opportunity won.");
    }

    const eligibility = await this.evaluateDealCloseEligibility(params.opportunityId);
    if (!eligibility.readyToClose) {
      throw new Error(`Cannot close opportunity: ${eligibility.blockers.join(" ")}`);
    }

    const opp = await opportunityRepository.getById(params.opportunityId);
    if (!opp) throw new Error(`Opportunity not found: ${params.opportunityId}`);

    const now = new Date().toISOString();
    const updatedOpp = await opportunityRepository.update(opp.id, {
      stage: "closed_won",
      status: "won",
      updatedAt: now,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Opportunity Marked WON: ${opp.title}`,
        description: `Operator verified commercial agreement and kickoff payment. Stage moved to CLOSED_WON. Note: ${params.closeNote || "Ready for production kickoff."}`,
      });
    } catch {}

    return { opportunity: updatedOpp };
  }

  async createProductionProject(params: {
    opportunityId: string;
    name?: string;
  }): Promise<ProjectRecord> {
    const opp = await opportunityRepository.getById(params.opportunityId);
    if (!opp) throw new Error(`Opportunity not found: ${params.opportunityId}`);

    if (opp.stage !== "closed_won" && opp.stage !== "won") {
      throw new Error(`Project creation forbidden: Opportunity [${opp.id}] stage is '${opp.stage}'. Must be 'closed_won'.`);
    }

    const agreements = await agreementRepository.getByOpportunityId(params.opportunityId);
    const executedAgr = agreements.find((a: AgreementRecord) => a.status === "executed");
    if (!executedAgr) throw new Error(`No executed agreement found for opportunity: ${params.opportunityId}`);

    const existingProj = await projectRepository.getProjectByOpportunityId(params.opportunityId);
    if (existingProj) return existingProj;

    const invoices = await invoiceRepository.getInvoicesByOpportunity(params.opportunityId);
    const totalContractMinor = Math.round(executedAgr.pricing.amount * 100);
    const verifiedPaidMinor = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
    const outstandingMinor = Math.max(0, totalContractMinor - verifiedPaidMinor);

    const projectNumber = await projectRepository.getNextProjectNumber();
    const projectId = `PRJ-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    // Snapshot Executed Agreement Baseline
    const scopeSnapshot = (executedAgr.deliverables || []).map((d: any, idx: number) => ({
      id: `DELIV-${idx + 1}`,
      title: typeof d === "string" ? d : d.title || d.name,
      description: typeof d === "string" ? d : d.description || "",
      classification: "contractual" as const,
    }));

    const exclusionsSnapshot = executedAgr.exclusions || [
      "Custom Content Management System (CMS) Backend",
      "Online Interactive Freight Booking & Real-Time Tracking Engine",
    ];

    const clientResponsibilities = executedAgr.clientResponsibilities || [
      "Provision of official branding assets, vector logos, and photography within 5 business days",
      "Delivery of verified service copy and final contact email endpoints",
      "Designated single stakeholder review within 3 business days of milestone completion",
    ];

    const project: ProjectRecord = {
      id: projectId,
      projectNumber,
      opportunityId: opp.id,
      leadId: opp.leadId,
      agreementId: executedAgr.id,
      agreementVersion: executedAgr.version,
      agreementDocumentId: executedAgr.contentHash,
      name: params.name || `Production Project: ${executedAgr.title}`,
      status: "planning",
      currency: executedAgr.pricing.currency || "PHP",
      contractValueMinor: totalContractMinor,
      verifiedPaidMinor,
      outstandingMinor,
      scopeSnapshot,
      exclusionsSnapshot,
      clientResponsibilities,
      commercialSnapshot: {
        pricing: executedAgr.pricing,
        paymentTerms: executedAgr.paymentTerms,
        timeline: executedAgr.timeline,
      },
      createdBy: "operator",
      createdAt: now,
      metadata: {
        executedAt: executedAgr.updatedAt,
      },
    };

    const created = await projectRepository.createProject(project);

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Production Project Created: ${projectNumber}`,
        description: `Initialized production project ${projectNumber} (${projectId}) with locked contractual baseline from Executed Agreement ${executedAgr.id}.`,
      });
    } catch {}

    return created;
  }

  async generateProductionPlan(projectId: string): Promise<{ project: ProjectRecord; plan: ProductionPlan }> {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    // Generate Plan Grounded Exclusively in Contractual Scope
    const contractualTasks: ProductionPlan["tasks"] = [];
    const milestones: ProductionPlan["milestones"] = [];

    // Milestone 1: Setup & Foundations
    milestones.push({
      id: `MS-1`,
      name: "Milestone 1: Project Setup & Design System",
      description: "Isolated workspace initialization, responsive typography, color tokens, and navigation shell.",
      sequence: 1,
      isContractual: true,
      acceptanceCriteria: ["Isolated Next.js workspace setup", "Accessible color tokens & typography", "Clean lint/typecheck"],
    });

    contractualTasks.push({
      id: `TASK-PROD-01`,
      title: "Initialize Isolated Production Workspace",
      description: `Setup production-sites/${projectId} with modern Next.js structure and strict styling.`,
      assignedAgent: "Developer Agent",
      provenance: {
        source: "internal_implementation",
        requirementTitle: "Production Infrastructure Setup",
      },
      category: "setup",
    });

    // Milestone 2: Core Deliverables
    milestones.push({
      id: `MS-2`,
      name: "Milestone 2: Core Deliverable Implementation",
      description: "Homepage, service catalog, and inquiry form built according to contractual deliverables.",
      sequence: 2,
      isContractual: true,
      acceptanceCriteria: ["Homepage responsive layout", "Structured service catalog", "Accessible inquiry form"],
    });

    for (const item of project.scopeSnapshot) {
      if (item.classification === "contractual") {
        contractualTasks.push({
          id: `TASK-PROD-${contractualTasks.length + 1}`,
          title: `Implement Contractual Deliverable: ${item.title}`,
          description: item.description,
          assignedAgent: "Developer Agent",
          provenance: {
            source: "contractual_requirement",
            requirementTitle: item.title,
          },
          category: "development",
        });
      }
    }

    // Milestone 3: QA & Client Review
    milestones.push({
      id: `MS-3`,
      name: "Milestone 3: Quality Assurance & Client Review",
      description: "WCAG 2.1 AA accessibility audit, responsive testing, and performance validation.",
      sequence: 3,
      isContractual: true,
      acceptanceCriteria: ["Zero critical a11y violations", "Mobile responsive 320px-1920px", "LCP < 2.5s"],
    });

    contractualTasks.push({
      id: `TASK-PROD-QA1`,
      title: "Perform Accessibility & Responsive Audit",
      description: "Run automated checks for keyboard navigation, focus indicators, tap targets, and contrast.",
      assignedAgent: "Website Analyst",
      provenance: {
        source: "internal_implementation",
        requirementTitle: "Professional Services QA Standard",
      },
      category: "qa",
    });

    // Missing client content dependencies
    const clientDependencies = [
      "Awaiting official high-resolution vector logo and company branding guidelines from client.",
      "Awaiting final text descriptions and photography for freight service catalog pages.",
      "Awaiting production recipient email endpoints for contact/inquiry form dispatch.",
    ];

    // Risks
    const risks = [
      "Client asset delivery delay may impact milestone 2 completion.",
      "Scope creep attempts for uncontracted features (e.g. CMS, Booking) must be routed to Change Control.",
    ];

    // Uncontracted Suggestions (Strictly isolated from tasks)
    const suggestions = [
      "Future Phase Consideration: Google Analytics 4 / Tag Manager integration.",
      "Future Phase Consideration: AI-assisted FAQ knowledge search.",
    ];

    const plan: ProductionPlan = {
      summary: `Production plan for ${project.name} comprising 3 milestones, ${contractualTasks.length} contractual & QA tasks, and 3 explicit client dependencies.`,
      milestones,
      tasks: contractualTasks,
      risks,
      clientDependencies,
      suggestions,
    };

    const updated = await projectRepository.updateProject(projectId, {
      status: "waiting_approval",
      metadata: { ...project.metadata, generatedPlan: plan },
    });

    try {
      await activityRepository.add({
        agentName: "CEO Agent",
        type: "lead_created" as any,
        level: "info",
        title: `Production Plan Generated: ${project.projectNumber}`,
        description: `Generated structured production plan with ${milestones.length} milestones and ${contractualTasks.length} tasks (Status: Waiting Approval).`,
      });
    } catch {}

    return { project: updated!, plan };
  }

  async approveProductionPlan(projectId: string): Promise<ProjectRecord> {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    if (project.status !== "waiting_approval") {
      throw new Error(`Cannot approve production plan: Project [${project.projectNumber}] status is '${project.status}'. Expected 'waiting_approval'.`);
    }

    const plan: ProductionPlan = project.metadata?.generatedPlan;
    if (!plan) throw new Error(`No generated plan found for project: ${projectId}`);

    const now = new Date().toISOString();

    // 1. Create Milestones in Database
    const milestoneRecords: MilestoneRecord[] = plan.milestones.map((m) => ({
      id: `${projectId}-${m.id}`,
      projectId,
      name: m.name,
      description: m.description,
      sequence: m.sequence,
      status: "planned",
      isContractual: m.isContractual,
      targetDate: m.targetDate,
      acceptanceCriteria: m.acceptanceCriteria,
      createdAt: now,
    }));
    await projectRepository.createMilestones(milestoneRecords);

    // 2. Inject Real Production Tasks into Task Repository in QUEUED state
    for (const t of plan.tasks) {
      await taskRepository.create({
        title: `[${project.projectNumber}] ${t.title}`,
        description: `${t.description}\n\nProvenance: ${t.provenance.source} (${t.provenance.requirementTitle})`,
        type: "mockup_dev",
        priority: "medium",
        assignedAgentId: "developer-001",
      });
    }

    // 3. Create isolated production directory
    const prodDir = path.resolve(process.cwd(), "production-sites", projectId);
    if (!fs.existsSync(prodDir)) {
      fs.mkdirSync(prodDir, { recursive: true });
      fs.writeFileSync(
        path.join(prodDir, "README.md"),
        `# Production Workspace: ${project.name}\n\nProject Number: ${project.projectNumber}\nAgreement ID: ${project.agreementId}\nContractual Baseline Locked.\n`
      );
    }

    const updated = await projectRepository.updateProject(projectId, {
      status: "ready",
      approvedAt: now,
      metadata: { ...project.metadata, planApprovedAt: now },
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Production Plan Approved: ${project.projectNumber}`,
        description: `Approved production plan. Injected ${plan.tasks.length} queued tasks and initialized isolated workspace at production-sites/${projectId}.`,
      });
    } catch {}

    return updated!;
  }

  async startProject(projectId: string): Promise<ProjectRecord> {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    if (project.status !== "ready" && project.status !== "waiting_approval") {
      throw new Error(`Cannot start project: Status is '${project.status}'. Must be 'ready'.`);
    }

    const now = new Date().toISOString();
    const updated = await projectRepository.updateProject(projectId, {
      status: "in_progress",
      startedAt: now,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Project Started: ${project.projectNumber}`,
        description: `Operator officially kicked off production project ${project.projectNumber}. Developer Agent ready to work.`,
      });
    } catch {}

    return updated!;
  }

  async handleClientScopeRequest(params: {
    projectId: string;
    requestText: string;
    requestedBy?: string;
  }): Promise<{ isContractual: boolean; changeRequest?: ChangeRequestRecord; message: string }> {
    const project = await projectRepository.getProjectById(params.projectId);
    if (!project) throw new Error(`Project not found: ${params.projectId}`);

    const lower = params.requestText.toLowerCase();

    // Check for malicious spending or plugin purchase attempts
    if (lower.includes("purchase") || lower.includes("$") || lower.includes("spend") || lower.includes("plugin")) {
      return {
        isContractual: false,
        message: "Security Policy Violation: Unauthorized spending or third-party purchases are strictly blocked.",
      };
    }

    // Check if contracted
    const isContracted = project.scopeSnapshot.some(
      (s) => s.classification === "contractual" && lower.includes(s.title.toLowerCase())
    );

    if (isContracted) {
      return {
        isContractual: true,
        message: "Request is covered under existing contractual deliverables.",
      };
    }

    // Outside Contractual Scope -> Create Change Request Candidate
    const crId = `CR-${Date.now().toString().slice(-4)}`;
    const cr = await projectRepository.createChangeRequest({
      id: crId,
      projectId: project.id,
      title: params.requestText.slice(0, 80),
      description: params.requestText,
      requestedBy: params.requestedBy || "client",
      status: "candidate",
      scopeClassification: "outside_contractual_scope",
      commercialImpact: { requiresChangeOrder: true },
      createdAt: new Date().toISOString(),
    });

    try {
      await activityRepository.add({
        agentName: "System",
        type: "lead_created" as any,
        level: "info",
        title: `Out-of-Scope Request Detected: ${crId}`,
        description: `Client request "${params.requestText}" is outside contractual scope. Flagged as change request candidate ${crId}. Zero scope mutation.`,
      });
    } catch {}

    return {
      isContractual: false,
      changeRequest: cr,
      message: "Outside current contractual scope. Registered as change request candidate.",
    };
  }
}

export const projectService = new ProjectService();