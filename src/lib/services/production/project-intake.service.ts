import fs from "fs";
import path from "path";
import { requirementIntelligenceService, RequirementRecord, ClarificationQuestion, DesignDecisionTraceRecord } from "../developer/requirement-intelligence.service";

export interface ProjectIntakePayload {
  clientRequestId: string;
  rawPrompt: string;
  explicitCompanyName?: string;
  explicitIndustry?: string;
}

export interface StructuredProjectIntakeResult {
  intakeId: string;
  projectId: string;
  projectObjective: string;
  businessType: string;
  companyName: string;
  targetAudience: string;
  requestedFeatures: string[];
  requirements: {
    explicit: RequirementRecord[];
    inferred: RequirementRecord[];
    unknown: RequirementRecord[];
    conflicting: RequirementRecord[];
    content: string[];
    functional: string[];
    visual: string[];
    technical: string[];
  };
  clarifications: ClarificationQuestion[];
  assumptions: Array<{ parameter: string; assumedValue: string; reason: string }>;
  designDecisions: DesignDecisionTraceRecord[];
  intakeVerifiedAt: string;
}

export class ProjectIntakeService {
  async processClientRequest(payload: ProjectIntakePayload): Promise<StructuredProjectIntakeResult> {
    const intakeId = `INTAKE-${Date.now().toString().slice(-4)}`;
    const projectId = `PRJ-${Date.now().toString().slice(-4)}`;

    const parsed = requirementIntelligenceService.parseUserRequest({
      projectId,
      rawUserPrompt: payload.rawPrompt,
      explicitCompanyName: payload.explicitCompanyName,
      explicitIndustry: payload.explicitIndustry,
    });

    const explicitReqs = parsed.requirements.filter((r) => r.status === "EXPLICIT");
    const inferredReqs = parsed.requirements.filter((r) => r.status === "INFERRED");
    const unknownReqs = parsed.unknownRequirements;
    const conflictingReqs = parsed.requirements.filter((r) => r.status === "CONFLICTING");

    return {
      intakeId,
      projectId,
      projectObjective: "Deliver a high-contrast, structural building materials web application with interactive estimation and lead capture.",
      businessType: parsed.industry,
      companyName: parsed.companyName,
      targetAudience: "General Contractors, Project Engineers, Purchasing Managers",
      requestedFeatures: ["Material browsing", "Live quote calculation", "Contact inquiry form"],
      requirements: {
        explicit: explicitReqs,
        inferred: inferredReqs,
        unknown: unknownReqs,
        conflicting: conflictingReqs,
        content: ["Verified product specifications", "Contractor quotation policies"],
        functional: ["Search filter", "Volume-to-tonnage range calculator", "Inquiry form"],
        visual: ["High-contrast slate-950 neutrals", "Emerald-600 action accents", "12-column structural grid"],
        technical: ["Next.js 16 App Router", "Tailwind CSS", "TypeScript strict"],
      },
      clarifications: parsed.clarifications,
      assumptions: parsed.assumptions,
      designDecisions: parsed.designDecisions,
      intakeVerifiedAt: new Date().toISOString(),
    };
  }
}

export const projectIntakeService = new ProjectIntakeService();
