/**
 * SYN-FIN-002 regression: DNS cutover must honor kill switch, firewall,
 * tenant/project scope, and must not persist fabricated DNS/TLS/health success.
 */
import fs from "fs";

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

import { productionReleaseRepository, ProductionReleaseRecord } from "./src/lib/repositories/production-release.repository";
import { productionProjectRepository, ProductionProjectRecord } from "./src/lib/repositories/production-project.repository";
import { productionReleaseService } from "./src/lib/services/production-release/production-release.service";
import { emergencyKillSwitch } from "./src/lib/services/security/emergency-kill-switch.service";
import { vercelDeploymentProvider } from "./src/lib/deployment/providers/vercel.provider";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

async function seedRelease(suffix: string, orgId = "ORG-FIN002-A") {
  const projectId = `PRJ-FIN002-${suffix}`;
  const releaseId = `REL-FIN002-${suffix}`;
  const now = new Date().toISOString();
  const prod: ProductionProjectRecord = {
    id: projectId,
    organizationId: orgId,
    workspaceId: "WS-FIN002-A",
    environment: "production",
    companyName: "FIN002",
    industry: "test",
    currentState: "DEPLOYMENT_ELIGIBLE",
    snapshotId: "SNAP-FIN002",
    manifestHash: "man-fin002",
    sourceHash: "src-fin002",
    timeline: [],
    createdAt: now,
    updatedAt: now,
    isImmutable: false,
  };
  await productionProjectRepository.saveProject(prod);

  const release: ProductionReleaseRecord = {
    id: releaseId,
    releaseNumber: `REL-FIN002-${suffix}`,
    projectId,
    reviewSessionId: "REV-FIN002",
    reviewNumber: "1",
    snapshotId: "SNAP-FIN002",
    manifestHash: "man-fin002",
    qaRunId: "QA-FIN002",
    deploymentProvider: "vercel",
    status: "waiting_dns_approval",
    buildEvidence: {},
    securityEvidence: {},
    configurationEvidence: {},
    dnsPlan: {},
    healthEvidence: {},
    rollbackEvidence: {},
    requestedBy: "operator",
    requestedAt: now,
  };
  await productionReleaseRepository.createRelease(release);
  return { projectId, releaseId, orgId };
}

function fabricated(release: ProductionReleaseRecord | null, domain: any) {
  const tls = String(release?.healthEvidence?.customDomainTls || "");
  const health = String(release?.healthEvidence?.postCutoverBrowserHealth || "");
  const http = release?.healthEvidence?.customDomainHttp;
  return (
    /VALID|SUCCESS|LIVE|HEALTHY|PASS/i.test(tls) ||
    /VALID|SUCCESS|LIVE|HEALTHY|PASS/i.test(health) ||
    http === 200 ||
    domain?.ownershipStatus === "verified" && domain?.verificationStatus === "verified" && domain?.status === "active"
  );
}

async function unchanged(releaseId: string, projectId: string) {
  const release = await productionReleaseRepository.getReleaseById(releaseId);
  const domain = await productionReleaseRepository.getDomainByProject(projectId);
  return {
    status: release?.status,
    verifiedAt: release?.verifiedAt,
    cutoverAt: release?.cutoverAt,
    domain: domain && domain.projectId === projectId ? domain : null,
    health: release?.healthEvidence || {},
  };
}

async function run() {
  console.log("SYN-FIN-002 — DNS cutover kill switch, firewall, evidence honesty\n");
  const priorKill = emergencyKillSwitch.getState();
  const origRequest = vercelDeploymentProvider.requestCustomDomain.bind(vercelDeploymentProvider);

  const controlled = async () => ({
    ok: true as const,
    evidenceClass: "CONTROLLED_TEST" as const,
    ownershipStatus: "NOT_VERIFIED" as const,
    verificationStatus: "NOT_VERIFIED" as const,
    tlsStatus: "NOT_VERIFIED" as const,
    httpStatus: "NOT_VERIFIED" as const,
    healthStatus: "NOT_VERIFIED" as const,
    provider: "vercel" as const,
  });

  // 1. Emergency stop
  try {
    const seed = await seedRelease(`STOP-${Date.now().toString().slice(-6)}`);
    emergencyKillSwitch.transition("EMERGENCY_STOP", "syn-fin-002-test", "targeted regression");
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "stop.example.com",
        actorRole: "OPERATOR",
        callerOrgId: seed.orgId,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    } finally {
      emergencyKillSwitch.transition(priorKill, "syn-fin-002-test", "restore");
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    if (threw && /EMERGENCY_STOP_BLOCKED/i.test(msg) && after.status === "waiting_dns_approval" && !after.domain && !after.verifiedAt) {
      record("1. Emergency stop active", "PASS", "EMERGENCY_STOP_BLOCKED; no DNS/release mutation.");
    } else {
      record("1. Emergency stop active", "FAIL", `threw=${threw} msg=${msg.slice(0, 100)} status=${after.status} domain=${!!after.domain}`);
    }
  } catch (e: any) {
    emergencyKillSwitch.transition(priorKill, "syn-fin-002-test", "restore");
    record("1. Emergency stop active", "FAIL", e.message);
  }

  // 2. Unauthorized actor
  try {
    const seed = await seedRelease(`UNAUTH-${Date.now().toString().slice(-6)}`);
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "unauth.example.com",
        actorRole: "CLIENT_SESSION",
        callerOrgId: seed.orgId,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    if (threw && /UNAUTHORIZED_OPERATION/i.test(msg) && after.status === "waiting_dns_approval" && !after.domain) {
      record("2. Unauthorized actor", "PASS", "CLIENT_SESSION rejected; no mutation.");
    } else {
      record("2. Unauthorized actor", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)} status=${after.status}`);
    }
  } catch (e: any) {
    record("2. Unauthorized actor", "FAIL", e.message);
  }

  // 3. Cross-project
  try {
    const seed = await seedRelease(`XPRJ-${Date.now().toString().slice(-6)}`);
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "xproj.example.com",
        actorRole: "OPERATOR",
        callerOrgId: seed.orgId,
        callerProjectId: "PRJ-ATTACKER-99",
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    if (threw && /PROJECT_BOUNDARY_VIOLATION/i.test(msg) && !after.domain) {
      record("3. Cross-project attempt", "PASS", "PROJECT_BOUNDARY_VIOLATION; no mutation.");
    } else {
      record("3. Cross-project attempt", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)}`);
    }
  } catch (e: any) {
    record("3. Cross-project attempt", "FAIL", e.message);
  }

  // 4. Cross-tenant
  try {
    const seed = await seedRelease(`XTEN-${Date.now().toString().slice(-6)}`, "ORG-FIN002-A");
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "xtenant.example.com",
        actorRole: "OPERATOR",
        callerOrgId: "ORG-ATTACKER-99",
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    if (threw && /TENANT_BOUNDARY_VIOLATION/i.test(msg) && !after.domain) {
      record("4. Cross-tenant attempt", "PASS", "TENANT_BOUNDARY_VIOLATION; no mutation.");
    } else {
      record("4. Cross-tenant attempt", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)}`);
    }
  } catch (e: any) {
    record("4. Cross-tenant attempt", "FAIL", e.message);
  }

  // 5. Missing provider credentials
  const prevToken = process.env.VERCEL_TOKEN;
  const prevProject = process.env.VERCEL_PROJECT_ID;
  try {
    const seed = await seedRelease(`NOPROV-${Date.now().toString().slice(-6)}`);
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "noprovider.example.com",
        actorRole: "OPERATOR",
        callerOrgId: seed.orgId,
        callerProjectId: seed.projectId,
      });
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    if (threw && /DNS_PROVIDER_NOT_CONFIGURED|NOT_SUPPORTED/i.test(msg) && after.status === "waiting_dns_approval" && !after.domain) {
      record("5. Missing provider credentials", "PASS", "Fail-closed NOT_SUPPORTED; no fabricated domain record.");
    } else {
      record("5. Missing provider credentials", "FAIL", `threw=${threw} msg=${msg.slice(0, 140)} status=${after.status}`);
    }
  } catch (e: any) {
    record("5. Missing provider credentials", "FAIL", e.message);
  } finally {
    if (prevToken !== undefined) process.env.VERCEL_TOKEN = prevToken;
    else delete process.env.VERCEL_TOKEN;
    if (prevProject !== undefined) process.env.VERCEL_PROJECT_ID = prevProject;
    else delete process.env.VERCEL_PROJECT_ID;
  }

  // 6–8. Fake provider / TLS / health evidence in the caller payload
  try {
    const seed = await seedRelease(`FAKE-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.requestCustomDomain = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      ownershipStatus: "NOT_SUPPORTED",
      verificationStatus: "NOT_SUPPORTED",
      tlsStatus: "NOT_VERIFIED",
      httpStatus: "NOT_VERIFIED",
      healthStatus: "NOT_VERIFIED",
      provider: "vercel",
      error: "DNS_PROVIDER_NOT_CONFIGURED: VERCEL_TOKEN is not configured. DNS cutover is NOT_SUPPORTED.",
    });
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveDNSCutover({
        releaseId: seed.releaseId,
        domainName: "fake.example.com",
        actorRole: "OPERATOR",
        callerOrgId: seed.orgId,
        callerProjectId: seed.projectId,
        healthEvidence: { customDomainTls: "VALID", customDomainHttp: 200, postCutoverBrowserHealth: "PASS" },
        ownershipStatus: "verified",
        verificationStatus: "verified",
        providerSuccess: true,
      } as any);
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await unchanged(seed.releaseId, seed.projectId);
    const invented = fabricated(await productionReleaseRepository.getReleaseById(seed.releaseId), after.domain);
    if (threw && !after.domain && !invented) {
      record("6. Fake provider success", "PASS", "Caller-supplied provider success ignored; no mutation without provider.");
      record("7. Fabricated TLS evidence", "PASS", "No VALID TLS record persisted.");
      record("8. Fabricated health evidence", "PASS", "No PASS/200 health record persisted.");
    } else {
      record("6. Fake provider success", "FAIL", `threw=${threw} msg=${msg.slice(0, 100)} domain=${!!after.domain} invented=${invented}`);
      record("7. Fabricated TLS evidence", "FAIL", `invented=${invented} tls=${JSON.stringify(after.health)}`);
      record("8. Fabricated health evidence", "FAIL", `http=${after.health?.customDomainHttp} health=${after.health?.postCutoverBrowserHealth}`);
    }
  } catch (e: any) {
    record("6. Fake provider success", "FAIL", e.message);
    record("7. Fabricated TLS evidence", "FAIL", e.message);
    record("8. Fabricated health evidence", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.requestCustomDomain = origRequest;
  }

  // 9. Authorized CONTROLLED_TEST operation
  try {
    const seed = await seedRelease(`OK-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.requestCustomDomain = async () => controlled();
    const result = await productionReleaseService.approveDNSCutover({
      releaseId: seed.releaseId,
      domainName: "controlled.example.com",
      actorRole: "OPERATOR",
      callerOrgId: seed.orgId,
      callerProjectId: seed.projectId,
    });
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    const domain = result.domain;
    const liveReal = JSON.stringify(result).includes("LIVE_REAL");
    const honest =
      result.newlyApplied === true &&
      after?.status === "dns_updating" &&
      !after?.verifiedAt &&
      domain.ownershipStatus === "NOT_VERIFIED" &&
      domain.verificationStatus === "NOT_VERIFIED" &&
      after?.healthEvidence?.customDomainTls === "NOT_VERIFIED" &&
      after?.healthEvidence?.customDomainHttp === "NOT_VERIFIED" &&
      after?.healthEvidence?.postCutoverBrowserHealth === "NOT_VERIFIED" &&
      after?.healthEvidence?.evidenceClass === "CONTROLLED_TEST" &&
      !liveReal &&
      !fabricated(after, domain);
    if (honest) {
      record("9. Authorized controlled operation", "PASS", "CONTROLLED_TEST request persisted as NOT_VERIFIED; not labeled LIVE_REAL.");
    } else {
      record(
        "9. Authorized controlled operation",
        "FAIL",
        `status=${after?.status} tls=${after?.healthEvidence?.customDomainTls} class=${after?.healthEvidence?.evidenceClass} verifiedAt=${after?.verifiedAt}`
      );
    }
  } catch (e: any) {
    record("9. Authorized controlled operation", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.requestCustomDomain = origRequest;
  }

  // 10. Duplicate / idempotent
  try {
    const seed = await seedRelease(`DUP-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.requestCustomDomain = async () => controlled();
    const first = await productionReleaseService.approveDNSCutover({
      releaseId: seed.releaseId,
      domainName: "dup.example.com",
      actorRole: "OPERATOR",
      callerOrgId: seed.orgId,
      callerProjectId: seed.projectId,
    });
    const second = await productionReleaseService.approveDNSCutover({
      releaseId: seed.releaseId,
      domainName: "dup.example.com",
      actorRole: "OPERATOR",
      callerOrgId: seed.orgId,
      callerProjectId: seed.projectId,
    });
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (
      first.newlyApplied === true &&
      second.newlyApplied === false &&
      second.domain.id === first.domain.id &&
      after?.healthEvidence?.customDomainTls === "NOT_VERIFIED" &&
      after?.status === "dns_updating"
    ) {
      record("10. Duplicate/idempotent operation", "PASS", "Second cutover is idempotent; evidence stays NOT_VERIFIED.");
    } else {
      record("10. Duplicate/idempotent operation", "FAIL", `first=${first.newlyApplied} second=${second.newlyApplied} ids=${first.domain.id}/${second.domain.id}`);
    }
  } catch (e: any) {
    record("10. Duplicate/idempotent operation", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.requestCustomDomain = origRequest;
  }

  emergencyKillSwitch.transition(priorKill, "syn-fin-002-test", "final restore");

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
