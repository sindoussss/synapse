import { NextResponse } from "next/server";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";
import { OPERATOR_SESSION_COOKIE } from "@/lib/http/operator-session";

export async function POST(req: Request) {
  const denied = denyUnlessAuthenticated(req);
  if (denied) return denied;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
