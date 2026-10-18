"use strict";

// W19B GPU GNN Bridge
// PID: AGT-CUBE_CUBED_SEALER-HOOKWALL-W19B-GPU-GATE-2026-05-21
// Routes GPU dispatch via fabric envelopes through hookwall gate; emits GNN edges.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STORE_DIR = "C:/HyperBEHCS/store";
const EDGE_LOG = path.join(STORE_DIR, "gnn-edges-gpu.ndjson");

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

// buildGpuEnvelope — fabric envelope for GPU kernel dispatch
function buildGpuEnvelope(payload, opts) {
  const o = opts || {};
  const payload_sha16 = sha16(payload);
  const env = {
    schema: "hyperbehcs.gpu_dispatch.v1",
    pid: o.pid || `GPU-ENV-${payload_sha16}`,
    target_lane: "gpu",
    kernel_id: o.kernel_id || (payload && payload.op) || "unknown",
    payload_sha16,
    dispatch_opts: {
      device_id: typeof o.device_id === "number" ? o.device_id : 0,
      iters: Number(o.iters) || 1,
      dim: Number(o.dim) || 0
    },
    ts_iso: nowIso(),
    apex_cosign: o.apex_cosign || null,
    prev_sha: o.prev_sha || null,
    payload
  };
  return env;
}

// routeKernel — pick micro-kernel handler for envelope
function routeKernel(envelope) {
  const kid = envelope && envelope.kernel_id;
  switch (kid) {
    case "matmul":
      return "gpu-microkernel-matmul";
    case "vecadd":
    case "vector_add":
      return "gpu-microkernel-vector-add";
    default:
      throw new Error("no_kernel_for_id");
  }
}

// emitGnnEdge — append edge to ndjson log
function emitGnnEdge(from_pid, to_pid, edge_type) {
  ensureStoreDir();
  const row = {
    from: String(from_pid || ""),
    to: String(to_pid || ""),
    type: String(edge_type || "dispatch"),
    ts: nowIso()
  };
  try {
    fs.appendFileSync(EDGE_LOG, JSON.stringify(row) + "\n", "utf8");
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
  return { ok: true, row };
}

// dispatchViaGate — chain: gate check -> route + emit edge OR log block
function dispatchViaGate(envelope, gateCheckFn) {
  if (typeof gateCheckFn !== "function") {
    return { error: "gateCheckFn_required" };
  }
  const req = {
    kernel_id: envelope.kernel_id,
    dim: envelope.dispatch_opts && envelope.dispatch_opts.dim,
    iters: envelope.dispatch_opts && envelope.dispatch_opts.iters,
    device_id: envelope.dispatch_opts && envelope.dispatch_opts.device_id
  };
  const decision = gateCheckFn(req);
  if (!decision.allowed) {
    emitGnnEdge(envelope.pid, decision.gate_pid || "GATE-BLOCK", "blocked");
    return {
      error: "gate_blocked",
      tier: decision.tier,
      reason: decision.reason,
      witness_required: decision.witness_required
    };
  }
  let kernel_handler;
  try {
    kernel_handler = routeKernel(envelope);
  } catch (err) {
    emitGnnEdge(envelope.pid, "UNKNOWN-KERNEL", "route_error");
    return { error: String(err && err.message || err) };
  }
  emitGnnEdge(envelope.pid, kernel_handler, "routed");
  return {
    ok: true,
    tier: decision.tier,
    kernel_handler,
    envelope_pid: envelope.pid,
    payload_sha16: envelope.payload_sha16
  };
}

module.exports = {
  buildGpuEnvelope,
  routeKernel,
  emitGnnEdge,
  dispatchViaGate,
  sha16,
  EDGE_LOG
};
