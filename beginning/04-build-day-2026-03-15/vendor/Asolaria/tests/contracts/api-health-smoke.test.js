/**
 * API Health Smoke Tests
 * Validates critical API endpoints respond correctly after a build.
 * Run: node tests/contracts/api-health-smoke.test.js
 */

const http = require("http");

const BASE = "http://127.0.0.1:4781";
let passed = 0;
let failed = 0;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${path}`, { timeout: 15000 }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function assert(asyncFn, label) {
  try {
    const ok = await asyncFn();
    if (ok) { passed++; console.log(`  PASS: ${label}`); }
    else { failed++; console.error(`  FAIL: ${label}`); }
  } catch (e) {
    failed++;
    console.error(`  FAIL: ${label} — ${e.message}`);
  }
}

async function run() {
  console.log("\n=== API Health Smoke Tests ===\n");

  await assert(async () => {
    const r = await get("/api/health/fast");
    return r.status === 200 && r.body.ok === true;
  }, "GET /api/health/fast returns ok");

  await assert(async () => {
    const r = await get("/api/swarm/status");
    return r.status === 200 && r.body.ok === true;
  }, "GET /api/swarm/status returns ok");

  await assert(async () => {
    const r = await get("/api/standing-directives?active=true");
    return r.status === 200 && Array.isArray(r.body.directives);
  }, "GET /api/standing-directives returns array");

  await assert(async () => {
    const r = await get("/api/hooks/stats");
    return r.status === 200 && r.body.ok === true;
  }, "GET /api/hooks/stats returns ok");

  await assert(async () => {
    const r = await get("/api/jobs");
    return r.status === 200 && r.body.stats !== undefined;
  }, "GET /api/jobs returns stats with WAL info");

  await assert(async () => {
    const r = await get("/api/worker-router/status");
    return r.status === 200 && r.body.ok === true;
  }, "GET /api/worker-router/status returns ok");

  await assert(async () => {
    const r = await get("/api/vault/status");
    return r.status === 200;
  }, "GET /api/vault/status responds");

  await assert(async () => {
    const r = await get("/api/projects");
    return r.status === 200;
  }, "GET /api/projects responds");

  await assert(async () => {
    const r = await get("/api/mistakes/patterns");
    return r.status === 200;
  }, "GET /api/mistakes/patterns responds");

  await assert(async () => {
    const r = await get("/api/hooks/dashboard");
    return r.status === 200 && r.body.ok === true;
  }, "GET /api/hooks/dashboard returns ok");

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("Test runner failed:", e); process.exit(1); });
