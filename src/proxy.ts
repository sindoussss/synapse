import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";
import { resolveHttpIdentity } from "@/lib/http/http-identity";

function isOperatorApprovalsPage(pathname: string): boolean {
  return pathname === "/approvals" || pathname.startsWith("/approvals/");
}

function isOperatorBillingPage(pathname: string): boolean {
  return pathname === "/billing" || pathname.startsWith("/billing/");
}

function isClientBillingPage(pathname: string): boolean {
  return pathname === "/client/billing" || pathname.startsWith("/client/billing/");
}

/**
 * Production HTTP gate.
 * API paths: operator identity (JSON 401).
 * /approvals, /billing: redirect to login before any RSC render when unauthenticated as operator.
 * /client/billing: redirect to login when unauthenticated as client.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isOperatorApprovalsPage(pathname) || isOperatorBillingPage(pathname)) {
    const principal = resolveHttpIdentity(request);
    if (!principal || principal.actorRole !== "OPERATOR") {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  if (isClientBillingPage(pathname)) {
    const principal = resolveHttpIdentity(request);
    if (!principal || principal.actorRole !== "CLIENT_SESSION") {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  const denied = denyUnlessAuthenticated(request);
  if (denied) return denied;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/approvals",
    "/approvals/:path*",
    "/billing",
    "/billing/:path*",
    "/client/billing",
    "/client/billing/:path*",
  ],
};
