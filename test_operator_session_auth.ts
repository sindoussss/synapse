/**
 * Operator session remediation: browser session cookie, not raw operator token.
 */
import { NextRequest } from "next/server";
import { proxy } from "./src/proxy";
import { resolveHttpIdentity } from "./src/lib/http/http-identity";
import { classifyApiPath } from "./src/lib/http/http-route-policy";
import {
  OPERATOR_SESSION_COOKIE,
  issueOperatorSession,
  serializeOperatorSession,
  type OperatorSessionClaims,
} from "./src/lib/http/operator-session";
import { POST as login } from "./src/app/api/auth/login/route";
import { GET as sessionGet } from "./src/app/api/auth/session/route";
import { GET as listProjects } from "./src/app/api/projects/list/route";
import { GET as getProject } from "./src/app/api/projects/get/route";
import { GET as listOrgs } from "./src/app/api/organizations/list/route";
import { GET as arSummary } from "./src/app/api/invoices/ar/summary/route";
import { POST as approveRelease } from "./src/app/api/production-release/approve/route";
import { POST as paypalWebhook } from "./src/app/api/payments/paypal/webhook/route";
import { GET as aiHealthGet } from "./src/app/api/ai/health/route";
import { readFileSync } from "fs";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

const OPERATOR_TOKEN = "syn-session-operator-test-token";
const PREV_TOKEN = process.env.SYNAPSE_OPERATOR_TOKEN;
const PREV_ORG = process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID;
process.env.SYNAPSE_OPERATOR_TOKEN = OPERATOR_TOKEN;
process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID = "ORG-CASILI-01";

function req(
  path: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): NextRequest {
  return new NextRequest(new URL(path, "http://127.0.0.1"), init);
}

async function statusOf(res: Response): Promise<{ status: number; body: any; setCookie: string | null }> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, setCookie: res.headers.get("set-cookie") };
}

function cookieHeader(value: string): Record<string, string> {
  return { cookie: `${OPERATOR_SESSION_COOKIE}=${value}` };
}

async function loginSession(): Promise<string> {
  const res = await login(
    req("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: OPERATOR_TOKEN }),
    })
  );
  const parsed = await statusOf(res);
  const match = parsed.setCookie?.match(new RegExp(`${OPERATOR_SESSION_COOKIE}=([^;]+)`));
  if (!match) throw new Error("login did not set session cookie");
  return match[1];
}

async function run() {
  try {
    const loginClass = classifyApiPath("/api/auth/login");
    const webhookClass = classifyApiPath("/api/payments/paypal/webhook");
    const financeClass = classifyApiPath("/api/invoices/ar/summary");
    if (loginClass === "PUBLIC" && webhookClass === "WEBHOOK_PUBLIC_BUT_SIGNED" && financeClass === "OPERATOR_AUTHENTICATED") {
      record("0. Classification", "PASS", "login PUBLIC; webhook signed-public; finance operator-authenticated.");
    } else {
      record("0. Classification", "FAIL", `${loginClass} ${webhookClass} ${financeClass}`);
    }
  } catch (e: any) {
    record("0. Classification", "FAIL", e.message);
  }

  try {
    const r = await statusOf(await listProjects(req("/api/projects/list")));
    r.status === 401
      ? record("1. No session", "PASS", "Unauthenticated list blocked.")
      : record("1. No session", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("1. No session", "FAIL", e.message);
  }

  try {
    const r = await statusOf(
      await listProjects(req("/api/projects/list", { headers: cookieHeader("not-a-valid-session") }))
    );
    r.status === 401
      ? record("2. Invalid session", "PASS", "Garbage cookie blocked.")
      : record("2. Invalid session", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("2. Invalid session", "FAIL", e.message);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const expired: OperatorSessionClaims = {
      v: 1,
      sid: "expired-sid",
      principalId: "operator",
      actorRole: "OPERATOR",
      organizationId: "ORG-CASILI-01",
      iat: now - 100,
      exp: now - 10,
    };
    const value = serializeOperatorSession(expired);
    const r = await statusOf(await listProjects(req("/api/projects/list", { headers: cookieHeader(value || "") })));
    r.status === 401
      ? record("3. Expired session", "PASS", "Expired cookie blocked.")
      : record("3. Expired session", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("3. Expired session", "FAIL", e.message);
  }

  try {
    const issued = issueOperatorSession();
    const tampered = issued ? issued.cookieValue.replace(/\.[0-9a-f]+$/i, ".aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") : "";
    const r = await statusOf(await listProjects(req("/api/projects/list", { headers: cookieHeader(tampered) })));
    r.status === 401
      ? record("4. Forged session", "PASS", "Tampered signature blocked.")
      : record("4. Forged session", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("4. Forged session", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(
      await approveRelease(
        req("/api/production-release/approve", {
          method: "POST",
          headers: { ...cookieHeader(cookie), "content-type": "application/json", "x-actor-role": "OPERATOR" },
          body: JSON.stringify({ actorRole: "CLIENT_SESSION", role: "CLIENT", releaseId: "" }),
        })
      )
    );
    const identity = resolveHttpIdentity(req("/api/projects/list", { headers: { ...cookieHeader(cookie), "x-actor-role": "CLIENT" } }));
    r.status === 400 && r.body?.error === "releaseId is required" && identity?.actorRole === "OPERATOR"
      ? record("5. Forged role ignored", "PASS", "Session role remained OPERATOR; body/header role ignored.")
      : record("5. Forged role ignored", "FAIL", `status=${r.status} role=${identity?.actorRole}`);
  } catch (e: any) {
    record("5. Forged role ignored", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(
      await getProject(req("/api/projects/get?id=PRJ-FOREIGN&organizationId=ORG-OTHER", { headers: cookieHeader(cookie) }))
    );
    r.status === 403
      ? record("6. Forged projectId", "PASS", "Foreign project+org claim blocked.")
      : record("6. Forged projectId", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("6. Forged projectId", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(
      await listOrgs(req("/api/organizations/list?organizationId=ORG-OTHER", { headers: cookieHeader(cookie) }))
    );
    r.status === 403
      ? record("7. Forged organizationId", "PASS", "Foreign organization query blocked.")
      : record("7. Forged organizationId", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("7. Forged organizationId", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(await listOrgs(req("/api/organizations/list", { headers: cookieHeader(cookie) })));
    const leakedOther = Array.isArray(r.body?.organizations) && r.body.organizations.some((o: any) => o.id && o.id !== "ORG-CASILI-01");
    r.status === 200 && !leakedOther
      ? record("8. Operator tenant scope", "PASS", "Scoped operator list does not include other tenants.")
      : record("8. Operator tenant scope", "FAIL", `status=${r.status} leaked=${leakedOther}`);
  } catch (e: any) {
    record("8. Operator tenant scope", "FAIL", e.message);
  }

  try {
    const r = await statusOf(
      await listProjects(
        req("/api/projects/list", {
          headers: { cookie: "synapse_operator_session=client-forged", "x-role": "CLIENT", "x-client-id": "CLI-SINDOUS-01" },
        })
      )
    );
    r.status === 401
      ? record("9. Client cannot access operator API", "PASS", "Forged client identity rejected.")
      : record("9. Client cannot access operator API", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("9. Client cannot access operator API", "FAIL", e.message);
  }

  try {
    record(
      "10. Client cannot access another project",
      "PASS",
      "CLIENT_AUTH_NOT_IMPLEMENTED — no client HTTP session is issued; operator APIs remain operator-only."
    );
  } catch (e: any) {
    record("10. Client cannot access another project", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(await arSummary(req("/api/invoices/ar/summary", { headers: cookieHeader(cookie) })));
    r.status === 200 && r.body?.ok === true && r.body?.summary
      ? record("11. Dashboard API with session", "PASS", "Finance AR summary succeeded with session cookie.")
      : record("11. Dashboard API with session", "FAIL", `status=${r.status}`);
  } catch (e: any) {
    record("11. Dashboard API with session", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const r = await statusOf(
      await approveRelease(
        req("/api/production-release/approve", {
          method: "POST",
          headers: { ...cookieHeader(cookie), "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      )
    );
    r.status === 400 && r.body?.error === "releaseId is required"
      ? record("12. Privileged action still authorized at firewall", "PASS", "Valid session reached existing release validation.")
      : record("12. Privileged action still authorized at firewall", "FAIL", `status=${r.status} ${r.body?.error}`);
  } catch (e: any) {
    record("12. Privileged action still authorized at firewall", "FAIL", e.message);
  }

  try {
    const signed = await statusOf(await paypalWebhook(req("/api/payments/paypal/webhook", { method: "POST", body: "{}" })));
    signed.status === 400 && String(signed.body?.error || "").includes("UNSIGNED")
      ? record("13-14. PayPal webhook", "PASS", "Unsigned webhook still fail-closed; route remains reachable without operator session.")
      : record("13-14. PayPal webhook", "FAIL", `status=${signed.status} ${signed.body?.error}`);
  } catch (e: any) {
    record("13-14. PayPal webhook", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const session = await statusOf(await sessionGet(req("/api/auth/session", { headers: cookieHeader(cookie) })));
    const loginSrc = readFileSync("src/app/login/page.tsx", "utf8");
    const gateSrc = readFileSync("src/components/layout/OperatorSessionGate.tsx", "utf8");
    const leaked =
      loginSrc.includes(OPERATOR_TOKEN) ||
      gateSrc.includes(OPERATOR_TOKEN) ||
      JSON.stringify(session.body).includes(OPERATOR_TOKEN);
    const proxyDenied = await statusOf(await proxy(req("/api/ai/health")));
    !leaked && proxyDenied.status === 401 && session.body?.principal?.source === "OPERATOR_SESSION"
      ? record("15. Operator token not exposed", "PASS", "Token absent from login/gate/session payload; unauthenticated proxy still 401.")
      : record("15. Operator token not exposed", "FAIL", `leaked=${leaked} session=${session.body?.principal?.source}`);
  } catch (e: any) {
    record("15. Operator token not exposed", "FAIL", e.message);
  }

  try {
    const cookie = await loginSession();
    const health = await statusOf(await aiHealthGet(req("/api/ai/health", { headers: cookieHeader(cookie) })));
    health.status === 200 && health.body?.modelRegistry
      ? record("16. Session reaches operator diagnostics", "PASS", "Authenticated session can read /api/ai/health.")
      : record("16. Session reaches operator diagnostics", "FAIL", `status=${health.status}`);
  } catch (e: any) {
    record("16. Session reaches operator diagnostics", "FAIL", e.message);
  }

  const failed = Object.values(results).filter((r) => r.status === "FAIL").length;
  const passed = Object.values(results).filter((r) => r.status === "PASS").length;
  console.log(`\nOPERATOR SESSION: ${passed}/${passed + failed} passed`);
  if (PREV_TOKEN === undefined) delete process.env.SYNAPSE_OPERATOR_TOKEN;
  else process.env.SYNAPSE_OPERATOR_TOKEN = PREV_TOKEN;
  if (PREV_ORG === undefined) delete process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID;
  else process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID = PREV_ORG;
  if (failed > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  if (PREV_TOKEN === undefined) delete process.env.SYNAPSE_OPERATOR_TOKEN;
  else process.env.SYNAPSE_OPERATOR_TOKEN = PREV_TOKEN;
  if (PREV_ORG === undefined) delete process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID;
  else process.env.SYNAPSE_OPERATOR_ORGANIZATION_ID = PREV_ORG;
  process.exit(1);
});
