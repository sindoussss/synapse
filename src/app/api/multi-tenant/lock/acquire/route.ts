import { NextResponse } from "next/server";
import { multiTenantService } from "@/lib/services/multi-tenant/multi-tenant.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await multiTenantService.acquireProjectLock(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}