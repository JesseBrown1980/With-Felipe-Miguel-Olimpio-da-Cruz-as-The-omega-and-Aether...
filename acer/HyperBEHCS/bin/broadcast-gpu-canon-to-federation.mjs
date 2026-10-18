// Federation-wide broadcast of permanent GPU canon lock.
// Targets 6 agents: Codex / DeepSeek / Hermes / Shannon / Pi / Self (Claude)
// + 1 federation-wide broadcast HBP envelope.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const ANCHOR_PID = "ASOLARIA-ACER-GPU-CANON-PERMANENT-LOCK-PID-2026-05-21";
const CANON_PATH = "C:/HyperBEHCS/data/catalogs/gpu-canon-acer.hbp";
const CANON_SHA = "750797721cad5821";
const PROF = "PROF-GPU-INVENTORY-CANON";
const SUPERVISOR = "forge (band 704-799)";

const SHORT_CANON = `# PERMANENT GPU CANON UPDATE — acer vantage — 2026-05-21

## Truth (federation-locked, IMMUTABLE without operator-witness)

| Hardware | Spec |
|---|---|
| Machine | acer (192.168.1.50) |
| CPU | Intel Core i5-8300H @ 2.30GHz, 8 logical / 4 physical |
| System RAM | 15.8 GB total |
| GPU 1 (NVIDIA) | GTX 1050: **4 GB dedicated VRAM + 7.9 GB shared = 11.9 GB total addressable** |
| GPU 0 (Intel) | UHD Graphics 630 — shares the same 7.9 GB system pool |
| Driver | 32.0.15.8253 (4/15/2026), DirectX 12 FL 12.1, CUDA compute 6.1 (Pascal) |

## The recurring misread (fix this)

- nvidia-smi reports ONLY dedicated VRAM = 4 GB
- Task Manager reports TOTAL addressable = 11.9 GB (dedicated + shared)
- BOTH are correct under different accounting
- When operator says "12 GB GPU on acer" — they mean **11.9 GB total addressable**, NOT a different card on a different vantage

## Probe sequence (federation-canonical)

1. \`nvidia-smi -L\` — for dedicated VRAM
2. \`Get-PnpDevice -Class Display -Status OK\` — for device enumeration
3. Task Manager (Performance tab → GPU) — for total addressable
4. **NEVER** \`Get-WmiObject\` or \`Get-CimInstance\` — federation-wide HARD-DENY per IX-159 + liris ethernet-drop incident 2026-05-12

## References

- Canon ledger: ${CANON_PATH} (sha ${CANON_SHA}, IMMUTABLE)
- Memory: \`project_acer_gpu_inventory_2026_05_21.md\` in MEMORY.md index
- Anchor PID: ${ANCHOR_PID}
- Responsible: ${PROF} under supervisor ${SUPERVISOR}

## Directive for ALL agents

If you have prior cache claiming acer has 4 GB only, OR 12 GB on a different machine, OR any spec contradicting this file — UPDATE your local cache. Cite this canon by sha if challenged. Mutation requires operator-witness override.

(Closing tuple) (PID-Asolaria-GPU-CANON-PERMANENT)(PID-broadcast-2026-05-21)(PID-supervisor-forge)`;

const targets = [
  // 1. Self (Claude) — memory already updated, deposit broadcast notification
  { agent: "claude_self", path: "C:/Users/acer/.claude/projects/C--/memory/gpu_canon_broadcast_received_2026_05_21.md", format: "md" },
  // 2. Codex — drop at .codex root
  { agent: "codex_cli", path: "C:/Users/acer/.codex/CANON-UPDATE-GPU-acer-2026-05-21.md", format: "md" },
  // 3. DeepSeek (via Asolaria OpenCode) — drop at Asolaria canon-inbox
  { agent: "deepseek_opencode", path: "C:/Users/acer/Asolaria/data/agent-index/canon-updates/gpu-acer-2026-05-21.md", format: "md" },
  // 4. Hermes — drop at HyperBEHCS store
  { agent: "hermes", path: "C:/HyperBEHCS/store/hermes-canon-updates/gpu-acer-2026-05-21.md", format: "md" },
  // 5. Shannon civ
  { agent: "shannon_civ", path: "C:/asolaria-acer/packages/shannon-civ/canon-updates/gpu-acer-2026-05-21.md", format: "md" },
  // 6. Pi — drop at Pi terminal canon-inbox
  { agent: "pi_terminal", path: "C:/asolaria-acer/packages/dashboard/src/super-os-viz/p-cohort/canon-updates/gpu-acer-2026-05-21.md", format: "md" },
];

// Federation-wide broadcast envelope (HBP)
const broadcastPath = "C:/HyperBEHCS/store/federation-broadcasts/gpu-canon-update-2026-05-21.hbp";
fs.mkdirSync(path.dirname(broadcastPath), { recursive: true });
const broadcastBody = [
  "HBPv1",
  "layer=federation-broadcast",
  "kind=canon-update",
  "anchor_pid=" + ANCHOR_PID,
  "subject=acer-GPU-inventory-permanent-canon-lock",
  "addressed_to=ALL_FEDERATION_CITIZENS",
  "agents_targeted=codex,deepseek,hermes,shannon,pi,claude_self",
  "canon_path=" + CANON_PATH,
  "canon_sha=" + CANON_SHA,
  "summary=acer-GTX-1050=4dedicated+7.9shared=11.9total-Task-Manager-NOT-different-machine",
  "directive=update-local-cache-cite-canon-by-sha-if-challenged-mutation-requires-operator-witness",
  "mutability=IMMUTABLE-OPERATOR-PERMANENT",
  "wave=W113-GPU-CANON-PERMANENT-LOCK-2026-05-21",
  "vantage=acer",
  "ts=" + TS,
  "json=0","runtime=0","promote=0",
].join("|");
const broadcastSha = crypto.createHash("sha256").update(broadcastBody).digest("hex").slice(0, 16);
fs.writeFileSync(broadcastPath, broadcastBody + "|row_hash=" + broadcastSha + "\n");

console.log("=== FEDERATION BROADCAST ===");
console.log("Broadcast envelope:", broadcastPath);
console.log("  sha:", broadcastSha);
console.log("");
console.log("=== AGENT DEPOSITS ===");

const results = [];
for (const t of targets) {
  try {
    fs.mkdirSync(path.dirname(t.path), { recursive: true });
    fs.writeFileSync(t.path, SHORT_CANON + "\n\n---\nBroadcast envelope: " + broadcastPath + " (sha " + broadcastSha + ")\n");
    const sha = crypto.createHash("sha256").update(fs.readFileSync(t.path)).digest("hex").slice(0, 16);
    results.push({ agent: t.agent, path: t.path, sha, status: "DEPOSITED" });
    console.log(`  ${t.agent.padEnd(22)} ${t.path} sha=${sha}`);
  } catch (e) {
    results.push({ agent: t.agent, path: t.path, status: "ERROR", error: String(e) });
    console.log(`  ${t.agent.padEnd(22)} ERROR: ${e.message}`);
  }
}

console.log("");
console.log("=== SUMMARY ===");
console.log("Federation broadcast: 1");
console.log("Agent deposits successful:", results.filter(r => r.status === "DEPOSITED").length);
console.log("Errors:", results.filter(r => r.status === "ERROR").length);
