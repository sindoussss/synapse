import { NextResponse } from "next/server";
import { productionReleaseService } from "@/lib/services/production-release/production-release.service";
import { isHttpDenial, requireHttpPrincipal } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const principal = requireHttpPrincipal(req);
    if (isHttpDenial(principal)) return principal;
    const body = await req.json().catch(() => ({}));
    const releaseId = typeof body?.releaseId === "string" ? body.releaseId : "";
    const domainName = typeof body?.domainName === "string" ? body.domainName : "";
    if (!releaseId || !domainName) {
      return NextResponse.json({ ok: false, error: "releaseId and domainName are required" }, { status: 400 });
    }

    const result = await productionReleaseService.approveDNSCutover({
      releaseId,
      domainName,
      actorRole: principal.actorRole,
      callerOrgId: principal.organizationId,
      callerWorkspaceId: principal.workspaceId,
      callerProjectId: typeof body?.projectId === "string" ? body.projectId : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
