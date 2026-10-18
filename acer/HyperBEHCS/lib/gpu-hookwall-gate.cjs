"use strict";

// W19B GPU Hookwall Gate
// PID: AGT-CUBE_CUBED_SEALER-HOOKWALL-W19B-GPU-GATE-2026-05-21
// Tier-class taxonomy for GPU dispatch safety.
// Append-only ndjson log at C:/HyperBEHCS/store/gpu-hookwall-gate.ndjson

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STORE_DIR = "C:/HyperBEHCS/store";
const LOG_PATH = path.join(STORE_DIR, "gpu-hookwall-gate.ndjson");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

// classifyDispatch — tier the request based on properties
function classifyDispatch(req) {
  const r = req || {};

  // FIRMWARE — any firmware/driver/persistence mutation or multi-adapter swap
  if (r.driver_mod === true || r.persistence_mod === true ||
      r.device_id_swap === true || r.firmware_flash === true ||
      (typeof r.kernel_id === "string" && /^fw_|_flash$/.test(r.kernel_id))) {
    return {
      tier: "firmware",
      reason: "firmware/driver/persistence mutation or multi-adapter swap",
      blocked: true
    };
  }

  const iters = Number(r.iters) || 1;
  const wall = Number(r.expected_wall_ms) || 0;

  // COSIGN — multi-kernel pipelines, sustained loads > 5s, training loops
  if (iters > 100 || wall > 5000 || r.training === true ||
      r.multi_kernel === true || r.pipeline === true) {
    return {
      tier: "cosign",
      reason: `multi-kernel/sustained-load (iters=${iters}, wall_ms=${wall})`,
      blocked: false
    };
  }

  // MICRO — single kernel, < 1s, single adapter, no persistence
  return {
    tier: "micro",
    reason: `single kernel under 1s (iters=${iters}, wall_ms=${wall})`,
    blocked: false
  };
}

// gateCheck — apply policy given dispatch classification + opts
function gateCheck(req, opts) {
  const o = opts || {};
  const c = classifyDispatch(req);
  const gate_pid = `GATE-${sha16({ req, ts: nowIso() })}`;

  let allowed = false;
  let witness_required = false;

  if (c.tier === "micro") {
    allowed = true;
  } else if (c.tier === "cosign") {
    if (typeof o.cosign_token === "string" && o.cosign_token.length > 0) {
      allowed = true;
    } else {
      allowed = false;
      witness_required = true;
    }
  } else if (c.tier === "firmware") {
    allowed = false;
    witness_required = true; // operator-witness ceremony required, but ALWAYS blocked here
  }

  return {
    allowed,
    tier: c.tier,
    reason: c.reason,
    witness_required,
    gate_pid,
    blocked: !allowed
  };
}

// logGateDecision — append-only ndjson
function logGateDecision(req, decision) {
  ensureStoreDir();
  const row = {
    ts: nowIso(),
    gate_pid: decision.gate_pid,
    dispatch_req_sha: sha16(req),
    tier: decision.tier,
    allowed: !!decision.allowed,
    reason: decision.reason,
    witness_required: !!decision.witness_required
  };
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n", "utf8");
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
  return { ok: true, row };
}

module.exports = {
  classifyDispatch,
  gateCheck,
  logGateDecision,
  // helpers
  sha16,
  LOG_PATH
};
