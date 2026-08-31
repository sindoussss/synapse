import crypto from "crypto";
import type { ActorRole } from "@/lib/services/security/privileged-action-firewall.service";
import {
  OPERATOR_SESSION_COOKIE,
  parseCookieHeader,
  verifyOperatorSessionCookie,
} from "@/lib/http/operator-session";

/**
 * HTTP identity is resolved only from:
 * 1. Process-configured operator bearer token (machine / INTERNAL)
 * 2. Server-issued HMAC operator session cookie (browser)
 *
 * Caller-supplied role, user id, organization id, or project id are never identity.
 */
export type HttpPrincipal = {
  principalId: string;
  actorRole: ActorRole;
  organizationId?: string;
  workspaceId?: string;
  source: "OPERATOR_TOKEN" | "OPERATOR_SESSION";
};

const OPERATOR_TOKEN_ENV = "SYNAPSE_OPERATOR_TOKEN";
const OPERATOR_ORG_ENV = "SYNAPSE_OPERATOR_ORGANIZATION_ID";
const OPERATOR_WS_ENV = "SYNAPSE_OPERATOR_WORKSPACE_ID";

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function configuredOperatorToken(): string | null {
  const token = process.env[OPERATOR_TOKEN_ENV];
  if (!token || token.trim().length === 0) return null;
  return token;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  return match[1];
}

function tokensMatch(provided: string, expected: string): boolean {
  const a = sha256(provided);
  const b = sha256(expected);
  return crypto.timingSafeEqual(a, b);
}

function resolveBearerIdentity(req: Request): HttpPrincipal | null {
  const expected = configuredOperatorToken();
  if (!expected) return null;

  const provided = extractBearerToken(req);
  if (!provided) return null;
  if (!tokensMatch(provided, expected)) return null;

  const organizationId = process.env[OPERATOR_ORG_ENV]?.trim() || undefined;
  const workspaceId = process.env[OPERATOR_WS_ENV]?.trim() || undefined;

  return {
    principalId: "operator",
    actorRole: "OPERATOR",
    organizationId,
    workspaceId,
    source: "OPERATOR_TOKEN",
  };
}

function resolveSessionIdentity(req: Request): HttpPrincipal | null {
  const raw = parseCookieHeader(req.headers.get("cookie"), OPERATOR_SESSION_COOKIE);
  const claims = verifyOperatorSessionCookie(raw);
  if (!claims) return null;
  return {
    principalId: claims.principalId,
    actorRole: claims.actorRole,
    organizationId: claims.organizationId || undefined,
    workspaceId: claims.workspaceId || undefined,
    source: "OPERATOR_SESSION",
  };
}

/**
 * Resolve the authenticated HTTP principal.
 * Returns null when no production identity can be established (fail closed).
 */
export function resolveHttpIdentity(req: Request): HttpPrincipal | null {
  return resolveBearerIdentity(req) ?? resolveSessionIdentity(req);
}

/**
 * Target scope claimed by the request is not identity.
 * If the principal is tenant-bound and the request names another org, deny.
 */
export function requestTargetOrganizationId(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("organizationId");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch {
    return null;
  }
  return null;
}

export function requestTargetProjectId(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("projectId") || url.searchParams.get("id");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch {
    return null;
  }
  return null;
}
