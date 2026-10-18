"use strict";

const childProcess = require("child_process");
const path = require("path");
const fs = require("fs");

const DEFAULT_VSCREEN_WIDTH = 480;
const DEFAULT_VSCREEN_HEIGHT = 960;
const DEFAULT_VSCREEN_DPI = 160;
const MAX_VIRTUAL_DISPLAYS = 3;
const CAPTURE_TIMEOUT_MS = 12000;
const ADB_PATH = "adb";

const runtimeState = {
  displays: [],
  lastUpdatedAt: "",
  capturesDir: ""
};

function adbShell(command, options = {}) {
  const timeoutMs = Math.max(2000, Math.min(30000, Number(options.timeoutMs || 10000)));
  const transport = options.transport || "-d";
  try {
    const result = childProcess.spawnSync(
      ADB_PATH,
      [transport, "shell", command],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true }
    );
    return {
      ok: Number(result.status || 0) === 0 && !result.error,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim(),
      exitCode: Number(result.status || -1)
    };
  } catch (error) {
    return { ok: false, stdout: "", stderr: String(error?.message || error), exitCode: -1 };
  }
}

function adbPull(remotePath, localPath, options = {}) {
  const timeoutMs = Math.max(3000, Math.min(30000, Number(options.timeoutMs || 15000)));
  const transport = options.transport || "-d";
  try {
    const result = childProcess.spawnSync(
      ADB_PATH,
      [transport, "pull", remotePath, localPath],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true }
    );
    return {
      ok: Number(result.status || 0) === 0 && !result.error,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim()
    };
  } catch (error) {
    return { ok: false, stdout: "", stderr: String(error?.message || error) };
  }
}

function initCapturesDir(baseDir) {
  const dir = path.join(baseDir, "captures", "virtual-displays");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    runtimeState.capturesDir = dir;
  } catch (error) {
    runtimeState.capturesDir = path.join(baseDir, "captures");
  }
  return runtimeState.capturesDir;
}

/**
 * List current virtual overlay displays from Android settings.
 */
function listVirtualDisplays(options = {}) {
  const result = adbShell("settings get global overlay_display_devices", options);
  if (!result.ok || !result.stdout || result.stdout === "null") {
    return { ok: true, displays: [], raw: result.stdout || "" };
  }
  const specs = result.stdout.split(",").map(s => s.trim()).filter(Boolean);
  const displays = specs.map((spec, index) => {
    const match = spec.match(/(\d+)x(\d+)\/(\d+)/);
    return {
      index: index + 1,
      spec,
      width: match ? Number(match[1]) : 0,
      height: match ? Number(match[2]) : 0,
      dpi: match ? Number(match[3]) : 0,
      displayId: index + 1 // overlay displays start at ID 1+ after primary
    };
  });
  runtimeState.displays = displays;
  runtimeState.lastUpdatedAt = new Date().toISOString();
  return { ok: true, displays, raw: result.stdout };
}

/**
 * Create N virtual overlay displays on the phone.
 */
function createVirtualDisplays(options = {}) {
  const count = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(options.count || 3)));
  const w = Number(options.width || DEFAULT_VSCREEN_WIDTH);
  const h = Number(options.height || DEFAULT_VSCREEN_HEIGHT);
  const dpi = Number(options.dpi || DEFAULT_VSCREEN_DPI);

  const specs = Array.from({ length: count }, () => `${w}x${h}/${dpi}`).join(",");
  const setResult = adbShell(`settings put global overlay_display_devices "${specs}"`, options);

  if (!setResult.ok) {
    return { ok: false, error: setResult.stderr || "Failed to set overlay_display_devices", count: 0 };
  }

  // Wait briefly for displays to initialize
  childProcess.spawnSync("timeout", ["/t", "2", "/nobreak"], { windowsHide: true, stdio: "ignore" });

  // Verify
  const listed = listVirtualDisplays(options);
  return {
    ok: true,
    count: listed.displays.length,
    displays: listed.displays,
    specs,
    note: `Created ${listed.displays.length} virtual displays at ${w}x${h}/${dpi}`
  };
}

/**
 * Destroy all virtual overlay displays.
 */
function destroyVirtualDisplays(options = {}) {
  const result = adbShell('settings put global overlay_display_devices "null"', options);
  runtimeState.displays = [];
  runtimeState.lastUpdatedAt = new Date().toISOString();
  return {
    ok: result.ok,
    note: "All virtual displays destroyed"
  };
}

/**
 * Capture a specific virtual display by index (1-based).
 * Uses screencap with display ID. Falls back to screencap of the overlay window.
 */
function captureVirtualDisplay(displayIndex, options = {}) {
  const index = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(displayIndex || 1)));
  const capturesDir = runtimeState.capturesDir || initCapturesDir(options.baseDir || process.cwd());
  const remotePath = `/sdcard/vscreen${index}.png`;
  const localPath = path.join(capturesDir, `vscreen-${index}-latest.png`);

  // Try screencap with -d flag for display ID
  // Display IDs: overlay displays typically start at ID 2+ (primary is 0)
  const displayId = index + 1; // primary=0, first overlay=2, etc. Adjust based on actual device
  let captureResult = adbShell(`screencap -d ${displayId} ${remotePath}`, {
    ...options,
    timeoutMs: CAPTURE_TIMEOUT_MS
  });

  // Fallback: try without -d flag (some devices use -p and display param differently)
  if (!captureResult.ok) {
    captureResult = adbShell(`screencap -p ${remotePath}`, {
      ...options,
      timeoutMs: CAPTURE_TIMEOUT_MS
    });
  }

  if (!captureResult.ok) {
    return {
      ok: false,
      error: `Capture failed for display ${index}: ${captureResult.stderr}`,
      displayIndex: index,
      localPath: ""
    };
  }

  // Pull to local
  const pullResult = adbPull(remotePath, localPath, options);
  if (!pullResult.ok) {
    return {
      ok: false,
      error: `Pull failed for display ${index}: ${pullResult.stderr}`,
      displayIndex: index,
      localPath: ""
    };
  }

  return {
    ok: true,
    displayIndex: index,
    displayId,
    localPath,
    remotePath,
    capturedAt: new Date().toISOString()
  };
}

/**
 * Get the local file path for a virtual display capture.
 */
function getVirtualDisplayImagePath(displayIndex, options = {}) {
  const index = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(displayIndex || 1)));
  const capturesDir = runtimeState.capturesDir || initCapturesDir(options.baseDir || process.cwd());
  const localPath = path.join(capturesDir, `vscreen-${index}-latest.png`);
  return {
    ok: fs.existsSync(localPath),
    localPath,
    displayIndex: index
  };
}

/**
 * Send a tap to a specific virtual display.
 */
function tapVirtualDisplay(displayIndex, x, y, options = {}) {
  const index = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(displayIndex || 1)));
  const displayId = index + 1;
  const tapX = Math.round(Number(x || 0));
  const tapY = Math.round(Number(y || 0));
  const result = adbShell(`input -d ${displayId} tap ${tapX} ${tapY}`, options);
  return {
    ok: result.ok,
    displayIndex: index,
    displayId,
    x: tapX,
    y: tapY,
    error: result.ok ? "" : result.stderr
  };
}

/**
 * Send text input to a specific virtual display.
 */
function typeOnVirtualDisplay(displayIndex, text, options = {}) {
  const index = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(displayIndex || 1)));
  const displayId = index + 1;
  const safeText = String(text || "").replace(/"/g, '\\"').replace(/\$/g, "\\$").slice(0, 500);
  const result = adbShell(`input -d ${displayId} text "${safeText}"`, options);
  return {
    ok: result.ok,
    displayIndex: index,
    text: safeText.slice(0, 60),
    error: result.ok ? "" : result.stderr
  };
}

/**
 * Launch an activity on a specific virtual display.
 */
function launchOnVirtualDisplay(displayIndex, component, options = {}) {
  const index = Math.max(1, Math.min(MAX_VIRTUAL_DISPLAYS, Number(displayIndex || 1)));
  const displayId = index + 1;
  const componentStr = String(component || "").trim();
  if (!componentStr) {
    return { ok: false, error: "Component is required (e.g. com.package/.Activity)" };
  }
  const result = adbShell(`am start --display ${displayId} -n ${componentStr}`, options);
  return {
    ok: result.ok,
    displayIndex: index,
    displayId,
    component: componentStr,
    output: result.stdout,
    error: result.ok ? "" : result.stderr
  };
}

function getState() {
  return {
    displays: runtimeState.displays,
    lastUpdatedAt: runtimeState.lastUpdatedAt,
    capturesDir: runtimeState.capturesDir,
    maxDisplays: MAX_VIRTUAL_DISPLAYS
  };
}

function manifest() {
  return {
    id: "virtualDisplay",
    version: "1.0.0",
    description: "Android virtual display manager via ADB — create, capture, interact with secondary displays",
    capabilities: ["list_displays", "create_display", "destroy_display", "capture_display", "tap_display", "type_on_display", "launch_on_display"],
    readScopes: ["adb.shell"],
    writeScopes: ["adb.shell"],
    approvalRequired: true,
    healthCheck: false,
    retrySemantics: "none",
    timeoutMs: 12000,
    secretRequirements: [],
    sideEffects: ["creates_virtual_android_displays", "captures_screenshots", "sends_input_events"],
    failureModes: ["adb_not_connected", "device_not_found", "display_limit_reached"],
    emittedEvents: []
  };
}

module.exports = {
  initCapturesDir,
  listVirtualDisplays,
  createVirtualDisplays,
  destroyVirtualDisplays,
  captureVirtualDisplay,
  getVirtualDisplayImagePath,
  tapVirtualDisplay,
  typeOnVirtualDisplay,
  launchOnVirtualDisplay,
  getState,
  MAX_VIRTUAL_DISPLAYS,
  manifest
};
