import { opportunityRepository, OpportunityRecord, GroundedRequirement, QualificationMatrix } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { emailMessageRepository, EmailMessageRecord } from "../../repositories/message.repository";
import { replyAnalysisRepository } from "../../repositories/reply-analysis.repository";
import { auditRepository } from "../../repositories/audit.repository";
import { redesignRepository } from "../../repositories/redesign.repository";
import { activityRepository } from "../../repositories/activity.repository";

export interface OpportunityAnalysisResult {
  opportunityRecommended: boolean;
  title: string;
  summary: string;
  projectType: string;
  requestedScope: GroundedRequirement[];
  requiredFeatures: GroundedRequirement[];
  optionalFeatures: GroundedRequirement[];
  prospectQuestions: string[];
  unresolvedQuestions: string[];
  commercialSignals: string[];
  budgetSignal: string;
  budgetLiteral?: string;
  timelineSignal: string;
  authoritySignal: string;
  qualification: QualificationMatrix;
  proposalReadiness: number;
  nextRecommendedAction: string;
}

export class OpportunityIntelligenceService {
  async analyzeLeadOpportunity(leadId: string, apiKey?: string): Promise<OpportunityAnalysisResult> {
    const lead = await leadRepository.getById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found.`);

    const messages = await emailMessageRepository.getByLeadId(leadId);
    const inboundMessages = messages.filter((m) => m.direction === "inbound");
    const analyses = await replyAnalysisRepository.getByLeadId(leadId);
    const audit = await auditRepository.getByLeadId(leadId);
    const redesign = await redesignRepository.getByLeadId(leadId);
    const existingOpp = await opportunityRepository.getByLeadId(leadId);

    // 1. Rejection / Do-Not-Contact Safety Check
    if ((lead.status as string) === "do_not_contact") {
      return {
        opportunityRecommended: false,
        title: `Suppressed Lead - ${lead.company}`,
        summary: "Prospect has unsubscribed or requested no contact. Opportunity creation suppressed.",
        projectType: "unknown",
        requestedScope: [],
        requiredFeatures: [],
        optionalFeatures: [],
        prospectQuestions: [],
        unresolvedQuestions: [],
        commercialSignals: ["unsubscribe"],
        budgetSignal: "unknown",
        timelineSignal: "unknown",
        authoritySignal: "unknown",
        qualification: {
          need: "unknown",
          authority: "unknown",
          budget: "unknown",
          timeline: "unknown",
          engagement: "weak",
          summary: "Prospect unsubscribed.",
        },
        proposalReadiness: 0,
        nextRecommendedAction: "manual_review",
      };
    }

    // Check if the latest inbound message indicates a clear rejection
    const latestInbound = inboundMessages[0];
    const latestAnalysis = analyses[0];

    if (
      latestAnalysis?.classification === "not_interested" ||
      latestAnalysis?.classification === "unsubscribe" ||
      latestInbound?.bodyText.toLowerCase().includes("not planning to move forward") ||
      latestInbound?.bodyText.toLowerCase().includes("not interested")
    ) {
      return {
        opportunityRecommended: false,
        title: `Inactive - ${lead.company}`,
        summary: "Prospect indicated they are not interested in moving forward at this time.",
        projectType: "unknown",
        requestedScope: existingOpp?.requestedScope || [],
        requiredFeatures: existingOpp?.requiredFeatures || [],
        optionalFeatures: existingOpp?.optionalFeatures || [],
        prospectQuestions: [],
        unresolvedQuestions: [],
        commercialSignals: ["not_interested"],
        budgetSignal: "unknown",
        timelineSignal: "unknown",
        authoritySignal: "unknown",
        qualification: {
          need: "weak",
          authority: "unknown",
          budget: "unknown",
          timeline: "unknown",
          engagement: "weak",
          summary: "Prospect declined proposal.",
        },
        proposalReadiness: 0,
        nextRecommendedAction: "manual_review",
      };
    }

    // If no inbound messages exist yet
    if (inboundMessages.length === 0) {
      return {
        opportunityRecommended: false,
        title: `Outreach Pending - ${lead.company}`,
        summary: "No prospect replies received yet to establish commercial intent.",
        projectType: "website_redesign",
        requestedScope: [],
        requiredFeatures: [],
        optionalFeatures: [],
        prospectQuestions: [],
        unresolvedQuestions: [],
        commercialSignals: [],
        budgetSignal: "unknown",
        timelineSignal: "unknown",
        authoritySignal: "unknown",
        qualification: {
          need: "medium",
          authority: "unknown",
          budget: "unknown",
          timeline: "unknown",
          engagement: "unknown",
          summary: "Awaiting initial prospect response.",
        },
        proposalReadiness: 15,
        nextRecommendedAction: "wait_for_reply",
      };
    }

    // Combine all conversation text for deep extraction
    const allInboundText = inboundMessages.map((m) => m.bodyText).join("\n\n");
    const lowerAll = allInboundText.toLowerCase();

    // 2. Commercial Signals Extraction
    const commercialSignals: string[] = [];
    if (lowerAll.includes("cost") || lowerAll.includes("price") || lowerAll.includes("pricing") || lowerAll.includes("quote") || lowerAll.includes("rate")) {
      commercialSignals.push("pricing_interest");
    }
    if (lowerAll.includes("call") || lowerAll.includes("meeting") || lowerAll.includes("schedule") || lowerAll.includes("walkthrough") || lowerAll.includes("zoom")) {
      commercialSignals.push("meeting_interest");
    }
    if (lowerAll.includes("timeline") || lowerAll.includes("when can") || lowerAll.includes("how long") || lowerAll.includes("turnaround") || lowerAll.includes("next week")) {
      commercialSignals.push("timeline_interest");
    }
    if (lowerAll.includes("need") || lowerAll.includes("feature") || lowerAll.includes("cms") || lowerAll.includes("page") || lowerAll.includes("form") || lowerAll.includes("booking")) {
      commercialSignals.push("feature_request");
    }
    if (lowerAll.includes("proposal") || lowerAll.includes("estimate") || lowerAll.includes("scope")) {
      commercialSignals.push("proposal_request");
    }

    // 3. Grounded Requirements Extraction & Contradiction Resolution
    const requestedScope: GroundedRequirement[] = existingOpp?.requestedScope ? [...existingOpp.requestedScope] : [];
    const requiredFeatures: GroundedRequirement[] = existingOpp?.requiredFeatures ? [...existingOpp.requiredFeatures] : [];

    // Helper to add or supersede requirement
    const handleRequirement = (
      reqName: string,
      category: string,
      targetList: GroundedRequirement[],
      sourceMsg: EmailMessageRecord,
      quote: string,
      isRetracted: boolean
    ) => {
      const existing = targetList.find((r) => r.requirement.toLowerCase().includes(reqName.toLowerCase()));
      const now = new Date().toISOString();

      if (isRetracted && existing) {
        if (existing.status !== "superseded") {
          existing.status = "superseded";
          existing.supersededAt = now;
          existing.supersededReason = `Prospect explicitly retracted in message (${sourceMsg.id}): "${quote}"`;
        }
      } else if (!isRetracted && !existing) {
        targetList.push({
          id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
          requirement: reqName,
          category,
          sourceMessageId: sourceMsg.id,
          sourceQuote: quote,
          status: "active",
          isClientExplicit: true,
          addedAt: now,
        });
      }
    };

    // Iterate through inbound messages in chronological order (oldest to newest) to track provenance & contradictions
    const chronologicalInbound = [...inboundMessages].reverse();

    for (const msg of chronologicalInbound) {
      const txt = msg.bodyText.toLowerCase();

      // Homepage & Service Pages
      if (txt.includes("homepage")) {
        handleRequirement("Modern Homepage Layout", "Pages & Architecture", requestedScope, msg, "homepage", false);
      }
      if (txt.includes("service pages") || txt.includes("services page")) {
        handleRequirement("Structured Service Catalog Pages", "Pages & Architecture", requestedScope, msg, "service pages", false);
      }
      if (txt.includes("contact form") || txt.includes("inquiry form")) {
        handleRequirement("Interactive Client Contact & Inquiry Form", "Conversion & Leads", requiredFeatures, msg, "contact form", false);
      }
      if (txt.includes("update content") || txt.includes("cms") || txt.includes("content management") || txt.includes("admin panel")) {
        handleRequirement("Content Management System (CMS) / Content Editor", "CMS & Operations", requiredFeatures, msg, "update content", false);
      }

      // Booking / Scheduling feature check with contradiction detection
      if (txt.includes("not to include booking") || txt.includes("won't need booking") || txt.includes("decided not to include booking") || txt.includes("cancel booking")) {
        handleRequirement("Online Booking / Appointment Scheduler", "Scheduling", requiredFeatures, msg, "decided not to include booking", true);
      } else if (txt.includes("booking") || txt.includes("appointment") || txt.includes("reservation")) {
        handleRequirement("Online Booking / Appointment Scheduler", "Scheduling", requiredFeatures, msg, "online booking feature", false);
      }

      // Ecommerce feature check with contradiction detection
      if (txt.includes("not to include ecommerce") || txt.includes("won't need ecommerce") || txt.includes("decided not to include ecommerce")) {
        handleRequirement("E-Commerce Catalog & Checkout", "E-Commerce", requiredFeatures, msg, "won't need ecommerce", true);
      } else if (txt.includes("ecommerce") || txt.includes("shop") || txt.includes("cart") || txt.includes("checkout")) {
        handleRequirement("E-Commerce Catalog & Checkout", "E-Commerce", requiredFeatures, msg, "ecommerce", false);
      }
    }

    // 4. Questions Extracted
    const prospectQuestions: string[] = [];
    analyses.forEach((a) => {
      if (a.questions && Array.isArray(a.questions)) {
        a.questions.forEach((q) => {
          if (!prospectQuestions.includes(q)) prospectQuestions.push(q);
        });
      }
    });

    // 5. Signals Analysis
    let budgetSignal = "unknown";
    let budgetLiteral: string | undefined = undefined;
    if (commercialSignals.includes("pricing_interest")) {
      budgetSignal = "budget_requested";
    }
    // Check if literal number range was mentioned (e.g. $5,000, 50k, etc.)
    const budgetMatch = allInboundText.match(/(\$\s?[0-9,]+(\s?-\s?\$?\s?[0-9,]+)?|\b[0-9]+\s?k\b)/i);
    if (budgetMatch) {
      budgetSignal = "budget_range_provided";
      budgetLiteral = budgetMatch[0];
    }

    let timelineSignal = "unknown";
    if (lowerAll.includes("next week")) timelineSignal = "next_week";
    else if (lowerAll.includes("asap") || lowerAll.includes("urgent")) timelineSignal = "urgent";
    else if (lowerAll.includes("next month")) timelineSignal = "next_month";
    else if (commercialSignals.includes("timeline_interest")) timelineSignal = "timeline_inquired";

    const authoritySignal = lowerAll.includes("my team") || lowerAll.includes("we would need") || lowerAll.includes("our operations")
      ? "decision_maker_proxy"
      : "unknown";

    // 6. Proposal Readiness Calculation (0-100)
    let score = 0;
    const activeReqs = [...requestedScope, ...requiredFeatures].filter((r) => r.status === "active");
    // Scope clarity: 10 pts per active req, max 35 pts
    score += Math.min(35, activeReqs.length * 10);
    // Commercial signals: 15 pts per signal, max 30 pts
    score += Math.min(30, commercialSignals.length * 15);
    // Verified lead & contact email: 20 pts
    if (lead.contactEmail) score += 20;
    // Inbound interaction depth: 15 pts
    if (inboundMessages.length >= 1) score += 15;

    const proposalReadiness = Math.min(100, Math.max(0, score));

    // 7. Qualification Matrix
    const qualification: QualificationMatrix = {
      need: activeReqs.length >= 2 ? "strong" : activeReqs.length === 1 ? "medium" : "weak",
      authority: authoritySignal !== "unknown" ? "medium" : "unknown",
      budget: budgetSignal === "budget_range_provided" ? "strong" : budgetSignal === "budget_requested" ? "medium" : "unknown",
      timeline: timelineSignal !== "unknown" ? "medium" : "unknown",
      engagement: inboundMessages.length >= 2 ? "strong" : inboundMessages.length === 1 ? "medium" : "weak",
      summary: `Client has expressed ${commercialSignals.join(", ") || "interest"} with ${activeReqs.length} active scope requirements grounded in conversation.`,
    };

    // 8. Next Recommended Action Engine
    let nextRecommendedAction = "ask_scope_question";
    if (commercialSignals.includes("meeting_interest")) {
      nextRecommendedAction = "offer_meeting";
    } else if (proposalReadiness >= 70 && activeReqs.length >= 2) {
      nextRecommendedAction = "prepare_proposal";
    } else if (commercialSignals.includes("pricing_interest") && activeReqs.length < 2) {
      nextRecommendedAction = "ask_scope_question";
    } else if (timelineSignal === "unknown" && activeReqs.length >= 2) {
      nextRecommendedAction = "ask_timeline_question";
    } else {
      nextRecommendedAction = "manual_review";
    }

    const title = `${lead.company} - Web Modernization & Redesign Opportunity`;
    const summary = `Opportunity with ${lead.company} (${lead.industry}). Prospect requested ${activeReqs.map((r) => r.requirement).join(", ") || "redesign exploration"}. Intent signals: ${commercialSignals.join(", ")}.`;

    return {
      opportunityRecommended: true,
      title,
      summary,
      projectType: "website_redesign",
      requestedScope,
      requiredFeatures,
      optionalFeatures: existingOpp?.optionalFeatures || [],
      prospectQuestions,
      unresolvedQuestions: prospectQuestions,
      commercialSignals,
      budgetSignal,
      budgetLiteral,
      timelineSignal,
      authoritySignal,
      qualification,
      proposalReadiness,
      nextRecommendedAction,
    };
  }

  async createOrUpdateOpportunity(leadId: string): Promise<OpportunityRecord> {
    const analysis = await this.analyzeLeadOpportunity(leadId);
    const existing = await opportunityRepository.getByLeadId(leadId);
    const lead = await leadRepository.getById(leadId);

    const now = new Date().toISOString();

    if (existing) {
      // Update existing opportunity with latest memory & provenance
      const updated = await opportunityRepository.update(existing.id, {
        title: analysis.title,
        summary: analysis.summary,
        projectType: analysis.projectType,
        requestedScope: analysis.requestedScope,
        requiredFeatures: analysis.requiredFeatures,
        optionalFeatures: analysis.optionalFeatures,
        prospectQuestions: analysis.prospectQuestions,
        unresolvedQuestions: analysis.unresolvedQuestions,
        commercialSignals: analysis.commercialSignals,
        budgetSignal: analysis.budgetSignal,
        budgetLiteral: analysis.budgetLiteral,
        timelineSignal: analysis.timelineSignal,
        authoritySignal: analysis.authoritySignal,
        qualification: analysis.qualification,
        nextRecommendedAction: analysis.nextRecommendedAction,
        proposalReadiness: analysis.proposalReadiness,
      });

      await activityRepository.add({
        type: "lead_event",
        title: `Opportunity Updated: ${lead?.company || existing.title}`,
        description: `Intelligence updated opportunity state: ${analysis.nextRecommendedAction} (Readiness: ${analysis.proposalReadiness}%).`,
        level: "info",
        agentName: "Sales Agent",
        metadata: {
          opportunityId: updated.id,
          leadId,
          readiness: analysis.proposalReadiness,
        },
      });

      return updated;
    } else {
      // Create new opportunity
      const initialStage = analysis.proposalReadiness >= 60 ? "qualified" : "discovery";

      const created = await opportunityRepository.create({
        leadId,
        primaryContactEmail: lead?.contactEmail,
        status: "open",
        stage: initialStage,
        title: analysis.title,
        summary: analysis.summary,
        projectType: analysis.projectType,
        requestedScope: analysis.requestedScope,
        requiredFeatures: analysis.requiredFeatures,
        optionalFeatures: analysis.optionalFeatures,
        prospectQuestions: analysis.prospectQuestions,
        unresolvedQuestions: analysis.unresolvedQuestions,
        commercialSignals: analysis.commercialSignals,
        budgetSignal: analysis.budgetSignal,
        budgetLiteral: analysis.budgetLiteral,
        timelineSignal: analysis.timelineSignal,
        authoritySignal: analysis.authoritySignal,
        qualification: analysis.qualification,
        nextRecommendedAction: analysis.nextRecommendedAction,
        proposalReadiness: analysis.proposalReadiness,
        history: [
          {
            timestamp: now,
            actor: "Sales Agent",
            action: "Opportunity Created",
            newStage: initialStage,
            notes: `Structured opportunity with ${analysis.proposalReadiness}% proposal readiness.`,
          },
        ],
      });

      await activityRepository.add({
        type: "lead_event",
        title: `New Opportunity Created: ${lead?.company || created.title}`,
        description: `Sales Agent converted lead into structured opportunity in stage [${initialStage.toUpperCase()}].`,
        level: "success",
        agentName: "Sales Agent",
        metadata: {
          opportunityId: created.id,
          leadId,
          stage: initialStage,
          readiness: analysis.proposalReadiness,
        },
      });

      return created;
    }
  }
}

export const opportunityIntelligenceService = new OpportunityIntelligenceService();