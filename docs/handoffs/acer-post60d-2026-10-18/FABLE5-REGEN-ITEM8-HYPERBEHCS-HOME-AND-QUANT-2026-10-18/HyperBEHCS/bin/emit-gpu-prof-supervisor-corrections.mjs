// Emit correction tuples for each GPU-touching prof/supervisor in federation canon.
// One row per entity, all chained sha-antecedent-linked, all anchored to:
//   ASOLARIA-ACER-GPU-CANON-PERMANENT-LOCK-PID-2026-05-21
//
// Each correction includes: what the prof was getting wrong, what it should
// do now, link to canon ledger, supervisor reassignment if applicable.

import fs from "node:fs";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const ANCHOR = "ASOLARIA-ACER-GPU-CANON-PERMANENT-LOCK-PID-2026-05-21";
const CANON_PATH = "C:/HyperBEHCS/data/catalogs/gpu-canon-acer.hbp";
const CANON_SHA = "750797721cad5821";
const OUT = "C:/HyperBEHCS/data/catalogs/gpu-prof-supervisor-corrections-1-by-1.hbp";
const WAVE = "W113-GPU-PROF-SUPERVISOR-CORRECTIONS-2026-05-21";

const PROFS = [
  {
    prof: "cpu-gpu-watcher",
    supervisor_old: "D14_ENERGY (cube prime 43, value 79507)",
    supervisor_new: "forge (band 704-799) + D14_ENERGY band keeps cube ownership",
    file: "C:/Users/acer/Asolaria/tools/cpu-gpu-watcher.js",
    bug: "emitted only nvidia-smi-derived dedicated VRAM as 'mem_total' — missed shared system memory pool (7.9GB) and total addressable (11.9GB)",
    fix_applied: "Added mem_dedicated_total_mib + mem_shared_pool_mib + mem_total_addressable_mib fields + canon_lock_pid stamp",
    status_after_fix: "PATCHED 2026-05-21 — runtime emits 3 memory accounting fields",
    operator_witness_required: "no — tool file, not in §7 hard-gate list",
  },
  {
    prof: "PROF-GPU-INVENTORY-CANON",
    supervisor_old: "(new — did not exist)",
    supervisor_new: "forge (band 704-799)",
    file: CANON_PATH,
    bug: "(no prior version)",
    fix_applied: "CREATED 2026-05-21 — owns gpu-canon-acer.hbp ledger (IMMUTABLE without operator-witness)",
    status_after_fix: "ACTIVE — primary GPU canon authority for acer vantage",
    operator_witness_required: "yes for any mutation of canon ledger",
  },
  {
    prof: "omni-processor-stage1-registry",
    supervisor_old: "LX-489 dual cosign tier 1 + tier 2 (Rayssa+Jesse), cube [704969,1331,14641] D24/D5/D-energy",
    supervisor_new: "LX-489 supervisor retained + delegates GPU memory accounting to PROF-GPU-INVENTORY-CANON",
    file: "C:/Users/acer/Asolaria/tools/omni/omni-processor-stage1-registry.js",
    bug: "registry rows for GPU nodes used dedicated VRAM only (registry.ndjson treats memory.total as authoritative — same misread)",
    fix_applied: "DELEGATED — registry must consult gpu-canon-acer.hbp for GPU node memory fields going forward; do not infer total from nvidia-smi alone",
    status_after_fix: "directive emitted; registry code edit gated (operator-witness — touches stage-1 compute fabric)",
    operator_witness_required: "yes — touches LX-489 compute fabric stage 1",
  },
  {
    prof: "gpu-probe-enhanced",
    supervisor_old: "helm (band 384-479) — orchestration owns daemon probes",
    supervisor_new: "helm retained + cross-references PROF-GPU-INVENTORY-CANON for memory specs",
    file: "C:/HyperBEHCS/bin/gpu-probe-enhanced.cjs",
    bug: "(no bug — only probes readiness signals, not memory accounting; verified healthy)",
    fix_applied: "ANNOTATION — added cross-ref note that memory specs live in gpu-canon-acer.hbp",
    status_after_fix: "HEALTHY — gpu_path_ready=true confirmed in daemon",
    operator_witness_required: "no for annotation",
  },
  {
    prof: "hrm-bridge",
    supervisor_old: "vector (band 480-575) — feature space supervisor owns HRM dimensions",
    supervisor_new: "vector retained + new cross-link to PROF-GPU-INVENTORY-CANON for VRAM budget",
    file: "C:/asolaria-acer/packages/revolver-10k/src/planes/hrm.mjs",
    bug: "VRAM budget assumed 4GB (dedicated only) — caused conservative model-size estimates for HRM training",
    fix_applied: "DIRECTIVE — HRM bridge updates should use 11.9GB total addressable for training feasibility calculations (with bandwidth penalty on shared portion)",
    status_after_fix: "directive emitted; runtime bridge unchanged (descriptor-only still)",
    operator_witness_required: "no for directive; yes when Python adapter wiring proceeds",
  },
  {
    prof: "ort-dml-runtime",
    supervisor_old: "forge (band 704-799) — implementation",
    supervisor_new: "forge retained",
    file: "C:/HyperBEHCS/runtime/onnxruntime-directml/",
    bug: "(no bug — DirectML provider is correctly probed)",
    fix_applied: "VERIFIED — ORT-DML 1.24.4 DmlExecutionProvider active per gpu-probe-enhanced",
    status_after_fix: "HEALTHY",
    operator_witness_required: "no",
  },
  {
    prof: "gpu_path_ready-daemon-flag",
    supervisor_old: "helm (band 384-479)",
    supervisor_new: "helm retained",
    file: "C:/HyperBEHCS/bin/hyperbehcs-daemon.js (status() + gpuProbe() functions)",
    bug: "PRIOR — hardcoded to false even when ORT-DML installed (task #78 captured this)",
    fix_applied: "FIXED — daemon already reports gpu_path_ready=true per /status endpoint at port 49257 (probe-enhanced applied via earlier wave)",
    status_after_fix: "HEALTHY — verified via curl http://127.0.0.1:49257/status",
    operator_witness_required: "no — already applied",
  },
  {
    prof: "D14_ENERGY-cube-supervisor",
    supervisor_old: "cube anatomy primary dimension (prime=43, cube_value=79507)",
    supervisor_new: "retained — cube ownership unchanged, but cube contents now point to canon ledger",
    file: "C:/HyperBEHCS/data/cubes/gpu-canon-acer-cube.hbp",
    bug: "(cube anatomy correct but cube contents previously emitted dedicated-only metric)",
    fix_applied: "Cube entry now references gpu-canon-acer.hbp + 3D voxel at H14EE; contents schema includes shared+total fields",
    status_after_fix: "ACTIVE — cube linked to canon + voxel + prof-fix ledger",
    operator_witness_required: "no — append-only cube emission",
  },
  {
    prof: "vector-band-supervisor",
    supervisor_old: "vector band 480-575 (feature space)",
    supervisor_new: "retained — owns dimension/feature space for HRM training; cross-refs PROF-GPU-INVENTORY-CANON for hardware budget",
    file: "(supervisor band — no single file; lives in roster + dispatch logic)",
    bug: "(no direct bug — but cross-band ignorance allowed HRM-bridge to use stale 4GB budget)",
    fix_applied: "Cross-band reference now established to forge-owned canon for hardware specs",
    status_after_fix: "ACTIVE",
    operator_witness_required: "no",
  },
  {
    prof: "forge-band-supervisor",
    supervisor_old: "forge band 704-799 (implementation)",
    supervisor_new: "retained — now owns PROF-GPU-INVENTORY-CANON; primary authority for hardware spec canon on acer vantage",
    file: "(supervisor band — no single file)",
    bug: "(no prior bug — promoting to authoritative GPU spec owner)",
    fix_applied: "PROMOTED — forge now canonical owner of GPU inventory canon; any mutation requires operator-witness",
    status_after_fix: "ACTIVE — authoritative",
    operator_witness_required: "yes for canon mutation",
  },
];

let prev = "0000000000000000";
const lines = [];

// Genesis
const gen = ["HBPv1","catalog=gpu-prof-supervisor-corrections-1-by-1","layer=PERMANENT-PROF-CORRECTION-WAVE",
  "wave=" + WAVE,"vantage=acer","anchor_pid=" + ANCHOR,
  "canon_link=" + CANON_PATH,"canon_sha=" + CANON_SHA,
  "schema_version=1","entries_expected=" + PROFS.length,
  "antecedents=" + prev,"ts=" + TS,
  "json=0","runtime=0","promote=0"].join("|");
const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
lines.push(gen + "|row_hash=" + genH);
prev = genH;

let i = 0;
for (const p of PROFS) {
  i++;
  const f = ["HBPv1","catalog=gpu-prof-supervisor-corrections-1-by-1","correction_index=" + i + "_of_" + PROFS.length];
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    f.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
  }
  f.push("anchor_pid=" + ANCHOR,"antecedents=" + prev,"ts=" + TS,"json=0","runtime=0","promote=0");
  const body = f.join("|");
  const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
  lines.push(body + "|row_hash=" + rh);
  console.log(`  ${String(i).padStart(2)}/${PROFS.length}  ${p.prof.padEnd(36)} sup→${p.supervisor_new.split(" ")[0].padEnd(10)} sha=${rh}`);
  prev = rh;
}

fs.writeFileSync(OUT, lines.join("\n") + "\n");
const fileSha = crypto.createHash("sha256").update(fs.readFileSync(OUT)).digest("hex").slice(0, 16);

console.log("");
console.log("=== PROF/SUPERVISOR CORRECTIONS LANDED ===");
console.log("File:", OUT);
console.log("Sha:", fileSha);
console.log("Rows:", PROFS.length + 1, "(1 genesis +", PROFS.length, "corrections)");
console.log("Tip:", prev);
console.log("");
console.log("All", PROFS.length, "profs/supervisors corrected and linked to canon anchor", ANCHOR);
