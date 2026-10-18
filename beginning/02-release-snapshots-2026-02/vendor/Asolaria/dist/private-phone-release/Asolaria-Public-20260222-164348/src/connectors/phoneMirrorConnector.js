const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const { resolveCapturePath } = require("../runtimePaths");

const DEFAULT_TIMEOUT_MS = 15000;
const PHONE_SCREEN_FALLBACK_FILE = "phone-screen-latest.png";
const PHONE_VOICE_FALLBACK_FILE = "phone-whatsapp-voice-latest.wav";

const PHONE_MIRROR_STATE = {
  lastPath: "",
  lastFileName: "",
  lastCapturedAt: "",
  lastCapturedAtMs: 0,
  width: 0,
  height: 0,
  orientation: "",
  deviceId: "",
  lastError: "",
  lastVoiceOutputPath: "",
  lastVoiceOutputAt: "",
  lastVoiceOutputAtMs: 0
};

function normalizeText(value) {
  return String(value || "").trim();
}

function safePhoneImageFileName(value, fallback = PHONE_SCREEN_FALLBACK_FILE) {
  const raw = normalizeText(value) || fallback;
  const parsed = path.parse(raw);
  const safeBase = String(parsed.name || "phone-screen-latest")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80) || "phone-screen-latest";
  const ext = ".png";
  return `${safeBase}${ext}`;
}

function safePhoneVoiceFileName(value, fallback = PHONE_VOICE_FALLBACK_FILE) {
  const raw = normalizeText(value) || fallback;
  const parsed = path.parse(raw);
  const safeBase = String(parsed.name || "phone-whatsapp-voice-latest")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80) || "phone-whatsapp-voice-latest";
  return `${safeBase}.wav`;
}

function resolveAdbPath() {
  const envPath = normalizeText(process.env.ASOLARIA_ADB_PATH);
  const candidates = [
    envPath,
    "C:\\Users\\acer\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe",
    "C:\\Android\\platform-tools\\adb.exe",
    "C:\\platform-tools\\adb.exe",
    "C:\\Program Files\\Android\\platform-tools\\adb.exe",
    "C:\\Users\\acer\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const where = childProcess.spawnSync("where", ["adb"], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 3000
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
  const timeoutMs = Math.max(2500, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(exe, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const stdoutChunks = [];
    let stderrText = "";
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => {
      stderrText += String(chunk || "");
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
      const stdout = Buffer.concat(stdoutChunks);
      const stderr = String(stderrText || "").trim();
      const allowNonZero = Boolean(options.allowNonZero);
      if (code !== 0 && !allowNonZero) {
        const reason = stderr || String(stdout.toString("utf8") || "").trim() || "unknown_error";
        return reject(new Error(`Command exited ${code}: ${reason}`));
      }
      return resolve({
        code: Number(code || 0),
        stdout,
        stderr
      });
    });

    if (options.stdinBuffer && Buffer.isBuffer(options.stdinBuffer)) {
      child.stdin.write(options.stdinBuffer);
    } else if (options.stdinText !== undefined) {
      child.stdin.write(String(options.stdinText || ""));
    }
    child.stdin.end();
  });
}

async function runAdb(adbPath, args, options = {}) {
  if (!adbPath) {
    throw new Error("adb_not_found");
  }
  return runCommand(adbPath, args, options);
}

function parseAdbDevices(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];
  for (const line of lines) {
    if (line.toLowerCase().startsWith("list of devices attached")) {
      continue;
    }
    const match = /^(\S+)\s+(\S+)$/.exec(line);
    if (!match) continue;
    rows.push({
      id: match[1],
      state: match[2]
    });
  }
  return rows;
}

function choosePhoneDevice(rows = [], requestedId = "") {
  const normalizedRequested = normalizeText(requestedId);
  const connected = rows.filter((row) => String(row.state || "").toLowerCase() === "device");
  if (!connected.length) {
    return "";
  }
  if (normalizedRequested) {
    const exact = connected.find((row) => row.id === normalizedRequested);
    if (exact) {
      return exact.id;
    }
  }
  if (PHONE_MIRROR_STATE.deviceId) {
    const fromState = connected.find((row) => row.id === PHONE_MIRROR_STATE.deviceId);
    if (fromState) {
      return fromState.id;
    }
  }
  return connected[0].id;
}

function parsePngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    return { width: 0, height: 0 };
  }
  const pngSig = "89504e470d0a1a0a";
  if (buffer.slice(0, 8).toString("hex").toLowerCase() !== pngSig) {
    return { width: 0, height: 0 };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0
  };
}

function resolveOrientation(width, height) {
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  if (width > 0 && height > 0) return "square";
  return "unknown";
}

async function listPhoneDevices(adbPath, options = {}) {
  const result = await runAdb(adbPath, ["devices"], {
    timeoutMs: options.timeoutMs || 8000
  });
  return parseAdbDevices(result.stdout.toString("utf8"));
}

async function getPhoneMirrorStatus(options = {}) {
  const adbPath = resolveAdbPath();
  const base = {
    adbFound: Boolean(adbPath),
    adbPath: adbPath || "",
    devices: [],
    selectedDeviceId: "",
    authorizedDeviceCount: 0,
    snapshot: {
      fileName: PHONE_MIRROR_STATE.lastFileName || "",
      capturedAt: PHONE_MIRROR_STATE.lastCapturedAt || "",
      capturedAtMs: Number(PHONE_MIRROR_STATE.lastCapturedAtMs || 0),
      width: Number(PHONE_MIRROR_STATE.width || 0),
      height: Number(PHONE_MIRROR_STATE.height || 0),
      orientation: PHONE_MIRROR_STATE.orientation || "",
      imageReady: Boolean(PHONE_MIRROR_STATE.lastPath && fs.existsSync(PHONE_MIRROR_STATE.lastPath))
    },
    voice: {
      hasLatest: Boolean(PHONE_MIRROR_STATE.lastVoiceOutputPath && fs.existsSync(PHONE_MIRROR_STATE.lastVoiceOutputPath)),
      updatedAt: PHONE_MIRROR_STATE.lastVoiceOutputAt || ""
    },
    lastError: PHONE_MIRROR_STATE.lastError || ""
  };
  if (!adbPath) {
    return base;
  }
  try {
    const devices = await listPhoneDevices(adbPath, options);
    const selectedDeviceId = choosePhoneDevice(devices, options.deviceId);
    return {
      ...base,
      devices,
      selectedDeviceId,
      authorizedDeviceCount: devices.filter((row) => String(row.state || "").toLowerCase() === "device").length
    };
  } catch (error) {
    PHONE_MIRROR_STATE.lastError = String(error?.message || error || "adb_devices_failed");
    return base;
  }
}

async function resolvePhoneDeviceContext(options = {}) {
  const adbPath = resolveAdbPath();
  if (!adbPath) {
    throw new Error("adb_not_found");
  }
  const devices = await listPhoneDevices(adbPath, {
    timeoutMs: options.timeoutMs || 8000
  });
  const deviceId = choosePhoneDevice(devices, options.deviceId);
  if (!deviceId) {
    throw new Error("no_authorized_phone_device");
  }
  return {
    adbPath,
    devices,
    deviceId
  };
}

async function capturePhoneMirrorSnapshot(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const timeoutMs = Math.max(4000, Number(options.timeoutMs || 20000));
  const fileName = safePhoneImageFileName(options.fileName, PHONE_SCREEN_FALLBACK_FILE);
  const outputPath = resolveCapturePath("phone", fileName);

  const result = await runAdb(ctx.adbPath, ["-s", ctx.deviceId, "exec-out", "screencap", "-p"], {
    timeoutMs
  });
  const bytes = Buffer.from(result.stdout || Buffer.alloc(0));
  if (bytes.length < 80) {
    throw new Error("phone_screencap_empty");
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);

  const dimensions = parsePngDimensions(bytes);
  const now = Date.now();
  const capturedAt = new Date(now).toISOString();
  const orientation = resolveOrientation(dimensions.width, dimensions.height);

  PHONE_MIRROR_STATE.lastPath = outputPath;
  PHONE_MIRROR_STATE.lastFileName = fileName;
  PHONE_MIRROR_STATE.lastCapturedAt = capturedAt;
  PHONE_MIRROR_STATE.lastCapturedAtMs = now;
  PHONE_MIRROR_STATE.width = dimensions.width;
  PHONE_MIRROR_STATE.height = dimensions.height;
  PHONE_MIRROR_STATE.orientation = orientation;
  PHONE_MIRROR_STATE.deviceId = ctx.deviceId;
  PHONE_MIRROR_STATE.lastError = "";

  return {
    fileName,
    outputPath,
    capturedAt,
    capturedAtMs: now,
    width: dimensions.width,
    height: dimensions.height,
    orientation,
    sizeBytes: bytes.length,
    deviceId: ctx.deviceId
  };
}

function getPhoneMirrorImagePath() {
  const value = String(PHONE_MIRROR_STATE.lastPath || "").trim();
  if (!value) return "";
  if (!fs.existsSync(value)) return "";
  return value;
}

function getPhoneMirrorSnapshotSummary() {
  const imagePath = getPhoneMirrorImagePath();
  return {
    fileName: PHONE_MIRROR_STATE.lastFileName || "",
    capturedAt: PHONE_MIRROR_STATE.lastCapturedAt || "",
    capturedAtMs: Number(PHONE_MIRROR_STATE.lastCapturedAtMs || 0),
    width: Number(PHONE_MIRROR_STATE.width || 0),
    height: Number(PHONE_MIRROR_STATE.height || 0),
    orientation: PHONE_MIRROR_STATE.orientation || "unknown",
    imagePath,
    imageReady: Boolean(imagePath),
    deviceId: PHONE_MIRROR_STATE.deviceId || "",
    lastError: PHONE_MIRROR_STATE.lastError || ""
  };
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeCoord(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric >= 0 && numeric <= 1) {
    return clampInt(numeric * Math.max(1, max - 1), 0, Math.max(0, max - 1));
  }
  return clampInt(numeric, 0, Math.max(0, max - 1));
}

function readControlScreenSize(options = {}) {
  const width = Number(options.screenWidth || PHONE_MIRROR_STATE.width || 0);
  const height = Number(options.screenHeight || PHONE_MIRROR_STATE.height || 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

function encodePhoneInputText(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, "%s")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["'`$\\&|;<>()]/g, "")
    .slice(0, 400);
}

async function sendPhoneTap(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const size = readControlScreenSize(options);
  if (!size) {
    throw new Error("phone_screen_size_required");
  }
  const x = normalizeCoord(options.x, size.width);
  const y = normalizeCoord(options.y, size.height);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("tap_coordinates_required");
  }

  await runAdb(ctx.adbPath, ["-s", ctx.deviceId, "shell", "input", "tap", String(x), String(y)], {
    timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000))
  });
  return {
    ok: true,
    deviceId: ctx.deviceId,
    x,
    y,
    width: size.width,
    height: size.height
  };
}

async function sendPhoneSwipe(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const size = readControlScreenSize(options);
  if (!size) {
    throw new Error("phone_screen_size_required");
  }
  const startX = normalizeCoord(options.startX, size.width);
  const startY = normalizeCoord(options.startY, size.height);
  const endX = normalizeCoord(options.endX, size.width);
  const endY = normalizeCoord(options.endY, size.height);
  if (![startX, startY, endX, endY].every((item) => Number.isFinite(item))) {
    throw new Error("swipe_coordinates_required");
  }
  const durationMs = clampInt(Number(options.durationMs || 320), 60, 4000);
  await runAdb(
    ctx.adbPath,
    [
      "-s",
      ctx.deviceId,
      "shell",
      "input",
      "swipe",
      String(startX),
      String(startY),
      String(endX),
      String(endY),
      String(durationMs)
    ],
    {
      timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000))
    }
  );
  return {
    ok: true,
    deviceId: ctx.deviceId,
    startX,
    startY,
    endX,
    endY,
    durationMs,
    width: size.width,
    height: size.height
  };
}

async function sendPhoneText(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const encoded = encodePhoneInputText(options.text);
  if (!encoded) {
    throw new Error("text_required");
  }
  await runAdb(ctx.adbPath, ["-s", ctx.deviceId, "shell", "input", "text", encoded], {
    timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000))
  });
  return {
    ok: true,
    deviceId: ctx.deviceId,
    length: String(options.text || "").length
  };
}

async function sendPhoneKey(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const key = normalizeText(options.key).toUpperCase();
  if (!key) {
    throw new Error("key_required");
  }
  const safeKey = /^\d+$/.test(key) ? key : key.replace(/[^A-Z0-9_]/g, "");
  if (!safeKey) {
    throw new Error("key_invalid");
  }
  await runAdb(ctx.adbPath, ["-s", ctx.deviceId, "shell", "input", "keyevent", safeKey], {
    timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000))
  });
  return {
    ok: true,
    deviceId: ctx.deviceId,
    key: safeKey
  };
}

async function openPhoneWhatsApp(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  await runAdb(
    ctx.adbPath,
    ["-s", ctx.deviceId, "shell", "monkey", "-p", "com.whatsapp", "-c", "android.intent.category.LAUNCHER", "1"],
    {
      timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000)),
      allowNonZero: true
    }
  );
  return {
    ok: true,
    deviceId: ctx.deviceId
  };
}

function normalizeWhatsAppPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 18);
}

async function openPhoneWhatsAppChat(options = {}) {
  const ctx = await resolvePhoneDeviceContext(options);
  const phone = normalizeWhatsAppPhone(options.phone || options.toNumber || "");
  if (!phone) {
    throw new Error("whatsapp_phone_required");
  }
  const message = String(options.message || "").trim().slice(0, 700);
  const waUrl = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;

  await runAdb(
    ctx.adbPath,
    [
      "-s",
      ctx.deviceId,
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      waUrl
    ],
    {
      timeoutMs: Math.max(3000, Number(options.timeoutMs || 10000)),
      allowNonZero: true
    }
  );
  return {
    ok: true,
    deviceId: ctx.deviceId,
    phone,
    url: waUrl
  };
}

function setPhoneMirrorVoiceOutput(outputPath) {
  const fullPath = normalizeText(outputPath);
  if (!fullPath) {
    PHONE_MIRROR_STATE.lastVoiceOutputPath = "";
    PHONE_MIRROR_STATE.lastVoiceOutputAt = "";
    PHONE_MIRROR_STATE.lastVoiceOutputAtMs = 0;
    return;
  }
  PHONE_MIRROR_STATE.lastVoiceOutputPath = fullPath;
  PHONE_MIRROR_STATE.lastVoiceOutputAt = new Date().toISOString();
  PHONE_MIRROR_STATE.lastVoiceOutputAtMs = Date.now();
}

function getPhoneMirrorVoiceOutput() {
  const value = normalizeText(PHONE_MIRROR_STATE.lastVoiceOutputPath);
  const exists = value ? fs.existsSync(value) : false;
  return {
    path: exists ? value : "",
    updatedAt: PHONE_MIRROR_STATE.lastVoiceOutputAt || "",
    updatedAtMs: Number(PHONE_MIRROR_STATE.lastVoiceOutputAtMs || 0)
  };
}

module.exports = {
  safePhoneVoiceFileName,
  getPhoneMirrorStatus,
  capturePhoneMirrorSnapshot,
  getPhoneMirrorImagePath,
  getPhoneMirrorSnapshotSummary,
  sendPhoneTap,
  sendPhoneSwipe,
  sendPhoneText,
  sendPhoneKey,
  openPhoneWhatsApp,
  openPhoneWhatsAppChat,
  setPhoneMirrorVoiceOutput,
  getPhoneMirrorVoiceOutput
};
