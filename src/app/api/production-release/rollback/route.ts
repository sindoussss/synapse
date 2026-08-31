import { NextResponse } from "next/server";
import { productionReleaseService } from "@/lib/services/production-release/production-release.service";
import { isHttpDenial, requireHttpPrincipal } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const principal = requireHttpPrincipal(req);
    if (isHttpDenial(principal)) return principal;
    const { releaseId } = await req.json();
    if (!releaseId) return NextResponse.json({ ok: false, error: "releaseId is required" }, { status: 400 });
    const result = await productionReleaseService.rollbackRelease(releaseId, principal.actorRole);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}