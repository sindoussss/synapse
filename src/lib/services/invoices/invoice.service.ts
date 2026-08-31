import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { invoiceRepository, InvoiceRecord, InvoiceDocumentRecord, InvoiceDeliveryRecord, PaymentRecord, InvoiceLineItem } from "../../repositories/invoice.repository";
import { agreementRepository } from "../../repositories/agreement.repository";
import { agreementDeliveryRepository } from "../../repositories/agreement-delivery.repository";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { emergencyKillSwitch } from "../security/emergency-kill-switch.service";

export interface CreateInvoiceParams {
  agreementId: string;
  invoiceType: "deposit" | "milestone" | "final" | "custom";
  percentage?: number; // e.g. 40 for 40%
  customAmount?: number; // in major units (e.g. 35200) or minor units
  dueDate?: string;
  taxStatus?: "unconfigured" | "exclusive" | "inclusive" | "not_applicable" | "operator_confirmed";
  taxRate?: number; // percentage, e.g. 12 for 12%
  notes?: string;
  internalNotes?: string;
  overrideReason?: string;
}

export interface AccountsReceivableSummary {
  totalContractValue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingUninvoiced: number;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
  invoices: InvoiceRecord[];
}

export class InvoiceService {
  async createInvoiceDraft(params: CreateInvoiceParams): Promise<InvoiceRecord> {
    const agreement = await agreementRepository.getById(params.agreementId);
    if (!agreement) {
      throw new Error(`Agreement not found: ${params.agreementId}`);
    }

    if (agreement.status !== "executed" && (agreement as any).status !== "approved_for_delivery") {
      throw new Error(`Invoice creation forbidden: Agreement [${agreement.id}] is in status '${agreement.status}'. Must be 'executed'.`);
    }

    // Load active documents & signed evidence
    const docs = await agreementDeliveryRepository.getDocumentsByAgreementId(agreement.id);
    const completedDoc = docs.find((d: any) => d.status === "completed") || docs[0];
    if (!completedDoc) {
      throw new Error(`Invoice creation forbidden: No valid signed agreement document found for [${agreement.id}].`);
    }

    // Determine contract value in major and minor units
    const priceMajor = (agreement.pricing as any)?.amount || (agreement.pricing as any)?.totalContractValue || (agreement as any).commercialBaseline?.price || 88000;
    const contractValueMinor = Math.round(priceMajor * 100);

    // Calculate previously invoiced amount across active invoices
    const existingInvoices = await invoiceRepository.getInvoicesByAgreement(agreement.id);
    const activeInvoices = existingInvoices.filter((i) => i.status !== "void" && i.status !== "superseded");
    const previouslyInvoicedMinor = activeInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

    // Parse upfront percentage from payment structure string or object
    let upfrontPct = 40;
    const paymentStructureStr = typeof (agreement.pricing as any)?.paymentStructure === "string" 
      ? (agreement.pricing as any)?.paymentStructure 
      : ((agreement.pricing as any)?.paymentStructure?.upfrontPercentage ? `${(agreement.pricing as any)?.paymentStructure?.upfrontPercentage}%` : "40%");
    
    const matchPct = paymentStructureStr.match(/(\d+)%/);
    if (matchPct) {
      upfrontPct = parseInt(matchPct[1], 10);
    }

    // Determine invoice subtotal based on invoice type
    let subtotalMinor = 0;
    let lineItemDesc = "";

    if (params.invoiceType === "deposit") {
      subtotalMinor = Math.round((contractValueMinor * upfrontPct) / 100);
      lineItemDesc = `${agreement.title} — ${upfrontPct}% Initial Deposit`;
    } else if (params.invoiceType === "final") {
      const finalPct = 100 - upfrontPct;
      subtotalMinor = Math.round((contractValueMinor * finalPct) / 100);
      lineItemDesc = `${agreement.title} — ${finalPct}% Final Completion Balance`;
    } else if (params.invoiceType === "milestone") {
      const pct = params.percentage || 30;
      subtotalMinor = Math.round((contractValueMinor * pct) / 100);
      lineItemDesc = `${agreement.title} — ${pct}% Milestone Payment`;
    } else {
      // Custom
      const customVal = params.customAmount || 0;
      subtotalMinor = customVal > 100000 ? Math.round(customVal) : Math.round(customVal * 100);
      lineItemDesc = `${agreement.title} — Custom Invoiced Amount`;
    }

    // Over-invoicing check
    const projectedTotalInvoiced = previouslyInvoicedMinor + subtotalMinor;
    if (projectedTotalInvoiced > contractValueMinor && !params.overrideReason) {
      const excess = (projectedTotalInvoiced - contractValueMinor) / 100;
      throw new Error(
        `Over-invoicing Blocked: Projected total invoices (PHP ${(projectedTotalInvoiced / 100).toLocaleString()}) exceeds contract value (PHP ${(contractValueMinor / 100).toLocaleString()}) by PHP ${excess.toLocaleString()}. Explicit operator override required.`
      );
    }

    // Tax handling
    const taxStatus = params.taxStatus || "unconfigured";
    let taxAmountMinor = 0;
    if (taxStatus === "exclusive" && params.taxRate) {
      taxAmountMinor = Math.round((subtotalMinor * params.taxRate) / 100);
    }

    const discountAmountMinor = 0;
    const totalAmountMinor = subtotalMinor + taxAmountMinor - discountAmountMinor;
    const balanceDueMinor = totalAmountMinor;

    // Due date (default Net 15 from agreement terms or 15 days from now)
    const issueDate = new Date().toISOString();
    const dueDate = params.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const invoiceNumber = await invoiceRepository.getNextInvoiceNumber();
    const invoiceId = `INV-${Date.now().toString().slice(-4)}`;

    const lineItems: InvoiceLineItem[] = [
      {
        description: lineItemDesc,
        quantity: 1,
        unitPrice: subtotalMinor,
        amount: subtotalMinor,
      },
    ];

    const contentHash = crypto
      .createHash("sha256")
      .update(`${invoiceNumber}:${agreement.id}:${totalAmountMinor}:${dueDate}:${issueDate}`)
      .digest("hex");

    const invoice: InvoiceRecord = {
      id: invoiceId,
      invoiceNumber,
      opportunityId: agreement.opportunityId,
      leadId: agreement.leadId,
      agreementId: agreement.id,
      agreementVersion: agreement.version,
      agreementDocumentId: completedDoc.id,
      status: "waiting_approval",
      currency: (agreement.pricing as any)?.currency || "PHP",
      subtotal: subtotalMinor,
      taxAmount: taxAmountMinor,
      discountAmount: discountAmountMinor,
      totalAmount: totalAmountMinor,
      amountPaid: 0,
      balanceDue: balanceDueMinor,
      issueDate,
      dueDate,
      paymentTerms: `${upfrontPct}% upfront deposit / ${100 - upfrontPct}% upon final acceptance`,
      billingEntity: {
        businessName: agreement.parties.serviceProvider.businessName,
        representativeName: agreement.parties.serviceProvider.representativeName,
        email: "billing@synapseops.internal",
        phone: (agreement.parties.serviceProvider as any).contactPhone || "+63 917 123 4567",
        address: agreement.parties.serviceProvider.address || "742 Innovation Way, Metro Manila, Philippines",
      },
      clientEntity: {
        companyName: agreement.parties.client.companyName,
        contactName: agreement.parties.client.contactName,
        email: agreement.parties.client.contactEmail || "client@sample.org",
        phone: (agreement.parties.client as any).contactPhone || "N/A",
        address: (agreement.parties.client as any).legalAddress || (agreement.parties.client as any).billingAddress || "Registered Office, Philippines",
      },
      lineItems,
      notes: params.notes || "Thank you for your business.",
      internalNotes: params.internalNotes,
      taxStatus,
      taxMetadata: params.taxRate ? { rate: params.taxRate } : {},
      contentHash,
      createdAt: issueDate,
      updatedAt: issueDate,
    };

    const created = await invoiceRepository.createInvoice(invoice);

    try {
      await activityRepository.add({
        agentName: "Accountant Agent",
        type: "lead_created" as any,
        level: "info",
        title: `Invoice Created: ${invoiceNumber}`,
        description: `Created draft invoice ${invoiceNumber} for ${invoice.currency} ${(totalAmountMinor / 100).toLocaleString()} (Status: Waiting Approval).`,
      });
    } catch {}

    return created;
  }

  async approveInvoice(invoiceId: string): Promise<InvoiceRecord> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = await invoiceRepository.getInvoiceById(invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

    if (invoice.status !== "waiting_approval" && invoice.status !== "draft") {
      throw new Error(`Cannot approve invoice in '${invoice.status}' status.`);
    }

    const now = new Date().toISOString();
    const updated = await invoiceRepository.updateInvoice(invoiceId, {
      status: "approved",
      approvedAt: now,
    });

    if (!updated) throw new Error("Failed to update invoice status.");

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: `Invoice Approved: ${invoice.invoiceNumber}`,
        description: `Approved invoice ${invoice.invoiceNumber}. Financial baseline is now immutable.`,
      });
    } catch {}

    return updated;
  }

  async generateInvoiceDocument(invoiceId: string): Promise<InvoiceDocumentRecord> {
    const invoice = await invoiceRepository.getInvoiceById(invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

    const existingDocs = await invoiceRepository.getDocumentsByInvoice(invoiceId);
    const version = existingDocs.length + 1;
    const docId = `INV-DOC-${Math.floor(1000 + Math.random() * 9000)}`;

    const dir = path.resolve(process.cwd(), "public", "invoices");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `invoice-${invoice.invoiceNumber}-v${version}.pdf`;
    const filePath = path.join(dir, fileName);
    const pdfReference = `/invoices/${fileName}`;

    await new Promise<void>((resolve, reject) => {
      const pdf = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      pdf.pipe(stream);

      // Header
      pdf.fontSize(22).font("Helvetica-Bold").text("INVOICE", { align: "right" });
      pdf.fontSize(10).font("Helvetica").text(`Invoice No: ${invoice.invoiceNumber}`, { align: "right" });
      pdf.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: "right" });
      pdf.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: "right" });
      pdf.moveDown(1.5);

      // Provider & Client Entities
      const topY = pdf.y;
      pdf.fontSize(10).font("Helvetica-Bold").text("FROM:", 50, topY);
      pdf.font("Helvetica").text(invoice.billingEntity.businessName);
      if (invoice.billingEntity.representativeName) pdf.text(invoice.billingEntity.representativeName);
      pdf.text(invoice.billingEntity.email);
      if (invoice.billingEntity.address) pdf.text(invoice.billingEntity.address);

      pdf.fontSize(10).font("Helvetica-Bold").text("BILL TO:", 320, topY);
      pdf.font("Helvetica").text(invoice.clientEntity.companyName);
      if (invoice.clientEntity.contactName) pdf.text(invoice.clientEntity.contactName);
      pdf.text(invoice.clientEntity.email);
      if (invoice.clientEntity.address) pdf.text(invoice.clientEntity.address);

      pdf.y = Math.max(pdf.y, topY + 80);
      pdf.moveDown(1.5);

      // Line Items Table Header
      pdf.fillColor("#1e293b").rect(50, pdf.y, 495, 20).fill();
      pdf.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      const tableY = pdf.y + 5;
      pdf.text("Description", 60, tableY);
      pdf.text("Qty", 340, tableY);
      pdf.text("Unit Price", 390, tableY);
      pdf.text("Amount", 480, tableY, { align: "right", width: 55 });

      pdf.y += 20;
      pdf.fillColor("#000000").font("Helvetica").fontSize(9);

      // Line Items Rows
      invoice.lineItems.forEach((item) => {
        const rowY = pdf.y + 5;
        pdf.text(item.description, 60, rowY, { width: 260 });
        pdf.text(item.quantity.toString(), 340, rowY);
        pdf.text(`${invoice.currency} ${(item.unitPrice / 100).toLocaleString()}`, 390, rowY);
        pdf.text(`${invoice.currency} ${(item.amount / 100).toLocaleString()}`, 480, rowY, { align: "right", width: 55 });
        pdf.y += 18;
      });

      pdf.moveDown(1);
      pdf.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, pdf.y).lineTo(545, pdf.y).stroke();
      pdf.moveDown(1);

      // Totals
      const subtotalMajor = (invoice.subtotal / 100).toLocaleString();
      const taxMajor = (invoice.taxAmount / 100).toLocaleString();
      const totalMajor = (invoice.totalAmount / 100).toLocaleString();
      const balanceMajor = (invoice.balanceDue / 100).toLocaleString();

      pdf.fontSize(10).font("Helvetica");
      pdf.text(`Subtotal: ${invoice.currency} ${subtotalMajor}`, { align: "right" });
      if (invoice.taxAmount > 0) {
        pdf.text(`Tax (${invoice.taxStatus}): ${invoice.currency} ${taxMajor}`, { align: "right" });
      }
      pdf.fontSize(12).font("Helvetica-Bold").text(`Total Due: ${invoice.currency} ${totalMajor}`, { align: "right" });
      pdf.fontSize(10).font("Helvetica-Bold").fillColor("#dc2626").text(`Balance Due: ${invoice.currency} ${balanceMajor}`, { align: "right" });
      pdf.fillColor("#000000");
      pdf.moveDown(1.5);

      // Payment Terms & Reference
      pdf.fontSize(9).font("Helvetica-Bold").text("PAYMENT INSTRUCTIONS & TERMS");
      pdf.font("Helvetica").fontSize(8);
      pdf.text(`Terms: ${invoice.paymentTerms}`);
      pdf.text(`Agreement Reference: ${invoice.agreementId} (Version ${invoice.agreementVersion})`);
      pdf.text(`Payment Methods: Bank Transfer / Operator Verified In-App Dispatch`);
      if (invoice.notes) pdf.text(`Notes: ${invoice.notes}`);

      pdf.end();
      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    });

    const fileBuffer = fs.readFileSync(filePath);
    const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const now = new Date().toISOString();

    const doc: InvoiceDocumentRecord = {
      id: docId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      version,
      status: "waiting_approval",
      pdfReference,
      contentHash,
      generatedAt: now,
    };

    return await invoiceRepository.createInvoiceDocument(doc);
  }

  async approveInvoiceDocument(docId: string): Promise<InvoiceDocumentRecord> {
    const doc = await invoiceRepository.getInvoiceDocumentById(docId);
    if (!doc) throw new Error(`Invoice Document not found: ${docId}`);

    const now = new Date().toISOString();
    const updated = await invoiceRepository.updateInvoiceDocument(docId, {
      status: "approved",
      approvedAt: now,
    });

    if (!updated) throw new Error("Failed to update document status.");
    return updated;
  }

  async requestInvoiceDelivery(params: { invoiceId: string; documentId: string; recipient: string; subject?: string; body?: string }): Promise<InvoiceDeliveryRecord> {
    const invoice = await invoiceRepository.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const doc = await invoiceRepository.getInvoiceDocumentById(params.documentId);
    if (!doc) throw new Error(`Document not found: ${params.documentId}`);

    if (doc.status !== "approved") {
      throw new Error(`Delivery request forbidden: Invoice document [${doc.id}] must be 'approved' first (current: ${doc.status}).`);
    }

    const deliveryId = `INV-DEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const subject = params.subject || `Invoice ${invoice.invoiceNumber} — ${invoice.billingEntity.businessName}`;
    const body =
      params.body ||
      `Hi ${invoice.clientEntity.contactName || invoice.clientEntity.companyName},\n\nPlease find attached Invoice ${invoice.invoiceNumber} relating to our executed agreement.\n\nInvoice Amount: ${invoice.currency} ${(invoice.totalAmount / 100).toLocaleString()}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nPayment terms: ${invoice.paymentTerms}\n\nPlease let us know once payment has been arranged.\n\nBest regards,\n${invoice.billingEntity.representativeName || invoice.billingEntity.businessName}`;

    const delivery: InvoiceDeliveryRecord = {
      id: deliveryId,
      invoiceId: invoice.id,
      invoiceDocumentId: doc.id,
      recipient: params.recipient,
      provider: "gmail",
      status: "pending_approval",
      subject,
      body,
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return await invoiceRepository.createInvoiceDelivery(delivery);
  }

  async approveAndSendInvoiceDelivery(deliveryId: string): Promise<{ delivery: InvoiceDeliveryRecord; invoice: InvoiceRecord }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const delivery = await invoiceRepository.getInvoiceDeliveryById(deliveryId);
    if (!delivery) throw new Error(`Delivery request not found: ${deliveryId}`);

    if (delivery.status !== "pending_approval") {
      throw new Error(`Delivery authorization failed: Status is '${delivery.status}'. Expected 'pending_approval'.`);
    }

    const doc = await invoiceRepository.getInvoiceDocumentById(delivery.invoiceDocumentId);
    if (!doc) throw new Error(`Document not found: ${delivery.invoiceDocumentId}`);

    const invoice = await invoiceRepository.getInvoiceById(delivery.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${delivery.invoiceId}`);

    // PDF Integrity & Tampering Check
    const filePath = path.resolve(process.cwd(), "public", doc.pdfReference.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      throw new Error(`Invoice PDF file not found at: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    if (calculatedHash !== doc.contentHash) {
      throw new Error(
        `Security Violation: Invoice PDF content hash mismatch! Expected ${doc.contentHash}, found ${calculatedHash}. Delivery blocked.`
      );
    }

    // Duplicate Delivery Check
    const pastDeliveries = await invoiceRepository.getDeliveriesByInvoice(invoice.id);
    const alreadySent = pastDeliveries.filter((d) => d.status === "sent" && d.invoiceDocumentId === doc.id);
    if (alreadySent.length > 0) {
      throw new Error(`Duplicate Delivery Blocked: Invoice document [${doc.id}] has already been delivered.`);
    }

    // Send real email via Gmail Provider
    const now = new Date().toISOString();
    const sendResult = await gmailEmailProvider.sendEmail({
      sender: process.env.GMAIL_USER || "billing@synapseops.internal",
      recipient: delivery.recipient,
      subject: delivery.subject,
      body: delivery.body,
      attachments: [
        {
          filename: path.basename(filePath),
          content: fileBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (!sendResult.success) {
      await invoiceRepository.updateInvoiceDelivery(deliveryId, {
        status: "failed",
        failedAt: now,
        error: sendResult.error || "Failed to dispatch email via Gmail provider.",
      });
      throw new Error(`Invoice dispatch failed: ${sendResult.error}`);
    }

    const updatedDelivery = await invoiceRepository.updateInvoiceDelivery(deliveryId, {
      status: "sent",
      providerMessageId: sendResult.providerMessageId,
      approvedAt: now,
      sentAt: now,
    });

    // Update invoice status to 'sent'
    const updatedInvoice = await invoiceRepository.updateInvoice(invoice.id, {
      status: "sent",
      sentAt: now,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "email_sent" as any,
        level: "info",
        title: `Invoice Delivered: ${invoice.invoiceNumber}`,
        description: `Delivered invoice ${invoice.invoiceNumber} to ${delivery.recipient} via Gmail (Message ID: ${sendResult.providerMessageId}).`,
      });
    } catch {}

    return { delivery: updatedDelivery!, invoice: updatedInvoice! };
  }

  // --- Payment Handling & Verification ---
  async recordPayment(params: {
    invoiceId: string;
    amount: number; // minor units or major units (if < 100000 and has decimal, converted)
    currency?: string;
    paymentMethod: "bank_transfer" | "gcash" | "maya" | "paypal" | "cash" | "other";
    paymentReference: string;
    paymentDate?: string;
    evidenceType?: string;
    evidenceReference?: string;
    notes?: string;
  }): Promise<PaymentRecord> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const invoice = await invoiceRepository.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const amountMinor = params.amount > 100000 ? Math.round(params.amount) : Math.round(params.amount * 100);
    const paymentId = `PAY-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const payment: PaymentRecord = {
      id: paymentId,
      invoiceId: invoice.id,
      opportunityId: invoice.opportunityId,
      agreementId: invoice.agreementId,
      amount: amountMinor,
      currency: params.currency || invoice.currency,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      paymentDate: params.paymentDate || now,
      status: "pending_verification",
      evidenceType: params.evidenceType,
      evidenceReference: params.evidenceReference,
      notes: params.notes,
      recordedBy: "operator",
      recordedAt: now,
    };

    const created = await invoiceRepository.createPaymentRecord(payment);

    try {
      await activityRepository.add({
        agentName: "Accountant Agent",
        type: "lead_created" as any,
        level: "info",
        title: `Payment Reported: ${payment.currency} ${(amountMinor / 100).toLocaleString()}`,
        description: `Recorded reported payment of ${payment.currency} ${(amountMinor / 100).toLocaleString()} (Ref: ${payment.paymentReference}). Status: Pending Verification.`,
      });
    } catch {}

    return created;
  }

  async verifyPayment(paymentId: string): Promise<{ payment: PaymentRecord; invoice: InvoiceRecord }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const payment = await invoiceRepository.getPaymentById(paymentId);
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);

    if (payment.status !== "pending_verification" && payment.status !== "reported") {
      throw new Error(`Cannot verify payment in '${payment.status}' status.`);
    }

    const invoice = await invoiceRepository.getInvoiceById(payment.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${payment.invoiceId}`);

    // Overpayment check
    if (payment.amount > invoice.balanceDue) {
      throw new Error(
        `Overpayment Blocked: Reported payment amount (${invoice.currency} ${(payment.amount / 100).toLocaleString()}) exceeds remaining invoice balance (${invoice.currency} ${(invoice.balanceDue / 100).toLocaleString()}). Operator manual resolution required.`
      );
    }

    const now = new Date().toISOString();
    const newAmountPaid = invoice.amountPaid + payment.amount;
    const newBalanceDue = invoice.totalAmount - newAmountPaid;
    const newStatus = newBalanceDue === 0 ? "paid" : "partially_paid";

    const updatedPayment = await invoiceRepository.updatePayment(paymentId, {
      status: "verified",
      verifiedBy: "operator",
      verifiedAt: now,
    });

    const updatedInvoice = await invoiceRepository.updateInvoice(invoice.id, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      paidAt: newStatus === "paid" ? now : undefined,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "info",
        title: newStatus === "paid" ? `Invoice Fully Paid: ${invoice.invoiceNumber}` : `Invoice Partially Paid: ${invoice.invoiceNumber}`,
        description: `Verified payment of ${payment.currency} ${(payment.amount / 100).toLocaleString()}. Invoice ${invoice.invoiceNumber} balance is now ${invoice.currency} ${(newBalanceDue / 100).toLocaleString()} (Status: ${newStatus}).`,
      });
    } catch {}

    return { payment: updatedPayment!, invoice: updatedInvoice! };
  }

  async reversePayment(paymentId: string, reason: string): Promise<{ payment: PaymentRecord; invoice: InvoiceRecord }> {
    const killCheck = emergencyKillSwitch.isOperationAllowed("PAYMENT_MUTATION");
    if (!killCheck.allowed) {
      throw new Error(`EMERGENCY_STOP_BLOCKED: ${killCheck.blockedReason}`);
    }

    const payment = await invoiceRepository.getPaymentById(paymentId);
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);

    if (payment.status !== "verified") {
      throw new Error(`Cannot reverse unverified payment in '${payment.status}' status.`);
    }

    const invoice = await invoiceRepository.getInvoiceById(payment.invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${payment.invoiceId}`);

    const now = new Date().toISOString();
    const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
    const newBalanceDue = Math.min(invoice.totalAmount, invoice.totalAmount - newAmountPaid);
    const newStatus = newAmountPaid === 0 ? "sent" : "partially_paid";

    const updatedPayment = await invoiceRepository.updatePayment(paymentId, {
      status: "reversed",
      reversedAt: now,
      reversalReason: reason,
    });

    const updatedInvoice = await invoiceRepository.updateInvoice(invoice.id, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
    });

    try {
      await activityRepository.add({
        agentName: "Operator",
        type: "lead_created" as any,
        level: "warning",
        title: `Payment Reversed: ${invoice.invoiceNumber}`,
        description: `Reversed payment of ${payment.currency} ${(payment.amount / 100).toLocaleString()} for ${invoice.invoiceNumber}. Reason: ${reason}.`,
      });
    } catch {}

    return { payment: updatedPayment!, invoice: updatedInvoice! };
  }

  // --- Accounts Receivable Summary & Aging ---
  async getAccountsReceivableSummary(): Promise<AccountsReceivableSummary> {
    const invoices = await invoiceRepository.getAllInvoices();
    const activeInvoices = invoices.filter((i) => i.status !== "void" && i.status !== "superseded");

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90Plus: 0,
    };

    const now = new Date().getTime();

    activeInvoices.forEach((inv) => {
      totalInvoiced += inv.totalAmount;
      totalPaid += inv.amountPaid;
      totalOutstanding += inv.balanceDue;

      if (inv.balanceDue > 0) {
        const dueDateMs = new Date(inv.dueDate).getTime();
        const diffDays = Math.floor((now - dueDateMs) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          aging.current += inv.balanceDue;
        } else if (diffDays <= 30) {
          aging.days1to30 += inv.balanceDue;
        } else if (diffDays <= 60) {
          aging.days31to60 += inv.balanceDue;
        } else if (diffDays <= 90) {
          aging.days61to90 += inv.balanceDue;
        } else {
          aging.days90Plus += inv.balanceDue;
        }
      }
    });

    return {
      totalContractValue: 8800000, // PHP 88,000 in minor units
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      remainingUninvoiced: Math.max(0, 8800000 - totalInvoiced),
      aging,
      invoices: activeInvoices,
    };
  }
}

export const invoiceService = new InvoiceService();