#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function nowIso() {
  return new Date().toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTimestampForFile(date = new Date()) {
  // YYYYMMDD-HHMMSSZ
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate())
  ].join("") + "-" + [
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds())
  ].join("") + "Z";
}

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.ASOLARIA_BASE_URL || "http://127.0.0.1:4781",
    outDir: "",
    packageName: process.env.ASOLARIA_PLAY_PACKAGE || "com.jessebrown.asolaria",
    gcpProject: process.env.ASOLARIA_GCP_PROJECT || "",
    includeLocal: true,
    includePlay: true,
    includeGcp: true,
    latest: true,
    timeoutMs: 25000
  };

  const args = Array.isArray(argv) ? argv.slice(2) : [];
  for (let i = 0; i < args.length; i += 1) {
    const raw = String(args[i] || "");
    if (!raw.startsWith("--")) {
      continue;
    }
    const eq = raw.indexOf("=");
    const key = (eq === -1 ? raw : raw.slice(0, eq)).replace(/^--/, "");
    const value = eq === -1 ? "" : raw.slice(eq + 1);

    const nextValue = () => {
      if (value) return value;
      const next = args[i + 1];
      if (next !== undefined && !String(next).startsWith("--")) {
        i += 1;
        return String(next);
      }
      return "";
    };

    if (key === "baseUrl") out.baseUrl = nextValue() || out.baseUrl;
    else if (key === "outDir") out.outDir = nextValue();
    else if (key === "package" || key === "packageName") out.packageName = nextValue() || out.packageName;
    else if (key === "project" || key === "gcpProject") out.gcpProject = nextValue() || out.gcpProject;
    else if (key === "timeoutMs") out.timeoutMs = Math.max(2000, Math.min(180000, Number(nextValue() || out.timeoutMs)));
    else if (key === "noLocal") out.includeLocal = false;
    else if (key === "noPlay") out.includePlay = false;
    else if (key === "noGcp") out.includeGcp = false;
    else if (key === "noLatest") out.latest = false;
  }

  if (!out.outDir) {
    out.outDir = path.join(__dirname, "..", "reports");
  }
  return out;
}

async function fetchJson(url, options = {}) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch() is not available in this Node.js runtime.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2000, Number(options.timeoutMs || 25000)));
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (_error) {
      parsed = null;
    }
    if (!response.ok) {
      const hint = parsed && typeof parsed === "object"
        ? (parsed.error || parsed.message || "")
        : "";
      const suffix = hint ? ` ${String(hint).slice(0, 220)}` : "";
      throw new Error(`HTTP ${response.status} ${response.statusText}.${suffix}`.trim());
    }
    if (parsed && typeof parsed === "object") return parsed;
    return { ok: true, nonJson: true, text: String(text || "").slice(0, 8000) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, options = {}) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch() is not available in this Node.js runtime.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2000, Number(options.timeoutMs || 25000)));
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      signal: controller.signal
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: String(text || "")
    };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJob(baseUrl, jobId, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = Math.max(3000, Number(options.timeoutMs || 60000));
  const pollMs = Math.max(250, Math.min(2500, Number(options.pollMs || 650)));

  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for job ${jobId} after ${timeoutMs}ms.`);
    }
    const data = await fetchJson(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}`, {
      timeoutMs: Math.max(2000, Number(options.requestTimeoutMs || 5000))
    });
    const job = data && typeof data === "object" ? data.job : null;
    const status = String(job?.status || "");
    if (status === "completed" || status === "failed" || status === "cancelled") {
      return job;
    }
    await sleep(pollMs);
  }
}

function redactSecrets(value, depth = 0, seen = new Set()) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "<circular>";
  if (depth > 16) return "<max_depth>";
  seen.add(value);

  const redactKey = (key) => {
    const name = String(key || "");
    if (!name) return false;
    if (/(hint|masked|hash)$/i.test(name)) return false;
    return /(token|secret|private[_-]?key|api[_-]?key|refresh|access|authorization|assertion)/i.test(name);
  };

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1, seen));
  }

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (redactKey(k)) {
      out[k] = "<redacted>";
    } else {
      out[k] = redactSecrets(v, depth + 1, seen);
    }
  }
  return out;
}

function runPowerShellJson(command, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(String(command || ""), "utf16le").toString("base64");
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encoded
    ], {
      windowsHide: true,
      cwd: path.join(__dirname, ".."),
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill();
      reject(new Error(`PowerShell timed out after ${timeoutMs}ms.`));
    }, Math.max(2000, Number(timeoutMs || 15000)));

    child.stdout.on("data", (chunk) => { stdout += String(chunk || ""); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk || ""); });
    child.on("error", (error) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      if (code !== 0) {
        const detail = String(stderr || stdout || "").trim().slice(0, 2000);
        return reject(new Error(`PowerShell failed (exit ${code}): ${detail || "unknown error"}`));
      }
      const text = String(stdout || "").trim();
      if (!text) {
        return resolve(null);
      }
      try {
        return resolve(JSON.parse(text));
      } catch (_error) {
        return reject(new Error(`PowerShell returned non-JSON output: ${text.slice(0, 400)}`));
      }
    });
  });
}

async function collectLocalState(targetPorts) {
  const ports = Array.isArray(targetPorts) ? targetPorts : [4781, 8788, 4791, 5443, 5444];
  const ps = `
$ErrorActionPreference='SilentlyContinue'
$ports = @(${ports.map((p) => Number(p)).filter((p) => Number.isFinite(p)).join(",")})
$listeners = Get-NetTCPConnection -State Listen | Where-Object { $ports -contains $_.LocalPort } | Select-Object LocalAddress,LocalPort,OwningProcess
$procMap = @{}
foreach ($row in $listeners) {
  $procId = [int]$row.OwningProcess
  $key = [string]$procId
  if (-not $procMap.ContainsKey($key)) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" | Select-Object Name,ProcessId,CommandLine
    if ($p) { $procMap[$key] = $p }
  }
}
$allProcs = Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','cloudflared.exe','python.exe','cmd.exe','powershell.exe') } | Select-Object Name,ProcessId,CommandLine
$openclawLike = $allProcs | Where-Object { $_.CommandLine -match '(?i)openclaw|\\\\.openclaw\\\\|gateway\\\\.cmd' }
$task = ""
try { $task = (schtasks /Query /TN "OpenClaw Gateway" /V /FO LIST) -join [Environment]::NewLine } catch { $task = "" }
$tools = [ordered]@{
  node     = (Get-Command node -ErrorAction SilentlyContinue).Source
  gcloud   = (Get-Command gcloud -ErrorAction SilentlyContinue).Source
  firebase = (Get-Command firebase -ErrorAction SilentlyContinue).Source
  fastlane = (Get-Command fastlane -ErrorAction SilentlyContinue).Source
  adb      = (Get-Command adb -ErrorAction SilentlyContinue).Source
}
$adbDevices = ""
if ($tools.adb) {
  try { $adbDevices = ( & $tools.adb devices ) -join [Environment]::NewLine } catch { $adbDevices = "" }
}
[ordered]@{
  listeners = $listeners
  listenerProcesses = $procMap
  openclawLikeProcesses = $openclawLike
  openclawGatewayTask = $task
  tools = $tools
  adbDevices = $adbDevices
} | ConvertTo-Json -Depth 8 -Compress
`.trim();

  try {
    const raw = await runPowerShellJson(ps, 18000);
    const taskText = String(raw?.openclawGatewayTask || "");
    const disabled = /Status:\s+Desabilitado|Status:\s+Disabled/i.test(taskText);
    const normalizeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "object") {
        if (Object.keys(value).length === 0) return [];
        return [value];
      }
      return [];
    };
    return {
      ok: true,
      listeners: normalizeArray(raw?.listeners),
      listenerProcesses: raw?.listenerProcesses || {},
      openclawLikeProcesses: normalizeArray(raw?.openclawLikeProcesses),
      openclawGatewayTask: {
        present: Boolean(taskText.trim()),
        disabled,
        raw: taskText.trim().slice(0, 4000)
      },
      tools: raw?.tools || {},
      adbDevicesRaw: String(raw?.adbDevices || "").trim()
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error || "local_state_failed")
    };
  }
}

function markdownEscape(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
  return `${rounded} ${units[index]}`;
}

function toMarkdown(snapshot) {
  const lines = [];
  const capturedAt = String(snapshot?.capturedAt || "");
  lines.push(`# Asolaria Snapshot`);
  lines.push("");
  lines.push(`Captured: \`${markdownEscape(capturedAt)}\``);
  lines.push(`Base URL: \`${markdownEscape(snapshot?.baseUrl || "")}\``);
  lines.push("");

  const local = snapshot?.local || null;
  if (local) {
    lines.push("## Local");
    lines.push("");
    lines.push(`- OpenClaw gateway scheduled task: ${local.openclawGatewayTask?.present ? (local.openclawGatewayTask.disabled ? "present, disabled" : "present, enabled") : "not found"}`);
    lines.push(`- OpenClaw-like processes: ${Array.isArray(local.openclawLikeProcesses) ? local.openclawLikeProcesses.length : 0}`);
    lines.push(`- Listeners (selected ports): ${Array.isArray(local.listeners) ? local.listeners.length : 0}`);
    lines.push("");
    const tools = local.tools && typeof local.tools === "object" ? local.tools : {};
    const toolLine = (name) => `- ${name}: ${tools[name] ? `\`${markdownEscape(tools[name])}\`` : "_not found on PATH_"}`;
    lines.push(toolLine("node"));
    lines.push(toolLine("gcloud"));
    lines.push(toolLine("firebase"));
    lines.push(toolLine("fastlane"));
    lines.push(toolLine("adb"));
    if (local.adbDevicesRaw) {
      lines.push("");
      lines.push("ADB devices:");
      lines.push("");
      lines.push("```");
      lines.push(local.adbDevicesRaw);
      lines.push("```");
    }
    lines.push("");
  }

  const asolaria = snapshot?.asolaria || null;
  if (asolaria) {
    lines.push("## Asolaria");
    lines.push("");
    const health = asolaria.health || {};
    lines.push(`- Uptime: \`${markdownEscape(health.uptimeSeconds)}s\``);
    lines.push(`- Settings: \`openclawMode=${markdownEscape(health?.settings?.openclawMode || "")}\`, \`guardianMode=${markdownEscape(health?.settings?.guardianMode || "")}\`, \`approvalMode=${markdownEscape(health?.settings?.approvalMode || "")}\``);
    lines.push(`- Skills loaded: \`${markdownEscape(health?.skills?.total)}\``);
    lines.push("");

    const integrations = asolaria.integrations || {};
    const statusLine = (name, s) => {
      const enabled = s?.enabled ? "enabled" : "disabled";
      const configured = s?.configured ? "configured" : "not configured";
      return `- ${name}: ${enabled}, ${configured}`;
    };
    lines.push(statusLine("Google", integrations.google?.status || integrations.google));
    lines.push(statusLine("Telegram", integrations.telegram?.status || integrations.telegram));
    lines.push(statusLine("GCP", integrations.gcp?.status || integrations.gcp));
    lines.push(statusLine("Vertex", integrations.vertex?.status || integrations.vertex));
    lines.push(statusLine("Gemini API", integrations.geminiApi?.status || integrations.geminiApi));
    lines.push("");

    const captures = asolaria.captures || {};
    const policy = captures.policy || {};
    const stats = captures.stats || {};
    if (captures.ok && stats.ok && stats.desktop) {
      lines.push(`- Captures desktop auto: \`${markdownEscape(stats.desktop.autoCount)}\` (${formatBytes(stats.desktop.autoBytes)})`);
      lines.push(`- Captures desktop manual: \`${markdownEscape(stats.desktop.manualCount)}\` (${formatBytes(stats.desktop.manualBytes)})`);
      lines.push(`- Captures important: \`${markdownEscape(stats.important?.count)}\` (${formatBytes(stats.important?.bytes)})`);
      lines.push(`- Captures trash: \`${markdownEscape(stats.trash?.count)}\` (${formatBytes(stats.trash?.bytes)})`);
      if (policy.desktopAuto) {
        lines.push(`- Retention desktopAuto: keep=\`${markdownEscape(policy.desktopAuto.keep)}\` minAgeMinutes=\`${markdownEscape(policy.desktopAuto.minAgeMinutes)}\` mode=\`${markdownEscape(policy.desktopAuto.pruneMode)}\``);
      }
      lines.push("");
    }
  }

  const gcp = snapshot?.gcp || null;
  if (gcp) {
    lines.push("## Google Cloud");
    lines.push("");
    if (gcp.enabledServices) {
      const svc = gcp.enabledServices;
      lines.push(`- Enabled services for project \`${markdownEscape(svc.project || "")}\`: \`${markdownEscape(svc.count)}\``);
      if (Array.isArray(svc.services) && svc.services.length) {
        lines.push("");
        lines.push("Top enabled services:");
        lines.push("");
        for (const name of svc.services.slice(0, 30)) {
          lines.push(`- \`${markdownEscape(name)}\``);
        }
      }
      lines.push("");
    } else {
      lines.push("- Enabled services: _not captured_");
      lines.push("");
    }
  }

  const play = snapshot?.googlePlay || null;
  if (play) {
    lines.push("## Google Play");
    lines.push("");
    lines.push(`- Package: \`${markdownEscape(play.packageName || "")}\``);
    if (play.playStore) {
      lines.push(`- Play Store HTTP: \`${markdownEscape(play.playStore.status)}\` (${markdownEscape(play.playStore.statusText || "")})`);
    }
    if (play.androidPublisherApi) {
      lines.push(`- Android Publisher API: ${play.androidPublisherApi.ok ? "ok" : "failed"}`);
      if (play.androidPublisherApi.error) {
        lines.push(`  - Error: \`${markdownEscape(play.androidPublisherApi.error)}\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const capturedAt = nowIso();
  const ts = formatTimestampForFile(new Date());

  fs.mkdirSync(args.outDir, { recursive: true });

  const snapshot = {
    snapshotVersion: 1,
    capturedAt,
    baseUrl: args.baseUrl,
    packageName: args.packageName,
    gcpProject: args.gcpProject,
    local: null,
    asolaria: {
      health: null,
      settings: null,
      captures: null,
      integrations: {
        telegram: null,
        google: null,
        gcp: null,
        vertex: null,
        geminiApi: null
      }
    },
    gcp: null,
    googlePlay: null,
    warnings: [],
    errors: []
  };

  if (args.includeLocal) {
    snapshot.local = await collectLocalState([4781, 8788, 4791, 5443, 5444]);
    if (snapshot.local && snapshot.local.ok !== true) {
      snapshot.warnings.push(`Local state collection failed: ${snapshot.local.error || "unknown error"}`);
    }
  }

  // Asolaria health/settings + integration status (best-effort).
  const healthP = fetchJson(`${args.baseUrl}/api/health`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "health_failed") }));
  const settingsP = fetchJson(`${args.baseUrl}/api/settings`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "settings_failed") }));
  const capturesP = fetchJson(`${args.baseUrl}/api/captures/stats`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "captures_stats_failed") }));
  const telegramP = fetchJson(`${args.baseUrl}/api/integrations/telegram/status`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "telegram_status_failed") }));
  const googleP = fetchJson(`${args.baseUrl}/api/integrations/google/status`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "google_status_failed") }));
  const gcpP = fetchJson(`${args.baseUrl}/api/integrations/gcp/status`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "gcp_status_failed") }));
  const vertexP = fetchJson(`${args.baseUrl}/api/integrations/vertex/status`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "vertex_status_failed") }));
  const geminiP = fetchJson(`${args.baseUrl}/api/integrations/gemini_api/status`, { timeoutMs: args.timeoutMs })
    .catch((error) => ({ ok: false, error: String(error?.message || error || "gemini_status_failed") }));

  const [health, settings, captures, telegram, google, gcp, vertex, geminiApi] = await Promise.all([
    healthP,
    settingsP,
    capturesP,
    telegramP,
    googleP,
    gcpP,
    vertexP,
    geminiP
  ]);

  snapshot.asolaria.health = health;
  snapshot.asolaria.settings = settings;
  snapshot.asolaria.captures = captures;
  snapshot.asolaria.integrations.telegram = telegram;
  snapshot.asolaria.integrations.google = google;
  snapshot.asolaria.integrations.gcp = gcp;
  snapshot.asolaria.integrations.vertex = vertex;
  snapshot.asolaria.integrations.geminiApi = geminiApi;

  // GCP enabled services (job-based).
  if (args.includeGcp) {
    let project = String(args.gcpProject || "").trim();
    if (!project) {
      const proj = gcp?.status?.defaultProject || gcp?.status?.projectId || "";
      project = String(proj || "").trim();
    }
    if (project) {
      try {
        const queued = await fetchJson(`${args.baseUrl}/api/integrations/gcp/services/enabled?project=${encodeURIComponent(project)}&pageSize=200`, {
          timeoutMs: Math.max(2000, Math.min(30000, args.timeoutMs))
        });
        const jobId = String(queued?.job?.id || "").trim();
        if (!jobId) {
          snapshot.warnings.push("GCP services enabled: no job id returned.");
        } else {
          const job = await waitForJob(args.baseUrl, jobId, { timeoutMs: 90000 });
          if (job.status === "completed") {
            const result = job.result || {};
            const services = Array.isArray(result.services) ? result.services : [];
            snapshot.gcp = {
              enabledServices: {
                jobId,
                project: String(result.project || project),
                count: services.length,
                services: services.map((row) => String(row?.name || "")).filter(Boolean).sort()
              }
            };
          } else {
            snapshot.warnings.push(`GCP services enabled job failed: ${String(job.error || "unknown error").slice(0, 360)}`);
          }
        }
      } catch (error) {
        snapshot.warnings.push(`GCP services enabled request failed: ${String(error?.message || error || "unknown error").slice(0, 360)}`);
      }
    } else {
      snapshot.warnings.push("GCP services enabled: project id not available (gcp integration may be unconfigured).");
    }
  }

  // Play Store + Android Publisher API (best-effort).
  if (args.includePlay) {
    const play = {
      packageName: args.packageName,
      playStore: null,
      androidPublisherApi: null
    };

    try {
      const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(args.packageName)}&hl=en_US&gl=US`;
      const resp = await fetchText(url, { timeoutMs: 20000 });
      play.playStore = {
        url,
        ok: Boolean(resp.ok),
        status: resp.status,
        statusText: resp.statusText,
        titleHint: (resp.text || "").match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || ""
      };
    } catch (error) {
      play.playStore = {
        url: "",
        ok: false,
        status: 0,
        statusText: "",
        error: String(error?.message || error || "play_store_failed").slice(0, 360)
      };
    }

    // Android Publisher API: list tracks (read-only) using GCP service account.
    try {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(args.packageName)}/tracks`;
      const queued = await fetchJson(`${args.baseUrl}/api/integrations/gcp/request`, {
        method: "POST",
        timeoutMs: Math.max(2000, Math.min(30000, args.timeoutMs)),
        body: {
          method: "GET",
          url,
          scopes: ["https://www.googleapis.com/auth/androidpublisher"]
        }
      });
      const jobId = String(queued?.job?.id || "").trim();
      if (!jobId) {
        play.androidPublisherApi = { ok: false, error: "No job id returned." };
      } else {
        const job = await waitForJob(args.baseUrl, jobId, { timeoutMs: 90000 });
        if (job.status === "completed") {
          const data = job.result?.data;
          const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
          play.androidPublisherApi = {
            ok: true,
            jobId,
            tracksCount: tracks.length,
            tracks: tracks.map((t) => String(t?.track || "")).filter(Boolean).slice(0, 40)
          };
        } else {
          play.androidPublisherApi = {
            ok: false,
            jobId,
            error: String(job.error || "unknown error").slice(0, 420)
          };
        }
      }
    } catch (error) {
      play.androidPublisherApi = {
        ok: false,
        error: String(error?.message || error || "android_publisher_failed").slice(0, 420)
      };
    }

    snapshot.googlePlay = play;
  }

  const redacted = redactSecrets(snapshot);

  const jsonName = `asolaria-snapshot-${ts}.json`;
  const mdName = `asolaria-snapshot-${ts}.md`;
  const jsonPath = path.join(args.outDir, jsonName);
  const mdPath = path.join(args.outDir, mdName);
  fs.writeFileSync(jsonPath, JSON.stringify(redacted, null, 2), "utf8");
  fs.writeFileSync(mdPath, toMarkdown(redacted), "utf8");

  if (args.latest) {
    fs.writeFileSync(path.join(args.outDir, "asolaria-snapshot-latest.json"), JSON.stringify(redacted, null, 2), "utf8");
    fs.writeFileSync(path.join(args.outDir, "asolaria-snapshot-latest.md"), toMarkdown(redacted), "utf8");
  }

  // Minimal console output for humans.
  process.stdout.write([
    `Wrote: ${jsonPath}`,
    `Wrote: ${mdPath}`,
    args.latest ? `Wrote: ${path.join(args.outDir, "asolaria-snapshot-latest.json")}` : "",
    args.latest ? `Wrote: ${path.join(args.outDir, "asolaria-snapshot-latest.md")}` : ""
  ].filter(Boolean).join("\n") + "\n");
}

main().catch((error) => {
  process.stderr.write(`snapshot-asolaria failed: ${String(error?.message || error || "unknown error")}\n`);
  process.exitCode = 1;
});
