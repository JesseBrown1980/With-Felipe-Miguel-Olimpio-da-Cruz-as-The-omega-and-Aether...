// Parse Asolaria Super Dashboard MDs to extract every supervisor / agent / PID
// mentioned across all lanes for the triple-level farm.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SOURCES = [
  "C:/asolaria-acer/packages/dashboard/docs/DASHBOARD-7-LANES.md",
  "C:/asolaria-acer/packages/dashboard/docs/DASHBOARD-9-LANES.md",
];

const allText = SOURCES.map(p => fs.readFileSync(p, "utf8")).join("\n\n");

// Patterns:
//   AGT-XXX-...-PID-... (full agent PID)
//   agent: AGT-... (yaml-style)
//   supervisor: name (yaml-style)
//   cp 220 (cp ref)
//   AGT-W7-HERA, AGT-C4
//   /api/cohort-X, /api/X (routes — each likely has owning supervisor)

const supervisors = new Set();
const agents = new Set();
const cps = new Set();
const routes = new Set();
const lanes = new Set();

// Agent PIDs
for (const m of allText.matchAll(/\bAGT-[A-Z0-9][A-Z0-9_-]+(?:-PID-\d{4}-\d{2}-\d{2})?/g)) {
  agents.add(m[0]);
}
// YAML supervisor:
for (const m of allText.matchAll(/supervisor:\s*([a-z][a-z0-9_-]*)/gi)) {
  supervisors.add(m[1].toLowerCase());
}
// CP refs
for (const m of allText.matchAll(/cp\s*(\d{2,4})/gi)) {
  cps.add("cp_" + m[1]);
}
// Routes
for (const m of allText.matchAll(/`(\/api\/[a-z0-9/_.-]+)`/g)) {
  routes.add(m[1]);
}
// Lane numbers
for (const m of allText.matchAll(/^\s*\d+\.\s+\*\*([^*]+)\*\*/gm)) {
  lanes.add(m[1].trim());
}

// Federation supervisor bands (per canon)
const BANDS = ["cube_cubed_sealer", "gaia", "helm", "vector", "rook", "forge", "falcon", "livefree"];
for (const b of BANDS) supervisors.add(b);

// Known prof / supervisor names from memory + cohort canon
const KNOWN_SUPS = [
  "hera", "phoebe", "phoebe-prime", "concord-vega", "tessera-helm", "keystone-liris",
  "stealth-mediator", "sentinel", "scout", "explorer", "claude", "codex",
  "dan", "felipe", "amy", "jesse", "rayssa",
  "shannon", "omnishannon", "hermes", "pi", "opencode", "big-pickle",
  "omnispindle", "omniflywheel", "space-deck-driver", "space-agent", "connor",
];
for (const s of KNOWN_SUPS) supervisors.add(s);

const roster = {
  wave: "W113-DASHBOARD-SUPERVISOR-INVENTORY-FARM-2026-05-21",
  generated_at: new Date().toISOString(),
  sources: SOURCES,
  counts: {
    supervisors: supervisors.size,
    agents: agents.size,
    cps: cps.size,
    routes: routes.size,
    lanes: lanes.size,
    total_unique_farmable_targets: supervisors.size + agents.size + cps.size + routes.size,
  },
  supervisors: [...supervisors].sort(),
  agents: [...agents].sort(),
  cps: [...cps].sort(),
  routes: [...routes].sort(),
  lanes: [...lanes],
};

const out = "C:/HyperBEHCS/store/dashboard-supervisor-roster-W113.json";
fs.writeFileSync(out, JSON.stringify(roster, null, 2));
const sha = crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex").slice(0, 16);
console.log("Roster written to", out);
console.log("sha:", sha);
console.log("Counts:", roster.counts);
console.log("");
console.log("First 10 supervisors:", roster.supervisors.slice(0, 10).join(", "));
console.log("First 10 agents:", roster.agents.slice(0, 10).join(", "));
console.log("Lanes:", roster.lanes.join(" | "));
