#!/usr/bin/env node
"use strict";

/**
 * gpu-probe-enhanced.cjs
 *
 * Drop-in replacement probe for hyperbehcs-daemon.js `gpu_path_ready`.
 *
 * Current daemon (bin/hyperbehcs-daemon.js) hardcodes gpu_path_ready=false in
 *   - status()       line ~82
 *   - gpuProbe()     line ~104
 * even though ORT-DML 1.24.4 is installed under
 *   C:/HyperBEHCS/runtime/onnxruntime-directml/onnxruntime/
 * and python+nvidia-smi are on PATH.
 *
 * This module re-checks three real signals and returns true only if all pass:
 *   1. ORT-DML python package present on disk
 *   2. python can import onnxruntime AND DmlExecutionProvider is in providers
 *   3. nvidia-smi binary reachable (driver alive)
 *
 * Integration hook (intentionally not applied here — operator gates daemon
 * restarts): inside bin/hyperbehcs-daemon.js, replace the literal
 *   `gpu_path_ready: false`
 * on lines ~82 (status) and ~104 (gpuProbe) with a call to
 *   require("./gpu-probe-enhanced.cjs").probeGpuPath().ready
 * Cache the result for the lifetime of the daemon process if startup latency
 * is a concern (Python spawn ~400-800ms cold).
 *
 * Substrate frame: append the probeGpuPath() packet via
 *   require("../lib/hyperbehcs-substrate.cjs").appendSubstratePacket(...)
 * after wrapping in buildSubstratePacket() (same pattern as /substrate/commit).
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ORT_DML_ROOT = "C:\\HyperBEHCS\\runtime\\onnxruntime-directml";
const ORT_DML_INIT = path.join(ORT_DML_ROOT, "onnxruntime", "__init__.py");

function checkOrtDmlOnDisk() {
  try {
    const stat = fs.statSync(ORT_DML_INIT);
    return { ok: stat.isFile(), path: ORT_DML_INIT, size: stat.size };
  } catch (err) {
    return { ok: false, path: ORT_DML_INIT, error: String(err && err.message || err) };
  }
}

function checkOrtDmlImport() {
  const code = [
    "import sys",
    `sys.path.insert(0, r"${ORT_DML_ROOT}")`,
    "try:",
    "    import onnxruntime",
    "    provs = onnxruntime.get_available_providers()",
    "    ok = any('Dml' in p or 'DML' in p for p in provs)",
    "    print('OK' if ok else 'NODML', ';'.join(provs), getattr(onnxruntime, '__version__', '?'))",
    "except Exception as e:",
    "    print('ERR', type(e).__name__, str(e))",
  ].join("\n");

  const result = spawnSync("python", ["-c", code], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const ok = stdout.startsWith("OK ");

  return {
    ok,
    stdout,
    stderr,
    exit_code: result.status,
    spawn_error: result.error ? String(result.error.message || result.error) : null,
  };
}

function checkNvidiaSmi() {
  const result = spawnSync("nvidia-smi", ["--query-gpu=name,driver_version", "--format=csv,noheader"], {
    encoding: "utf8",
    timeout: 8000,
    windowsHide: true,
  });
  const stdout = (result.stdout || "").trim();
  const ok = result.status === 0 && stdout.length > 0;
  return {
    ok,
    stdout,
    stderr: (result.stderr || "").trim(),
    exit_code: result.status,
    spawn_error: result.error ? String(result.error.message || result.error) : null,
  };
}

function probeGpuPath() {
  const ort_disk = checkOrtDmlOnDisk();
  const ort_import = checkOrtDmlImport();
  const nvsmi = checkNvidiaSmi();

  const ready = ort_disk.ok && ort_import.ok && nvsmi.ok;

  return {
    schema: "hyperbehcs.gpu_probe_enhanced.v1",
    ready,
    checks: {
      ort_dml_on_disk: ort_disk,
      ort_dml_import: ort_import,
      nvidia_smi: nvsmi,
    },
    probed_at: new Date().toISOString(),
  };
}

module.exports = { probeGpuPath, checkOrtDmlOnDisk, checkOrtDmlImport, checkNvidiaSmi };

// CLI / selftest mode
if (require.main === module) {
  const packet = probeGpuPath();
  process.stdout.write(JSON.stringify(packet, null, 2) + "\n");
  process.exit(packet.ready ? 0 : 1);
}
