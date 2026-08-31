/**
 * SYN-FIN-004 regression: production approval must not persist fabricated
 * deployment URL / HTTP 200 / HEALTHY / provider IDs without provider evidence.
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
import { productionReleaseService } from "./src/lib/services/production-release/production-release.service";
import { emergencyKillSwitch } from "./src/lib/services/security/emergency-kill-switch.service";
import { vercelDeploymentProvider } from "./src/lib/deployment/providers/vercel.provider";
import { productionHealthService } from "./src/lib/services/deployment/production-health.service";

const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

function record(name: string, status: "PASS" | "FAIL", details: string) {
  results[name] = { status, details };
  console.log(`${status === "PASS" ? "✓" : "✗"} ${name}: ${details}`);
}

async function seedRelease(suffix: string) {
  const projectId = `PRJ-FIN004-${suffix}`;
  const releaseId = `REL-FIN004-${suffix}`;
  const now = new Date().toISOString();
  const release: ProductionReleaseRecord = {
    id: releaseId,
    releaseNumber: `REL-FIN004-${suffix}`,
    projectId,
    reviewSessionId: "REV-FIN004",
    reviewNumber: "1",
    snapshotId: "SNAP-FIN004",
    manifestHash: "man-fin004",
    qaRunId: "QA-FIN004",
    deploymentProvider: "vercel",
    status: "waiting_release_approval",
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
  return { projectId, releaseId };
}

function invented(release: ProductionReleaseRecord | null) {
  const url = String(release?.productionUrl || "");
  const id = String(release?.providerDeploymentId || "");
  const tls = String(release?.healthEvidence?.tlsStatus || "");
  const health = String(release?.healthEvidence?.healthStatus || "");
  const render = String(release?.healthEvidence?.homepageRender || "");
  const dns = JSON.stringify(release?.dnsPlan || {});
  return (
    /apex-logistics-prod\.vercel\.app/i.test(url) ||
    /^dpl_prod_\d+$/.test(id) ||
    tls === "VALID" ||
    render === "SUCCESS" ||
    /apex\.casili\.dev|mail\.apexlogistics\.com/.test(dns) ||
    (release?.healthEvidence?.httpStatus === 200 && release?.healthEvidence?.evidenceClass === "LIVE_REAL") ||
    (health === "HEALTHY" && release?.healthEvidence?.evidenceClass === "LIVE_REAL")
  );
}

function controlledDeploy() {
  return {
    ok: true as const,
    evidenceClass: "CONTROLLED_TEST" as const,
    providerDeploymentId: "dpl_controlled_fin004",
    productionUrl: "https://controlled-fin004.example.test",
  };
}

async function run() {
  console.log("SYN-FIN-004 — Production deployment evidence integrity\n");
  const priorKill = emergencyKillSwitch.getState();
  const origDeploy = vercelDeploymentProvider.deployProduction.bind(vercelDeploymentProvider);
  const origProbe = productionHealthService.probeHttp.bind(productionHealthService);
  const prevToken = process.env.VERCEL_TOKEN;
  emergencyKillSwitch.transition("NORMAL", "syn-fin-004-test", "start");

  // 1. Unconfigured provider
  try {
    const seed = await seedRelease(`UCFG-${Date.now().toString().slice(-6)}`);
    delete process.env.VERCEL_TOKEN;
    vercelDeploymentProvider.deployProduction = origDeploy;
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (
      threw &&
      /DEPLOYMENT_BLOCKED|NOT_SUPPORTED/i.test(msg) &&
      after?.status === "approved" &&
      after.productionUrl !== "https://apex-logistics-prod.vercel.app" &&
      after.providerDeploymentId === "NO_PROVIDER_DEPLOYMENT_ID" &&
      after.healthEvidence?.httpStatus === "NOT_VERIFIED" &&
      !after.deployedAt &&
      !invented(after)
    ) {
      record("1. Unconfigured provider", "PASS", "NOT_SUPPORTED; approval recorded; no fabricated deploy evidence.");
    } else {
      record("1. Unconfigured provider", "FAIL", `threw=${threw} msg=${msg.slice(0, 120)} status=${after?.status} url=${after?.productionUrl}`);
    }
  } catch (e: any) {
    record("1. Unconfigured provider", "FAIL", e.message);
  } finally {
    if (prevToken !== undefined) process.env.VERCEL_TOKEN = prevToken;
  }

  // 2. Provider failure
  try {
    const seed = await seedRelease(`FAIL-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
      error: "DEPLOYMENT_BLOCKED: provider 500",
    });
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (threw && /DEPLOYMENT_BLOCKED/i.test(msg) && after?.status === "failed" && after.productionUrl === "NOT_VERIFIED" && !invented(after)) {
      record("2. Provider failure", "PASS", "Provider 500 persisted as failed; no fake URL/health.");
    } else {
      record("2. Provider failure", "FAIL", `threw=${threw} status=${after?.status} url=${after?.productionUrl} msg=${msg.slice(0, 80)}`);
    }
  } catch (e: any) {
    record("2. Provider failure", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 3. Provider timeout
  try {
    const seed = await seedRelease(`TO-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
      error: "DEPLOYMENT_BLOCKED: provider timeout",
    });
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (threw && /timeout/i.test(msg) && after?.status === "failed" && !invented(after)) {
      record("3. Provider timeout", "PASS", "Timeout classified as failed; no fabricated success.");
    } else {
      record("3. Provider timeout", "FAIL", `threw=${threw} status=${after?.status} msg=${msg.slice(0, 80)}`);
    }
  } catch (e: any) {
    record("3. Provider timeout", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 4–8. Caller-supplied fake URL / 200 / HEALTHY / deployment ID
  try {
    const seed = await seedRelease(`FAKE-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
      error: "DEPLOYMENT_BLOCKED: NOT_SUPPORTED: VERCEL_TOKEN is not configured.",
    });
    let threw = false;
    try {
      await (productionReleaseService as any).approveProductionDeployment(seed.releaseId, "OPERATOR", {
        productionUrl: "https://apex-logistics-prod.vercel.app",
        providerDeploymentId: "dpl_prod_99999999",
        healthEvidence: { httpStatus: 200, healthStatus: "HEALTHY", tlsStatus: "VALID" },
        providerSuccess: true,
      });
    } catch {
      threw = true;
    }
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (threw && !invented(after) && after?.healthEvidence?.httpStatus === "NOT_VERIFIED") {
      record("4. Fake provider response", "PASS", "Caller-supplied provider success ignored.");
      record("5. Hardcoded URL attempt", "PASS", "apex-logistics URL not persisted.");
      record("6. Hardcoded HTTP 200 attempt", "PASS", "httpStatus remains NOT_VERIFIED.");
      record("7. Hardcoded HEALTHY attempt", "PASS", "healthStatus remains NOT_VERIFIED.");
      record("8. Fake deployment ID attempt", "PASS", "dpl_prod_* not persisted.");
    } else {
      record("4. Fake provider response", "FAIL", `threw=${threw} invented=${invented(after)} url=${after?.productionUrl}`);
      record("5. Hardcoded URL attempt", "FAIL", String(after?.productionUrl));
      record("6. Hardcoded HTTP 200 attempt", "FAIL", String(after?.healthEvidence?.httpStatus));
      record("7. Hardcoded HEALTHY attempt", "FAIL", String(after?.healthEvidence?.healthStatus));
      record("8. Fake deployment ID attempt", "FAIL", String(after?.providerDeploymentId));
    }
  } catch (e: any) {
    record("4. Fake provider response", "FAIL", e.message);
    record("5. Hardcoded URL attempt", "FAIL", e.message);
    record("6. Hardcoded HTTP 200 attempt", "FAIL", e.message);
    record("7. Hardcoded HEALTHY attempt", "FAIL", e.message);
    record("8. Fake deployment ID attempt", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 9. Emergency stop
  try {
    const seed = await seedRelease(`STOP-${Date.now().toString().slice(-6)}`);
    emergencyKillSwitch.transition("EMERGENCY_STOP", "syn-fin-004-test", "block deploy");
    let threw = false;
    let msg = "";
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch (e: any) {
      threw = true;
      msg = e.message || String(e);
    }
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (threw && /EMERGENCY_STOP_BLOCKED/i.test(msg) && after?.status === "waiting_release_approval" && !after.approvedAt && !invented(after)) {
      record("9. Emergency stop", "PASS", "EMERGENCY_STOP_BLOCKED; no approval or deploy mutation.");
    } else {
      record("9. Emergency stop", "FAIL", `threw=${threw} status=${after?.status} msg=${msg.slice(0, 80)}`);
    }
  } catch (e: any) {
    record("9. Emergency stop", "FAIL", e.message);
  } finally {
    emergencyKillSwitch.transition("NORMAL", "syn-fin-004-test", "clear stop");
  }

  // 10–11. Authorized CONTROLLED_TEST deployment + URL propagation
  try {
    const seed = await seedRelease(`OK-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => controlledDeploy();
    const result = await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    const liveReal = JSON.stringify(result).includes("LIVE_REAL");
    const honest =
      result.status === "deployed" &&
      result.productionUrl === "https://controlled-fin004.example.test" &&
      result.providerDeploymentId === "dpl_controlled_fin004" &&
      result.healthEvidence?.evidenceClass === "CONTROLLED_TEST" &&
      result.healthEvidence?.httpStatus === "NOT_VERIFIED" &&
      !liveReal &&
      !invented(result);
    if (honest) {
      record("10. Authorized controlled deployment", "PASS", "CONTROLLED_TEST deploy persisted; not LIVE_REAL.");
      record("11. Actual provider URL propagation", "PASS", "Persisted URL is the provider URL, not apex-logistics.");
    } else {
      record("10. Authorized controlled deployment", "FAIL", `status=${result.status} url=${result.productionUrl} class=${result.healthEvidence?.evidenceClass}`);
      record("11. Actual provider URL propagation", "FAIL", String(result.productionUrl));
    }
  } catch (e: any) {
    record("10. Authorized controlled deployment", "FAIL", e.message);
    record("11. Actual provider URL propagation", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 12. Actual health verification (CONTROLLED_TEST probe, not network LIVE_REAL)
  try {
    const seed = await seedRelease(`HLTH-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: true as const,
      evidenceClass: "LIVE" as const,
      providerDeploymentId: "dpl_probe_fin004",
      productionUrl: "https://controlled-fin004.example.test",
    });
    productionHealthService.probeHttp = async () => ({
      url: "https://controlled-fin004.example.test",
      httpStatus: 200 as const,
      healthStatus: "HEALTHY" as const,
      evidenceClass: "CONTROLLED_TEST" as const,
    });
    const result = await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    if (
      result.status === "deployed" &&
      result.healthEvidence?.httpStatus === 200 &&
      result.healthEvidence?.healthStatus === "HEALTHY" &&
      result.healthEvidence?.evidenceClass === "CONTROLLED_TEST" &&
      !JSON.stringify(result).includes("LIVE_REAL")
    ) {
      record("12. Actual health verification", "PASS", "HTTP 200 recorded only from CONTROLLED_TEST probe.");
    } else {
      record("12. Actual health verification", "FAIL", `http=${result.healthEvidence?.httpStatus} class=${result.healthEvidence?.evidenceClass}`);
    }
  } catch (e: any) {
    record("12. Actual health verification", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
    productionHealthService.probeHttp = origProbe;
  }

  // 13. Approval without deployment
  try {
    const seed = await seedRelease(`APPR-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
      error: "DEPLOYMENT_BLOCKED: NOT_SUPPORTED: VERCEL_TOKEN is not configured.",
    });
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch {}
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (after?.status === "approved" && after.approvedAt && !after.deployedAt && after.healthEvidence?.httpStatus === "NOT_VERIFIED") {
      record("13. Approval without deployment", "PASS", "APPROVED is distinct from DEPLOYED.");
    } else {
      record("13. Approval without deployment", "FAIL", `status=${after?.status} deployedAt=${after?.deployedAt}`);
    }
  } catch (e: any) {
    record("13. Approval without deployment", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 14. Deployment without verification
  try {
    const seed = await seedRelease(`NV-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => controlledDeploy();
    const result = await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    if (
      result.status === "deployed" &&
      result.healthEvidence?.httpStatus === "NOT_VERIFIED" &&
      result.healthEvidence?.healthStatus === "NOT_VERIFIED" &&
      result.healthEvidence?.evidenceClass === "CONTROLLED_TEST"
    ) {
      record("14. Deployment without verification", "PASS", "DEPLOYED with health NOT_VERIFIED.");
    } else {
      record("14. Deployment without verification", "FAIL", `status=${result.status} health=${result.healthEvidence?.healthStatus}`);
    }
  } catch (e: any) {
    record("14. Deployment without verification", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  // 15. Correct failed state
  try {
    const seed = await seedRelease(`BAD-${Date.now().toString().slice(-6)}`);
    vercelDeploymentProvider.deployProduction = async () => ({
      ok: false,
      evidenceClass: "LIVE",
      providerDeploymentId: "NO_PROVIDER_DEPLOYMENT_ID",
      productionUrl: "NOT_VERIFIED",
      error: "DEPLOYMENT_BLOCKED: invalid credentials",
    });
    try {
      await productionReleaseService.approveProductionDeployment(seed.releaseId, "OPERATOR");
    } catch {}
    const after = await productionReleaseRepository.getReleaseById(seed.releaseId);
    if (after?.status === "failed" && after.failedAt && after.productionUrl === "NOT_VERIFIED" && !invented(after)) {
      record("15. Correct failed state", "PASS", "Provider rejection persisted as failed.");
    } else {
      record("15. Correct failed state", "FAIL", `status=${after?.status} url=${after?.productionUrl}`);
    }
  } catch (e: any) {
    record("15. Correct failed state", "FAIL", e.message);
  } finally {
    vercelDeploymentProvider.deployProduction = origDeploy;
  }

  emergencyKillSwitch.transition(priorKill, "syn-fin-004-test", "final restore");
  vercelDeploymentProvider.deployProduction = origDeploy;
  productionHealthService.probeHttp = origProbe;

  const names = Object.keys(results);
  const failed = names.filter((n) => results[n].status === "FAIL").length;
  console.log(`\n${names.length - failed}/${names.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
