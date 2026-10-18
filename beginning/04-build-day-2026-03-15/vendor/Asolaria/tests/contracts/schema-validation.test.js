/**
 * Contract Schema Validation Tests
 * Validates all frozen data contracts survive across builds.
 * Run: node tests/contracts/schema-validation.test.js
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function loadJson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadNdjson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

// ── Memory Store Contract ──
console.log("\n=== Memory Store Contract ===");
const memory = loadJson("memory.json");
if (memory) {
  // memory.json may be an object with turns array or a direct array
  const turns = Array.isArray(memory) ? memory : (memory.turns || memory.messages || []);
  assert(typeof memory === "object", "memory.json is an object or array");
  if (turns.length > 0) {
    const turn = turns[0];
    assert(typeof turn.id !== "undefined", "turn has id");
    assert(typeof turn.role === "string", "turn has string role");
    assert(typeof turn.text === "string", "turn has string text");
    assert(typeof turn.at === "string", "turn has string at (timestamp)");
    assert(typeof turn.meta === "object" || turn.meta === undefined, "turn meta is object or undefined");
  }
} else {
  assert(false, "memory.json exists");
}

// ── Task Ledger Contract ──
console.log("\n=== Task Ledger Contract ===");
const VALID_STATUSES = ["planned", "ready", "in_progress", "blocked", "review", "done", "canceled", "archived"];
const taskLedger = loadJson("task-ledger.json");
if (taskLedger) {
  const tasks = taskLedger.tasks || taskLedger;
  assert(Array.isArray(tasks), "task-ledger contains tasks array");
  if (tasks.length > 0) {
    const task = tasks[0];
    assert(typeof task.id === "string", "task has string id");
    assert(typeof task.title === "string", "task has string title");
    assert(VALID_STATUSES.includes(task.status), `task status '${task.status}' is valid`);
    assert(typeof task.createdAt === "string", "task has createdAt");
  }
} else {
  assert(false, "task-ledger.json exists");
}

// ── Graph Runtime Events Contract ──
console.log("\n=== Graph Runtime Events Contract ===");
const graphEvents = loadNdjson("graph-runtime-events.ndjson");
assert(graphEvents.length > 0, "graph-runtime-events.ndjson has entries");
if (graphEvents.length > 0) {
  const event = graphEvents[graphEvents.length - 1];
  assert(typeof event.category === "string", "graph event has category");
  assert(typeof event.action === "string", "graph event has action");
  assert(typeof event.at === "string" || typeof event.timestamp === "string", "graph event has timestamp");
}

// ── Mistake Ledger Contract ──
console.log("\n=== Mistake Ledger Contract ===");
const mistakes = loadNdjson("mistake-ledger.ndjson");
assert(mistakes.length > 0, "mistake-ledger.ndjson has entries");
if (mistakes.length > 0) {
  const m = mistakes[0];
  assert(typeof m.id === "string" || typeof m.type === "string", "mistake has id or type");
}

// ── Mistake Patterns Contract ──
console.log("\n=== Mistake Patterns Contract ===");
const patterns = loadJson("mistake-patterns.json");
if (patterns) {
  assert(typeof patterns === "object", "mistake-patterns.json is an object");
}

// ── Skills/Tools Index Contract ──
console.log("\n=== Skills/Tools Index Contract ===");
const skillsIndex = loadJson("skills-tools-index.json");
if (skillsIndex) {
  assert(typeof skillsIndex === "object", "skills-tools-index.json is an object");
  assert(
    Array.isArray(skillsIndex.skills) || typeof skillsIndex.skills === "object",
    "skills-tools-index has skills"
  );
}

// ── Projects Contract ──
console.log("\n=== Projects Contract ===");
const projects = loadJson("projects.json");
if (projects) {
  assert(typeof projects === "object", "projects.json is an object");
}

// ── Standing Directives Contract (new) ──
console.log("\n=== Standing Directives Contract ===");
const directives = loadJson("standing-directives.json");
if (directives) {
  assert(Array.isArray(directives), "standing-directives.json is an array");
  if (directives.length > 0) {
    const d = directives[0];
    assert(typeof d.id === "string", "directive has id");
    assert(typeof d.directive === "string", "directive has text");
    assert(typeof d.priority === "string", "directive has priority");
    assert(typeof d.active === "boolean", "directive has active boolean");
    assert(typeof d.createdAt === "string", "directive has createdAt");
  }
} else {
  assert(false, "standing-directives.json exists");
}

// ── Gateway Audit Contract ──
console.log("\n=== Gateway Audit Contract ===");
const auditEntries = loadNdjson("gateway-audit.ndjson");
assert(auditEntries.length > 0, "gateway-audit.ndjson has entries");

// ── Runtime Settings Contract ──
console.log("\n=== Runtime Settings Contract ===");
const settings = loadJson("runtime-settings.json");
if (settings) {
  assert(typeof settings === "object", "runtime-settings.json is an object");
} else {
  assert(false, "runtime-settings.json exists");
}

// ── Summary ──
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
