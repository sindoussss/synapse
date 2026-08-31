/**
 * SYN-BUG-001 regression: unauthenticated / forged-identity HTTP must fail closed.
 * Authorized requests use the process-configured operator credential only.
 * Caller-supplied role / user / org / project is not identity.
 */
import { NextRequest } from "next/server";
import { proxy } from "./src/proxy";
import { resolveHttpIdentity } from "./src/lib/http/http-identity";
import { classifyApiPath } from "./src/lib/http/http-route-policy";
import { GET as listProjects } from "./src/app/api/projects/list/route";
import { GET as listInvoices } from "./src/app/api/invoices/list/route";
import { GET as getInvoice } from "./src/app/api/invoices/get/route";
import { GET as listOrgs } from "./src/app/api/organizations/list/route";
import { GET as listPayPalRequests } from "./src/app/api/payments/paypal/request/list/route";
import { GET as aiHealthGet, POST as aiHealthPost } from "./src/app/api/ai/health/route";
import { POST as approveRelease } from "./src/app/api/production-release/approve/route";
import { POST as rollbackRelease } from "./src/app/api/production-release/rollback/route";
import { POST as paypalVerify } from "./src/app/api/payments/paypal/verify/route";
import { POST as paypalWebhook } from "./src/app/api/payments/paypal/webhook/route";
import { POST as approveApproval } from "./src/app/api/approvals/approve/route";
import { GET as signingEmbedUrl } from "./src/app/api/agreements/signing/embed-url/route";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

const OPERATOR_TOKEN = "syn-bug-001-operator-test-token";
const PREV_TOKEN = process.env.SYNAPSE_OPERATOR_TOKEN;
process.env.SYNAPSE_OPERATOR_TOKEN = OPERATOR_TOKEN;

function req(
  path: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): NextRequest {
  return new NextRequest(new URL(path, "http://127.0.0.1"), init);
}

async function statusOf(res: Response): Promise<{ status: number; body: any }> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function run() {
  // ── Classification ──────────────────────────────────────────
  try {
    const webhook = classifyApiPath("/api/payments/paypal/webhook");
    const embed = classifyApiPath("/api/agreements/signing/embed-url");
    const health = classifyApiPath("/api/ai/health");
    const projects = classifyApiPath("/api/projects/list");
    const page = classifyApiPath("/finance");
    const login = classifyApiPath("/api/auth/login");
    if (
      webhook === "WEBHOOK_PUBLIC_BUT_SIGNED" &&
      embed === "PUBLIC" &&
      login === "PUBLIC" &&
      health === "OPERATOR_AUTHENTICATED" &&
      projects === "OPERATOR_AUTHENTICATED" &&
      page === "PUBLIC"
    ) {
      record("0. Route classification", "PASS", "Webhook signed-public; login PUBLIC; operator APIs OPERATOR_AUTHENTICATED; pages PUBLIC.");
    } else {
      record("0. Route classification", "FAIL", `webhook=${webhook} embed=${embed} health=${health} projects=${projects} page=${page} login=${login}`);
    }
  } catch (e: any) {
    record("0. Route classification", "FAIL", e.message);
  }

  // ── A. Unauthenticated access ───────────────────────────────
  try {
    const probes = await Promise.all([
      listProjects(req("/api/projects/list")),
      listInvoices(req("/api/invoices/list")),
      getInvoice(req("/api/invoices/get?id=INV-43-1309")),
      listOrgs(req("/api/organizations/list")),
      listPayPalRequests(req("/api/payments/paypal/request/list")),
      aiHealthGet(req("/api/ai/health")),
      approveRelease(req("/api/production-release/approve", { method: "POST", body: JSON.stringify({}) })),
      paypalVerify(req("/api/payments/paypal/verify", { method: "POST", body: JSON.stringify({ orderId: "FORGED" }) })),
    ]);
    const statuses = await Promise.all(probes.map((r) => statusOf(r)));
    const all401 = statuses.every((s) => s.status === 401 && s.body?.error === "UNAUTHENTICATED");
    const leakedRegistry = statuses.some((s) => s.body?.modelRegistry || s.body?.projects || s.body?.invoices || s.body?.organizations);
    if (all401 && !leakedRegistry) {
      record("A. Unauthenticated access", "PASS", "Sensitive routes returned 401 UNAUTHENTICATED with no tenant/model payload.");
    } else {
      record("A. Unauthenticated access", "FAIL", JSON.stringify(statuses.map((s) => ({ status: s.status, error: s.body?.error, keys: s.body ? Object.keys(s.body) : [] }))));
    }
  } catch (e: any) {
    record("A. Unauthenticated access", "FAIL", e.message);
  }

  // ── B. Forged operator identity ─────────────────────────────
  try {
    const forgedHeader = req("/api/projects/list", { headers: { "x-actor-role": "OPERATOR", "x-role": "OPERATOR" } });
    const forgedBody = req("/api/production-release/approve", {
      method: "POST",
      headers: { "content-type": "application/json", "x-actor-role": "OPERATOR" },
      body: JSON.stringify({ actorRole: "OPERATOR", role: "OPERATOR", releaseId: "REL-FORGED" }),
    });
    const r1 = await statusOf(await listProjects(forgedHeader));
    const r2 = await statusOf(await approveRelease(forgedBody));
    const identity = resolveHttpIdentity(forgedHeader);
    if (r1.status === 401 && r2.status === 401 && identity === null) {
      record("B. Forged operator identity", "PASS", "x-actor-role / body.actorRole did not become identity.");
    } else {
      record("B. Forged operator identity", "FAIL", `list=${r1.status} approve=${r2.status} identity=${identity?.actorRole}`);
    }
  } catch (e: any) {
    record("B. Forged operator identity", "FAIL", e.message);
  }

  // ── C. Forged client identity ───────────────────────────────
  try {
    const r = await statusOf(
      await listInvoices(
        req("/api/invoices/list", {
          headers: { "x-role": "CLIENT", "x-client-id": "CLI-SINDOUS-01", authorization: "Bearer token-sindous-01" },
        })
      )
    );
    if (r.status === 401) {
      record("C. Forged client identity", "PASS", "Hardcoded client token and client role header rejected.");
    } else {
      record("C. Forged client identity", "FAIL", `status=${r.status}`);
    }
  } catch (e: any) {
    record("C. Forged client identity", "FAIL", e.message);
  }

  // ── D/E/F/G. Forged project/org and cross-scope ─────────────
  try {
    const r = await statusOf(
      await listProjects(
        req("/api/projects/list?projectId=PRJ-OTHER&organizationId=ORG-OTHER", {
          headers: { "x-organization-id": "ORG-CASILI-01", "x-project-id": "PRJ-SINDOUS-01" },
        })
      )
    );
    if (r.status === 401 && !r.body?.projects) {
      record("D-G. Forged scope IDs", "PASS", "Unauthenticated caller with forged project/org IDs blocked before listing.");
    } else {
      record("D-G. Forged scope IDs", "FAIL", `status=${r.status} keys=${r.body ? Object.keys(r.body) : []}`);
    }
  } catch (e: any) {
    record("D-G. Forged scope IDs", "FAIL", e.message);
  }

  // ── H/I/J. Client / worker / arbitrary caller on privileged ─
  try {
    const client = await statusOf(
      await approveRelease(
        req("/api/production-release/approve", {
          method: "POST",
          headers: { "x-actor-role": "CLIENT_SESSION" },
          body: JSON.stringify({ releaseId: "REL-X", actorRole: "CLIENT" }),
        })
      )
    );
    const worker = await statusOf(
      await rollbackRelease(
        req("/api/production-release/rollback", {
          method: "POST",
          headers: { "x-actor-role": "BACKGROUND_WORKER", "x-worker-id": "WRK-DEV-01" },
          body: JSON.stringify({ releaseId: "REL-X", actorRole: "OPERATOR" }),
        })
      )
    );
    const external = await statusOf(
      await approveApproval(
        req("/api/approvals/approve", {
          method: "POST",
          body: JSON.stringify({ approvalId: "APR-X", actorRole: "OPERATOR" }),
        })
      )
    );
    if (client.status === 401 && worker.status === 401 && external.status === 401) {
      record("H-J. Privileged action without operator credential", "PASS", "Client/worker/external callers received 401.");
    } else {
      record("H-J. Privileged action without operator credential", "FAIL", `client=${client.status} worker=${worker.status} external=${external.status}`);
    }
  } catch (e: any) {
    record("H-J. Privileged action without operator credential", "FAIL", e.message);
  }

  // ── /api/ai/health leakage ──────────────────────────────────
  try {
    const unauth = await statusOf(await aiHealthGet(req("/api/ai/health")));
    const infer = await statusOf(
      await aiHealthPost(
        req("/api/ai/health", {
          method: "POST",
          body: JSON.stringify({ action: "test_gemini", prompt: "PONG" }),
        })
      )
    );
    const noLeak = !unauth.body?.modelRegistry && !unauth.body?.agentPolicies && !unauth.body?.allowedProviders;
    if (unauth.status === 401 && infer.status === 401 && noLeak) {
      record("Health. Unauthenticated model/provider exposure", "PASS", "GET/POST /api/ai/health blocked; registry not returned.");
    } else {
      record("Health. Unauthenticated model/provider exposure", "FAIL", `get=${unauth.status} post=${infer.status} leak=${!noLeak}`);
    }
  } catch (e: any) {
    record("Health. Unauthenticated model/provider exposure", "FAIL", e.message);
  }

  // ── Proxy gate ──────────────────────────────────────────────
  try {
    const unauth = await statusOf(await proxy(req("/api/projects/list")));
    const forged = await statusOf(
      await proxy(req("/api/ai/health", { headers: { "x-actor-role": "OPERATOR", authorization: "Bearer forged-operator" } }))
    );
    const allowed = await proxy(
      req("/api/projects/list", { headers: { authorization: `Bearer ${OPERATOR_TOKEN}` } })
    );
    if (unauth.status === 401 && forged.status === 401 && allowed.status === 200) {
      record("Proxy. HTTP boundary", "PASS", "proxy.ts denies unauthenticated/forged and allows operator bearer.");
    } else {
      record("Proxy. HTTP boundary", "FAIL", `unauth=${unauth.status} forged=${forged.status} allowed=${allowed.status}`);
    }
  } catch (e: any) {
    record("Proxy. HTTP boundary", "FAIL", e.message);
  }

  // ── Public routes remain reachable ──────────────────────────
  try {
    const webhook = await statusOf(await paypalWebhook(req("/api/payments/paypal/webhook", { method: "POST", body: "{}" })));
    const embed = await statusOf(await signingEmbedUrl(req("/api/agreements/signing/embed-url")));
    const webhookNotAuth = webhook.status !== 401 && webhook.status !== 403;
    const embedNotAuth = embed.status !== 401 && embed.status !== 403;
    if (webhookNotAuth && embedNotAuth) {
      record("Public. Webhook and embed-url", "PASS", `webhook=${webhook.status} embed=${embed.status} (auth not required; route still fail-closes its own capability).`);
    } else {
      record("Public. Webhook and embed-url", "FAIL", `webhook=${webhook.status} embed=${embed.status}`);
    }
  } catch (e: any) {
    record("Public. Webhook and embed-url", "FAIL", e.message);
  }

  // ── Authorized operator still reaches production routes ─────
  try {
    const authHeaders = { authorization: `Bearer ${OPERATOR_TOKEN}` };
    const projects = await statusOf(await listProjects(req("/api/projects/list", { headers: authHeaders })));
    const orgs = await statusOf(await listOrgs(req("/api/organizations/list", { headers: authHeaders })));
    const invoices = await statusOf(await listInvoices(req("/api/invoices/list", { headers: authHeaders })));
    const health = await statusOf(await aiHealthGet(req("/api/ai/health", { headers: authHeaders })));
    const approve = await statusOf(
      await approveRelease(
        req("/api/production-release/approve", {
          method: "POST",
          headers: { ...authHeaders, "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      )
    );
    const identity = resolveHttpIdentity(req("/api/projects/list", { headers: authHeaders }));
    const authorizedOk =
      projects.status === 200 &&
      projects.body?.ok === true &&
      Array.isArray(projects.body?.projects) &&
      orgs.status === 200 &&
      invoices.status === 200 &&
      health.status === 200 &&
      health.body?.modelRegistry &&
      approve.status === 400 &&
      approve.body?.error === "releaseId is required" &&
      identity?.actorRole === "OPERATOR";
    if (authorizedOk) {
      record("Authorized. Operator credential", "PASS", "Bearer operator token reaches list/health and privileged business validation.");
    } else {
      record(
        "Authorized. Operator credential",
        "FAIL",
        `projects=${projects.status} orgs=${orgs.status} invoices=${invoices.status} health=${health.status} approve=${approve.status}/${approve.body?.error} role=${identity?.actorRole}`
      );
    }
  } catch (e: any) {
    record("Authorized. Operator credential", "FAIL", e.message);
  }

  // ── Wrong bearer is not identity ────────────────────────────
  try {
    const r = await statusOf(
      await listProjects(req("/api/projects/list", { headers: { authorization: "Bearer definitely-not-the-operator-token" } }))
    );
    if (r.status === 401 && !r.body?.projects) {
      record("Auth. Wrong bearer", "PASS", "Non-matching bearer rejected.");
    } else {
      record("Auth. Wrong bearer", "FAIL", `status=${r.status}`);
    }
  } catch (e: any) {
    record("Auth. Wrong bearer", "FAIL", e.message);
  }

  // ── Unset token fail-closed ─────────────────────────────────
  try {
    delete process.env.SYNAPSE_OPERATOR_TOKEN;
    const r = await statusOf(
      await listProjects(req("/api/projects/list", { headers: { authorization: `Bearer ${OPERATOR_TOKEN}` } }))
    );
    process.env.SYNAPSE_OPERATOR_TOKEN = OPERATOR_TOKEN;
    if (r.status === 401) {
      record("Auth. Unset operator token", "PASS", "No configured token ⇒ fail closed even with a bearer present.");
    } else {
      record("Auth. Unset operator token", "FAIL", `status=${r.status}`);
    }
  } catch (e: any) {
    process.env.SYNAPSE_OPERATOR_TOKEN = OPERATOR_TOKEN;
    record("Auth. Unset operator token", "FAIL", e.message);
  }

  const failed = Object.values(results).filter((r) => r.status === "FAIL").length;
  const passed = Object.values(results).filter((r) => r.status === "PASS").length;
  console.log(`\nSYN-BUG-001: ${passed}/${passed + failed} passed`);
  if (PREV_TOKEN === undefined) delete process.env.SYNAPSE_OPERATOR_TOKEN;
  else process.env.SYNAPSE_OPERATOR_TOKEN = PREV_TOKEN;
  if (failed > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  if (PREV_TOKEN === undefined) delete process.env.SYNAPSE_OPERATOR_TOKEN;
  else process.env.SYNAPSE_OPERATOR_TOKEN = PREV_TOKEN;
  process.exit(1);
});
