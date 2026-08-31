import { NextResponse } from "next/server";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";
import { resolveHttpIdentity } from "@/lib/http/http-identity";

export async function GET(req: Request) {
  const denied = denyUnlessAuthenticated(req);
  if (denied) return denied;

  const principal = resolveHttpIdentity(req);
  if (!principal) {
    return NextResponse.json({ ok: true, authenticated: false, principal: null });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    principal: {
      principalId: principal.principalId,
      actorRole: principal.actorRole,
      organizationId: principal.organizationId || null,
      workspaceId: principal.workspaceId || null,
      source: principal.source,
    },
  });
}
