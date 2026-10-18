const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");

const BACKUP_DIR = resolveDataPath("transcript-backups");

function ensureDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function clip(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function backupTranscript(sessionId, transcriptPath, trigger = "auto") {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { ok: false, error: "transcript_not_found", path: transcriptPath || "" };
  }

  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sid = clip(sessionId || "unknown", 20);
  const trig = clip(trigger, 20);
  const backupName = `${sid}_${trig}_${timestamp}.jsonl`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    fs.copyFileSync(transcriptPath, backupPath);
    // Write companion metadata
    const metaPath = `${backupPath}.meta.json`;
    fs.writeFileSync(metaPath, JSON.stringify({
      sessionId: clip(sessionId, 80),
      trigger: trig,
      originalPath: clip(transcriptPath, 300),
      backedUpAt: new Date().toISOString(),
      sizeBytes: fs.statSync(backupPath).size
    }, null, 2), "utf8");

    return { ok: true, backupPath, backupName };
  } catch (error) {
    return { ok: false, error: error?.message || "backup_failed" };
  }
}

function listTranscriptBackups(options = {}) {
  ensureDir();
  const { sessionId, limit = 50 } = options;
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .reverse();

    let results = files.map((name) => {
      const metaPath = path.join(BACKUP_DIR, `${name}.meta.json`);
      let meta = {};
      try {
        if (fs.existsSync(metaPath)) {
          meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        }
      } catch (_) { /* skip bad meta */ }
      return {
        name,
        path: path.join(BACKUP_DIR, name),
        sessionId: meta.sessionId || "",
        trigger: meta.trigger || "",
        backedUpAt: meta.backedUpAt || "",
        sizeBytes: meta.sizeBytes || 0
      };
    });

    if (sessionId) {
      results = results.filter((r) => r.sessionId === sessionId);
    }

    return results.slice(0, Math.min(limit, 200));
  } catch (_err) {
    return [];
  }
}

function readTranscriptBackup(backupName) {
  if (!backupName) return null;
  const filePath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const messages = raw.split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch (_) { return null; }
    }).filter(Boolean);
    return { name: backupName, messages, count: messages.length };
  } catch (_err) {
    return null;
  }
}

module.exports = {
  BACKUP_DIR,
  backupTranscript,
  listTranscriptBackups,
  readTranscriptBackup
};
