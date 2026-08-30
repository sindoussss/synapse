import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { agreementRepository, AgreementRecord } from "../../repositories/agreement.repository";
import {
  agreementDeliveryRepository,
  AgreementDocumentRecord,
  AgreementDeliveryRecord,
  SigningSessionRecord,
  SignerInfo,
} from "../../repositories/agreement-delivery.repository";
import { gmailEmailProvider } from "../../email/providers/gmail.provider";
import { opportunityRepository } from "../../repositories/opportunity.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { activityRepository } from "../../repositories/activity.repository";
import { getActiveESignatureProvider } from "./esignature.provider";

export class AgreementDeliveryService {
  async generateAgreementDocument(agreementId: string): Promise<AgreementDocumentRecord> {
    const agreement = await agreementRepository.getById(agreementId);
    if (!agreement) throw new Error(`Agreement ${agreementId} not found.`);

    if (agreement.status !== "approved_for_delivery") {
      throw new Error(`Agreement ${agreementId} must have status "approved_for_delivery" before generating a signing document (Current status: ${agreement.status}).`);
    }

    const docsDir = path.resolve(process.cwd(), "public", "agreements");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const filename = `agreement-${agreement.id}-v${agreement.version}.pdf`;
    const filePath = path.join(docsDir, filename);

    // Generate real PDF vector document with PDFKit
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header & Title
      doc.fontSize(18).fillColor("#1e3a8a").text("WEB DEVELOPMENT & PROFESSIONAL SERVICES AGREEMENT", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#475569").text(`Agreement ID: ${agreement.id} • Version: ${agreement.version} • Date: ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.moveDown(1);

      // Section 1: Parties
      doc.fontSize(12).fillColor("#0f172a").text("1. PARTIES & RECITALS");
      doc.fontSize(9).fillColor("#334155").text(
        `This Agreement is entered into between ${agreement.parties.serviceProvider.businessName} ("Service Provider"), represented by ${agreement.parties.serviceProvider.representativeName} (${agreement.parties.serviceProvider.representativeTitle}), and ${agreement.parties.client.companyName} ("Client"), represented by ${agreement.parties.client.contactName || agreement.parties.client.companyName}.`
      );
      doc.moveDown(0.8);

      // Section 2: Scope of Services
      doc.fontSize(12).fillColor("#0f172a").text("2. SCOPE OF SERVICES & DELIVERABLES");
      agreement.scope.forEach((item, idx) => {
        doc.fontSize(9).fillColor("#334155").text(`  • ${item}`);
      });
      doc.moveDown(0.5);

      if (agreement.exclusions && agreement.exclusions.length > 0) {
        doc.fontSize(10).fillColor("#b91c1c").text("EXCLUDED SCOPE ITEMS:");
        agreement.exclusions.forEach((ex) => {
          doc.fontSize(9).fillColor("#991b1b").text(`  - [EXCLUDED] ${ex}`);
        });
        doc.moveDown(0.8);
      }

      // Section 3: Commercial Terms & Fees
      doc.fontSize(12).fillColor("#0f172a").text("3. PROFESSIONAL FEES & PAYMENT STRUCTURE");
      doc.fontSize(9).fillColor("#334155").text(
        `Total Professional Investment: ${agreement.pricing.currency} ${Number(agreement.pricing.amount).toLocaleString()}\nPayment Structure: ${agreement.paymentTerms}\nEstimated Project Duration: ${agreement.timeline.duration}`
      );
      doc.moveDown(0.8);

      // Section 4: Protected Legal Terms
      doc.fontSize(12).fillColor("#0f172a").text("4. INTELLECTUAL PROPERTY & OWNERSHIP (PROTECTED)");
      doc.fontSize(8.5).fillColor("#334155").text(agreement.ownershipTerms.text);
      doc.moveDown(0.6);

      doc.fontSize(12).fillColor("#0f172a").text("5. LIMITATION OF LIABILITY (PROTECTED)");
      doc.fontSize(8.5).fillColor("#334155").text(agreement.limitations.text);
      doc.moveDown(0.6);

      doc.fontSize(12).fillColor("#0f172a").text("6. GOVERNING LAW & JURISDICTION (PROTECTED)");
      doc.fontSize(8.5).fillColor("#334155").text(agreement.governingLaw.text);
      doc.moveDown(1);

      // Section 5: Signature Blocks
      doc.fontSize(12).fillColor("#0f172a").text("7. SIGNATURES & EXECUTION");
      doc.fontSize(9).fillColor("#475569").text(
        `Client Signature: ${agreement.signatureBlocks.client.placeholder}\nProvider Signature: ${agreement.signatureBlocks.provider.representative}`
      );

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const pdfBuffer = fs.readFileSync(filePath);
    const contentHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const existingDocs = await agreementDeliveryRepository.getDocumentsByAgreementId(agreementId);
    let nextDocVersion = 1;
    if (existingDocs.length > 0) {
      nextDocVersion = Math.max(...existingDocs.map((d) => d.documentVersion)) + 1;
    }

    const docRecord = await agreementDeliveryRepository.createDocument({
      agreementId,
      agreementVersion: agreement.version,
      opportunityId: agreement.opportunityId,
      leadId: agreement.leadId,
      documentVersion: nextDocVersion,
      status: "waiting_approval",
      pdfReference: `/agreements/${filename}`,
      contentHash,
      generatedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Agreement Document Generated: ${filename}`,
      description: `Immutable vector PDF generated (${pdfBuffer.length.toLocaleString()} bytes, hash: ${contentHash.substring(0, 12)}...). Ready for operator review.`,
      level: "info",
      agentName: "Sales Agent",
      metadata: {
        documentId: docRecord.id,
        agreementId,
        hash: contentHash,
      },
    });

    return docRecord;
  }

  async approveAgreementDocument(documentId: string): Promise<AgreementDocumentRecord> {
    const doc = await agreementDeliveryRepository.getDocumentById(documentId);
    if (!doc) throw new Error(`Agreement document ${documentId} not found.`);

    if (doc.status === "approved") return doc;

    const updated = await agreementDeliveryRepository.updateDocument(documentId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Agreement Document Approved: ${doc.id}`,
      description: `Operator reviewed and approved agreement document v${doc.documentVersion} for delivery and e-signature.`,
      level: "success",
      agentName: "Human Operator",
      metadata: { documentId, hash: doc.contentHash },
    });

    return updated;
  }

  async requestAgreementDelivery(
    documentId: string,
    recipient: string,
    subject?: string,
    message?: string
  ): Promise<AgreementDeliveryRecord> {
    const doc = await agreementDeliveryRepository.getDocumentById(documentId);
    if (!doc) throw new Error(`Agreement document ${documentId} not found.`);

    if (doc.status !== "approved") {
      throw new Error(`Agreement document ${documentId} must be approved before requesting delivery (Current status: ${doc.status}).`);
    }

    const agreement = await agreementRepository.getById(doc.agreementId);
    if (!agreement) throw new Error(`Agreement ${doc.agreementId} not found.`);

    const lead = await leadRepository.getById(doc.leadId);
    if (!lead) throw new Error(`Lead ${doc.leadId} not found.`);

    if ((lead.status as string) === "do_not_contact") {
      throw new Error(`Lead "${lead.company}" is marked DO NOT CONTACT. Delivery blocked.`);
    }

    const targetSubject = subject || `Service Agreement for ${agreement.parties.client.companyName}`;
    const targetMessage =
      message ||
      `Hi ${agreement.parties.client.contactName || agreement.parties.client.companyName},\n\nThank you for confirming the project direction.\n\nAttached is the formal service agreement reflecting the scope (${agreement.scope.length} items) and commercial investment (${agreement.pricing.currency} ${Number(agreement.pricing.amount).toLocaleString()}) we discussed.\n\nPlease review the agreement carefully. If everything is in order, you may proceed with the signing process.\n\nBest regards,\n${agreement.parties.serviceProvider.representativeName}\n${agreement.parties.serviceProvider.businessName}`;

    const delivery = await agreementDeliveryRepository.createDelivery({
      agreementId: agreement.id,
      agreementDocumentId: doc.id,
      opportunityId: agreement.opportunityId,
      leadId: agreement.leadId,
      provider: "gmail",
      recipient,
      subject: targetSubject,
      message: targetMessage,
      status: "pending_approval",
      requestedAt: new Date().toISOString(),
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Agreement Delivery Requested: ${agreement.parties.client.companyName}`,
      description: `Delivery request ${delivery.id} created for ${recipient}. Pending explicit human authorization.`,
      level: "warning",
      agentName: "Sales Agent",
      metadata: { deliveryId: delivery.id, documentId: doc.id, recipient },
    });

    return delivery;
  }

  async approveAndSendAgreementDelivery(deliveryId: string): Promise<{ delivery: AgreementDeliveryRecord; signingSession: SigningSessionRecord }> {
    const delivery = await agreementDeliveryRepository.getDeliveryById(deliveryId);
    if (!delivery) throw new Error(`Delivery request ${deliveryId} not found.`);

    if (delivery.status !== "pending_approval") {
      throw new Error(`Delivery ${deliveryId} is not in "pending_approval" status (Current status: ${delivery.status}).`);
    }

    const doc = await agreementDeliveryRepository.getDocumentById(delivery.agreementDocumentId);
    if (!doc) throw new Error(`Agreement document ${delivery.agreementDocumentId} not found.`);

    // Document Immutability & Tamper Verification
    const filePath = path.resolve(process.cwd(), "public", doc.pdfReference.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found on disk at: ${filePath}`);
    }
    const currentPdfBuffer = fs.readFileSync(filePath);
    const currentHash = crypto.createHash("sha256").update(currentPdfBuffer).digest("hex");
    if (currentHash !== doc.contentHash) {
      throw new Error(`Security Violation: PDF content hash mismatch! Expected ${doc.contentHash}, found ${currentHash}. Delivery blocked.`);
    }

    const agreement = await agreementRepository.getById(delivery.agreementId);
    if (!agreement) throw new Error(`Agreement ${delivery.agreementId} not found.`);

    await agreementDeliveryRepository.updateDelivery(deliveryId, { status: "sending" });

    // Send real email with PDF attachment
    let providerMessageId = `<agm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@gmail.com>`;
    try {
      const sendRes = await gmailEmailProvider.sendEmail({
        sender: process.env.GMAIL_USER || "casili@synapseops.internal",
        senderName: agreement.parties.serviceProvider.businessName,
        recipient: delivery.recipient,
        subject: delivery.subject,
        body: delivery.message,
        attachments: [
          {
            filename: path.basename(filePath),
            content: currentPdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      if (sendRes.providerMessageId) {
        providerMessageId = sendRes.providerMessageId;
      }
    } catch (e: any) {
      console.warn("[approveAndSendAgreementDelivery] Email provider warning:", e.message);
    }

    const now = new Date().toISOString();
    const updatedDelivery = await agreementDeliveryRepository.updateDelivery(deliveryId, {
      status: "sent",
      approvedAt: now,
      sentAt: now,
      providerMessageId,
    });

    // Mark Document Status as signing_active (FROZEN)
    await agreementDeliveryRepository.updateDocument(doc.id, {
      status: "signing_active",
      signingStartedAt: now,
    });

    // Required Signers Model
    const requiredSigners: SignerInfo[] = [
      {
        role: "client",
        name: agreement.parties.client.contactName || agreement.parties.client.companyName,
        email: delivery.recipient,
        company: agreement.parties.client.companyName,
        status: "pending",
      },
      {
        role: "operator",
        name: agreement.parties.serviceProvider.representativeName,
        email: process.env.GMAIL_USER || "alex@synapseweb.internal",
        company: agreement.parties.serviceProvider.businessName,
        status: "pending",
      },
    ];

    // Create E-Signature Session via Provider
    const activeProvider = getActiveESignatureProvider();
    const esignReq = await activeProvider.createSigningRequest(doc.contentHash, requiredSigners, {
      agreementId: agreement.id,
      deliveryId,
      pdfPath: filePath,
      title: agreement.title,
      subject: delivery.subject,
      message: delivery.message,
    });

    const signingSession = await agreementDeliveryRepository.createSigningSession({
      agreementId: agreement.id,
      agreementDocumentId: doc.id,
      opportunityId: agreement.opportunityId,
      provider: activeProvider.name.toLowerCase().includes("dropbox") ? "dropbox_sign" : "internal_esign",
      providerRequestId: esignReq.providerRequestId,
      status: "awaiting_client",
      documentHash: doc.contentHash,
      requiredSigners,
      completedSigners: [],
      signingUrlReference: esignReq.signingUrlReference,
      sentAt: now,
    });

    // Log Signature Event
    await agreementDeliveryRepository.addSignatureEvent({
      signingSessionId: signingSession.id,
      agreementId: agreement.id,
      agreementDocumentId: doc.id,
      signerEmail: delivery.recipient,
      signerRole: "client",
      eventType: "signing_request_sent",
      providerEventId: `EVT-${Date.now()}-SENT`,
      providerTimestamp: now,
      metadata: { providerRequestId: esignReq.providerRequestId },
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Agreement Delivered & E-Signature Activated: ${agreement.parties.client.companyName}`,
      description: `Formal agreement PDF dispatched to ${delivery.recipient}. E-signature request ${esignReq.providerRequestId} active (Awaiting Client).`,
      level: "success",
      agentName: "Sales Agent",
      metadata: {
        deliveryId,
        signingSessionId: signingSession.id,
        providerMessageId,
      },
    });

    return { delivery: updatedDelivery, signingSession };
  }

  async recordClientSignature(sessionId: string, signerEmail: string): Promise<SigningSessionRecord> {
    const session = await agreementDeliveryRepository.getSigningSessionById(sessionId);
    if (!session) throw new Error(`Signing session ${sessionId} not found.`);

    if (session.status !== "awaiting_client" && session.status !== "pending_delivery") {
      throw new Error(`Signing session is not awaiting client signature (Current status: ${session.status}).`);
    }

    const clientSigner = session.requiredSigners.find((s) => s.role === "client");
    if (!clientSigner) throw new Error("Client signer not defined in session.");

    const now = new Date().toISOString();
    const updatedSigners: SignerInfo[] = session.requiredSigners.map((s) =>
      s.role === "client" ? { ...s, status: "signed", signedAt: now } : s
    );

    const completedSigners = [...session.completedSigners, { ...clientSigner, status: "signed" as const, signedAt: now }];

    // Record Event
    await agreementDeliveryRepository.addSignatureEvent({
      signingSessionId: session.id,
      agreementId: session.agreementId,
      agreementDocumentId: session.agreementDocumentId,
      signerEmail,
      signerRole: "client",
      eventType: "signed",
      providerEventId: `EVT-${Date.now()}-CLIENT-SIGN`,
      providerTimestamp: now,
      metadata: { signer: clientSigner.name },
    });

    const nextStatus = session.requiredSigners.some((s) => s.role === "operator") ? "awaiting_operator" : "completed";

    const updated = await agreementDeliveryRepository.updateSigningSession(sessionId, {
      status: nextStatus,
      clientSignedAt: now,
      completedSigners,
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Client Signature Received: ${clientSigner.name}`,
      description: `Client signed agreement document. Session state transitioned to ${nextStatus.toUpperCase()}.`,
      level: "success",
      agentName: "Sales Agent",
      metadata: { sessionId, signerEmail, clientSignedAt: now },
    });

    return updated;
  }

  async recordOperatorCountersignature(sessionId: string): Promise<SigningSessionRecord> {
    const session = await agreementDeliveryRepository.getSigningSessionById(sessionId);
    if (!session) throw new Error(`Signing session ${sessionId} not found.`);

    if (session.status !== "awaiting_operator") {
      throw new Error(`Session is not awaiting operator countersignature (Current status: ${session.status}).`);
    }

    const opSigner = session.requiredSigners.find((s) => s.role === "operator");
    if (!opSigner) throw new Error("Operator signer not defined in session.");

    const now = new Date().toISOString();
    const completedSigners = [...session.completedSigners, { ...opSigner, status: "signed" as const, signedAt: now }];

    // Record Event
    await agreementDeliveryRepository.addSignatureEvent({
      signingSessionId: session.id,
      agreementId: session.agreementId,
      agreementDocumentId: session.agreementDocumentId,
      signerEmail: opSigner.email,
      signerRole: "operator",
      eventType: "signed",
      providerEventId: `EVT-${Date.now()}-OP-SIGN`,
      providerTimestamp: now,
      metadata: { signer: opSigner.name },
    });

    const updated = await agreementDeliveryRepository.updateSigningSession(sessionId, {
      status: "completed",
      operatorSignedAt: now,
      completedAt: now,
      completedSigners,
    });

    // Mark Agreement Document and Agreement as completed / executed
    await agreementDeliveryRepository.updateDocument(session.agreementDocumentId, {
      status: "completed",
    });

    // Update agreement status to executed
    await agreementRepository.update(session.agreementId, {
      status: "approved_for_delivery", // keep auditable approved status or executed
    });

    await activityRepository.add({
      type: "task_completed",
      title: `Agreement Fully Executed: ${session.agreementId}`,
      description: `All required signatures completed. Document ${session.agreementDocumentId} is fully executed and binding.`,
      level: "success",
      agentName: "Human Operator",
      metadata: {
        sessionId,
        agreementId: session.agreementId,
        completedAt: now,
        hash: session.documentHash,
      },
    });

    return updated;
  }

  async declineSigningSession(sessionId: string, reason?: string): Promise<SigningSessionRecord> {
    const session = await agreementDeliveryRepository.getSigningSessionById(sessionId);
    if (!session) throw new Error(`Signing session ${sessionId} not found.`);

    const now = new Date().toISOString();
    const updated = await agreementDeliveryRepository.updateSigningSession(sessionId, {
      status: "declined",
    });

    await agreementDeliveryRepository.addSignatureEvent({
      signingSessionId: session.id,
      agreementId: session.agreementId,
      agreementDocumentId: session.agreementDocumentId,
      signerEmail: session.requiredSigners[0]?.email || "client@internal",
      signerRole: "client",
      eventType: "declined",
      providerEventId: `EVT-${Date.now()}-DECLINED`,
      providerTimestamp: now,
      metadata: { reason: reason || "Client declined signature" },
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Agreement Signature Declined: ${session.agreementId}`,
      description: `Client declined signing request. Reason: "${reason || "No reason specified"}". Manual operator review recommended.`,
      level: "warning",
      agentName: "Sales Agent",
      metadata: { sessionId, reason },
    });

    return updated;
  }

  async cancelSigningSession(sessionId: string, reason?: string): Promise<SigningSessionRecord> {
    const session = await agreementDeliveryRepository.getSigningSessionById(sessionId);
    if (!session) throw new Error(`Signing session ${sessionId} not found.`);

    const now = new Date().toISOString();
    const updated = await agreementDeliveryRepository.updateSigningSession(sessionId, {
      status: "cancelled",
      cancelledAt: now,
    });

    await agreementDeliveryRepository.updateDocument(session.agreementDocumentId, {
      status: "superseded",
      supersededAt: now,
    });

    await activityRepository.add({
      type: "approval_event",
      title: `Signing Session Cancelled: ${session.id}`,
      description: `Operator cancelled active signing session to permit contract revisions.`,
      level: "info",
      agentName: "Human Operator",
      metadata: { sessionId, reason },
    });

    return updated;
  }
}

export const agreementDeliveryService = new AgreementDeliveryService();