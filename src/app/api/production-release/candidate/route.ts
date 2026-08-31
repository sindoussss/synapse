import { NextResponse } from "next/server";
import { productionReleaseService } from "@/lib/services/production-release/production-release.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const release = await productionReleaseService.createReleaseCandidate(body);
    return NextResponse.json({ ok: true, release });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}