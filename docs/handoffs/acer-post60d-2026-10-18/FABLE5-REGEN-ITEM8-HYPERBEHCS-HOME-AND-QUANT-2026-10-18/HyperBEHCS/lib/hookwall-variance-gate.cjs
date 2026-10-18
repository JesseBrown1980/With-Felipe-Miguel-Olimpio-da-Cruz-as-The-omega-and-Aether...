"use strict";

// W22C T53 Hookwall Variance Gate
// PID: AGT-CUBE_CUBED_SEALER-HOOKWALL-W22C-T53-VARIANCE-GATE-2026-05-21
// Sibling to W19B gpu-hookwall-gate.cjs (NOT modified).
// Adds rep-variance + lottery-ticket detection on top of tier classification.
// Append-only ndjson log at C:/HyperBEHCS/store/hookwall-variance-gate.ndjson
//
// Canon source: PB-B vanilla `around_right` (mean 49, std 27, range 32-96) —
// lottery-ticket "success" that must NEVER promote to tier-3 firmware.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STORE_DIR = "C:/HyperBEHCS/store";
const LOG_PATH = path.join(STORE_DIR, "hookwall-variance-gate.ndjson");
const THRESHOLDS_PATH = "C:/HyperBEHCS/data/variance-gate-thresholds.json";

const DEFAULT_THRESHOLDS = {
  schema: "hyperbehcs.hookwall.variance_gate.thresholds.v1",
  tier_thresholds: {
    tier_1_micro: { k_min: 1, std_max_pp: null, skip_variance_check: true },
    tier_2_cosign: { k_min: 3, std_max_pp: 5.0, lottery_check: true },
    tier_3_firmware: { k_min: 5, std_max_pp: 0.5, lottery_check: true, operator_witness_override: true }
  },
  lottery_detection: { std_to_mean_ratio_max: 0.5, range_to_mean_ratio_max: 0.5 }
};

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha8(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 8);
}

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

function loadThresholds() {
  try {
    if (fs.existsSync(THRESHOLDS_PATH)) {
      const raw = fs.readFileSync(THRESHOLDS_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tier_thresholds) return parsed;
    }
  } catch (_) { /* fall through to defaults */ }
  return DEFAULT_THRESHOLDS;
}

// classifyVariance — pure stats on rep results
function classifyVariance(rep_results) {
  const arr = Array.isArray(rep_results) ? rep_results.map(Number).filter(v => Number.isFinite(v)) : [];
  const n = arr.length;
  if (n === 0) {
    return { n: 0, mean: 0, std: 0, cv: 0, max_min_range: 0, lottery_flag: false };
  }
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1
    ? arr.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1)
    : 0;
  const std = Math.sqrt(variance);
  const max_min_range = Math.max.apply(null, arr) - Math.min.apply(null, arr);
  const absMean = Math.abs(mean);
  const cv = absMean > 0 ? std / absMean : 0;
  const th = loadThresholds().lottery_detection || DEFAULT_THRESHOLDS.lottery_detection;
  const stdRatio = absMean > 0 ? std / absMean : 0;
  const rangeRatio = absMean > 0 ? max_min_range / absMean : 0;
  const lottery_flag = (stdRatio > th.std_to_mean_ratio_max) || (rangeRatio > th.range_to_mean_ratio_max);
  return { n, mean, std, cv, max_min_range, lottery_flag };
}

// gateCheckVariance — apply tier policy to rep stats
function gateCheckVariance(decision_id, rep_results, target_tier, opts) {
  const options = opts || {};
  const witness = options.operator_witness === true;
  const thresholds = loadThresholds();
  const tiers = thresholds.tier_thresholds || DEFAULT_THRESHOLDS.tier_thresholds;
  const stats = classifyVariance(rep_results);

  let tierKey;
  if (target_tier === "tier_1_micro" || target_tier === "micro") tierKey = "tier_1_micro";
  else if (target_tier === "tier_2_cosign" || target_tier === "cosign") tierKey = "tier_2_cosign";
  else if (target_tier === "tier_3_firmware" || target_tier === "firmware") tierKey = "tier_3_firmware";
  else tierKey = "tier_2_cosign";

  const policy = tiers[tierKey] || {};
  const gate_pid = `GATE-VAR-${sha8(`${decision_id}|${tierKey}|${JSON.stringify(rep_results)}|${nowIso()}`)}`;

  // tier-1 micro auto-pass
  if (policy.skip_variance_check === true) {
    return {
      allowed: true,
      tier_actual: "tier_1_micro",
      reason: "tier-1 micro auto-pass (no variance check)",
      witness_required: false,
      gate_pid,
      stats
    };
  }

  // k_min check
  if (typeof policy.k_min === "number" && stats.n < policy.k_min) {
    return {
      allowed: false,
      tier_actual: tierKey,
      reason: `insufficient reps: n=${stats.n} < k_min=${policy.k_min}`,
      witness_required: false,
      gate_pid,
      stats
    };
  }

  // lottery detection (tier-2 + tier-3)
  if (policy.lottery_check === true && stats.lottery_flag === true) {
    if (tierKey === "tier_3_firmware" && policy.operator_witness_override === true && witness) {
      return {
        allowed: true,
        tier_actual: "tier-3-witnessed",
        reason: "lottery_flag overridden by operator_witness",
        witness_required: false,
        gate_pid,
        stats
      };
    }
    return {
      allowed: false,
      tier_actual: tierKey,
      reason: `LOTTERY rejected: std/mean=${stats.cv.toFixed(3)} range/mean=${(stats.max_min_range / (stats.mean || 1)).toFixed(3)}`,
      witness_required: tierKey === "tier_3_firmware",
      gate_pid,
      stats
    };
  }

  // std_max_pp check
  if (typeof policy.std_max_pp === "number" && stats.std > policy.std_max_pp) {
    if (tierKey === "tier_3_firmware" && policy.operator_witness_override === true && witness) {
      return {
        allowed: true,
        tier_actual: "tier-3-witnessed",
        reason: `std=${stats.std.toFixed(3)}pp > ${policy.std_max_pp}pp overridden by operator_witness`,
        witness_required: false,
        gate_pid,
        stats
      };
    }
    return {
      allowed: false,
      tier_actual: tierKey,
      reason: `std=${stats.std.toFixed(3)}pp > std_max_pp=${policy.std_max_pp}pp`,
      witness_required: tierKey === "tier_3_firmware",
      gate_pid,
      stats
    };
  }

  return {
    allowed: true,
    tier_actual: tierKey,
    reason: `passed: n=${stats.n} std=${stats.std.toFixed(3)}pp lottery=${stats.lottery_flag}`,
    witness_required: false,
    gate_pid,
    stats
  };
}

// logVarianceGateDecision — append-only ndjson
function logVarianceGateDecision(decision_id, decision_obj) {
  ensureStoreDir();
  const row = {
    ts: nowIso(),
    decision_id,
    pid: "AGT-CUBE_CUBED_SEALER-HOOKWALL-W22C-T53-VARIANCE-GATE-2026-05-21",
    apex_cosign: "OP-JESSE-PLAN-B-T53-VARIANCE-GATE-W22",
    decision: decision_obj
  };
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n", "utf8");
    return { ok: true, log_path: LOG_PATH };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

module.exports = {
  classifyVariance,
  gateCheckVariance,
  logVarianceGateDecision,
  loadThresholds,
  LOG_PATH,
  THRESHOLDS_PATH
};
