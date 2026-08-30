import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ESignatureProvider, CreateSigningRequestResult } from "../esignature.provider";
import { SignerInfo } from "@/lib/repositories/agreement-delivery.repository";

export class DocuSignProvider implements ESignatureProvider {
  readonly name = "DocuSign";

  private getCredentials() {
    return {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID || null,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || null,
      accessToken: process.env.DOCUSIGN_ACCESS_TOKEN || null,
      basePath: process.env.DOCUSIGN_BASE_PATH || "https://demo.docusign.net/restapi",
    };
  }

  isConfigured(): boolean {
    const creds = this.getCredentials();
    return Boolean(creds.accountId && (creds.accessToken || creds.integrationKey));
  }

  async createSigningRequest(
    documentHash: string,
    signers: SignerInfo[],
    metadata: Record<string, any>
  ): Promise<CreateSigningRequestResult> {
    const creds = this.getCredentials();
    if (!this.isConfigured() || !creds.accessToken) {
      throw new Error("DocuSign credentials missing. Please configure DOCUSIGN_ACCOUNT_ID and DOCUSIGN_ACCESS_TOKEN in .env.local.");
    }

    const pdfPath = metadata.pdfPath || path.resolve(process.cwd(), "public", "agreements", `agreement-${metadata.agreementId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Agreement PDF file not found at: ${pdfPath}`);
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    if (calculatedHash !== documentHash) {
      throw new Error(`Security Violation: PDF file hash mismatch! Expected ${documentHash}, found ${calculatedHash}`);
    }

    const base64Doc = fileBuffer.toString("base64");

    const envelopeDefinition = {
      emailSubject: metadata.subject || "Please sign this Web Development Services Agreement",
      documents: [
        {
          documentBase64: base64Doc,
          name: path.basename(pdfPath),
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: signers.map((s, idx) => ({
          email: s.email,
          name: s.name,
          recipientId: (idx + 1).toString(),
          routingOrder: (idx + 1).toString(),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: (500 + idx * 80).toString(),
              },
            ],
          },
        })),
      },
      status: "sent",
    };

    const res = await fetch(`${creds.basePath}/v2.1/accounts/${creds.accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeDefinition),
    });

    const data = await res.json();
    if (!res.ok || !data.envelopeId) {
      throw new Error(data.message || "DocuSign API envelope creation failed.");
    }

    return {
      providerRequestId: data.envelopeId,
      signingUrlReference: `https://demo.docusign.net/Member/EnvelopeDetails.aspx?envelopeId=${data.envelopeId}`,
      status: "sent",
    };
  }

  async getSigningStatus(providerRequestId: string): Promise<{
    status: "pending" | "signed" | "completed" | "declined" | "expired";
    signers: SignerInfo[];
  }> {
    const creds = this.getCredentials();
    if (!creds.accessToken) throw new Error("DocuSign credentials missing.");

    const res = await fetch(`${creds.basePath}/v2.1/accounts/${creds.accountId}/envelopes/${providerRequestId}`, {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch DocuSign envelope status.");

    let status: "pending" | "signed" | "completed" | "declined" | "expired" = "pending";
    if (data.status === "completed") status = "completed";
    else if (data.status === "declined") status = "declined";
    else if (data.status === "voided") status = "expired";

    return {
      status,
      signers: [],
    };
  }

  async cancelSigningRequest(providerRequestId: string): Promise<boolean> {
    const creds = this.getCredentials();
    if (!creds.accessToken) return false;

    const res = await fetch(`${creds.basePath}/v2.1/accounts/${creds.accountId}/envelopes/${providerRequestId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "voided", voidedReason: "Operator requested revision" }),
    });
    return res.ok;
  }
}

export const docuSignProvider = new DocuSignProvider();