import { NextResponse } from "next/server";
import {
  resolveHttpIdentity,
  requestTargetOrganizationId,
  requestTargetProjectId,
  type HttpPrincipal,
} from "@/lib/http/http-identity";
import { classifyApiPath } from "@/lib/http/http-route-policy";

function pathnameOf(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "";
  }
}

function unauthenticatedResponse(): NextResponse {
  return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
}

function forbiddenResponse(): NextResponse {
  return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
}

function denyScopeMismatch(principal: HttpPrincipal, req: Request): NextResponse | null {
  if (!principal.organizationId) return null;

  const claimedOrg = requestTargetOrganizationId(req);
  if (claimedOrg && claimedOrg !== principal.organizationId) {
    return forbiddenResponse();
  }

  const claimedProject = requestTargetProjectId(req);
  if (claimedOrg && claimedProject && claimedOrg !== principal.organizationId) {
    return forbiddenResponse();
  }

  return null;
}

/**
 * Fail-closed HTTP gate.
 * PUBLIC and signed-webhook paths skip operator identity (they authenticate themselves).
 * Request body / query / x-role headers are never consulted as identity.
 */
export function denyUnlessAuthenticated(req: Request): NextResponse | null {
  const classification = classifyApiPath(pathnameOf(req));
  if (classification === "PUBLIC" || classification === "WEBHOOK_PUBLIC_BUT_SIGNED") {
    return null;
  }

  const principal = resolveHttpIdentity(req);
  if (!principal) return unauthenticatedResponse();

  if (classification === "OPERATOR_AUTHENTICATED" || classification === "INTERNAL_ONLY") {
    if (principal.actorRole !== "OPERATOR") return forbiddenResponse();
  }

  if (classification === "CLIENT_AUTHENTICATED") {
    if (principal.actorRole !== "CLIENT_SESSION") return forbiddenResponse();
  }

  const scoped = denyScopeMismatch(principal, req);
  if (scoped) return scoped;

  return null;
}

export function requireHttpPrincipal(req: Request): HttpPrincipal | NextResponse {
  const denied = denyUnlessAuthenticated(req);
  if (denied) return denied;
  const principal = resolveHttpIdentity(req);
  if (!principal) return unauthenticatedResponse();
  return principal;
}

export function isHttpDenial(value: HttpPrincipal | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
