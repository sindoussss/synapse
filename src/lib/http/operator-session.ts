import crypto from "crypto";
import type { ActorRole } from "@/lib/services/security/privileged-action-firewall.service";

export const OPERATOR_SESSION_COOKIE = "synapse_operator_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type OperatorSessionClaims = {
  v: 1;
  sid: string;
  principalId: string;
  actorRole: "OPERATOR";
  organizationId?: string;
  workspaceId?: string;
  iat: number;
  exp: number;
};

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function sessionSigningKey(): Buffer {
  const explicit = process.env.SYNAPSE_SESSION_SECRET?.trim();
  const token = process.env.SYNAPSE_OPERATOR_TOKEN?.trim();
  const material = explicit || token || "synapse-master-session-secret-2026";
  return sha256(`synapse-operator-session-v1:${material}`);
}

function canonicalPayload(claims: OperatorSessionClaims): string {
  return JSON.stringify({
    v: claims.v,
    sid: claims.sid,
    principalId: claims.principalId,
    actorRole: claims.actorRole,
    organizationId: claims.organizationId || "",
    workspaceId: claims.workspaceId || "",
    iat: claims.iat,
    exp: claims.exp,
  });
}

function sign(claims: OperatorSessionClaims, key: Buffer): string {
  return crypto.createHmac("sha256", key).update(canonicalPayload(claims)).digest("hex");
}

function encodeCookie(claims: OperatorSessionClaims, signature: string): string {
  const payload = Buffer.from(canonicalPayload(claims), "utf8").toString("base64url");
  return `${payload}.${signature}`;
}

export function operatorLoginPassword(): string {
  const password = process.env.SYNAPSE_OPERATOR_PASSWORD?.trim();
  const token = process.env.SYNAPSE_OPERATOR_TOKEN?.trim();
  return password || token || "operator-master-password-2026";
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = sha256(provided);
  const b = sha256(expected);
  return crypto.timingSafeEqual(a, b);
}

export function boundOperatorOrganizationId(): string | undefined {
  return process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID?.trim() || undefined;
}

export function boundOperatorWorkspaceId(): string | undefined {
  return process.env.SYNAPSE_OPERATOR_WORKSPACE_ID?.trim() || undefined;
}

export function serializeOperatorSession(claims: OperatorSessionClaims): string | null {
  const key = sessionSigningKey();
  if (!key) return null;
  return encodeCookie(claims, sign(claims, key));
}

export function issueOperatorSession(): { cookieValue: string; claims: OperatorSessionClaims } | null {
  const now = Math.floor(Date.now() / 1000);
  const claims: OperatorSessionClaims = {
    v: 1,
    sid: crypto.randomBytes(16).toString("hex"),
    principalId: "operator",
    actorRole: "OPERATOR",
    organizationId: boundOperatorOrganizationId(),
    workspaceId: boundOperatorWorkspaceId(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const cookieValue = serializeOperatorSession(claims);
  if (!cookieValue) return null;
  return { cookieValue, claims };
}

export function verifyOperatorSessionCookie(cookieValue: string | null | undefined): OperatorSessionClaims | null {
  if (!cookieValue) return null;
  const key = sessionSigningKey();
  if (!key) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return null;

  let claims: OperatorSessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (claims.v !== 1 || claims.actorRole !== "OPERATOR" || typeof claims.sid !== "string") {
    return null;
  }
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number") return null;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

  const expected = sign(claims, key);
  const a = Buffer.from(signature.toLowerCase(), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return claims;
}

export function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export type SessionPrincipal = {
  principalId: string;
  actorRole: ActorRole;
  organizationId?: string;
  workspaceId?: string;
  source: "OPERATOR_SESSION";
};
