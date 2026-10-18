const fs = require("fs");
const childProcess = require("child_process");

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_MAX_OUTPUT_CHARS = 16000;
const TERMUX_BIN_DIR = "/data/data/com.termux/files/usr/bin";
const TERMUX_PATH_ENV = `PATH=${TERMUX_BIN_DIR}:${TERMUX_BIN_DIR}/applets`;
const EXIT_MARKER = "__ASOLARIA_EXIT_CODE__=";

function normalizeText(value) {
  return String(value || "").trim();
}

function clampInt(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function firstExisting(candidates = []) {
  for (const raw of candidates) {
    const candidate = normalizeText(raw);
    if (!candidate) continue;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "";
}

function resolveAdbPath() {
  const localAppData = normalizeText(process.env.LOCALAPPDATA);
  const direct = firstExisting([
    normalizeText(process.env.ASOLARIA_ADB_PATH),
    localAppData ? `${localAppData}\\Android\\Sdk\\platform-tools\\adb.exe` : "",
    "C:\\Android\\platform-tools\\adb.exe",
    "C:\\platform-tools\\adb.exe",
    "C:\\Program Files\\Android\\platform-tools\\adb.exe",
    localAppData
      ? `${localAppData}\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe`
      : ""
  ]);
  if (direct) {
    return direct;
  }
  try {
    const where = childProcess.spawnSync("where", ["adb.exe"], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 4000
    });
    if (where.status === 0) {
      const first = String(where.stdout || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (first && fs.existsSync(first)) {
        return first;
      }
    }
  } catch (_error) {
    // ignore
  }
  return "";
}

function runCommand(exe, args, options = {}) {
  const timeoutMs = clampInt(options.timeoutMs, DEFAULT_TIMEOUT_MS, 3000, 15 * 60 * 1000);
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(exe, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        child.kill();
      } catch (_error) {
        // ignore
      }
      reject(new Error(`command_timeout_${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });
    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        code: Number(code || 0),
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks)
      });
    });
  });
}

async function runAdb(adbPath, args, options = {}) {
  if (!adbPath) {
    throw new Error("adb_not_found");
  }
  return runCommand(adbPath, args, options);
}

function parseAdbDevices(stdout) {
  const rows = [];
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.toLowerCase().startsWith("list of devices attached")) continue;
    const match = /^(\S+)\s+(\S+)$/i.exec(line);
    if (!match) continue;
    rows.push({
      id: match[1],
      state: match[2]
    });
  }
  return rows;
}

function chooseAuthorizedDevice(rows = [], requestedId = "") {
  const wanted = normalizeText(requestedId);
  const connected = rows.filter((row) => String(row.state || "").toLowerCase() === "device");
  if (connected.length < 1) {
    return "";
  }
  if (wanted) {
    const match = connected.find((row) => row.id === wanted);
    if (match) {
      return match.id;
    }
  }
  const usb = connected.find((row) => !String(row.id || "").includes(":"));
  return usb ? usb.id : connected[0].id;
}

async function resolvePhoneDeviceContext(options = {}) {
  const timeoutMs = clampInt(options.timeoutMs, 10000, 3000, 60000);
  const adbPath = resolveAdbPath();
  if (!adbPath) {
    throw new Error("adb_not_found");
  }
  const devicesResult = await runAdb(adbPath, ["devices"], { timeoutMs });
  const rows = parseAdbDevices(devicesResult.stdout.toString("utf8"));
  const deviceId = chooseAuthorizedDevice(rows, options.deviceId);
  if (!deviceId) {
    throw new Error("phone_device_not_found");
  }
  return { adbPath, deviceId };
}

function wrapTermuxCommand(command) {
  const normalized = String(command || "").replace(/\r/g, "").trim();
  if (!normalized) {
    throw new Error("command_required");
  }
  if (normalized.length > 4000) {
    throw new Error("command_too_long");
  }
  return [
    normalized,
    "__asolaria_exit=$?",
    `printf "\\n${EXIT_MARKER}%s\\n" "$__asolaria_exit"`,
    "exit \"$__asolaria_exit\""
  ].join("\n");
}

function buildTermuxExecArgs(options = {}) {
  const args = [];
  const deviceId = normalizeText(options.deviceId);
  if (deviceId) {
    args.push("-s", deviceId);
  }
  args.push(
    "shell",
    "run-as",
    "com.termux",
    "env",
    TERMUX_PATH_ENV,
    `${TERMUX_BIN_DIR}/bash`,
    "-lc",
    wrapTermuxCommand(options.command)
  );
  return args;
}

function parseExitCode(stdoutText) {
  const text = String(stdoutText || "");
  const index = text.lastIndexOf(EXIT_MARKER);
  if (index < 0) {
    return {
      exitCode: 0,
      stdout: text,
      markerFound: false
    };
  }
  const prefix = text.slice(0, index).replace(/\s+$/g, "");
  const tail = text.slice(index + EXIT_MARKER.length);
  const line = tail.split(/\r?\n/, 1)[0];
  const parsed = Number(line);
  return {
    exitCode: Number.isFinite(parsed) ? parsed : 0,
    stdout: prefix,
    markerFound: true
  };
}

function clipText(value, maxChars = DEFAULT_MAX_OUTPUT_CHARS) {
  const text = String(value || "");
  const limit = clampInt(maxChars, DEFAULT_MAX_OUTPUT_CHARS, 256, 100000);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

async function runPhoneEdgeCompute(options = {}) {
  const command = normalizeText(options.command);
  if (!command) {
    throw new Error("command_required");
  }
  const timeoutMs = clampInt(options.timeoutMs, DEFAULT_TIMEOUT_MS, 3000, 15 * 60 * 1000);
  const maxOutputChars = clampInt(options.maxOutputChars, DEFAULT_MAX_OUTPUT_CHARS, 256, 100000);
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const context = await resolvePhoneDeviceContext({
    deviceId: options.deviceId,
    timeoutMs: Math.min(timeoutMs, 60000)
  });
  const result = await runAdb(context.adbPath, buildTermuxExecArgs({
    deviceId: context.deviceId,
    command
  }), {
    timeoutMs
  });
  const stdoutRaw = result.stdout.toString("utf8");
  const stderrRaw = result.stderr.toString("utf8");
  const parsed = parseExitCode(stdoutRaw);
  const finishedAtMs = Date.now();
  return {
    ok: parsed.exitCode === 0,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    adbPath: context.adbPath,
    deviceId: context.deviceId,
    exitCode: parsed.exitCode,
    markerFound: parsed.markerFound,
    commandPreview: clipText(command, 280),
    stdout: clipText(parsed.stdout, maxOutputChars),
    stderr: clipText(stderrRaw, maxOutputChars)
  };
}

module.exports = {
  resolveAdbPath,
  resolvePhoneDeviceContext,
  buildTermuxExecArgs,
  runPhoneEdgeCompute
};
