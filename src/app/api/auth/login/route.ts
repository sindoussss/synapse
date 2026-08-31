import { NextResponse } from "next/server";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";
import {
  issueOperatorSession,
  operatorLoginPassword,
  passwordsMatch,
  sessionCookieOptions,
  OPERATOR_SESSION_COOKIE,
} from "@/lib/http/operator-session";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;

    const expected = operatorLoginPassword();
    if (!expected) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    let password = "";
    try {
      const body = await req.json();
      password = typeof body?.password === "string" ? body.password : "";
    } catch {
      password = "";
    }

    if (!password || !passwordsMatch(password, expected)) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const issued = issueOperatorSession();
    if (!issued) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      principal: {
        principalId: issued.claims.principalId,
        actorRole: issued.claims.actorRole,
        organizationId: issued.claims.organizationId || null,
        workspaceId: issued.claims.workspaceId || null,
      },
    });
    res.cookies.set(OPERATOR_SESSION_COOKIE, issued.cookieValue, sessionCookieOptions());
    return res;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
