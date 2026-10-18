/**
 * Phone Health Check — Phase 6
 * Periodic check of phone edge connectivity.
 */
const { appendGraphEvent } = require("./graphRuntimeStore");
const childProcess = require("child_process");

let _interval = null;
let _checkCount = 0;
let _consecutiveFailures = 0;

function checkAdb() {
  try {
    const result = childProcess.spawnSync("adb", ["devices", "-l"], {
      encoding: "utf8", timeout: 10000, windowsHide: true
    });
    const lines = (result.stdout || "").split("\n").filter(l => l.includes("device") && !l.startsWith("List"));
    return { ok: lines.length > 0, devices: lines.length, output: lines.join("; ") };
  } catch (e) {
    return { ok: false, devices: 0, error: e.message };
  }
}

function checkReverse() {
  try {
    const result = childProcess.spawnSync("adb", ["reverse", "--list"], {
      encoding: "utf8", timeout: 5000, windowsHide: true
    });
    const lines = (result.stdout || "").trim().split("\n").filter(Boolean);
    return { ok: lines.length > 0, mappings: lines.length, output: lines.join("; ") };
  } catch (e) {
    return { ok: false, mappings: 0, error: e.message };
  }
}

function runCheck() {
  _checkCount++;
  const adb = checkAdb();
  const reverse = checkReverse();
  const healthy = adb.ok && reverse.ok;

  if (healthy) {
    _consecutiveFailures = 0;
  } else {
    _consecutiveFailures++;
  }

  if (_consecutiveFailures >= 3) {
    appendGraphEvent({
      component: "phone_health", category: "supervision", action: "phone_degraded",
      actor: { type: "runtime", id: "phone-health-check" },
      target: { type: "phone_edge", id: "phone" },
      context: { checkCount: _checkCount, consecutiveFailures: _consecutiveFailures, adb: adb.ok, reverse: reverse.ok },
      risk: { score: 5, level: "high", reasons: ["phone_edge_degraded"] }
    });
  }

  return { healthy, adb, reverse, checkCount: _checkCount, consecutiveFailures: _consecutiveFailures, at: new Date().toISOString() };
}

function start(intervalMs = 300000) {
  if (_interval) return { started: false, reason: "already_running" };
  _interval = setInterval(runCheck, intervalMs);
  runCheck(); // immediate first check
  return { started: true, intervalMs };
}

function stop() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  return { stopped: true, totalChecks: _checkCount };
}

function status() {
  return { running: Boolean(_interval), checkCount: _checkCount, consecutiveFailures: _consecutiveFailures };
}

module.exports = { start, stop, status, runCheck };
