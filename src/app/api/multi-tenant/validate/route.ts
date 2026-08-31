import { NextResponse } from "next/server";
import { multiTenantService } from "@/lib/services/multi-tenant/multi-tenant.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const result = await multiTenantService.validateBoundary(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }
}