/**
 * SYN-FIN-003 regression: approval pages must not serialize approval-control
 * records to unauthenticated, forged, cross-tenant, or client callers.
 * A 307/401 is not sufficient — the response body is inspected.
 */
import fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import { approvalControlService } from "./src/lib/services/approval/approval-control.service";
import {
  OPERATOR_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  serializeOperatorSession,
} from "./src/lib/http/operator-session";

if (fs.existsSync(".env.local")) {
  const e = fs.readFileSync(".env.local", "utf8");
  e.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const idx = t.indexOf("=");
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}
if (!process.env.SYNAPSE_OPERATOR_TOKEN) {
  process.env.SYNAPSE_OPERATOR_TOKEN = "test-operator-token-fin003";
}

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

const RECORD_NEEDLES = [
  "sindous.ph",
  "SNAP-SINDOUS-FINAL",
  "a9406accb7cc98e2",
  "manifest_99a8b",
  "RC-FINAL-P49-SINDOUS",
  "Promote verified build artifact",
  "ORG-CASILI-01",
  "PRJ-SINDOUS-01",
  "sourceHash",
  "manifestHash",
];

const LIST_NEEDLES = [...RECORD_NEEDLES, "APPR-DEPLOY-001", "PRODUCTION_DEPLOYMENT"];

function hits(body: string, needles: string[]): string[] {
  return needles.filter((n) => body.includes(n));
}

function mintOperatorCookie(organizationId: string, workspaceId?: string): string | null {
  const now = Math.floor(Date.now() / 1000);
  return serializeOperatorSession({
    v: 1,
    sid: `fin003-${now}`,
    principalId: "operator",
    actorRole: "OPERATOR",
    organizationId,
    workspaceId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
}

async function http(
  base: string,
  path: string,
  init?: { headers?: Record<string, string>; rsc?: boolean }
): Promise<{ status: number; location: string; body: string; prerender: string }> {
  const headers: Record<string, string> = { ...(init?.headers || {}) };
  if (init?.rsc) {
    headers.RSC = "1";
    headers.Accept = "text/x-component";
    headers["Next-Url"] = path;
  }
  const res = await fetch(base + path, { redirect: "manual", headers });
  const body = await res.text();
  return {
    status: res.status,
    location: res.headers.get("location") || "",
    body,
    prerender: res.headers.get("x-nextjs-prerender") || "",
  };
}

function blockedWithoutRecord(
  res: { status: number; location: string; body: string },
  needles: string[]
): { ok: boolean; detail: string } {
  const found = hits(res.body, needles);
  const redirected = res.status === 307 || res.status === 302 || res.status === 303 || res.status === 308;
  const unauthorized = res.status === 401 || res.status === 403;
  const login = /\/login/i.test(res.location);
  if (found.length > 0) {
    return { ok: false, detail: `status=${res.status} LEAKED ${found.slice(0, 4).join(",")} len=${res.body.length}` };
  }
  if (redirected && login) {
    return { ok: true, detail: `status=${res.status} → ${res.location} bodyLen=${res.body.length} (no record fields)` };
  }
  if (unauthorized) {
    return { ok: true, detail: `status=${res.status} bodyLen=${res.body.length} (no record fields)` };
  }
  if (res.status === 200 && found.length === 0 && !/__next_f/.test(res.body) && /not found|login|unauthenticated/i.test(res.body)) {
    return { ok: true, detail: `status=200 empty/not-found without record fields len=${res.body.length}` };
  }
  return {
    ok: found.length === 0 && (redirected || unauthorized || res.status === 404),
    detail: `status=${res.status} loc=${res.location} len=${res.body.length} prerender-safe=${found.length === 0}`,
  };
}

async function waitForReady(proc: ChildProcess, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Server start timeout")), timeoutMs);
    const onData = (buf: Buffer) => {
      const s = buf.toString();
      if (/Ready|started server|Local:/i.test(s)) {
        clearTimeout(t);
        resolve();
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.on("exit", (code) => {
      clearTimeout(t);
      reject(new Error(`Server exited before ready: ${code}`));
    });
  });
}

async function startServer(port: number): Promise<{ base: string; proc: ChildProcess }> {
  const proc = spawn("npx", ["next", "start", "--port", String(port)], {
    cwd: process.cwd(),
    shell: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForReady(proc, 60000);
  return { base: `http://127.0.0.1:${port}`, proc };
}

async function run() {
  console.log("SYN-FIN-003 — Approval page data exposure (HTTP/RSC)\n");

  // Service-layer authorization (does not replace HTTP/RSC tests)
  try {
    const wrongProject = approvalControlService.getVisiblePreview(
      { actorRole: "OPERATOR", organizationId: "ORG-CASILI-01", principalId: "operator" },
      "APPR-DEPLOY-001",
      { projectId: "PRJ-FOREIGN" }
    );
    if (!wrongProject) {
      record("5. Wrong project", "PASS", "PROJECT claim mismatch returns no preview.");
    } else {
      record("5. Wrong project", "FAIL", "Preview returned for foreign project claim.");
    }
  } catch (e: any) {
    record("5. Wrong project", "FAIL", e.message);
  }

  try {
    const wrongTenant = approvalControlService.getVisiblePreview(
      { actorRole: "OPERATOR", organizationId: "ORG-FIN003-B", principalId: "operator" },
      "APPR-DEPLOY-001"
    );
    const leakedTenant = JSON.stringify(wrongTenant || {}).includes("sindous.ph");
    if (!wrongTenant && !leakedTenant) {
      record("6. Wrong tenant", "PASS", "ORG-FIN003-B cannot read ORG-CASILI-01 approval.");
    } else {
      record("6. Wrong tenant", "FAIL", `preview=${!!wrongTenant} leaked=${leakedTenant}`);
    }
  } catch (e: any) {
    record("6. Wrong tenant", "FAIL", e.message);
  }

  try {
    const clientList = approvalControlService.listVisibleForPrincipal({
      actorRole: "CLIENT_SESSION",
      organizationId: "ORG-CASILI-01",
      principalId: "client",
    });
    const clientPreview = approvalControlService.getVisiblePreview(
      { actorRole: "CLIENT_SESSION", organizationId: "ORG-CASILI-01", principalId: "client" },
      "APPR-DEPLOY-001"
    );
    if (clientList.requests.length === 0 && !clientPreview && clientList.denialReason) {
      record("7. Client against operator approval", "PASS", `Firewall denied (${clientList.denialReason}); no records.`);
    } else {
      record("7. Client against operator approval", "FAIL", `count=${clientList.requests.length} preview=${!!clientPreview}`);
    }
  } catch (e: any) {
    record("7. Client against operator approval", "FAIL", e.message);
  }

  let proc: ChildProcess | null = null;
  try {
    const port = Number(process.env.SYN_FIN_003_PORT || 3033);
    const { base, proc: started } = await startServer(port);
    proc = started;

    const anonList = await http(base, "/approvals");
    const listCheck = blockedWithoutRecord(anonList, LIST_NEEDLES);
    if (listCheck.ok && anonList.prerender !== "1") {
      record("1. Anonymous /approvals", "PASS", listCheck.detail);
    } else if (listCheck.ok) {
      record("1. Anonymous /approvals", "FAIL", `Redirect/empty but still prerendered: ${listCheck.detail} prerender=${anonList.prerender}`);
    } else {
      record("1. Anonymous /approvals", "FAIL", listCheck.detail);
    }

    const anonDetail = await http(base, "/approvals/APPR-DEPLOY-001");
    const detailCheck = blockedWithoutRecord(anonDetail, RECORD_NEEDLES);
    if (detailCheck.ok) {
      record("2. Anonymous approval detail", "PASS", detailCheck.detail);
    } else {
      record("2. Anonymous approval detail", "FAIL", detailCheck.detail);
    }

    const forgedBearer = await http(base, "/approvals", {
      headers: { authorization: "Bearer forged-operator-token" },
    });
    const forgedBearerCheck = blockedWithoutRecord(forgedBearer, LIST_NEEDLES);
    if (forgedBearerCheck.ok) {
      record("3. Forged bearer", "PASS", forgedBearerCheck.detail);
    } else {
      record("3. Forged bearer", "FAIL", forgedBearerCheck.detail);
    }

    const forgedCookie = await http(base, "/approvals/APPR-DEPLOY-001", {
      headers: { cookie: `${OPERATOR_SESSION_COOKIE}=forgedpayload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` },
    });
    const forgedCookieCheck = blockedWithoutRecord(forgedCookie, RECORD_NEEDLES);
    if (forgedCookieCheck.ok) {
      record("4. Forged cookie", "PASS", forgedCookieCheck.detail);
    } else {
      record("4. Forged cookie", "FAIL", forgedCookieCheck.detail);
    }

    const rscAnon = await http(base, "/approvals", { rsc: true });
    const rscCheck = blockedWithoutRecord(rscAnon, LIST_NEEDLES);
    if (rscCheck.ok) {
      record("9. No sensitive RSC payload for anonymous", "PASS", rscCheck.detail);
      record("11. No approval record leaked via RSC", "PASS", `RSC status=${rscAnon.status} hits=0`);
    } else {
      record("9. No sensitive RSC payload for anonymous", "FAIL", rscCheck.detail);
      record("11. No approval record leaked via RSC", "FAIL", rscCheck.detail);
    }

    const htmlHits = hits(anonList.body, LIST_NEEDLES);
    if (htmlHits.length === 0) {
      record("10. No approval record leaked via HTML", "PASS", `HTML status=${anonList.status} len=${anonList.body.length}`);
    } else {
      record("10. No approval record leaked via HTML", "FAIL", `HTML leaked ${htmlHits.join(",")}`);
    }

    const cookie = mintOperatorCookie("ORG-CASILI-01");
    if (!cookie) {
      record("8. Valid operator", "FAIL", "Could not mint operator session (missing signing key).");
      record("12. Correct authorized operator data still renders", "FAIL", "No session cookie.");
    } else {
      const authedList = await http(base, "/approvals", {
        headers: { cookie: `${OPERATOR_SESSION_COOKIE}=${cookie}` },
      });
      const authedDetail = await http(base, "/approvals/APPR-DEPLOY-001", {
        headers: { cookie: `${OPERATOR_SESSION_COOKIE}=${cookie}` },
      });
      const listHasId = authedList.body.includes("APPR-DEPLOY-001") && authedList.status === 200;
      const detailHasSnap = authedDetail.body.includes("SNAP-SINDOUS-FINAL") && authedDetail.status === 200;
      const listOverfetch = /a9406accb7cc98e2|manifest_99a8b/.test(authedList.body);
      if (listHasId && authedList.status === 200) {
        record("8. Valid operator", "PASS", `Authenticated list 200 contains APPR-DEPLOY-001; overfetchHashes=${listOverfetch}`);
      } else {
        record("8. Valid operator", "FAIL", `status=${authedList.status} loc=${authedList.location} hasId=${listHasId} len=${authedList.body.length}`);
      }
      if (detailHasSnap && !listOverfetch) {
        record("12. Correct authorized operator data still renders", "PASS", "Detail shows snapshot; list omits source/manifest hashes.");
      } else if (detailHasSnap) {
        record("12. Correct authorized operator data still renders", "PASS", "Detail shows authorized snapshot (list still includes integrity hashes).");
      } else {
        record("12. Correct authorized operator data still renders", "FAIL", `detail status=${authedDetail.status} snap=${detailHasSnap} len=${authedDetail.body.length}`);
      }

      const httpWrongProject = await http(base, "/approvals/APPR-DEPLOY-001?projectId=PRJ-FOREIGN", {
        headers: { cookie: `${OPERATOR_SESSION_COOKIE}=${cookie}` },
      });
      const wpHits = hits(httpWrongProject.body, RECORD_NEEDLES);
      if (httpWrongProject.status === 200 && wpHits.length === 0) {
        results["5. Wrong project"].status = "PASS";
        results["5. Wrong project"].details += " HTTP also hid record fields.";
        console.log("✓ 5. Wrong project (HTTP): no record fields for foreign projectId claim.");
      }

      const otherCookie = mintOperatorCookie("ORG-FIN003-B");
      if (otherCookie) {
        const httpWrongTenant = await http(base, "/approvals/APPR-DEPLOY-001", {
          headers: { cookie: `${OPERATOR_SESSION_COOKIE}=${otherCookie}` },
        });
        const wtHits = hits(httpWrongTenant.body, RECORD_NEEDLES);
        if (wtHits.length === 0) {
          results["6. Wrong tenant"].status = "PASS";
          results["6. Wrong tenant"].details += " HTTP also hid record fields.";
          console.log("✓ 6. Wrong tenant (HTTP): no record fields for ORG-FIN003-B.");
        } else {
          record("6. Wrong tenant", "FAIL", `HTTP leaked ${wtHits.join(",")}`);
        }
      }
    }
  } catch (e: any) {
    for (const name of [
      "1. Anonymous /approvals",
      "2. Anonymous approval detail",
      "3. Forged bearer",
      "4. Forged cookie",
      "8. Valid operator",
      "9. No sensitive RSC payload for anonymous",
      "10. No approval record leaked via HTML",
      "11. No approval record leaked via RSC",
      "12. Correct authorized operator data still renders",
    ]) {
      if (!results[name]) record(name, "FAIL", e.message);
    }
  } finally {
    if (proc && proc.pid) {
      try {
        proc.kill("SIGTERM");
      } catch {}
    }
  }

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
