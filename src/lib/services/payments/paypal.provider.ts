import fs from "fs";
import path from "path";

export type PayPalEnvironment = "sandbox" | "live";

export interface PaymentProvider {
  getEnvironment(override?: string): PayPalEnvironment;

  createPaymentRequest(params: {
    invoiceId: string;
    invoiceNumber: string;
    amountMinorUnits: number;
    currency: string;
    customId?: string;
    environment?: PayPalEnvironment;
  }): Promise<{
    orderId: string;
    checkoutUrl: string;
    status: string;
    environment: PayPalEnvironment;
  }>;

  getPaymentStatus(orderId: string, environment?: PayPalEnvironment): Promise<{
    orderId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    captureId?: string;
    completedAt?: string;
    environment: PayPalEnvironment;
  }>;

  verifyWebhook(headers: Record<string, string>, rawBody: string, expectedEnv?: PayPalEnvironment): Promise<{
    isValid: boolean;
    eventType?: string;
    eventId?: string;
    resource?: any;
    error?: string;
    environment: PayPalEnvironment;
  }>;

  capturePayment(orderId: string, environment?: PayPalEnvironment): Promise<{
    orderId: string;
    captureId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    completedAt: string;
    environment: PayPalEnvironment;
  }>;

  getTransaction(captureId: string, environment?: PayPalEnvironment): Promise<{
    captureId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    createTime: string;
    environment: PayPalEnvironment;
  }>;

  cancelPaymentRequest(orderId: string, environment?: PayPalEnvironment): Promise<boolean>;
}

export class PayPalProvider implements PaymentProvider {
  getEnvironment(override?: string): PayPalEnvironment {
    const raw = (override || process.env.PAYPAL_ENV || process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase();
    return raw === "live" || raw === "production" ? "live" : "sandbox";
  }

  getBaseUrl(env?: PayPalEnvironment): string {
    const activeEnv = env || this.getEnvironment();
    return activeEnv === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  private getCredentials(env?: PayPalEnvironment): { clientId?: string; clientSecret?: string } {
    const activeEnv = env || this.getEnvironment();
    if (activeEnv === "live") {
      return {
        clientId: (process.env.PAYPAL_LIVE_CLIENT_ID || (process.env.PAYPAL_ENV === "live" ? process.env.PAYPAL_CLIENT_ID : undefined))?.trim(),
        clientSecret: (process.env.PAYPAL_LIVE_CLIENT_SECRET || (process.env.PAYPAL_ENV === "live" ? process.env.PAYPAL_CLIENT_SECRET : undefined))?.trim(),
      };
    }
    return {
      clientId: process.env.PAYPAL_CLIENT_ID?.trim(),
      clientSecret: process.env.PAYPAL_CLIENT_SECRET?.trim(),
    };
  }

  isConfigured(env?: PayPalEnvironment): boolean {
    const { clientId, clientSecret } = this.getCredentials(env);
    return !!(clientId && clientSecret && clientId.length > 5 && clientSecret.length > 5);
  }

  async getAccessToken(env?: PayPalEnvironment): Promise<string> {
    const activeEnv = env || this.getEnvironment();
    const { clientId, clientSecret } = this.getCredentials(activeEnv);

    if (!clientId || !clientSecret) {
      if (activeEnv === "live") {
        throw new Error("PAYPAL_CONFIGURATION_INVALID: PayPal Live credentials (PAYPAL_LIVE_CLIENT_ID/SECRET) missing from environment.");
      }
      throw new Error("PAYPAL_CONFIGURATION_INVALID: PayPal Sandbox credentials (PAYPAL_CLIENT_ID/SECRET) missing from environment.");
    }

    const authHeader = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${this.getBaseUrl(activeEnv)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal OAuth authentication failed (${activeEnv}): ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  async createPaymentRequest(params: {
    invoiceId: string;
    invoiceNumber: string;
    amountMinorUnits: number;
    currency: string;
    customId?: string;
    environment?: PayPalEnvironment;
  }): Promise<{
    orderId: string;
    checkoutUrl: string;
    status: string;
    environment: PayPalEnvironment;
  }> {
    const targetEnv = params.environment || this.getEnvironment();
    if (!this.isConfigured(targetEnv)) {
      throw new Error(`PAYPAL_CONFIGURATION_INVALID: Credentials missing for PayPal ${targetEnv} environment.`);
    }

    const token = await this.getAccessToken(targetEnv);
    const majorAmount = (params.amountMinorUnits / 100).toFixed(2);

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.invoiceId,
          custom_id: params.customId || params.invoiceId,
          description: `Payment for Invoice ${params.invoiceNumber}`,
          amount: {
            currency_code: params.currency,
            value: majorAmount,
          },
        },
      ],
      application_context: {
        brand_name: "Synapse Operations",
        user_action: "PAY_NOW",
        return_url: `http://localhost:3005/finance?paypal_order=${params.invoiceId}&success=true`,
        cancel_url: `http://localhost:3005/finance?paypal_order=${params.invoiceId}&cancel=true`,
      },
    };

    const res = await fetch(`${this.getBaseUrl(targetEnv)}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Create Order failed (${targetEnv}): ${res.status} ${err}`);
    }

    const data = await res.json();
    const approveLink = data.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approveLink) {
      throw new Error("PayPal response missing approval URL.");
    }

    return {
      orderId: data.id,
      checkoutUrl: approveLink,
      status: data.status,
      environment: targetEnv,
    };
  }

  async getPaymentStatus(orderId: string, environment?: PayPalEnvironment): Promise<{
    orderId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    captureId?: string;
    completedAt?: string;
    environment: PayPalEnvironment;
  }> {
    const targetEnv = environment || this.getEnvironment();
    const token = await this.getAccessToken(targetEnv);
    const res = await fetch(`${this.getBaseUrl(targetEnv)}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Get Order failed (${targetEnv}): ${res.status} ${err}`);
    }

    const data = await res.json();
    const unit = data.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    const currency = unit?.amount?.currency_code || "PHP";
    const amountVal = parseFloat(unit?.amount?.value || "0");
    const amountMinorUnits = Math.round(amountVal * 100);

    return {
      orderId: data.id,
      status: data.status,
      currency,
      amountMinorUnits,
      captureId: capture?.id,
      completedAt: capture?.create_time || data.update_time,
      environment: targetEnv,
    };
  }

  async capturePayment(orderId: string, environment?: PayPalEnvironment): Promise<{
    orderId: string;
    captureId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    completedAt: string;
    environment: PayPalEnvironment;
  }> {
    const targetEnv = environment || this.getEnvironment();
    const token = await this.getAccessToken(targetEnv);
    const res = await fetch(`${this.getBaseUrl(targetEnv)}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Capture Order failed (${targetEnv}): ${res.status} ${err}`);
    }

    const data = await res.json();
    const unit = data.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    const currency = capture?.amount?.currency_code || unit?.amount?.currency_code || "PHP";
    const amountVal = parseFloat(capture?.amount?.value || unit?.amount?.value || "0");
    const amountMinorUnits = Math.round(amountVal * 100);

    return {
      orderId: data.id,
      captureId: capture?.id || data.id,
      status: data.status,
      currency,
      amountMinorUnits,
      completedAt: capture?.create_time || new Date().toISOString(),
      environment: targetEnv,
    };
  }

  async getTransaction(captureId: string, environment?: PayPalEnvironment): Promise<{
    captureId: string;
    status: string;
    currency: string;
    amountMinorUnits: number;
    createTime: string;
    environment: PayPalEnvironment;
  }> {
    const targetEnv = environment || this.getEnvironment();
    const token = await this.getAccessToken(targetEnv);
    const res = await fetch(`${this.getBaseUrl(targetEnv)}/v2/payments/captures/${captureId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Get Capture failed (${targetEnv}): ${res.status} ${err}`);
    }

    const data = await res.json();
    const currency = data.amount?.currency_code || "PHP";
    const amountVal = parseFloat(data.amount?.value || "0");
    const amountMinorUnits = Math.round(amountVal * 100);

    return {
      captureId: data.id,
      status: data.status,
      currency,
      amountMinorUnits,
      createTime: data.create_time,
      environment: targetEnv,
    };
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string, expectedEnv?: PayPalEnvironment): Promise<{
    isValid: boolean;
    eventType?: string;
    eventId?: string;
    resource?: any;
    error?: string;
    environment: PayPalEnvironment;
  }> {
    const activeEnv = expectedEnv || this.getEnvironment();
    let parsed: any;
    try {
      parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      return { isValid: false, error: "Invalid JSON webhook payload.", environment: activeEnv };
    }

    const webhookId = process.env.PAYPAL_WEBHOOK_ID || process.env.PAYPAL_LIVE_WEBHOOK_ID;
    const authAlgo = headers["paypal-auth-algo"] || headers["PAYPAL-AUTH-ALGO"];
    const transmissionId = headers["paypal-transmission-id"] || headers["PAYPAL-TRANSMISSION-ID"];
    const transmissionTime = headers["paypal-transmission-time"] || headers["PAYPAL-TRANSMISSION-TIME"];
    const transmissionSig = headers["paypal-transmission-sig"] || headers["PAYPAL-TRANSMISSION-SIG"];
    const certUrl = headers["paypal-cert-url"] || headers["PAYPAL-CERT-URL"];

    if (!transmissionSig || !transmissionId || !transmissionTime || !certUrl) {
      return { isValid: false, error: "UNSIGNED_WEBHOOK: Missing required PayPal signature headers.", environment: activeEnv };
    }

    if (!webhookId || !this.isConfigured(activeEnv)) {
      return {
        isValid: false,
        error: "WEBHOOK_VERIFICATION_UNAVAILABLE: Webhook ID or PayPal credentials not configured for environment.",
        environment: activeEnv,
      };
    }

    try {
      const token = await this.getAccessToken(activeEnv);
      const verifyRes = await fetch(`${this.getBaseUrl(activeEnv)}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: parsed,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.verification_status !== "SUCCESS") {
        return { isValid: false, error: "INVALID_WEBHOOK_SIGNATURE: PayPal webhook signature verification failed.", environment: activeEnv };
      }
    } catch (err: any) {
      return { isValid: false, error: `Webhook verification error: ${err.message}`, environment: activeEnv };
    }

    return {
      isValid: true,
      eventType: parsed.event_type,
      eventId: parsed.id,
      resource: parsed.resource,
      environment: activeEnv,
    };
  }

  async cancelPaymentRequest(orderId: string, environment?: PayPalEnvironment): Promise<boolean> {
    return true;
  }
}

export const payPalProvider = new PayPalProvider();
