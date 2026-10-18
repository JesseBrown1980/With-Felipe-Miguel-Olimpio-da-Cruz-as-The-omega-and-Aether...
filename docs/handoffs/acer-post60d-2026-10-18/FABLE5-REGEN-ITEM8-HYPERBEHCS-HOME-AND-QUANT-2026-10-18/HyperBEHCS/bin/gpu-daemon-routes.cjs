"use strict";

// W19D GPU daemon routes — mountable in hyperbehcs-daemon.js with one line.
// PID: AGT-FALCON-FABRIC_QUERY-W19D-DAEMON-WIRE-2026-05-21
// Authority: OP-JESSE-GPU-FABRIC-FULL-SYSTEM-W19 (operator-witness granted 2026-05-21)
//
// Adds three endpoints:
//   GET  /gpu/lane-status  -> gpu-lane.cjs getLaneStatus()
//   GET  /gpu/bindings     -> data/gpu-supervisor-prof-bindings.json
//   POST /gpu/dispatch     -> gpu-gnn-bridge + gpu-hookwall-gate + gpu-kernel-dispatch

const fs = require("fs");
const path = require("path");

const BINDINGS_PATH = "C:/HyperBEHCS/data/gpu-supervisor-prof-bindings.json";

// Lazy-load + cache the GPU lane (avoid spawning nvidia-smi on every request).
let _laneCache = null;
function getLane() {
  if (_laneCache) return _laneCache;
  const gpuLane = require("../lib/gpu-lane.cjs");
  _laneCache = gpuLane.createGpuLane({ device_id: 0 });
  return _laneCache;
}

function jsonResp(res, status, payload) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4 * 1024 * 1024) {
        reject(new Error("request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// Returns true if request was handled (mount-point should `return` immediately).
async function handle(req, res, url) {
  // GET /gpu/lane-status
  if (req.method === "GET" && url.pathname === "/gpu/lane-status") {
    try {
      const lane = getLane();
      const probe = await lane.refreshFromProbe();
      const stat = lane.getLaneStatus();
      jsonResp(res, 200, {
        ok: true,
        schema: "hyperbehcs.gpu_lane_status.v1",
        gpu_path_ready: stat.gpu_path_ready,
        pstate: stat.pstate,
        util_pct: stat.util_pct,
        vram_in_use_mib: stat.vram_in_use_mib,
        adapter: stat.adapter,
        lane_pid: stat.lane_pid,
        last_dispatch_ms: stat.last_dispatch_ms,
        last_dispatch_at: stat.last_dispatch_at,
        dispatch_count: stat.dispatch_count,
        probe_ok: probe && probe.ok === true,
        ts: stat.ts
      });
    } catch (err) {
      jsonResp(res, 500, { ok: false, error: String(err && err.message || err) });
    }
    return true;
  }

  // GET /gpu/bindings
  if (req.method === "GET" && url.pathname === "/gpu/bindings") {
    try {
      const raw = fs.readFileSync(BINDINGS_PATH, "utf8");
      const parsed = JSON.parse(raw);
      jsonResp(res, 200, parsed);
    } catch (err) {
      jsonResp(res, 500, { ok: false, error: String(err && err.message || err) });
    }
    return true;
  }

  // POST /gpu/dispatch
  if (req.method === "POST" && url.pathname === "/gpu/dispatch") {
    try {
      const bodyText = await readBody(req);
      let payload;
      try {
        payload = bodyText.trim() ? JSON.parse(bodyText) : {};
      } catch (e) {
        return jsonResp(res, 400, { ok: false, error: "invalid_json", message: String(e.message) });
      }

      if (payload.schema !== "hyperbehcs.gpu_dispatch.v1") {
        return jsonResp(res, 400, { ok: false, error: "schema_mismatch", expected: "hyperbehcs.gpu_dispatch.v1" });
      }
      if (!payload.kernel_id || typeof payload.kernel_id !== "string") {
        return jsonResp(res, 400, { ok: false, error: "kernel_id_required" });
      }

      const bridge = require("../lib/gpu-gnn-bridge.cjs");
      const gate = require("../lib/gpu-hookwall-gate.cjs");
      const kernel = require("./gpu-kernel-dispatch.cjs");

      const envelope = bridge.buildGpuEnvelope(payload.payload || {}, {
        pid: payload.pid,
        kernel_id: payload.kernel_id,
        apex_cosign: payload.apex_cosign || null,
        device_id: payload.dispatch_opts && payload.dispatch_opts.device_id,
        iters: payload.dispatch_opts && payload.dispatch_opts.iters,
        dim: payload.dispatch_opts && payload.dispatch_opts.dim
      });
      // Preserve client-supplied payload_sha16 if provided (test fixture stability).
      if (payload.payload_sha16) envelope.payload_sha16 = payload.payload_sha16;

      const gateReq = {
        kernel_id: envelope.kernel_id,
        dim: envelope.dispatch_opts.dim,
        iters: envelope.dispatch_opts.iters,
        device_id: envelope.dispatch_opts.device_id
      };
      const gateOpts = envelope.apex_cosign ? { cosign_token: envelope.apex_cosign } : {};

      const routed = bridge.dispatchViaGate(envelope, (req) => {
        const decision = gate.gateCheck(req, gateOpts);
        gate.logGateDecision(req, decision);
        return decision;
      });

      if (routed.error) {
        return jsonResp(res, 403, {
          ok: false,
          stage: "gate",
          error: routed.error,
          tier: routed.tier,
          reason: routed.reason,
          witness_required: routed.witness_required
        });
      }

      // Lane recording + actual kernel execution
      const lane = getLane();
      kernel.dispatch(envelope, (err, result) => {
        if (err) {
          return jsonResp(res, 500, {
            ok: false,
            stage: "kernel",
            error: String(err.message || err),
            kernel_pid: result && result.kernel_pid,
            wall_ms: result && result.wall_ms,
            stderr: result && result.stderr
          });
        }
        try { lane.recordDispatch(result.wall_ms); } catch (_) { /* ignore */ }
        bridge.emitGnnEdge(envelope.pid, result.kernel_pid, "completed");
        jsonResp(res, 200, {
          ok: true,
          schema: "hyperbehcs.gpu_dispatch_result.v1",
          envelope_pid: envelope.pid,
          kernel_pid: result.kernel_pid,
          tier: routed.tier,
          kernel_handler: routed.kernel_handler,
          payload_sha16: envelope.payload_sha16,
          wall_ms: result.wall_ms,
          result: result.result
        });
      });
    } catch (err) {
      jsonResp(res, 500, { ok: false, error: String(err && err.message || err) });
    }
    return true;
  }

  return false;
}

module.exports = { handle };
