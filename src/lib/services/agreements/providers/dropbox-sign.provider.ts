import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ESignatureProvider, CreateSigningRequestResult } from "../esignature.provider";
import { SignerInfo } from "@/lib/repositories/agreement-delivery.repository";

export class DropboxSignProvider implements ESignatureProvider {
  readonly name = "Dropbox Sign";

  private getApiKey(): string | null {
    return process.env.DROPBOX_SIGN_API_KEY || process.env.HELLOSIGN_API_KEY || null;
  }

  private getClientId(): string | null {
    return process.env.DROPBOX_SIGN_CLIENT_ID || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 10);
  }

  async createSigningRequest(
    documentHash: string,
    signers: SignerInfo[],
    metadata: Record<string, any>
  ): Promise<CreateSigningRequestResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Dropbox Sign credentials missing. Please configure DROPBOX_SIGN_API_KEY in .env.local.");
    }

    const clientId = this.getClientId();
    const testMode = process.env.DROPBOX_SIGN_TEST_MODE === "false" ? 0 : 1;
    const pdfPath = metadata.pdfPath || path.resolve(process.cwd(), "public", "agreements", `agreement-${metadata.agreementId}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Agreement PDF file not found at: ${pdfPath}`);
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    if (calculatedHash !== documentHash) {
      throw new Error(`Security Violation: PDF file hash mismatch! Expected ${documentHash}, found ${calculatedHash}`);
    }

    // Build multi-part form-data for Dropbox Sign API
    const formData = new FormData();
    formData.append("test_mode", testMode.toString());
    formData.append("title", metadata.title || "Web Development Services Agreement");
    formData.append("subject", metadata.subject || "Please review and sign this agreement");
    formData.append("message", metadata.message || "Please sign the attached agreement.");

    if (clientId) {
      formData.append("client_id", clientId);
    }

    signers.forEach((s, idx) => {
      formData.append(`signers[${idx}][name]`, s.name);
      formData.append(`signers[${idx}][email_address]`, s.email);
      formData.append(`signers[${idx}][order]`, (idx + 1).toString());
    });

    const blob = new Blob([fileBuffer], { type: "application/pdf" });
    formData.append("file[0]", blob, path.basename(pdfPath));

    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");

    const endpoint = clientId
      ? "https://api.hellosign.com/v3/signature_request/create_embedded"
      : "https://api.hellosign.com/v3/signature_request/send";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.signature_request) {
      throw new Error(data.error?.error_msg || "Dropbox Sign API request failed.");
    }

    const sigReq = data.signature_request;
    let signingUrlReference = sigReq.signing_url || `https://app.hellosign.com/sign/${sigReq.signature_request_id}`;

    // If embedded, fetch initial sign_url for first signer
    if (clientId && sigReq.signatures && sigReq.signatures.length > 0) {
      try {
        const firstSigId = sigReq.signatures[0].signature_id;
        const signUrlRes = await fetch(`https://api.hellosign.com/v3/embedded/sign_url/${firstSigId}`, {
          headers: { Authorization: authHeader },
        });
        const signUrlData = await signUrlRes.json();
        if (signUrlData.embedded?.sign_url) {
          signingUrlReference = signUrlData.embedded.sign_url;
        }
      } catch {}
    }

    return {
      providerRequestId: sigReq.signature_request_id,
      signingUrlReference,
      status: "sent",
    };
  }

  async getSigningStatus(providerRequestId: string): Promise<{
    status: "pending" | "signed" | "completed" | "declined" | "expired";
    signers: SignerInfo[];
    signatureRequest?: any;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("Dropbox Sign credentials not configured.");

    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`https://api.hellosign.com/v3/signature_request/${providerRequestId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok || !data.signature_request) {
      throw new Error(data.error?.error_msg || "Failed to fetch signature request status from Dropbox Sign.");
    }

    const req = data.signature_request;
    let status: "pending" | "signed" | "completed" | "declined" | "expired" = "pending";
    if (req.is_complete) status = "completed";
    else if (req.is_declined) status = "declined";
    else if (req.has_error) status = "declined";

    // Map each signature distinctly by order / role
    const signers: any[] = (req.signatures || []).map((s: any, idx: number) => ({
      signatureId: s.signature_id,
      role: (s.order === 0 || s.order === 1 || idx === 0) ? ("client" as const) : ("operator" as const),
      name: s.signer_name,
      email: s.signer_email_address,
      company: "",
      status: s.status_code === "signed" ? ("signed" as const) : s.status_code === "declined" ? ("declined" as const) : ("pending" as const),
      signedAt: s.signed_at ? new Date(s.signed_at * 1000).toISOString() : null,
      lastViewedAt: s.last_viewed_at ? new Date(s.last_viewed_at * 1000).toISOString() : null,
    }));

    return { status, signers, signatureRequest: req };
  }

  async getEmbeddedSignUrl(signatureId: string): Promise<string | null> {
    const apiKey = this.getApiKey();
    const clientId = this.getClientId();
    if (!apiKey) return null;
    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`https://api.hellosign.com/v3/embedded/sign_url/${signatureId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    let url = data.embedded?.sign_url || null;
    if (url && clientId && !url.includes("client_id=")) {
      url = `${url}&client_id=${clientId}`;
    }
    return url;
  }

  async cancelSigningRequest(providerRequestId: string): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;

    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`https://api.hellosign.com/v3/signature_request/cancel/${providerRequestId}`, {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    return res.ok;
  }

  async downloadCompletedDocument(providerRequestId: string, savePath: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("Dropbox Sign credentials not configured.");

    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`https://api.hellosign.com/v3/signature_request/files/${providerRequestId}?get_data_uri=false`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) throw new Error("Failed to download completed PDF from Dropbox Sign.");

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(savePath, buffer);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  verifyWebhookSignature(eventPayload: string, signatureHash: string): boolean {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;
    const computed = crypto.createHmac("sha256", apiKey).update(eventPayload).digest("hex");
    return computed === signatureHash;
  }
}

export const dropboxSignProvider = new DropboxSignProvider();