import { Lead } from "@/data/types";
import { WebsiteAuditRecord } from "../../repositories/audit.repository";
import { RedesignProjectRecord } from "../../repositories/redesign.repository";
import { OutreachPersonalization } from "../../repositories/outreach.repository";

export interface GeneratedOutreachDraft {
  subject: string;
  emailBody: string;
  followUp: string;
  personalization: OutreachPersonalization;
}

export interface SenderIdentity {
  name: string;
  title: string;
  company: string;
  email: string;
}

export class OutreachDraftGenerator {
  async generateDraft(
    lead: Lead,
    audit: WebsiteAuditRecord | null,
    redesign: RedesignProjectRecord | null,
    previewUrl: string,
    sender: SenderIdentity,
    apiKey: string
  ): Promise<GeneratedOutreachDraft> {
    const prompt = this.buildPrompt(lead, audit, redesign, previewUrl, sender);

    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error (${model}): ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error(`Empty response from model ${model}`);

        const parsed = JSON.parse(rawText);
        return this.validateAndSanitizeDraft(parsed, lead, previewUrl, sender);
      } catch (err: any) {
        console.warn(`[OutreachDraftGenerator] Attempt with ${model} failed:`, err.message);
        lastError = err;
      }
    }

    // Fallback deterministic synthesis
    return this.buildFallbackDraft(lead, audit, redesign, previewUrl, sender);
  }

  private buildPrompt(
    lead: Lead,
    audit: WebsiteAuditRecord | null,
    redesign: RedesignProjectRecord | null,
    previewUrl: string,
    sender: SenderIdentity
  ): string {
    const auditDeficiencies = audit?.findings?.length
      ? audit.findings.map((f) => `- ${f.category}: ${f.evidence} (${f.recommendation})`).join("\n")
      : lead.detectedIssues.map((issue) => `- ${issue}`).join("\n");

    const preservedStrengths = redesign?.designBrief?.preserve?.length
      ? redesign.designBrief.preserve.join(", ")
      : audit?.strengths?.length
      ? audit.strengths.join(", ")
      : "Established brand presence and core service offerings";

    const improvements = redesign?.designBrief?.improve?.length
      ? redesign.designBrief.improve.join(", ")
      : audit?.weaknesses?.length
      ? audit.weaknesses.join(", ")
      : "Mobile responsiveness, navigation clarity, and simplified inquiry flow";

    return `You are an elite B2B Sales Specialist crafting a respectful, highly personalized cold outreach email for a potential web modernization engagement.

TARGET COMPANY INFORMATION:
- Company Name: "${lead.company}"
- Industry: "${lead.industry}"
- Current Website: "${lead.website}"
- Location: "${lead.location || "Regional"}"
- Detected Technical Audit Findings:
${auditDeficiencies}
- Strengths to Preserve: "${preservedStrengths}"
- Key Redesign Improvements: "${improvements}"
- Verified Live Preview URL: "${previewUrl}"

SENDER IDENTITY (MUST USE EXACTLY - DO NOT INVENT):
- Sender Name: "${sender.name}"
- Sender Title: "${sender.title}"
- Sender Organization: "${sender.company}"

STRICT OUTREACH RULES:
1. TONE: Professional, concise, courteous, helpful. Length: 100 to 180 words.
2. NO HYPERBOLE: DO NOT use phrases like "revolutionize your presence", "cutting-edge", "unlock full potential", "3x your sales", or "guaranteed results".
3. NO INSULTS: Never say their current site is "bad", "broken", or "outdated". Frame findings constructively (e.g. "I noticed opportunities to enhance the mobile layout and streamline inquiry paths").
4. UNOFFICIAL DISCLAIMER: Clearly identify this as an unofficial front-end demonstration concept created for their review.
5. PREVIEW LINK: Include the exact preview URL "${previewUrl}".
6. SENDER SIGN-OFF: End with "${sender.name}", "${sender.title}", "${sender.company}".
7. GROUNDING: Do NOT invent executive names, company revenue, awards, or fake claims.

Respond ONLY with valid JSON matching this schema:
{
  "subject": "Concise personalized subject line (e.g. 'A Website Concept for [Company]')",
  "emailBody": "Full email message (100-180 words) formatted with paragraphs and exact preview URL",
  "followUp": "Short 2-3 sentence follow-up message to send 4 days later",
  "personalization": {
    "auditSignalsUsed": ["Array of 2-3 specific audit signals addressed in plain business language"],
    "companyFactsUsed": ["Array of verified facts about the company from input data"],
    "redesignImprovementsReferenced": ["Array of 2-3 frontend improvements showcased in the preview"]
  }
}`;
  }

  private validateAndSanitizeDraft(
    parsed: any,
    lead: Lead,
    previewUrl: string,
    sender: SenderIdentity
  ): GeneratedOutreachDraft {
    let body = String(parsed.emailBody || "");
    if (!body.includes(previewUrl)) {
      body += `\n\nConcept Preview:\n${previewUrl}\n\nBest regards,\n${sender.name}\n${sender.title}, ${sender.company}`;
    }

    return {
      subject: parsed.subject || `A Web Concept for ${lead.company}`,
      emailBody: body,
      followUp: parsed.followUp || `Hi team, just following up to see if you had a chance to review the concept preview for ${lead.company}: ${previewUrl}`,
      personalization: {
        auditSignalsUsed: Array.isArray(parsed.personalization?.auditSignalsUsed)
          ? parsed.personalization.auditSignalsUsed
          : ["Mobile layout optimization", "Inquiry path clarity"],
        companyFactsUsed: Array.isArray(parsed.personalization?.companyFactsUsed)
          ? parsed.personalization.companyFactsUsed
          : [`${lead.company} in ${lead.industry}`],
        redesignImprovementsReferenced: Array.isArray(parsed.personalization?.redesignImprovementsReferenced)
          ? parsed.personalization.redesignImprovementsReferenced
          : ["Next.js responsive component", "Interactive quote estimator"],
      },
    };
  }

  private buildFallbackDraft(
    lead: Lead,
    audit: WebsiteAuditRecord | null,
    redesign: RedesignProjectRecord | null,
    previewUrl: string,
    sender: SenderIdentity
  ): GeneratedOutreachDraft {
    const subject = `A Website Concept for ${lead.company}`;
    const emailBody = `Good day,

My name is ${sender.name} with ${sender.company}.

I recently reviewed the public web experience for ${lead.company} and developed an unofficial front-end redesign concept for your team to explore.

The concept focuses on mobile-first responsiveness, streamlined navigation, and a clearer inquiry process, while preserving your established brand identity in the ${lead.industry} sector.

You can interact with the live demonstration preview here:
${previewUrl}

This is currently an isolated interactive prototype. If this direction is helpful for your digital initiatives, I would welcome the opportunity to discuss adapting it to your exact specifications.

Thank you for your time.

Best regards,
${sender.name}
${sender.title}
${sender.company}`;

    const followUp = `Good day,

Following up briefly regarding the unofficial web concept created for ${lead.company}:
${previewUrl}

Please let me know if you would like to explore this direction further.

Best regards,
${sender.name}`;

    return {
      subject,
      emailBody,
      followUp,
      personalization: {
        auditSignalsUsed: ["Mobile layout responsiveness", "Inquiry flow optimization"],
        companyFactsUsed: [`${lead.company} (${lead.industry})`],
        redesignImprovementsReferenced: ["Next.js responsive architecture", "Instant lead capture interface"],
      },
    };
  }
}

export const outreachDraftGenerator = new OutreachDraftGenerator();