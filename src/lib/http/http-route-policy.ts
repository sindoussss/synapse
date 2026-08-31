export type HttpRouteClass =
  | "PUBLIC"
  | "OPERATOR_AUTHENTICATED"
  | "CLIENT_AUTHENTICATED"
  | "INTERNAL_ONLY"
  | "WEBHOOK_PUBLIC_BUT_SIGNED";

function normalizePath(pathname: string): string {
  if (!pathname) return "";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

/**
 * Classify API paths. Default is fail-closed OPERATOR_AUTHENTICATED.
 * Caller role is not a classifier input.
 */
export function classifyApiPath(pathname: string): HttpRouteClass {
  const path = normalizePath(pathname);

  if (path === "/api/payments/paypal/webhook") {
    return "WEBHOOK_PUBLIC_BUT_SIGNED";
  }

  if (
    path === "/api/auth/login" ||
    path === "/api/auth/logout" ||
    path === "/api/auth/session"
  ) {
    return "PUBLIC";
  }

  // Signer embed bootstrap. Dropbox Sign signatureId is the capability.
  if (path === "/api/agreements/signing/embed-url") {
    return "PUBLIC";
  }

  if (path.startsWith("/api/")) {
    return "OPERATOR_AUTHENTICATED";
  }

  return "PUBLIC";
}

export function isPublicApiPath(pathname: string): boolean {
  const classification = classifyApiPath(pathname);
  return classification === "PUBLIC" || classification === "WEBHOOK_PUBLIC_BUT_SIGNED";
}
