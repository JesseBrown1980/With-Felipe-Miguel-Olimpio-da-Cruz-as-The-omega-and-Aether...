#!/usr/bin/env node
"use strict";

const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const core = require("../lib/hyperbehcs-core.cjs");
const targets = require("../lib/hyperbehcs-targets.cjs");
const fileIndex = require("../lib/hyperbehcs-file-index.cjs");
const substrate = require("../lib/hyperbehcs-substrate.cjs");
const enhancedGpuProbe = require("./gpu-probe-enhanced.cjs");
const gpuDaemonRoutes = require("./gpu-daemon-routes.cjs"); // W19D GPU routes mount

// W17 GPU upgrade — cache enhanced probe for process lifetime (cold spawn ~400-800ms)
let _enhancedGpuCache = null;
function enhancedGpuReady() {
  if (_enhancedGpuCache === null) {
    try {
      _enhancedGpuCache = enhancedGpuProbe.probeGpuPath();
    } catch (err) {
      _enhancedGpuCache = { ready: false, error: String(err && err.message || err) };
    }
  }
  return Boolean(_enhancedGpuCache && _enhancedGpuCache.ready);
}
function enhancedGpuPacket() {
  if (_enhancedGpuCache === null) enhancedGpuReady();
  return _enhancedGpuCache || { ready: false };
}

const ROOT = path.resolve(__dirname, "..");
const REPORTS = path.join(ROOT, "reports");
const HOST = "127.0.0.1";
const PORT = Number(process.env.HYPERBEHCS_PORT || 49257);

function json(res, status, payload) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function safeReportPath(fileName) {
  fs.mkdirSync(REPORTS, { recursive: true });
  return path.join(REPORTS, path.basename(fileName));
}

function writeJsonReport(value, fileName) {
  const reportPath = safeReportPath(fileName);
  fs.writeFileSync(reportPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return reportPath;
}

function writeBinaryReport(value, fileName) {
  const reportPath = safeReportPath(fileName);
  fs.writeFileSync(reportPath, value);
  return reportPath;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parsePayload(text) {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function status() {
  const cpus = os.cpus();
  return {
    ok: true,
    schema: "hyperbehcs.local_daemon.status.v1",
    runtime_root: ROOT,
    host: HOST,
    port: PORT,
    pid: process.pid,
    cpu_model: cpus[0]?.model || "unknown",
    cpu_threads: cpus.length,
    cpu_path_ready: true,
    gpu_path_ready: enhancedGpuReady(),
    hybrid_binary_envelope_ready: true,
    substrate_ready: true,
    asolaria_dependency: false,
    normal_computer_scope: "loopback daemon callable by local programs",
    ...core.ZERO_COUNTERS
  };
}

function gpuProbe() {
  let controllers = [];
  try {
    const inventory = JSON.parse(fs.readFileSync(path.join(REPORTS, "gpu-inventory.json"), "utf8"));
    controllers = Array.isArray(inventory.controllers) ? inventory.controllers : [];
  } catch {
    controllers = [];
  }
  const enhanced = enhancedGpuPacket();
  const packet = {
    schema: "hyperbehcs.local_daemon.gpu_probe.v1",
    controllers,
    gpu_quant_kernel_executed: false,
    gpu_acceleration_claimed: false,
    gpu_path_ready: Boolean(enhanced && enhanced.ready),
    enhanced_probe: enhanced,
    next_gate: enhanced && enhanced.ready
      ? "kernel benchmark via ORT-DML"
      : "real DirectML/CUDA/WebGPU/ONNX backend and kernel benchmark",
    ...core.ZERO_COUNTERS
  };
  return { ...packet, fingerprint: core.sha16(packet) };
}

async function handle(req, res) {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith("/gpu/")) { // W19D GPU routes
      const handled = await gpuDaemonRoutes.handle(req, res, url);
      if (handled) return;
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/status")) {
      return json(res, 200, status());
    }
    if (req.method === "GET" && url.pathname === "/gpu-probe") {
      return json(res, 200, gpuProbe());
    }
    if (req.method === "GET" && url.pathname === "/targets") {
      const { report } = targets.writeTargetReport();
      return json(res, 200, report);
    }
    if (req.method === "GET" && url.pathname === "/substrate/status") {
      return json(res, 200, substrate.storeStatus());
    }
    if (req.method === "POST" && (url.pathname === "/substrate/pack" || url.pathname === "/substrate/commit")) {
      const payload = parsePayload(await readBody(req));
      const commit = url.pathname === "/substrate/commit";
      const packet = substrate.buildSubstratePacket(payload, {
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || 768),
        bits: Number(url.searchParams.get("bits") || payload.bits || 8),
        targetDimension: Number(url.searchParams.get("targetDimension") || payload.targetDimension || 0) || undefined,
        seed: String(url.searchParams.get("seed") || payload.seed || "hyperbehcs-substrate"),
        commit
      });
      const result = commit ? substrate.appendSubstratePacket(packet) : null;
      return json(res, 200, {
        ok: true,
        schema: commit ? "hyperbehcs.substrate_commit_daemon.v1" : "hyperbehcs.substrate_pack_daemon.v1",
        receipt: packet.receipt,
        envelope_base64: packet.envelope_base64,
        append_result: result
      });
    }
    if (req.method === "POST" && url.pathname === "/quantize") {
      const payload = parsePayload(await readBody(req));
      return json(res, 200, core.buildFastPacket(payload, {
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || 1536),
        bits: Number(url.searchParams.get("bits") || payload.bits || 8)
      }));
    }
    if (req.method === "POST" && url.pathname === "/bench") {
      const payload = parsePayload(await readBody(req));
      return json(res, 200, core.benchmark(payload, {
        iterations: Number(url.searchParams.get("iterations") || payload.iterations || 100),
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || 768),
        bits: Number(url.searchParams.get("bits") || payload.bits || 8)
      }));
    }
    if (req.method === "POST" && url.pathname === "/hybrid-pack") {
      const payload = parsePayload(await readBody(req));
      const packet = core.buildHybridPacket(payload, {
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || 1536),
        bits: Number(url.searchParams.get("bits") || payload.bits || 8),
        targetDimension: Number(url.searchParams.get("targetDimension") || payload.targetDimension || 0) || undefined,
        seed: String(url.searchParams.get("seed") || payload.seed || "hyperbehcs-hybrid-local")
      });
      const envelopePath = writeBinaryReport(packet.envelope, "hybrid-packet-latest.hbp");
      const receiptPath = writeJsonReport(packet.receipt, "hybrid-packet-latest.hbp.json");
      return json(res, 200, {
        ok: true,
        schema: "hyperbehcs.local_hybrid_pack_daemon.v1",
        envelope_path: envelopePath,
        receipt_path: receiptPath,
        envelope_base64: packet.envelope_base64,
        envelope_bytes: packet.envelope_bytes,
        receipt: packet.receipt
      });
    }
    if (req.method === "POST" && url.pathname === "/hybrid-bench") {
      const payload = parsePayload(await readBody(req));
      const packet = core.hybridBenchmark(payload, {
        iterations: Number(url.searchParams.get("iterations") || payload.iterations || 100),
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || 768),
        bits: Number(url.searchParams.get("bits") || payload.bits || 8),
        targetDimension: Number(url.searchParams.get("targetDimension") || payload.targetDimension || 0) || undefined,
        seed: String(url.searchParams.get("seed") || payload.seed || "hyperbehcs-hybrid-local")
      });
      const reportPath = writeJsonReport(packet, "hybrid-benchmark-latest.json");
      return json(res, 200, { ...packet, report_path: reportPath });
    }
    if (req.method === "POST" && url.pathname === "/file-index") {
      const payload = parsePayload(await readBody(req));
      const result = fileIndex.ingestPath({
        target: payload.target,
        maxFiles: Number(url.searchParams.get("maxFiles") || payload.maxFiles || fileIndex.DEFAULTS.maxFiles),
        maxBytes: Number(url.searchParams.get("maxBytes") || payload.maxBytes || fileIndex.DEFAULTS.maxBytes),
        dimension: Number(url.searchParams.get("dimension") || payload.dimension || fileIndex.DEFAULTS.dimension),
        sidecar: false,
        includeBinary: Boolean(payload.includeBinary)
      });
      return json(res, 200, {
        ok: true,
        schema: "hyperbehcs.file_index_daemon_summary.v1",
        target: result.report.target,
        report_path: result.report_path,
        summary: result.report.summary,
        fingerprint: result.report.fingerprint
      });
    }
    return json(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) });
  }
}

const server = http.createServer(handle);
server.listen(PORT, HOST, () => {
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, "daemon-latest.json"), `${JSON.stringify(status(), null, 2)}\n`, "utf8");
  console.log(JSON.stringify(status()));
});
