"use strict";

const fs = require("node:fs");
const path = require("node:path");

function resolveInstanceRoot() {
  return path.resolve(__dirname, "..", "..");
}

function getPaths(root = resolveInstanceRoot()) {
  const behcsDir = path.join(root, "data", "behcs");
  return {
    root,
    behcsDir,
    inboxPath: path.join(behcsDir, "inbox.ndjson"),
    gnnReportPath: path.join(behcsDir, "gnn-active-report.json"),
    supervisorStatePath: path.join(root, "logs", "system-supervisor.state.json"),
    outputPath: path.join(behcsDir, "resource-budget-snapshot.json"),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function isFresh(timestamp, maxAgeMs = 180000) {
  const epoch = new Date(timestamp || 0).getTime();
  if (!epoch) return false;
  return Date.now() - epoch <= maxAgeMs;
}

function normalizeDeviceId(raw) {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return "unknown";
  if (text.includes("acer") || text.includes("asolaria")) return "acer";
  if (text.includes("liris")) return "liris";
  if (text.includes("falcon")) return "falcon";
  if (text.includes("felipe") || text.includes("aether")) return "felipe";
  return text.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function inferKind(deviceId) {
  if (deviceId === "acer") return "desktop";
  if (deviceId === "liris") return "peer";
  if (deviceId === "falcon" || deviceId === "felipe" || deviceId.includes("phone")) return "phone";
  return "device";
}

function inferTransport(message = {}) {
  const from = String(message.from || "").toLowerCase();
  if (from.includes("liris")) return "ethernet";
  if (from.includes("falcon") || from.includes("aether") || from.includes("felipe")) return "adb-reverse";
  if (from.includes("acer") || from.includes("asolaria")) return "local";
  return "unknown";
}

function normalizeProcessFamily(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "pwsh" || normalized === "powershell") return "powershell";
  if (normalized === "node") return "node";
  if (normalized === "cmd") return "cmd";
  if (normalized === "chrome") return "chrome";
  if (normalized === "mongod") return "mongod";
  if (normalized === "adb") return "adb";
  if (normalized === "python" || normalized === "pythonw") return "python";
  if (normalized === "cloudflared") return "cloudflared";
  if (normalized === "slack") return "slack";
  if (normalized === "explorer") return "explorer";
  if (normalized === "docker desktop" || normalized.startsWith("com.docker.")) return "docker";
  if (normalized === "codex") return "codex";
  return normalized;
}

function parseTopProcessSummary(value) {
  return String(value || "")
    .split(/\s*,\s*/)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.+?)#(\d+)\(([\d.]+)MB\)$/i);
      const name = match ? String(match[1] || "").trim() : item;
      return {
        name,
        pid: match ? toNumber(match[2]) : null,
        workingSetMb: match ? toNumber(match[3]) : null,
        privateMemoryMb: null,
        cpuSeconds: null,
        family: normalizeProcessFamily(name),
      };
    });
}

function normalizeTopProcessRows(value, fallbackSummary = "") {
  const source = Array.isArray(value) ? value : [];
  if (source.length > 0) {
    return source
      .map((row) => {
        const name = String(row.name || row.ProcessName || "").trim();
        return {
          name,
          pid: toNumber(row.pid ?? row.Id ?? row.ProcessId),
          workingSetMb: toNumber(row.workingSetMb ?? row.wsMb ?? row.WSMb),
          privateMemoryMb: toNumber(row.privateMemoryMb ?? row.pmMb ?? row.PMMb),
          cpuSeconds: toNumber(row.cpuSeconds ?? row.CPU),
          family: normalizeProcessFamily(name),
        };
      })
      .filter((row) => row.name)
      .slice(0, 12);
  }
  return parseTopProcessSummary(fallbackSummary).slice(0, 12);
}

function normalizeRuntimeProcessCounts(value, topProcessRows = []) {
  const families = [
    "codex",
    "node",
    "powershell",
    "cmd",
    "chrome",
    "mongod",
    "adb",
    "python",
    "cloudflared",
    "slack",
    "explorer",
    "docker",
    "other",
  ];
  const counts = {};
  for (const family of families) {
    counts[family] = 0;
  }

  const source = value && typeof value === "object" ? value : {};
  const hasExplicitCounts = Object.keys(source).length > 0;
  if (hasExplicitCounts) {
    for (const [key, raw] of Object.entries(source)) {
      const family = families.includes(String(key)) ? String(key) : "other";
      counts[family] += Number(raw || 0);
    }
    return {
      coverage: "full_named_families",
      counts,
    };
  }

  for (const row of Array.isArray(topProcessRows) ? topProcessRows : []) {
    const family = families.includes(row.family) ? row.family : "other";
    counts[family] += 1;
  }
  return {
    coverage: topProcessRows.length > 0 ? "top_rows_only" : "none",
    counts,
  };
}

function parseMeminfoLines(lines) {
  if (!Array.isArray(lines)) return {};
  const values = {};
  for (const rawLine of lines) {
    const match = String(rawLine || "").match(/^([^:]+):\s*([0-9.]+)\s*([A-Za-z]+)?/);
    if (!match) continue;
    values[match[1].trim().toLowerCase()] = Number(match[2]);
  }
  const totalKb = toNumber(values.memtotal);
  const freeKb = toNumber(values.memavailable ?? values.memfree);
  if (totalKb === null || freeKb === null || totalKb <= 0) return {};
  return {
    ramTotalMb: round(totalKb / 1024, 1),
    ramFreeMb: round(freeKb / 1024, 1),
    ramUsedPct: round((1 - (freeKb / totalKb)) * 100, 1),
  };
}

function classifyPressure(score) {
  if (!Number.isFinite(score)) {
    return { score: null, level: "unknown" };
  }
  const safeScore = round(clamp(score, 0, 100), 1);
  if (safeScore >= 90) return { score: safeScore, level: "critical" };
  if (safeScore >= 75) return { score: safeScore, level: "high" };
  if (safeScore >= 45) return { score: safeScore, level: "medium" };
  return { score: safeScore, level: "low" };
}

function extractRamState(payload = {}) {
  if (payload.ram && typeof payload.ram === "object") {
    const totalGb = toNumber(payload.ram.total_gb ?? payload.ram.totalGB);
    const freeGb = toNumber(payload.ram.free_gb ?? payload.ram.freeGB);
    const totalMb = totalGb !== null ? round(totalGb * 1024, 1) : toNumber(payload.ram.total_mb ?? payload.ram.totalMb);
    const freeMb = freeGb !== null ? round(freeGb * 1024, 1) : toNumber(payload.ram.free_mb ?? payload.ram.freeMb);
    let usedPct = toNumber(payload.ram.used_pct ?? payload.ram.usedPct);
    if (usedPct === null && totalMb !== null && freeMb !== null && totalMb > 0) {
      usedPct = round((1 - (freeMb / totalMb)) * 100, 1);
    }
    return { ramTotalMb: totalMb, ramFreeMb: freeMb, ramUsedPct: usedPct };
  }
  if (payload.hw && typeof payload.hw === "object") {
    return parseMeminfoLines(payload.hw.ram);
  }
  return {};
}

function extractCpuState(payload = {}) {
  const cpu = payload.cpu && typeof payload.cpu === "object" ? payload.cpu : payload.hw && typeof payload.hw === "object" ? payload.hw : {};
  const cpuCores = toNumber(cpu.cores ?? cpu.cores_logical);
  const cpuSpeedMhz = toNumber(cpu.speed_mhz ?? cpu.speed);
  let cpuPct = toNumber(cpu.util_pct ?? cpu.cpu_pct ?? cpu.usage_pct);
  const loadArray = Array.isArray(cpu.load)
    ? cpu.load.map((value) => toNumber(value)).filter((value) => value !== null)
    : [];
  const cpuLoad1 = loadArray.length > 0 ? loadArray[0] : toNumber(cpu.load_1 ?? cpu.load1);
  if (cpuPct === null && cpuLoad1 !== null && cpuCores !== null && cpuCores > 0 && cpuLoad1 <= cpuCores * 2) {
    cpuPct = round((cpuLoad1 / cpuCores) * 100, 1);
  }
  return { cpuCores, cpuSpeedMhz, cpuPct, cpuLoad1 };
}

function extractGpuState(payload = {}) {
  if (!payload.gpu || typeof payload.gpu !== "object") return {};
  const gpu = payload.gpu;
  return {
    gpuPresent: Boolean(
      gpu.model
      || gpu.mem_total_mb
      || gpu.mem_total_mib
      || gpu.util_pct
      || gpu.gpu_util_pct
      || gpu.temp_c
      || gpu.temperature_c
    ),
    gpuModel: String(gpu.model || "").trim() || null,
    gpuUtilPct: toNumber(gpu.util_pct ?? gpu.gpu_util_pct ?? gpu.utilization_pct),
    gpuTempC: toNumber(gpu.temp_c ?? gpu.temperature_c ?? gpu.temp),
    gpuMemUsedMb: toNumber(gpu.mem_used_mb ?? gpu.mem_used_mib ?? gpu.memUsed),
    gpuMemTotalMb: toNumber(gpu.mem_total_mb ?? gpu.mem_total_mib ?? gpu.memTotal),
  };
}

function buildSupervisorRecord(supervisorState = {}) {
  const snapshot = supervisorState.latestSnapshot || {};
  const cpuPct = toNumber(snapshot.cpuPct);
  const ramUsedPct = toNumber(snapshot.memoryUsedPct);
  const gpuUtilPct = toNumber(snapshot.gpuPct);
  const totalGb = toNumber(snapshot.totalGB);
  const freeGb = toNumber(snapshot.freeGB);
  const topProcesses = String(snapshot.topProcesses || "").trim();
  const topProcessRows = normalizeTopProcessRows(snapshot.topProcessRows, topProcesses);
  const runtimeProcessCounts = normalizeRuntimeProcessCounts(snapshot.runtimeProcessCounts, topProcessRows);
  if (cpuPct === null && ramUsedPct === null && gpuUtilPct === null && totalGb === null) {
    return null;
  }
  return {
    id: "acer",
    kind: "desktop",
    label: "acer",
    model: "acer-host",
    transport: "local",
    lastSeenAt: supervisorState.latestTickAt || supervisorState.savedAt || new Date().toISOString(),
    sourceVerb: "system_supervisor",
    sourceType: "supervisor",
    cpuPct,
    ramUsedPct,
    ramTotalMb: totalGb !== null ? round(totalGb * 1024, 1) : null,
    ramFreeMb: freeGb !== null ? round(freeGb * 1024, 1) : null,
    gpuPresent: gpuUtilPct !== null,
    gpuUtilPct,
    gpuTempC: null,
    topProcesses,
    topProcessRows,
    runtimeProcessCounts: runtimeProcessCounts.counts,
    taskManagerSource: String(snapshot.taskManagerSource || "windows_get_process"),
    taskManagerSampledAt: String(snapshot.taskManagerSampledAt || supervisorState.latestTickAt || supervisorState.savedAt || ""),
    taskManagerCoverage: runtimeProcessCounts.coverage,
    supervisorInAlert: Boolean(supervisorState.inAlert),
    watchers: { cpu: cpuPct !== null, gpu: gpuUtilPct !== null, device: true },
  };
}

function buildGnnPresenceRecord(node = {}) {
  const id = normalizeDeviceId(node.deviceId || node.name);
  if (id === "unknown") return null;
  return {
    id,
    kind: inferKind(id),
    label: id,
    model: null,
    transport: node.transport || "unknown",
    lastSeenAt: node.lastSeen || node.ts || new Date().toISOString(),
    sourceVerb: node.verb || "gnn_alive",
    sourceType: "gnn_alive",
    watchers: { cpu: false, gpu: false, device: true },
  };
}

function hasHardwareSignal(message = {}) {
  const payload = message.payload || {};
  const verb = String(payload.verb || message.type || "").toLowerCase();
  return Boolean(
    payload.cpu
    || payload.ram
    || payload.gpu
    || payload.hw
    || verb.includes("compute_pulse")
    || verb.includes("behcs.pulse")
    || verb.includes("node_boot")
  );
}

function extractRecordFromMessage(message = {}) {
  if (!hasHardwareSignal(message)) return null;
  const payload = message.payload || {};
  const cpu = extractCpuState(payload);
  const ram = extractRamState(payload);
  const gpu = extractGpuState(payload);
  const id = normalizeDeviceId(
    payload.device
    || payload.hw?.device
    || payload.hw?.name
    || message.from
  );
  const verb = String(payload.verb || message.type || "").trim() || "message";
  return {
    id,
    kind: inferKind(id),
    label: id,
    model: String(payload.cpu?.model || payload.gpu?.model || payload.hw?.name || "").trim() || null,
    transport: inferTransport(message),
    lastSeenAt: message.received_at || message.ts || new Date().toISOString(),
    sourceVerb: verb,
    sourceType: message.type || "message",
    cpuCores: cpu.cpuCores,
    cpuSpeedMhz: cpu.cpuSpeedMhz,
    cpuPct: cpu.cpuPct,
    cpuLoad1: cpu.cpuLoad1,
    ramTotalMb: ram.ramTotalMb ?? null,
    ramFreeMb: ram.ramFreeMb ?? null,
    ramUsedPct: ram.ramUsedPct ?? null,
    gpuPresent: gpu.gpuPresent ?? false,
    gpuModel: gpu.gpuModel ?? null,
    gpuUtilPct: gpu.gpuUtilPct ?? null,
    gpuTempC: gpu.gpuTempC ?? null,
    gpuMemUsedMb: gpu.gpuMemUsedMb ?? null,
    gpuMemTotalMb: gpu.gpuMemTotalMb ?? null,
    watchers: {
      cpu: Boolean(payload.cpu || payload.hw),
      gpu: Boolean(payload.gpu),
      device: Boolean(payload.hw || verb.includes("pulse") || verb.includes("boot")),
    },
  };
}

function mergeRecord(current = {}, next = {}) {
  const merged = { ...current, ...next };
  const fields = [
    "kind",
    "label",
    "model",
    "transport",
    "lastSeenAt",
    "sourceVerb",
    "sourceType",
    "cpuCores",
    "cpuSpeedMhz",
    "cpuPct",
    "cpuLoad1",
    "ramTotalMb",
    "ramFreeMb",
    "ramUsedPct",
    "gpuPresent",
    "gpuModel",
    "gpuUtilPct",
    "gpuTempC",
    "gpuMemUsedMb",
    "gpuMemTotalMb",
    "topProcesses",
    "taskManagerSource",
    "taskManagerSampledAt",
    "taskManagerCoverage",
    "supervisorInAlert",
  ];
  for (const field of fields) {
    if (next[field] === null || next[field] === undefined || next[field] === "") {
      merged[field] = current[field] ?? next[field];
    }
  }
  merged.watchers = {
    cpu: Boolean(current.watchers?.cpu || next.watchers?.cpu),
    gpu: Boolean(current.watchers?.gpu || next.watchers?.gpu),
    device: Boolean(current.watchers?.device || next.watchers?.device),
  };
  merged.topProcessRows = Array.isArray(next.topProcessRows) && next.topProcessRows.length
    ? next.topProcessRows
    : Array.isArray(current.topProcessRows) ? current.topProcessRows : [];
  merged.runtimeProcessCounts = next.runtimeProcessCounts && typeof next.runtimeProcessCounts === "object" && Object.keys(next.runtimeProcessCounts).length
    ? next.runtimeProcessCounts
    : current.runtimeProcessCounts && typeof current.runtimeProcessCounts === "object" ? current.runtimeProcessCounts : {};
  return merged;
}

function buildDeviceEntry(record = {}) {
  const metrics = [];
  if (record.cpuPct !== null) metrics.push(record.cpuPct);
  if (record.ramUsedPct !== null) metrics.push(record.ramUsedPct);
  if (record.gpuUtilPct !== null) metrics.push(record.gpuUtilPct);
  if (record.gpuTempC !== null) metrics.push(round((record.gpuTempC / 90) * 100, 1));
  if (record.supervisorInAlert) metrics.push(95);

  let pressure = metrics.length > 0
    ? classifyPressure(Math.max(...metrics.map((value) => clamp(value, 0, 100))))
    : record.watchers?.device
      ? { score: 25, level: "low" }
      : { score: null, level: "unknown" };

  if (record.kind === "phone" && pressure.level === "unknown") {
    pressure = { score: 25, level: "low" };
  }

  const readyForTasks = Boolean(
    pressure.level !== "critical"
    && !(record.kind === "desktop" && record.supervisorInAlert)
    && (record.watchers?.device || record.watchers?.cpu || record.watchers?.gpu || record.kind === "desktop")
  );

  return {
    id: record.id,
    label: record.label || record.id,
    kind: record.kind || inferKind(record.id),
    model: record.model || null,
    transport: record.transport || "unknown",
    lastSeenAt: record.lastSeenAt || "",
    fresh: isFresh(record.lastSeenAt),
    sourceVerb: record.sourceVerb || "",
    sourceType: record.sourceType || "",
    cpu: {
      cores: record.cpuCores ?? null,
      pct: record.cpuPct ?? null,
      load1: record.cpuLoad1 ?? null,
      speedMhz: record.cpuSpeedMhz ?? null,
    },
    ram: {
      totalMb: record.ramTotalMb ?? null,
      freeMb: record.ramFreeMb ?? null,
      usedPct: record.ramUsedPct ?? null,
    },
    gpu: {
      present: Boolean(record.gpuPresent),
      model: record.gpuModel ?? null,
      utilPct: record.gpuUtilPct ?? null,
      tempC: record.gpuTempC ?? null,
      memUsedMb: record.gpuMemUsedMb ?? null,
      memTotalMb: record.gpuMemTotalMb ?? null,
    },
    watchers: {
      cpu: Boolean(record.watchers?.cpu),
      gpu: Boolean(record.watchers?.gpu),
      device: Boolean(record.watchers?.device),
    },
    taskManager: {
      source: record.taskManagerSource || "",
      sampledAt: record.taskManagerSampledAt || "",
      coverage: record.taskManagerCoverage || "none",
      topProcessRows: Array.isArray(record.topProcessRows) ? record.topProcessRows.slice(0, 12) : [],
      runtimeProcessCounts: record.runtimeProcessCounts && typeof record.runtimeProcessCounts === "object"
        ? record.runtimeProcessCounts
        : {},
    },
    pressure,
    readyForTasks,
    topProcesses: record.topProcesses || "",
  };
}

function chooseHeavyLane(devices) {
  const rank = { desktop: 0, peer: 1, device: 2, phone: 3 };
  return devices
    .filter((device) => device.readyForTasks)
    .sort((left, right) => {
      const rankDelta = (rank[left.kind] ?? 9) - (rank[right.kind] ?? 9);
      if (rankDelta !== 0) return rankDelta;
      const leftScore = left.pressure.score ?? 1000;
      const rightScore = right.pressure.score ?? 1000;
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.id.localeCompare(right.id);
    })[0] || null;
}

function choosePhoneLane(devices) {
  return devices
    .filter((device) => device.readyForTasks && device.kind === "phone")
    .sort((left, right) => {
      const leftScore = left.pressure.score ?? 1000;
      const rightScore = right.pressure.score ?? 1000;
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.id.localeCompare(right.id);
    })[0] || null;
}

function choosePeerLane(devices) {
  return devices.find((device) => device.readyForTasks && device.kind === "peer")
    || devices.find((device) => device.readyForTasks && device.id === "liris")
    || null;
}

function buildSummary(devices = []) {
  const readyDevices = devices.filter((device) => device.readyForTasks);
  const constrainedDevices = devices.filter((device) => ["high", "critical"].includes(device.pressure.level));
  const pressureScores = devices.map((device) => device.pressure.score).filter((value) => value !== null);
  const maxScore = pressureScores.length > 0 ? Math.max(...pressureScores) : null;
  const heavyLane = chooseHeavyLane(devices);
  const edgeLane = choosePhoneLane(devices) || heavyLane;
  const peerLane = choosePeerLane(devices) || heavyLane;
  return {
    totalDevices: devices.length,
    readyDevices: readyDevices.length,
    constrainedDevices: constrainedDevices.length,
    watcherCoverage: {
      cpu: devices.filter((device) => device.watchers.cpu).length,
      gpu: devices.filter((device) => device.watchers.gpu).length,
      device: devices.filter((device) => device.watchers.device).length,
    },
    taskManagerLinkedDevices: devices.filter((device) => String(device.taskManager?.source || "").trim()).length,
    pressureScore: maxScore,
    pressureLevel: classifyPressure(maxScore).level,
    dispatchReady: readyDevices.length > 0 && !constrainedDevices.some((device) => device.pressure.level === "critical"),
    suggestedDispatch: {
      heavy: heavyLane ? heavyLane.id : "",
      edge: edgeLane ? edgeLane.id : "",
      peer: peerLane ? peerLane.id : "",
    },
    slots: {
      heavy: heavyLane && heavyLane.pressure.level === "low" ? 1 : 0,
      medium: readyDevices.length,
      light: readyDevices.filter((device) => device.pressure.level !== "critical").length,
    },
  };
}

function buildResourceBudgetSnapshot(options = {}) {
  const root = options.instanceRoot ? path.resolve(options.instanceRoot) : resolveInstanceRoot();
  const filePaths = getPaths(root);
  const supervisorState = readJson(filePaths.supervisorStatePath, {});
  const gnnReport = readJson(filePaths.gnnReportPath, {});
  const messages = Array.isArray(options.messages)
    ? options.messages.slice()
    : readNdjson(filePaths.inboxPath).slice(-(Math.max(32, Number(options.messageLimit) || 180)));

  if (options.latestMessage) messages.push(options.latestMessage);

  const records = new Map();
  const supervisorRecord = buildSupervisorRecord(supervisorState);
  if (supervisorRecord) {
    records.set(supervisorRecord.id, supervisorRecord);
  }

  for (const node of gnnReport.aliveNodes || []) {
    const record = buildGnnPresenceRecord(node);
    if (!record) continue;
    records.set(record.id, mergeRecord(records.get(record.id), record));
  }

  let resourceSignals = 0;
  for (const message of messages) {
    const record = extractRecordFromMessage(message);
    if (!record) continue;
    resourceSignals += 1;
    records.set(record.id, mergeRecord(records.get(record.id), record));
  }

  const devices = Array.from(records.values())
    .map((record) => buildDeviceEntry(record))
    .sort((left, right) => left.id.localeCompare(right.id));

  const snapshot = {
    ok: true,
    generatedAt: new Date().toISOString(),
    instanceRoot: root,
    sources: {
      inboxPath: filePaths.inboxPath,
      gnnReportPath: filePaths.gnnReportPath,
      supervisorStatePath: filePaths.supervisorStatePath,
    },
    observedMessages: messages.length,
    resourceSignals,
    summary: buildSummary(devices),
    devices,
  };

  const writeEnabled = options.write !== false;
  const primaryOutputPath = options.outputPath || filePaths.outputPath;
  if (writeEnabled) {
    writeJson(primaryOutputPath, snapshot);
    snapshot.outputPath = primaryOutputPath;
    if (options.outputDir) {
      const mirrorPath = path.join(options.outputDir, "resource-budget-snapshot.json");
      writeJson(mirrorPath, snapshot);
      snapshot.mirrorOutputPath = mirrorPath;
    }
  } else {
    snapshot.outputPath = primaryOutputPath;
  }

  return snapshot;
}

function readResourceBudgetSnapshot(options = {}) {
  const root = options.instanceRoot ? path.resolve(options.instanceRoot) : resolveInstanceRoot();
  const filePaths = getPaths(root);
  return readJson(options.outputPath || filePaths.outputPath, null);
}

module.exports = {
  buildResourceBudgetSnapshot,
  readResourceBudgetSnapshot,
  classifyPressure,
  normalizeDeviceId,
  parseMeminfoLines,
};
