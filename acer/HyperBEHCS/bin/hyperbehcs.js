#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const core = require("../lib/hyperbehcs-core.cjs");
const targets = require("../lib/hyperbehcs-targets.cjs");
const fileIndex = require("../lib/hyperbehcs-file-index.cjs");
const substrate = require("../lib/hyperbehcs-substrate.cjs");

const ROOT = path.resolve(__dirname, "..");
const REPORTS = path.join(ROOT, "reports");

function ensureReports() {
  fs.mkdirSync(REPORTS, { recursive: true });
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

function readInput(args) {
  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0 && args[fileIndex + 1]) return fs.readFileSync(args[fileIndex + 1], "utf8").replace(/^\uFEFF/, "");
  const textIndex = args.indexOf("--text");
  if (textIndex >= 0 && args[textIndex + 1]) return args[textIndex + 1];
  const stdin = readStdin();
  return stdin.trim() ? stdin : "";
}

function parseInput(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function intArg(args, name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) {
    const value = Number(args[index + 1]);
    if (Number.isFinite(value)) return Math.round(value);
  }
  return fallback;
}

function boolArg(args, name) {
  return args.includes(name);
}

function stringArg(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1];
  return fallback;
}

function safeReportPath(fileName) {
  ensureReports();
  return path.join(REPORTS, path.basename(fileName));
}

function writeJson(value, fileName) {
  const reportPath = safeReportPath(fileName);
  fs.writeFileSync(reportPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return reportPath;
}

function writeBinary(value, fileName) {
  const reportPath = safeReportPath(fileName);
  fs.writeFileSync(reportPath, value);
  return reportPath;
}

function gpuProbe() {
  let controllers = [];
  const inventoryPath = path.join(REPORTS, "gpu-inventory.json");
  try {
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    controllers = Array.isArray(inventory.controllers) ? inventory.controllers : [];
  } catch {
    controllers = [];
  }
  let nvidiaSmiAvailable = false;
  try {
    childProcess.execFileSync("nvidia-smi", ["--help"], { stdio: "ignore", timeout: 5000 });
    nvidiaSmiAvailable = true;
  } catch {
    nvidiaSmiAvailable = false;
  }
  const packet = {
    schema: "hyperbehcs.local_gpu_probe.v1",
    runtime: ROOT,
    inventory_path: inventoryPath,
    controllers,
    nvidia_smi_available: nvidiaSmiAvailable,
    gpu_quant_kernel_executed: false,
    gpu_acceleration_claimed: false,
    next_gate: "install_or_bind_real_directml_cuda_webgpu_backend_then_execute_kernel_benchmark",
    ...core.ZERO_COUNTERS,
    gpu_kernel_launches: 0
  };
  return { ...packet, fingerprint: core.sha16(packet) };
}

function status() {
  const cpus = os.cpus();
  return {
    ok: true,
    schema: "hyperbehcs.local_runtime.status.v1",
    runtime_root: ROOT,
    cli: path.join(ROOT, "bin", "hyperbehcs.cmd"),
    node: process.execPath,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu_model: cpus[0]?.model || "unknown",
    cpu_threads: cpus.length,
    total_memory_bytes: os.totalmem(),
    normal_computer_scope: "available_as_local_cli_for_any_program_that_calls_it",
    not_transparent_for_unmodified_programs: true,
    cpu_path_ready: true,
    gpu_path_ready: false,
    ...core.ZERO_COUNTERS
  };
}

function usage() {
  return {
    ok: true,
    commands: {
      status: "Print local runtime status.",
      quantize: "Read JSON vector/text from stdin or --file and emit a Triple Quant fast packet.",
      bench: "Run local CPU packet benchmark. Options: --file path --iterations 250 --dimension 1536.",
      "hybrid-pack": "Build a hybrid binary envelope plus JSON receipt. Options: --file path --text text --dimension 1536 --bits 8 --target-dimension n.",
      "hybrid-bench": "Benchmark raw JSON, fast JSON, and hybrid binary envelope. Options: --file path --text text --iterations 250 --dimension 1536 --bits 8.",
      "substrate-status": "Print central HyperBEHCS substrate store status.",
      "substrate-pack": "Build one universal substrate envelope with PID/Hilbert/quant/hookwall/cube/GNN receipt.",
      "substrate-commit": "Append one substrate envelope to the central binary store. No sidecar fanout.",
      "gpu-probe": "Detect GPU controllers; does not claim acceleration until a real kernel runs.",
      targets: "Report Acer/C/D/USB/LIRIS/FALCON/AETHER local deployment targets.",
      "file-index": "Safely ingest a file or bounded directory into HyperBEHCS fast packets."
    },
    examples: [
      "echo [1,2,3,4,5,6] | C:\\HyperBEHCS\\bin\\hyperbehcs.cmd quantize",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd bench --text \"hello world\" --iterations 250",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd hybrid-pack --text \"hello world\" --dimension 1536",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd hybrid-bench --text \"hello world\" --iterations 250",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd substrate-pack --text \"agent memory event\" --dimension 768",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd substrate-commit --text \"agent memory event\" --dimension 768",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd gpu-probe",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd targets",
      "C:\\HyperBEHCS\\bin\\hyperbehcs.cmd file-index --target C:\\HyperBEHCS --max-files 25"
    ]
  };
}

async function main() {
  const [commandRaw, ...args] = process.argv.slice(2);
  const command = String(commandRaw || "help").toLowerCase();
  if (command === "status") {
    console.log(JSON.stringify(status(), null, 2));
    return;
  }
  if (command === "gpu-probe") {
    const packet = gpuProbe();
    const reportPath = writeJson(packet, "gpu-probe-latest.json");
    console.log(JSON.stringify({ ...packet, report_path: reportPath }, null, 2));
    return;
  }
  if (command === "targets") {
    const { report, reportPath } = targets.writeTargetReport();
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2));
    return;
  }
  if (command === "file-index") {
    const result = fileIndex.ingestPath({
      target: stringArg(args, "--target"),
      maxFiles: intArg(args, "--max-files", fileIndex.DEFAULTS.maxFiles),
      maxBytes: intArg(args, "--max-bytes", fileIndex.DEFAULTS.maxBytes),
      dimension: intArg(args, "--dimension", fileIndex.DEFAULTS.dimension),
      sidecar: boolArg(args, "--sidecar"),
      includeBinary: boolArg(args, "--include-binary")
    });
    console.log(JSON.stringify({
      ok: true,
      schema: "hyperbehcs.file_index_cli_summary.v1",
      target: result.report.target,
      report_path: result.report_path,
      files_indexed: result.report.summary.files_indexed,
      skipped: result.report.summary.skipped,
      total_bytes_read: result.report.summary.total_bytes_read,
      total_packet_bytes: result.report.summary.total_packet_bytes,
      size_reduction_percent: result.report.summary.size_reduction_percent,
      fingerprint: result.report.fingerprint
    }, null, 2));
    return;
  }
  if (command === "substrate-status") {
    console.log(JSON.stringify(substrate.storeStatus(), null, 2));
    return;
  } else if (command === "substrate-list") {
    // Walks the binary substrate file frame-by-frame and emits a summary of each.
    // Magic HBS1 (4 bytes) + frames: each frame = 4-byte LE length + payload bytes.
    const storePath = "C:/HyperBEHCS/store/hyperbehcs-substrate.v1.hbs";
    const buf = fs.readFileSync(storePath);
    const magic = buf.slice(0, 4).toString("utf8");
    const frames = [];
    let off = 4;
    while (off + 4 <= buf.length) {
      const len = buf.readUInt32LE(off);
      off += 4;
      if (off + len > buf.length) break;
      const payloadBuf = buf.slice(off, off + len);
      off += len;
      let appendedAt = null, receiptSha16 = null, pid = null, room = null, hilbertIdx = null, testKind = null;
      try {
        const obj = JSON.parse(payloadBuf.toString("utf8"));
        appendedAt = obj.appended_at || null;
        if (obj.receipt) {
          receiptSha16 = obj.receipt.payload_sha16 || null;
          pid = obj.receipt.pid || null;
          room = obj.receipt.room_id || null;
          hilbertIdx = (obj.receipt.hilbert && obj.receipt.hilbert.index) || null;
          testKind = obj.test_kind || obj.receipt.test_kind || null;
        }
      } catch (e) {}
      frames.push({ idx: frames.length, bytes: len, appended_at: appendedAt, payload_sha16: receiptSha16, pid, room_id: room, hilbert_index: hilbertIdx, test_kind: testKind });
    }
    console.log(JSON.stringify({ ok: true, schema: "hyperbehcs.substrate_list.v1", store_path: storePath, magic, magic_valid: magic === "HBS1", store_size_bytes: buf.length, frame_count: frames.length, frames }, null, 2));
    return;
  }
  if (command === "substrate-pack" || command === "substrate-commit") {
    const testKind = args.includes("--test");
    const input = parseInput(readInput(args));
    const packet = substrate.buildSubstratePacket(input, {
      dimension: intArg(args, "--dimension", 768),
      bits: intArg(args, "--bits", 8),
      targetDimension: intArg(args, "--target-dimension", 0) || undefined,
      seed: stringArg(args, "--seed", "hyperbehcs-substrate"),
      commit: command === "substrate-commit"
    });
    const result = command === "substrate-commit" ? substrate.appendSubstratePacket(packet) : null;
    console.log(JSON.stringify({
      ok: true,
      schema: command === "substrate-commit" ? "hyperbehcs.substrate_commit_cli.v1" : "hyperbehcs.substrate_pack_cli.v1",
      test_kind: testKind,
      receipt: packet.receipt,
      append_result: result
    }, null, 2));
    return;
  }
  if (command === "hybrid-pack") {
    const input = parseInput(readInput(args));
    const packet = core.buildHybridPacket(input, {
      dimension: intArg(args, "--dimension", 1536),
      bits: intArg(args, "--bits", 8),
      targetDimension: intArg(args, "--target-dimension", 0) || undefined,
      seed: stringArg(args, "--seed", "hyperbehcs-hybrid-local")
    });
    const envelopePath = writeBinary(packet.envelope, "hybrid-packet-latest.hbp");
    const receiptPath = writeJson(packet.receipt, "hybrid-packet-latest.hbp.json");
    console.log(JSON.stringify({
      ok: true,
      schema: "hyperbehcs.local_hybrid_pack_cli.v1",
      envelope_path: envelopePath,
      receipt_path: receiptPath,
      envelope_bytes: packet.envelope_bytes,
      receipt: packet.receipt
    }, null, 2));
    return;
  }
  if (command === "hybrid-bench") {
    const input = parseInput(readInput(args));
    const packet = core.hybridBenchmark(input, {
      iterations: intArg(args, "--iterations", 250),
      dimension: intArg(args, "--dimension", 1536),
      bits: intArg(args, "--bits", 8),
      targetDimension: intArg(args, "--target-dimension", 0) || undefined,
      seed: stringArg(args, "--seed", "hyperbehcs-hybrid-local")
    });
    const reportPath = writeJson(packet, "hybrid-benchmark-latest.json");
    console.log(JSON.stringify({ ...packet, report_path: reportPath }, null, 2));
    return;
  }
  if (command === "quantize") {
    const input = parseInput(readInput(args));
    const packet = core.buildFastPacket(input, {
      bits: intArg(args, "--bits", 8)
    });
    const reportPath = writeJson(packet, "fast-packet-latest.json");
    console.log(JSON.stringify({ ...packet, report_path: reportPath }, null, 2));
    return;
  }
  if (command === "bench") {
    const input = parseInput(readInput(args));
    const packet = core.benchmark(input, {
      iterations: intArg(args, "--iterations", 250),
      dimension: intArg(args, "--dimension", 1536),
      bits: intArg(args, "--bits", 8)
    });
    const reportPath = writeJson(packet, "cpu-benchmark-latest.json");
    console.log(JSON.stringify({ ...packet, report_path: reportPath }, null, 2));
    return;
  }
  if (command === "install") {
    // HyperBEHCS-native install dispatcher · spec: C:/HyperBEHCS/store/install-wrapper-spec-2026-05-17.hbp
    // Usage: hyperbehcs install <dep> [--version V] [--mode dry-run|execute] [--witness <op>]
    const dep = args[0];
    if (!dep) {
      console.log(JSON.stringify({ ok: false, error: "missing dep_name", usage: "hyperbehcs install <dep> [--version V] [--mode dry-run|execute] [--witness <op>]" }));
      process.exit(2);
    }
    const mode = (args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "dry-run");
    const version = (args.includes("--version") ? args[args.indexOf("--version") + 1] : "latest");
    const witness = (args.includes("--witness") ? args[args.indexOf("--witness") + 1] : "");
    const planPath = `C:/HyperBEHCS/store/install-plan-${dep}-2026-05-17.ps1`;
    const planExists = fs.existsSync(planPath);
    console.log(JSON.stringify({
      ok: true,
      schema: "hyperbehcs.install.dispatch.v1",
      dep, version, mode, witness: witness || null,
      plan_path: planPath,
      plan_exists: planExists,
      target_dir: `C:/HyperBEHCS/runtime/${dep}`,
      next_step: planExists
        ? `powershell -NoProfile -File "${planPath}" -Mode ${mode}${mode === "execute" ? " -OperatorWitness " + (witness || "REQUIRED") : ""}`
        : `write_install_plan_first_at_${planPath}`,
      canon_spec: "C:/HyperBEHCS/store/install-wrapper-spec-2026-05-17.hbp",
      bloat_guard: "controlled_target_dir_per_dep_no_system_wide_install"
    }, null, 2));
    return;
  }
  if (command === "install-plan") {
    const action = args[0]; const dep = args[1];
    if (action !== "write" || !dep) {
      console.log(JSON.stringify({ ok: false, error: "usage: hyperbehcs install-plan write <dep> [--pip-package PKG]" }));
      process.exit(2);
    }
    const pipPkg = (args.includes("--pip-package") ? args[args.indexOf("--pip-package") + 1] : dep);
    const planPath = `C:/HyperBEHCS/store/install-plan-${dep}-2026-05-17.ps1`;
    const tpl = fs.readFileSync("C:/HyperBEHCS/store/install-plan-onnxruntime-directml-2026-05-17.ps1", "utf8");
    const out = tpl.replace(/onnxruntime-directml/g, dep).replace(/onnxruntime\.__version__/g, `${pipPkg.replace(/-/g, "_")}.__version__`);
    fs.writeFileSync(planPath, out);
    console.log(JSON.stringify({ ok: true, schema: "hyperbehcs.install_plan_write.v1", dep, pip_package: pipPkg, plan_path: planPath, bytes: out.length }, null, 2));
    return;
  }
  if (command === "gpu-kernel-bench") {
    // Stub · spec: C:/HyperBEHCS/store/install-pattern-hyperbehcs-asolaria-os-2026-05-17.hbp
    // Usage: hyperbehcs gpu-kernel-bench [--backend directml|cuda|cpu] [--iterations N] [--dimension D]
    const backend = (args.includes("--backend") ? args[args.indexOf("--backend") + 1] : "directml");
    const backendNormalized = backend === "dml" ? "directml" : backend;
    const __gpuBackendWhitelist = ["directml", "cuda", "cpu"];
    if (!__gpuBackendWhitelist.includes(backendNormalized)) {
      console.log(JSON.stringify({ ok: false, error: "invalid_backend", accepted: __gpuBackendWhitelist, provided: backend }, null, 2));
      process.exit(2);
    }
    const iterations = parseInt((args.includes("--iterations") ? args[args.indexOf("--iterations") + 1] : "10"), 10);
    const dimension = parseInt((args.includes("--dimension") ? args[args.indexOf("--dimension") + 1] : "768"), 10);
    const runtimeDir = `C:/HyperBEHCS/runtime/onnxruntime-${backendNormalized}`;
    const installed = fs.existsSync(runtimeDir);
    console.log(JSON.stringify({
      ok: true,
      schema: "hyperbehcs.gpu_kernel_bench.stub.v1",
      backend: backendNormalized, iterations, dimension,
      runtime_dir: runtimeDir,
      runtime_installed: installed,
      next_step: installed
        ? "implement_real_kernel_launch_via_onnxruntime_then_emit_hbp_packet_to_reports"
        : `hyperbehcs install onnxruntime-${backendNormalized} --mode execute --witness <op>`,
      canon: "C:/HyperBEHCS/store/install-pattern-hyperbehcs-asolaria-os-2026-05-17.hbp",
      note: "stub: returns HBP-prepared metadata; real kernel launch deferred until onnxruntime is installed in controlled dir"
    }, null, 2));
    return;
  }
  console.log(JSON.stringify(usage(), null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.stack || error) }, null, 2));
  process.exitCode = 1;
});
