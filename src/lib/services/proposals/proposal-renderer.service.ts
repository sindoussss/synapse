import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { proposalRepository, ProposalRecord } from "../../repositories/proposal.repository";
import { proposalDocumentRepository, ProposalDocumentRecord } from "../../repositories/proposal-document.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { MOCK_BUSINESS_SETTINGS } from "@/data/settings";

const PDF_DIR = path.resolve(process.cwd(), ".proposals_pdf");
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

export class ProposalRendererService {
  async renderProposalDocument(proposalId: string): Promise<ProposalDocumentRecord> {
    const proposal = await proposalRepository.getById(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.status !== "approved") {
      throw new Error(`Proposal must be in approved status before generating client document (Current: ${proposal.status}).`);
    }

    const lead = await leadRepository.getById(proposal.leadId);
    if (!lead) throw new Error(`Lead ${proposal.leadId} not found.`);

    const opp = await opportunityRepository.getById(proposal.opportunityId);
    const businessName = MOCK_BUSINESS_SETTINGS.businessName || "Synapse Web Modernization Engine";
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // 1. Generate Clean Corporate HTML Snapshot
    const renderedHtml = this.generateCleanHtml(proposal, lead, businessName, dateStr);

    // 2. Generate Real Vector PDF using PDFKit
    const pdfFilename = `${proposal.id}-v${proposal.version}.pdf`;
    const pdfFilePath = path.join(PDF_DIR, pdfFilename);
    await this.generatePdfFile(proposal, lead, businessName, dateStr, pdfFilePath);

    // 3. Compute SHA-256 content hash of the generated PDF
    const pdfBuffer = fs.readFileSync(pdfFilePath);
    const contentHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    // 4. Versioning Check: Check existing documents for this proposal
    const existingDocs = await proposalDocumentRepository.getByProposalId(proposalId);
    let docVersion = 1;
    if (existingDocs.length > 0) {
      docVersion = Math.max(...existingDocs.map((d) => d.documentVersion)) + 1;
      const prev = existingDocs[0];
      if (prev && prev.status === "waiting_approval") {
        await proposalDocumentRepository.updateStatus(prev.id, "superseded");
      }
    }

    const docRecord = await proposalDocumentRepository.create({
      proposalId: proposal.id,
      opportunityId: proposal.opportunityId,
      leadId: proposal.leadId,
      proposalVersion: proposal.version,
      documentVersion: docVersion,
      status: "waiting_approval",
      title: proposal.title,
      renderedHtml,
      pdfPathOrUrl: pdfFilePath,
      contentHash,
      generatedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Proposal Document Generated: ${lead.company} (v${proposal.version})`,
      description: `Rendered client document snapshot and vector PDF (${contentHash.substring(0, 12)}...).`,
      level: "info",
      agentName: "Sales Agent",
      metadata: {
        documentId: docRecord.id,
        proposalId: proposal.id,
        version: proposal.version,
        hash: contentHash,
      },
    });

    return docRecord;
  }

  private generateCleanHtml(
    proposal: ProposalRecord,
    lead: any,
    businessName: string,
    dateStr: string
  ): string {
    const pricingStr = proposal.pricing?.hasPrice
      ? `${proposal.pricing.currency} ${Number(proposal.pricing.basePrice).toLocaleString()}`
      : "Operator pricing required.";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${proposal.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 24px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
    h2 { font-size: 16px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 28px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .header-meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; color: #64748b; }
    .executive-summary { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 10px; border: 1px solid #cbd5e1; }
    .investment-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 20px 0; }
    .investment-amount { font-size: 22px; font-weight: bold; color: #166534; font-family: monospace; }
    .tag { display: inline-block; padding: 2px 8px; font-size: 11px; background: #e2e8f0; border-radius: 4px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header-meta">
    <div><strong>Prepared by:</strong> ${businessName}</div>
    <div><strong>Prepared for:</strong> ${lead.company}</div>
    <div><strong>Date:</strong> ${dateStr}</div>
    <div><strong>Version:</strong> ${proposal.version}</div>
  </div>

  <h1>${proposal.title}</h1>

  <div class="executive-summary">
    <strong>Executive Summary:</strong><br/>
    ${proposal.executiveSummary}
  </div>

  <h2>1. Understanding of Client Needs</h2>
  <ul>
    ${proposal.clientNeeds.map((n) => `<li>${n}</li>`).join("")}
  </ul>

  <h2>2. Committed Scope of Work</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Component / Feature</th>
        <th style="width: 25%;">Category</th>
        <th>Scope Specification</th>
      </tr>
    </thead>
    <tbody>
      ${proposal.scopeItems
        .map(
          (s) => `<tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="tag">${s.category}</span></td>
        <td>${s.description}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>3. Optional Recommended Enhancements</h2>
  <ul>
    ${(proposal.optionalEnhancements || [])
      .map((o) => `<li><strong>${o.name}:</strong> ${o.description}</li>`)
      .join("")}
  </ul>

  <h2>4. Out of Scope & Exclusions</h2>
  <ul>
    ${proposal.exclusions.map((e) => `<li>${e}</li>`).join("")}
  </ul>

  <h2>5. Estimated Timeline & Milestones</h2>
  <p><strong>Duration:</strong> ${proposal.timeline?.estimatedDuration || "4-6 weeks"}</p>
  <p><strong>Kickoff:</strong> ${proposal.timeline?.startAssumption || "Within 5 business days of agreement"}</p>
  <table>
    <thead>
      <tr>
        <th>Phase / Milestone</th>
        <th>Schedule</th>
        <th>Key Deliverables</th>
      </tr>
    </thead>
    <tbody>
      ${(proposal.timeline?.milestones || [])
        .map(
          (m) => `<tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.week}</td>
        <td>${m.deliverables}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>6. Commercial Investment & Payment Terms</h2>
  <div class="investment-box">
    <div>Total Project Investment:</div>
    <div class="investment-amount">${pricingStr}</div>
    <div style="margin-top: 8px; font-size: 13px; color: #374151;">
      <strong>Payment Structure:</strong> ${proposal.pricing?.paymentTerms || "Operator pricing required."}
    </div>
  </div>

  <h2>7. Next Steps</h2>
  <ol>
    ${proposal.nextSteps.map((s) => `<li>${s}</li>`).join("")}
  </ol>

  <div class="footer">
    ${businessName} • Proposal ${proposal.id} (Version ${proposal.version}) • Confidential & Proprietary
  </div>
</body>
</html>`;
  }

  private generatePdfFile(
    proposal: ProposalRecord,
    lead: any,
    businessName: string,
    dateStr: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Header / Metadata Bar
        doc.fontSize(9).fillColor("#64748b");
        doc.text(`${businessName} | Proposal v${proposal.version} | ${dateStr}`, { align: "right" });
        doc.moveDown(1);

        // Title
        doc.fontSize(18).fillColor("#0f172a").font("Helvetica-Bold");
        doc.text(proposal.title);
        doc.moveDown(0.5);

        // Client & Meta box
        doc.fontSize(10).fillColor("#475569").font("Helvetica");
        doc.text(`Client: ${lead.company}  |  Website: ${lead.website}`);
        doc.text(`Status: Approved Proposal Document  |  Doc ID: ${proposal.id}-v${proposal.version}`);
        doc.moveDown(1);

        // Horizontal rule
        doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Executive Summary
        doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("Executive Summary");
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#334155").font("Helvetica").text(proposal.executiveSummary, { lineGap: 3 });
        doc.moveDown(1);

        // Scope of Work
        doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("1. Committed Scope of Work");
        doc.moveDown(0.3);
        proposal.scopeItems.forEach((s, idx) => {
          doc.fontSize(10).fillColor("#0f172a").font("Helvetica-Bold").text(`${idx + 1}. ${s.name} (${s.category})`);
          doc.fontSize(9).fillColor("#475569").font("Helvetica").text(`   ${s.description}`, { lineGap: 2 });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.8);

        // Optional Enhancements
        if (proposal.optionalEnhancements && proposal.optionalEnhancements.length > 0) {
          doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("2. Optional Recommended Enhancements (Inferred)");
          doc.moveDown(0.3);
          proposal.optionalEnhancements.forEach((o) => {
            doc.fontSize(9).fillColor("#475569").font("Helvetica").text(`• ${o.name}: ${o.description}`, { lineGap: 2 });
          });
          doc.moveDown(0.8);
        }

        // Exclusions
        doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("3. Out of Scope / Exclusions");
        doc.moveDown(0.3);
        proposal.exclusions.forEach((e) => {
          doc.fontSize(9).fillColor("#64748b").font("Helvetica").text(`• ${e}`);
        });
        doc.moveDown(0.8);

        // Timeline
        doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("4. Estimated Timeline & Delivery");
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#0f172a").font("Helvetica").text(`Estimated Duration: ${proposal.timeline?.estimatedDuration || "4-6 weeks"}`);
        doc.text(`Kickoff Start: ${proposal.timeline?.startAssumption || "Within 5 business days"}`);
        doc.moveDown(0.8);

        // Investment & Terms Box
        const pricingStr = proposal.pricing?.hasPrice
          ? `${proposal.pricing.currency} ${Number(proposal.pricing.basePrice).toLocaleString()}`
          : "Operator pricing required.";

        doc.fontSize(12).fillColor("#1e3a8a").font("Helvetica-Bold").text("5. Commercial Investment & Payment Terms");
        doc.moveDown(0.3);
        doc.fontSize(14).fillColor("#166534").font("Helvetica-Bold").text(`Total Investment: ${pricingStr}`);
        doc.fontSize(10).fillColor("#334155").font("Helvetica").text(`Payment Terms: ${proposal.pricing?.paymentTerms || "Operator pricing required."}`);
        doc.moveDown(1);

        // Footer
        doc.fontSize(8).fillColor("#94a3b8").text(`Confidential • Prepared for ${lead.company} by ${businessName}`, 50, 780, { align: "center" });

        doc.end();

        stream.on("finish", () => resolve());
        stream.on("error", (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const proposalRendererService = new ProposalRendererService();