import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const pkg = await handoverService.confirmHandover(body);
    return NextResponse.json({ ok: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}