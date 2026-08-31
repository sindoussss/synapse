import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";
import { isHttpDenial, requireHttpPrincipal } from "@/lib/http/enforce-http-auth";
import type { PayPalEnvironment } from "@/lib/services/payments/paypal.provider";

export async function POST(req: Request) {
  try {
    const principal = requireHttpPrincipal(req);
    if (isHttpDenial(principal)) return principal;

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : undefined;
    const captureId =
      typeof body?.captureId === "string"
        ? body.captureId
        : typeof body?.providerTransactionId === "string"
          ? body.providerTransactionId
          : undefined;
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : undefined;
    const projectId = typeof body?.projectId === "string" ? body.projectId : undefined;
    const clientId = typeof body?.clientId === "string" ? body.clientId : undefined;
    const envRaw = typeof body?.environment === "string" ? body.environment.toLowerCase() : "";
    const environment: PayPalEnvironment | undefined =
      envRaw === "live" || envRaw === "sandbox" ? envRaw : undefined;

    // Amount, currency, paid/verified flags, and deliveryContext are not forwarded.
    const result = await handoverService.reconcileFinalPayment({
      orderId,
      captureId,
      invoiceId,
      projectId,
      clientId,
      environment,
      actorRole: principal.actorRole,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
