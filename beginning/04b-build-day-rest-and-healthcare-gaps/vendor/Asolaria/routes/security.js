/**
 * Security Routes — Phase 2 Security Fabric
 * Handles: /api/security/*
 * Command risk classification, secret hardening status, RBAC info
 */

const express = require("express");
const router = express.Router();

const { classifyCommandRisk, COMMAND_RISK_CLASSES } = require("../src/approvalEngine");
const { getHardeningStatus, listHardenedKeys, hardenSecret } = require("../src/secretHardening");
const { ROLES, listTokens } = require("../middleware/auth");
const { rotateAllLogs } = require("../lib/logRotation");
const path = require("path");

function respondError(res, error, status = 500) {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return res.status(status).json({ ok: false, error: message });
}

// Classify command risk
router.post("/classify-command", (req, res) => {
  try {
    const { command } = req.body || {};
    if (!command) return respondError(res, "Command text is required.", 400);
    const result = classifyCommandRisk(command);
    return res.json({ ok: true, ...result });
  } catch (error) {
    return respondError(res, error, 400);
  }
});

// Get all risk class definitions
router.get("/risk-classes", (_req, res) => {
  try {
    return res.json({ ok: true, classes: COMMAND_RISK_CLASSES });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

// Get RBAC role definitions
router.get("/roles", (_req, res) => {
  try {
    return res.json({ ok: true, roles: ROLES });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

// Secret hardening status
router.get("/hardening/status", (_req, res) => {
  try {
    return res.json({ ok: true, ...getHardeningStatus() });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

// List hardened keys
router.get("/hardening/keys", (_req, res) => {
  try {
    return res.json({ ok: true, keys: listHardenedKeys() });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

// Harden a secret (loopback only — sensitive)
router.post("/hardening/protect", (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key || !value) return respondError(res, "Key and value are required.", 400);
    const result = hardenSecret(key, value);
    return res.json(result);
  } catch (error) {
    return respondError(res, error, 400);
  }
});

// Log rotation
router.post("/logs/rotate", (req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    const results = rotateAllLogs(dataDir, {
      maxLines: req.body?.maxLines,
      keepLines: req.body?.keepLines
    });
    return res.json({ ok: true, results });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

router.get("/logs/status", (_req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    const fs = require("fs");
    const files = ["gateway-audit.ndjson", "graph-runtime-events.ndjson", "graph-runtime-manifests.ndjson", "job-queue-wal.ndjson", "mistake-ledger.ndjson", "hook-events.ndjson"];
    const status = {};
    for (const file of files) {
      const fp = path.join(dataDir, file);
      try {
        const stat = fs.statSync(fp);
        const lines = fs.readFileSync(fp, "utf8").split("\n").filter(Boolean).length;
        status[file] = { exists: true, sizeBytes: stat.size, lines, lastModified: stat.mtime.toISOString() };
      } catch { status[file] = { exists: false }; }
    }
    return res.json({ ok: true, logs: status });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

// Full security dashboard
router.get("/dashboard", (_req, res) => {
  try {
    return res.json({
      ok: true,
      rbac: { roles: Object.keys(ROLES), activeTokens: listTokens().length },
      hardening: getHardeningStatus(),
      riskClasses: Object.keys(COMMAND_RISK_CLASSES),
      phase: "2_active"
    });
  } catch (error) {
    return respondError(res, error, 500);
  }
});

module.exports = router;
