/**
 * cube-fabric.js — Express routes wiring ALL unwired cube/gate/GNN modules.
 *
 * Mounts at /api/cube-fabric
 * Wires: hookwall, gnn gate, shannon gate, bashSecurityGuard, sovereignty-gate,
 *        edgeRiskEngine, gnnDataExport, gnnConstructionWatcher, sharedComputeFabric,
 *        hookEventStore, constructionIndex, instantAgentSpawner, unifiedAgentIndexStore,
 *        cube engines (v4, v5, intersection, healer, full-cycle).
 *
 * COSIGN: COSIGN_47D_001 — quadruple operator 2026-04-10T23:08Z
 * Cube: D6 GATE (2197) + D36 INFERENCE_SURFACE (3442951)
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");

// ═══ SAFE REQUIRE — never crash server on missing module ═══
function safeRequire(modPath, label) {
  try {
    const m = require(modPath);
    console.log(`[cube-fabric] WIRED: ${label}`);
    return m;
  } catch (e) {
    console.error(`[cube-fabric] FAILED to wire ${label}: ${e.message}`);
    return null;
  }
}

// ═══ WIRE ALL MODULES (prefer shadow v2 upgrades on E: sovereignty USB) ═══
const hookwall = safeRequire("E:/sovereignty/ix/gates/hookwall-v2", "hookwall-v2 (shadow)")
  || safeRequire("../ix/gates/hookwall", "hookwall (local fallback)");
const gnnGate = safeRequire("E:/sovereignty/ix/gates/gnn", "gnn-gate (shadow)")
  || safeRequire("../ix/gates/gnn", "gnn-gate (local fallback)");
const shannonGate = safeRequire("E:/sovereignty/ix/gates/shannon", "shannon-gate (shadow)")
  || safeRequire("../ix/gates/shannon", "shannon-gate (local fallback)");
const bashGuard = safeRequire("../src/bashSecurityGuard", "bashSecurityGuard");
const sovereigntyGate = safeRequire("../src/sovereignty-gate", "sovereignty-gate");
const edgeRisk = safeRequire("../src/edgeRiskEngine", "edgeRiskEngine");
const gnnExport = safeRequire("../src/gnnDataExport", "gnnDataExport");
const gnnWatcher = safeRequire("../src/gnnConstructionWatcher", "gnnConstructionWatcher");
const computeFabric = safeRequire("../src/sharedComputeFabric", "sharedComputeFabric");
const hookEvents = safeRequire("../src/hookEventStore", "hookEventStore");
const constructions = safeRequire("../src/constructionIndex", "constructionIndex");
const spawner = safeRequire("../src/instantAgentSpawner", "instantAgentSpawner");
const unifiedIndex = safeRequire("../src/unifiedAgentIndexStore", "unifiedAgentIndexStore");

// ═══════════════════════════════════════════════════════════
// GATE PIPELINE — hookwall → gnn → shannon (fail-closed)
// ═══════════════════════════════════════════════════════════

async function runGatePipeline(verb, args, envelope) {
  const results = { hookwall: null, gnn: null, shannon: null, passed: false };

  // Gate 1: Hookwall (6-hook membrane)
  if (hookwall) {
    try {
      results.hookwall = await hookwall(verb, args, envelope);
      if (!results.hookwall.allow) {
        return { ...results, blocked_by: "hookwall", reason: results.hookwall.reason };
      }
    } catch (e) {
      return { ...results, blocked_by: "hookwall_error", reason: e.message };
    }
  }

  // Gate 2: GNN (construction routing + risk prediction)
  if (gnnGate) {
    try {
      results.gnn = await gnnGate(verb, args, envelope);
      if (results.gnn && !results.gnn.allow) {
        return { ...results, blocked_by: "gnn", reason: results.gnn.reason };
      }
    } catch (e) {
      // GNN is advisory — log but don't block
      results.gnn = { error: e.message, advisory: true };
    }
  }

  // Gate 3: Shannon (remote consensus for high-risk)
  if (shannonGate && results.hookwall?.risk?.score >= 5) {
    try {
      results.shannon = await shannonGate(verb, args, envelope);
      if (results.shannon && !results.shannon.allow) {
        return { ...results, blocked_by: "shannon", reason: results.shannon.reason };
      }
    } catch (e) {
      // Shannon fail-closed at risk >= 5
      if (results.hookwall?.risk?.score >= 7) {
        return { ...results, blocked_by: "shannon_unreachable", reason: "risk >= 7 and shannon unreachable" };
      }
      results.shannon = { error: e.message, failOpen: true };
    }
  }

  results.passed = true;
  return results;
}

// ═══════════════════════════════════════════════════════════
// ROUTES — /api/cube-fabric/*
// ═══════════════════════════════════════════════════════════

// ── Gate pipeline ──
router.post("/gate", async (req, res) => {
  try {
    const { verb, args, envelope } = req.body || {};
    const result = await runGatePipeline(verb || "unknown", args || {}, envelope || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/gate/status", (_req, res) => {
  res.json({
    ok: true,
    gates: {
      hookwall: !!hookwall,
      gnn: !!gnnGate,
      shannon: !!shannonGate,
      sovereignty: !!sovereigntyGate,
    },
    modules: {
      bashGuard: !!bashGuard,
      edgeRisk: !!edgeRisk,
      gnnExport: !!gnnExport,
      gnnWatcher: !!gnnWatcher,
      computeFabric: !!computeFabric,
      hookEvents: !!hookEvents,
      constructions: !!constructions,
      spawner: !!spawner,
      unifiedIndex: !!unifiedIndex,
    },
    cube: { D6: 2197, D36: 3442951 },
    engine: "cube-fabric-v1",
  });
});

// ── Bash security guard ──
router.post("/bash-guard", (req, res) => {
  if (!bashGuard) return res.status(503).json({ ok: false, error: "bashSecurityGuard not loaded" });
  try {
    const result = bashGuard.checkCommand(req.body?.command || "");
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Sovereignty gate ──
router.post("/sovereignty-gate", (req, res) => {
  if (!sovereigntyGate) return res.status(503).json({ ok: false, error: "sovereignty-gate not loaded" });
  try {
    const { op, author, payload } = req.body || {};
    const result = sovereigntyGate.gate(op, author, payload);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Edge risk scoring ──
router.post("/edge-risk", (req, res) => {
  if (!edgeRisk) return res.status(503).json({ ok: false, error: "edgeRiskEngine not loaded" });
  try {
    const result = edgeRisk.scoreEdgeRisk(req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GNN data export ──
router.get("/gnn/export", (req, res) => {
  if (!gnnExport) return res.status(503).json({ ok: false, error: "gnnDataExport not loaded" });
  try {
    const data = gnnExport.exportTrainingData(req.query || {});
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GNN construction watcher ──
router.get("/gnn/watcher/status", (_req, res) => {
  if (!gnnWatcher) return res.status(503).json({ ok: false, error: "gnnConstructionWatcher not loaded" });
  try {
    res.json({ ok: true, ...gnnWatcher.getWatcherStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/gnn/watcher/predict", (req, res) => {
  if (!gnnWatcher) return res.status(503).json({ ok: false, error: "gnnConstructionWatcher not loaded" });
  try {
    const { message, currentConstructionId } = req.body || {};
    const prediction = gnnWatcher.predictConstruction(message || "", currentConstructionId || "");
    res.json({ ok: true, prediction });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Hook events ──
router.get("/hook-events", (req, res) => {
  if (!hookEvents) return res.status(503).json({ ok: false, error: "hookEventStore not loaded" });
  try {
    const events = hookEvents.queryHookEvents(req.query || {});
    res.json({ ok: true, events });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/hook-events/stats", (_req, res) => {
  if (!hookEvents) return res.status(503).json({ ok: false, error: "hookEventStore not loaded" });
  try {
    res.json({ ok: true, ...hookEvents.getHookEventStats() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Constructions ──
router.get("/constructions", (_req, res) => {
  if (!constructions) return res.status(503).json({ ok: false, error: "constructionIndex not loaded" });
  try {
    const all = constructions.getAllConstructions();
    res.json({ ok: true, constructions: all });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/constructions/route", (req, res) => {
  if (!constructions) return res.status(503).json({ ok: false, error: "constructionIndex not loaded" });
  try {
    const { message } = req.body || {};
    const gnnPred = gnnWatcher ? gnnWatcher.predictConstruction(message || "", "") : null;
    const result = constructions.routeToConstruction(message || "", gnnPred);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Agent spawner ──
router.get("/spawner/status", (_req, res) => {
  if (!spawner) return res.status(503).json({ ok: false, error: "instantAgentSpawner not loaded" });
  try {
    res.json({ ok: true, ...spawner.getSpawnerStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Shared compute fabric ──
router.get("/compute/status", (_req, res) => {
  if (!computeFabric) return res.status(503).json({ ok: false, error: "sharedComputeFabric not loaded" });
  try {
    res.json({ ok: true, ...computeFabric.getSharedComputeStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/compute/workers", (_req, res) => {
  if (!computeFabric) return res.status(503).json({ ok: false, error: "sharedComputeFabric not loaded" });
  try {
    res.json({ ok: true, workers: computeFabric.getSharedComputeWorkers() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/compute/jobs", (req, res) => {
  if (!computeFabric) return res.status(503).json({ ok: false, error: "sharedComputeFabric not loaded" });
  try {
    res.json({ ok: true, jobs: computeFabric.listSharedComputeJobs(req.query || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Unified agent index ──
router.get("/index/status", (_req, res) => {
  if (!unifiedIndex) return res.status(503).json({ ok: false, error: "unifiedAgentIndexStore not loaded" });
  try {
    res.json({ ok: true, ...unifiedIndex.getUnifiedIndexStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/index/search", (req, res) => {
  if (!unifiedIndex) return res.status(503).json({ ok: false, error: "unifiedAgentIndexStore not loaded" });
  try {
    const results = unifiedIndex.searchUnifiedIndex({ query: req.query?.q || "", ...req.query });
    res.json({ ok: true, ...results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CUBE ENGINE ROUTES — run v4/v5/intersection/healer/cycle
// ═══════════════════════════════════════════════════════════

function runCubeEngine(script, args) {
  const cmd = `node "${path.join(ROOT, 'tools/cube', script)}" ${args}`;
  return JSON.parse(execSync(cmd, { cwd: ROOT, encoding: "utf8", timeout: 300000 }));
}

router.get("/engine/self-diagnose", (_req, res) => {
  try {
    const result = runCubeEngine("omni-shannon-v4-real.js", "--self-diagnose");
    res.json({ ok: true, engine: "v4", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/live-scan", (_req, res) => {
  try {
    const result = runCubeEngine("omni-shannon-v4-real.js", "--live-scan");
    res.json({ ok: true, engine: "v4", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/deep-diagnose", (_req, res) => {
  try {
    const result = runCubeEngine("omni-shannon-v5-deep-cascade.js", "--self-diagnose");
    res.json({ ok: true, engine: "v5-deep", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/deep-qdd", (_req, res) => {
  try {
    const result = runCubeEngine("omni-shannon-v5-deep-cascade.js", "--qdd-cube");
    res.json({ ok: true, engine: "v5-deep-qdd", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/intersection", (_req, res) => {
  try {
    const result = runCubeEngine("hilbert-intersection-engine.js", "");
    res.json({ ok: true, engine: "intersection", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/heal", (_req, res) => {
  try {
    const result = runCubeEngine("cube-self-healer.js", "");
    res.json({ ok: true, engine: "healer", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

router.get("/engine/full-cycle", (_req, res) => {
  try {
    const result = runCubeEngine("cube-full-cycle.js", "");
    res.json({ ok: true, engine: "full-cycle", ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message.slice(0, 500) });
  }
});

// ── 47D spec ──
router.get("/47d", (_req, res) => {
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/hilbert-omni-47D.json"), "utf8"));
    res.json({ ok: true, ...spec });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
