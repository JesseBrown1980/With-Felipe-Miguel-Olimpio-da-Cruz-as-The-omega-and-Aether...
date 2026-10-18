const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { projectRoot, resolveCapturePath } = require("../runtimePaths");

const DEFAULT_TIMEOUT_MS = Math.max(
  5000,
  Math.min(90000, Number(process.env.ASOLARIA_DESKTOP_CAPTURE_TIMEOUT_MS || 25000))
);

function safeDesktopFileName(raw, fallbackPrefix = "desktop") {
  const seed = `${fallbackPrefix}-${Date.now()}.png`;
  const value = String(raw || "").trim();
  const base = value || seed;
  const withExt = base.toLowerCase().endsWith(".png") ? base : `${base}.png`;
  const sanitized = withExt.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!sanitized) {
    return seed;
  }
  return sanitized;
}

function resolveCaptureScriptPath() {
  return path.join(projectRoot, "tools", "Capture-PrimaryScreen.ps1");
}

async function captureDesktopSnapshot(options = {}) {
  const timeoutMs = Math.max(
    5000,
    Math.min(120000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS))
  );
  const outputDir = resolveCapturePath("desktop");
  fs.mkdirSync(outputDir, { recursive: true });

  const fileName = safeDesktopFileName(options.fileName, "desktop");
  const outputPath = path.join(outputDir, fileName);
  const scriptPath = resolveCaptureScriptPath();
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Desktop capture script not found: ${scriptPath}`);
  }

  await new Promise((resolve, reject) => {
    const args = [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      // Screen capture via System.Drawing is more reliable in STA mode on Windows.
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-OutputPath",
      outputPath
    ];
    if (Number.isInteger(Number(options.screenIndex)) && Number(options.screenIndex) >= 0) {
      args.push("-ScreenIndex", String(Number(options.screenIndex)));
    }
    if (Boolean(options.captureAll)) {
      args.push("-CaptureAll");
    }
    const child = spawn("powershell.exe", args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error(`Desktop capture timed out after ${timeoutMs}ms.`));
      }
      if (code !== 0) {
        const detail = String(stderr || stdout || "").trim() || "Unknown error.";
        return reject(new Error(`Desktop capture failed (exit ${code}): ${detail}`));
      }
      return resolve();
    });
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Desktop capture succeeded but file was not found: ${outputPath}`);
  }

  const stat = fs.statSync(outputPath);
  return {
    outputPath,
    fileName,
    sizeBytes: Number(stat.size || 0),
    capturedAt: new Date().toISOString(),
    screenIndex: Number.isInteger(Number(options.screenIndex)) ? Number(options.screenIndex) : -1,
    captureAll: Boolean(options.captureAll)
  };
}

module.exports = {
  captureDesktopSnapshot,
  safeDesktopFileName
};
