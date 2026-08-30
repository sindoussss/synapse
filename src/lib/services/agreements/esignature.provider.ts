import crypto from "crypto";
import { SignerInfo } from "../../repositories/agreement-delivery.repository";

export interface CreateSigningRequestResult {
  providerRequestId: string;
  signingUrlReference: string;
  status: "sent" | "ready";
}

export interface ESignatureProvider {
  name: string;
  isConfigured(): boolean;
  createSigningRequest(
    documentHash: string,
    signers: SignerInfo[],
    metadata: Record<string, any>
  ): Promise<CreateSigningRequestResult>;

  getSigningStatus(providerRequestId: string): Promise<{
    status: "pending" | "signed" | "completed" | "declined" | "expired";
    signers: SignerInfo[];
    signatureRequest?: any;
  }>;

  cancelSigningRequest(providerRequestId: string): Promise<boolean>;
}

export class InternalEsignProvider implements ESignatureProvider {
  readonly name = "Internal E-Sign (Development Sandbox)";

  isConfigured(): boolean {
    return true;
  }

  async createSigningRequest(
    documentHash: string,
    signers: SignerInfo[],
    metadata: Record<string, any>
  ): Promise<CreateSigningRequestResult> {
    const providerRequestId = `REQ-ESIGN-${Math.floor(1000 + Math.random() * 9000)}`;
    const sessionToken = crypto.createHash("sha256").update(providerRequestId + documentHash).digest("hex").substring(0, 16);
    const signingUrlReference = `https://synapseops.internal/esign/session/${sessionToken}`;

    return {
      providerRequestId,
      signingUrlReference,
      status: "sent",
    };
  }

  async getSigningStatus(providerRequestId: string): Promise<{
    status: "pending" | "signed" | "completed" | "declined" | "expired";
    signers: SignerInfo[];
  }> {
    return {
      status: "pending",
      signers: [],
    };
  }

  async cancelSigningRequest(providerRequestId: string): Promise<boolean> {
    return true;
  }
}

export function getActiveESignatureProvider(): ESignatureProvider {
  // Check for Dropbox Sign credentials
  const dbxKey = process.env.DROPBOX_SIGN_API_KEY || process.env.HELLOSIGN_API_KEY;
  if (dbxKey && dbxKey.trim().length > 10) {
    const { dropboxSignProvider } = require("./providers/dropbox-sign.provider");
    return dropboxSignProvider;
  }

  // Check for DocuSign credentials
  const docusignAcct = process.env.DOCUSIGN_ACCOUNT_ID;
  if (docusignAcct && docusignAcct.trim().length > 5) {
    const { docuSignProvider } = require("./providers/docusign.provider");
    return docuSignProvider;
  }

  return new InternalEsignProvider();
}

export const esignatureProvider: ESignatureProvider = new InternalEsignProvider();