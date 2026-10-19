#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");

const PATHS = {
  pilotDir: path.join(ROOT, "data", "behcs", "omnicoder"),
  state: path.join(ROOT, "data", "behcs", "omnicoder", "pilot-state.json"),
  receipts: path.join(ROOT, "data", "behcs", "omnicoder", "pilot-receipts.ndjson"),
  tasklist: path.join(ROOT, "data", "behcs", "fabric-revolver", "tasklist-latest.ndjson"),
  dashboard: path.join(ROOT, "data", "behcs", "dashboard-feeds", "omnicoder-pilot-latest.json"),
  report: path.join(ROOT, "reports", "omnicoder-pilot-latest.md")
};

const MODELS = [
  "opencode/deepseek-v4-flash-free",
  "opencode/big-pickle",
  "opencode/hy3-preview-free",
  "opencode/ling-2.6-flash-free",
  "opencode/minimax-m2.5-free",
  "opencode/nemotron-3-super-free"
];

function parseArgs(argv) {
  const flags = {
    once: false,
    cycle: false,
    execute: false,
    port: Number(process.env.OMNICODER_PORT || 8789),
    serial: process.env.FALCON_SERIAL || "${BEHCS_DEVICE_SERIAL}",
    intervalMs: Number(process.env.OMNICODER_PILOT_INTERVAL_MS || 15000),
    maxPackets: Number(process.env.OMNICODER_PILOT_MAX_PACKETS || 24)
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--once") flags.once = true;
    else if (arg === "--cycle") flags.cycle = true;
    else if (arg === "--execute") flags.execute = true;
    else if (arg === "--port" && next) { flags.port = Number(next) || flags.port; i += 1; }
    else if (arg === "--serial" && next) { flags.serial = next; i += 1; }
    else if (arg === "--interval-ms" && next) { flags.intervalMs = Number(next) || flags.intervalMs; i += 1; }
    else if (arg === "--max-packets" && next) { flags.maxPackets = Number(next) || flags.maxPackets; i += 1; }
  }
  return flags;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sha16(value) {
  return sha(value).slice(0, 16);
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return fallback; }
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function httpJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
  });
}

function adbShell(serial, command) {
  return execFileSync("adb", ["-s", serial, "shell", command], {
    encoding: "utf8",
    maxBuffer: 2_000_000,
    windowsHide: true
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function readFalconPacket(serial, name) {
  const full = `${ANDROID_ASOLARIA_ROOT}/omnicoder/packets/${name}`;
  const text = adbShell(serial, `cat ${shellQuote(full)}`);
  return JSON.parse(text);
}

function brownHilbertRange(seed) {
  const n = BigInt(`0x${sha(seed).slice(0, 14)}`);
  const start = Number(n % 100_000_000_000n);
  const width = 8192;
  return { start, end: start + width - 1, count: width };
}

function taskFromPacket(packet, fileName, index) {
  const body = packet.body || {};
  const seed = `${packet.id || fileName}:${packet.ts || ""}:${body.title || ""}`;
  const proof = sha16(seed);
  return {
    id: `omnicoder-${String(index).padStart(4, "0")}-${proof}`,
    ts: new Date().toISOString(),
    status: "queue_ready",
    priority: "operator_visual",
    shellless: true,
    fabric: "BEHCS-1024",
    active_slot: index % 8,
    revolver_chamber: index % 8,
    lane: `omnicoder_${String(body.lane || "white_room").replace(/[^a-zA-Z0-9_:-]+/g, "_")}`,
    model_hint: MODELS[index % MODELS.length],
    omnispindle: `omnicoder-spindle-${(index % 8) + 1}`,
    omniflywheel: `omnicoder-flywheel-${(index % 4) + 1}`,
    objective_id: "omnicoder_white_room_packet",
    objective: body.objective || body.title || "Route OMNICODER packet through white-room review.",
    surface_id: "falcon.omnicoder.8789",
    surface_node: "falcon",
    surface_layer: "visual_coder_frontend",
    surface_kind: "omnicoder_white_room_packet",
    logical_node_range: brownHilbertRange(seed),
    materialization: "range_packet_not_process_per_node",
    source_packet: {
      file: fileName,
      packet_id: packet.id || null,
      title: body.title || null,
      pilot: body.pilot || null,
      command: body.command || null
    },
    route: ["hookwall", "forward_gnn", "reverse_gain_gnn", "omnishannon", "omniwhite_room", "gc"],
    gates: [
      "Falcon OMNICODER packet present",
      "white-room packet only",
      "backend execution routed by Acer/Liris",
      "no Android-native Codex claim",
      "append-only receipt"
    ],
    gulp: {
      gulp_2000_bucket: index % 2000,
      super_gulp_5000_bucket: index % 5000
    },
    proof_sha16: proof
  };
}

function taskExists(taskId, existingTasks) {
  return existingTasks.some((task) => task.id === taskId);
}

function loadState() {
  return readJson(PATHS.state, {
    ok: true,
    service: "omnicoder-pilot-daemon",
    processed_files: [],
    counters: { observed: 0, routed: 0, skipped: 0, cycles: 0 },
    updated_at: null,
    last_error: null
  });
}

function writeReport(state, latestStatus) {
  const lines = [
    "# OMNICODER Pilot Daemon",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Role",
    "",
    "One Acer-side watcher reads Falcon OMNICODER packets and routes them into bounded Brown-Hilbert revolver rooms.",
    "",
    "## Runtime",
    "",
    `- Processed files: ${state.processed_files.length}`,
    `- Observed: ${state.counters.observed}`,
    `- Routed: ${state.counters.routed}`,
    `- Skipped: ${state.counters.skipped}`,
    `- Cycles: ${state.counters.cycles}`,
    `- Falcon packets: ${latestStatus?.packets?.count ?? "unknown"}`,
    `- Falcon white rooms: ${latestStatus?.white_room?.count ?? "unknown"}`,
    "",
    "## Architecture",
    "",
    "- Falcon is the visual coder and packet source.",
    "- Acer/Liris are the backend execution surfaces.",
    "- One watcher handles packet intake.",
    "- Bounded revolver chambers handle parallel work.",
    "- Free models are used only through explicit revolver execution."
  ];
  ensureDir(PATHS.report);
  fs.writeFileSync(PATHS.report, `${lines.join("\n")}\n`, "utf8");
}

function runRevolver(flags) {
  const args = ["tools/behcs/fabric-revolver.mjs", "cycle", "--max-claims", "8"];
  if (flags.execute) args.push("--execute", "--timeout-ms", "45000");
  const result = spawnSync("node", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: flags.execute ? 120000 : 30000,
    windowsHide: true,
    shell: false
  });
  return {
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message || result.error) : null,
    stdout: String(result.stdout || "").slice(0, 4000),
    stderr: String(result.stderr || "").slice(0, 4000)
  };
}

async function scanOnce(flags) {
  const state = loadState();
  let latestStatus = null;
  try {
    latestStatus = await httpJson(`http://127.0.0.1:${flags.port}/api/status`);
    const latest = (latestStatus?.packets?.latest || []).slice(0, flags.maxPackets);
    const existingTasks = readNdjson(PATHS.tasklist);
    const processed = new Set(state.processed_files || []);
    const routed = [];
    state.counters.observed += latest.length;
    for (const row of latest.reverse()) {
      if (!row.name || processed.has(row.name)) {
        state.counters.skipped += 1;
        continue;
      }
      const packet = readFalconPacket(flags.serial, row.name);
      const task = taskFromPacket(packet, row.name, existingTasks.length + routed.length);
      if (!taskExists(task.id, existingTasks) && !taskExists(task.id, routed)) {
        appendNdjson(PATHS.tasklist, task);
        routed.push(task);
        state.counters.routed += 1;
        appendNdjson(PATHS.receipts, {
          id: `omnicoder-route-${task.proof_sha16}`,
          ts: new Date().toISOString(),
          event: "route_packet_to_revolver",
          packet_file: row.name,
          packet_id: packet.id || null,
          task_id: task.id,
          model_hint: task.model_hint,
          logical_node_range: task.logical_node_range
        });
      }
      processed.add(row.name);
    }
    state.processed_files = Array.from(processed).slice(-1000);
    let cycle = null;
    if (flags.cycle && routed.length) {
      cycle = runRevolver(flags);
      state.counters.cycles += 1;
      appendNdjson(PATHS.receipts, {
        id: `omnicoder-cycle-${sha16(`${Date.now()}:${routed.length}`)}`,
        ts: new Date().toISOString(),
        event: flags.execute ? "cycle_execute" : "cycle_dry",
        routed_count: routed.length,
        result: cycle
      });
    }
    state.updated_at = new Date().toISOString();
    state.last_error = null;
    writeJson(PATHS.state, state);
    writeJson(PATHS.dashboard, {
      ...state,
      falcon_status: latestStatus,
      latest_routed: routed.map((task) => ({
        id: task.id,
        packet_file: task.source_packet.file,
        model_hint: task.model_hint,
        logical_node_range: task.logical_node_range
      }))
    });
    writeReport(state, latestStatus);
    return { ok: true, routed_count: routed.length, routed: routed.map((task) => task.id), cycle, state };
  } catch (err) {
    state.updated_at = new Date().toISOString();
    state.last_error = String(err?.message || err);
    writeJson(PATHS.state, state);
    throw err;
  }
}

async function main() {
  const flags = parseArgs(process.argv);
  fs.mkdirSync(PATHS.pilotDir, { recursive: true });
  if (flags.once) {
    const out = await scanOnce(flags);
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`[omnicoder-pilot] watching Falcon OMNICODER on :${flags.port} every ${flags.intervalMs}ms`);
  while (true) {
    try {
      const out = await scanOnce(flags);
      console.log(JSON.stringify({ ts: new Date().toISOString(), routed_count: out.routed_count, cycle: Boolean(out.cycle) }));
    } catch (err) {
      console.error(`[omnicoder-pilot] ${String(err?.message || err)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, flags.intervalMs));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
