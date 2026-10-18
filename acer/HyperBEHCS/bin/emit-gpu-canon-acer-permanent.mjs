// PERMANENT canon lock for acer GPU inventory.
// Emits to 5 surfaces so no future agent can misread:
//   1. C:/HyperBEHCS/data/catalogs/gpu-canon-acer.hbp           (canon ledger)
//   2. C:/HyperBEHCS/store/autopilot-fires.hbp                  (autopilot row)
//   3. D:/AsolariaGuides/3d-slice-map/voxels/acer-gpu-canon.hbp (3D map voxel)
//   4. C:/HyperBEHCS/data/cubes/gpu-canon-acer-cube.hbp         (cube entry, D14 ENERGY)
//   5. C:/HyperBEHCS/data/catalogs/gpu-prof-supervisor-fix.hbp  (prof+supervisor correction)
//
// Brown-Hilbert position: H14EE (D14 ENERGY band, cube_value 79507, prime 43)
// Supervisor: forge (704-799 band — hardware/implementation supervisor)
// PROF: PROF-GPU-INVENTORY-CANON (new, replaces buggy cpu-gpu-watcher GPU side)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-GPU-CANON-PERMANENT-LOCK-2026-05-21";
const VANTAGE = "acer";
const ANCHOR_PID = "ASOLARIA-ACER-GPU-CANON-PERMANENT-LOCK-PID-2026-05-21";
const HCOORD = "H14EE";  // D14 ENERGY band, derived from cube_value 79507

function rowSha(body) {
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

// ========== 1. GPU CANON LEDGER (PERMANENT, IMMUTABLE) ==========
const CANON = "C:/HyperBEHCS/data/catalogs/gpu-canon-acer.hbp";
const canonRows = [
  { entry: "canon_lock_meta", kind: "lock_marker", anchor_pid: ANCHOR_PID, locked_at: TS, mutability: "IMMUTABLE-OPERATOR-PERMANENT", reason: "Multiple agents misread GPU specs over multiple sessions — operator escalation 2026-05-21" },
  { entry: "machine", value: "acer", hostname_alias: "asolaria-acer", lan_ip: "192.168.1.50", dashboard_port: 4949 },
  { entry: "cpu", model: "Intel Core i5-8300H @ 2.30GHz", logical_cores: 8, physical_cores: 4, arch: "x64", family: 6, model_num: 158, stepping: 10 },
  { entry: "system_ram_total_gb", value: 15.8, unit: "GB" },
  { entry: "gpu_dedicated_nvidia", name: "NVIDIA GeForce GTX 1050", dedicated_vram_gb: 4.0, cuda_compute: 6.1, architecture: "Pascal", driver_version: "32.0.15.8253", driver_date: "4/15/2026", directx: "12 FL 12.1", bus: "PCI 1" },
  { entry: "gpu_integrated_intel", name: "Intel(R) UHD Graphics 630", dedicated_vram_gb: 0, shares_system_memory: "true" },
  { entry: "gpu_shared_system_memory_pool_gb", value: 7.9, unit: "GB", note: "Shared between GTX 1050 and Intel UHD 630 — same system RAM pool, dynamic allocation" },
  { entry: "gtx_1050_total_addressable_gb", value: 11.9, unit: "GB", calculation: "4.0 dedicated + 7.9 shared", windows_task_manager_displays: "true", nvidia_smi_displays: "false" },
  { entry: "memory_accounting_canon_RULE_1", value: "nvidia-smi reports ONLY dedicated VRAM (4 GB) — DO NOT use this as total" },
  { entry: "memory_accounting_canon_RULE_2", value: "Task Manager reports TOTAL addressable (4 + 7.9 = 11.9 GB) — this is the federation-canonical total" },
  { entry: "memory_accounting_canon_RULE_3", value: "Both numbers are correct under different accounting; agents misreading caused recurring confusion 2026-05" },
  { entry: "memory_accounting_canon_RULE_4", value: "When operator says '12 GB GPU on acer' — they mean 11.9 GB total addressable Task Manager display, NOT a different card" },
  { entry: "memory_accounting_canon_RULE_5", value: "Probe sequence — nvidia-smi -L AND Get-PnpDevice -Class Display AND Task Manager screenshot if available. NEVER Get-WmiObject / Get-CimInstance (federation-wide HARD-DENY per IX-159 + liris ethernet-drop 2026-05-12)" },
  { entry: "training_feasibility_inference_gemma_3_4b_int4", value: "fits dedicated 4 GB cleanly, fast PCIe-local path" },
  { entry: "training_feasibility_training_with_checkpointing", value: "viable up to ~11 GB working set via CUDA unified memory + gradient checkpointing + activation offload — speed-limited by PCIe to shared portion" },
  { entry: "disks", value: "Disco 0 (D:) HDD RAID 21%, Disco 1 (C:) SSD RAID 18%, Disco 2 (F:) Removable USB" },
  { entry: "network", value: "2 Ethernet adapters (Npcap Loopback + primary) + Wi-Fi" },
  { entry: "12_gb_claim_on_other_vantages", value: "false — the '12 GB GPU' has always been acer's GTX 1050 total addressable; not liris, not falcon, not separate hardware" },
  { entry: "responsible_supervisor", value: "forge (band 704-799 — hardware/implementation)" },
  { entry: "responsible_prof", value: "PROF-GPU-INVENTORY-CANON (new, supersedes buggy memory-only reading of cpu-gpu-watcher.js)" },
  { entry: "brown_hilbert_position", value: HCOORD, dimension: "D14_ENERGY", cube_prime: 43, cube_value: 79507 },
  { entry: "future_agent_directive", value: "DO NOT MISREAD AGAIN. Cite this canon file by sha if challenged. Update both this file AND project_acer_gpu_inventory_2026_05_21.md memory if hardware changes — operator-witness required for mutation" },
];

let prev = "0000000000000000";
const canonLines = [];
const gen = ["HBPv1","catalog=gpu-canon-acer","layer=PERMANENT-CANON-LOCK","wave=" + WAVE,"vantage=" + VANTAGE,
  "anchor_pid=" + ANCHOR_PID,"mutability=IMMUTABLE-OPERATOR-PERMANENT","schema_version=1",
  "entries_expected=" + canonRows.length,"antecedents=" + prev,"ts=" + TS,
  "json=0","runtime=0","promote=0"].join("|");
const genH = rowSha(gen);
canonLines.push(gen + "|row_hash=" + genH);
prev = genH;
for (const r of canonRows) {
  const f = ["HBPv1","catalog=gpu-canon-acer"];
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined) continue;
    f.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
  }
  f.push("antecedents=" + prev, "ts=" + TS, "anchor_pid=" + ANCHOR_PID, "json=0", "runtime=0", "promote=0");
  const body = f.join("|");
  const rh = rowSha(body);
  canonLines.push(body + "|row_hash=" + rh);
  prev = rh;
}
fs.writeFileSync(CANON, canonLines.join("\n") + "\n");
const canonSha = crypto.createHash("sha256").update(fs.readFileSync(CANON)).digest("hex").slice(0, 16);
const canonTip = prev;

// ========== 2. 3D MAP VOXEL ==========
const VOXEL_DIR = "D:/AsolariaGuides/3d-slice-map/voxels";
fs.mkdirSync(VOXEL_DIR, { recursive: true });
const VOXEL_PATH = path.join(VOXEL_DIR, "acer-gpu-canon-permanent.hbp");
const voxelBody = [
  "HBPv1",
  "layer=voxel-3d-map",
  "wave=" + WAVE,
  "vantage=" + VANTAGE,
  "anchor_pid=" + ANCHOR_PID,
  "voxel_kind=gpu_inventory_canon_lock",
  "hilbert_coord=" + HCOORD,
  "dimension=D14_ENERGY",
  "cube_prime=43",
  "cube_value=79507",
  "x=4_dedicated_gb",
  "y=7.9_shared_gb",
  "z=11.9_total_gb",
  "color=permanent_red_canon_lock",
  "label=GTX-1050-acer-4dedicated+7.9shared=11.9total",
  "linked_canon_path=" + CANON,
  "linked_canon_sha=" + canonSha,
  "mutability=IMMUTABLE-OPERATOR-PERMANENT",
  "ts=" + TS,
  "json=0","runtime=0","promote=0",
].join("|");
const voxelSha = rowSha(voxelBody);
fs.writeFileSync(VOXEL_PATH, voxelBody + "|row_hash=" + voxelSha + "\n");

// ========== 3. CUBE LEDGER ==========
const CUBE_DIR = "C:/HyperBEHCS/data/cubes";
fs.mkdirSync(CUBE_DIR, { recursive: true });
const CUBE_PATH = path.join(CUBE_DIR, "gpu-canon-acer-cube.hbp");
const cubeBody = [
  "HBPv1",
  "layer=cube-entry",
  "wave=" + WAVE,
  "vantage=" + VANTAGE,
  "anchor_pid=" + ANCHOR_PID,
  "cube_id=D14_ENERGY_cube_acer_gpu",
  "cube_prime=43",
  "cube_value=79507",
  "cube_dimension=D14",
  "cube_sub=ENERGY",
  "contents=acer_gpu_inventory_canon_permanent_11.9_total",
  "linked_canon_path=" + CANON,
  "linked_canon_sha=" + canonSha,
  "linked_voxel_path=" + VOXEL_PATH,
  "responsible_supervisor=forge",
  "responsible_prof=PROF-GPU-INVENTORY-CANON",
  "ts=" + TS,
  "json=0","runtime=0","promote=0",
].join("|");
const cubeSha = rowSha(cubeBody);
fs.writeFileSync(CUBE_PATH, cubeBody + "|row_hash=" + cubeSha + "\n");

// ========== 4. PROF + SUPERVISOR FIX LEDGER ==========
const FIX_PATH = "C:/HyperBEHCS/data/catalogs/gpu-prof-supervisor-fix.hbp";
const fixRows = [
  { entry: "issue", value: "PROF/supervisor responsible for GPU inventory misread the spec multiple times in 2026-05 — caused operator frustration + recurring corrections" },
  { entry: "root_cause", value: "cpu-gpu-watcher.js + agents reading nvidia-smi treated dedicated 4 GB as total — missed Task Manager's 11.9 GB shared+dedicated number" },
  { entry: "prior_prof_buggy", value: "cpu-gpu-watcher (D14 ENERGY, cube 79507) — only emits nvidia-smi-derived dedicated-VRAM metric" },
  { entry: "new_prof", value: "PROF-GPU-INVENTORY-CANON", supersedes: "cpu-gpu-watcher-gpu-side", scope: "GPU inventory canon — full memory accounting (dedicated + shared = total addressable)" },
  { entry: "responsible_supervisor", value: "forge (band 704-799)", reason: "hardware/implementation supervisor band per W113 R3" },
  { entry: "fix_directive_1", value: "All future GPU inventory probes MUST capture BOTH nvidia-smi dedicated AND Task Manager total" },
  { entry: "fix_directive_2", value: "Update cpu-gpu-watcher.js to emit shared + total fields (deferred to operator-witness gate — code change in /tools/)" },
  { entry: "fix_directive_3", value: "PROF-GPU-INVENTORY-CANON owns the canon file C:/HyperBEHCS/data/catalogs/gpu-canon-acer.hbp — IMMUTABLE without operator-witness" },
  { entry: "fix_directive_4", value: "Memory entry project_acer_gpu_inventory_2026_05_21.md is the L1 reference — load early in any session that touches GPU" },
  { entry: "fix_directive_5", value: "If any agent claims acer has different GPU specs than this canon — CHALLENGE with this file's sha + operator-witness override required for canon mutation" },
];
let fixPrev = "0000000000000000";
const fixLines = [];
const fixGen = ["HBPv1","catalog=gpu-prof-supervisor-fix","layer=PERMANENT-PROF-CORRECTION","wave=" + WAVE,"vantage=" + VANTAGE,
  "anchor_pid=" + ANCHOR_PID,"entries_expected=" + fixRows.length,"antecedents=" + fixPrev,"ts=" + TS,
  "json=0","runtime=0","promote=0"].join("|");
const fixGenH = rowSha(fixGen);
fixLines.push(fixGen + "|row_hash=" + fixGenH);
fixPrev = fixGenH;
for (const r of fixRows) {
  const f = ["HBPv1","catalog=gpu-prof-supervisor-fix"];
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined) continue;
    f.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
  }
  f.push("antecedents=" + fixPrev, "ts=" + TS, "anchor_pid=" + ANCHOR_PID, "json=0", "runtime=0", "promote=0");
  const body = f.join("|");
  const rh = rowSha(body);
  fixLines.push(body + "|row_hash=" + rh);
  fixPrev = rh;
}
fs.writeFileSync(FIX_PATH, fixLines.join("\n") + "\n");
const fixSha = crypto.createHash("sha256").update(fs.readFileSync(FIX_PATH)).digest("hex").slice(0, 16);

// ========== 5. AUTOPILOT-FIRES + POLICY EVENT ==========
const fireBody = [
  "HBPv1","layer=autopilot-fire","wave=" + WAVE,"vantage=" + VANTAGE,
  "fire_pid=AGT-FORGE-PROF-GPU-INVENTORY-CANON-LOCK-" + HCOORD + "-W113-F" + Math.random().toString(36).slice(2, 8),
  "fired_ts=" + TS,
  "anchor_pid=" + ANCHOR_PID,
  "advisor_verdict=GUIDED-EXECUTE-via-operator-permanent-mark-directive",
  "advisor_audit_row=operator-direct-PERMANENTLY-MARK-INDEX-MAP-CUBE-FIX-PROF",
  "candidate_verb=permanent-canon-lock+voxel-emit+cube-entry+prof-correction",
  "envelope_emitted_to=gpu-canon-acer.hbp+3d-map-voxel+cube-entry+prof-fix-ledger",
  "envelope_receipt_received=true",
  "class=A-envelope-emitted",
  "canon_path=" + CANON,
  "canon_sha=" + canonSha,
  "canon_tip_row=" + canonTip,
  "voxel_path=" + VOXEL_PATH,
  "voxel_sha=" + voxelSha,
  "cube_path=" + CUBE_PATH,
  "cube_sha=" + cubeSha,
  "fix_path=" + FIX_PATH,
  "fix_sha=" + fixSha,
  "reason=operator-escalation-multiple-agents-misread-GPU-specs-2026-05-permanent-lock-with-5-surface-emission",
  "antecedents=prev-fire-fcc3102a87491911,project_acer_gpu_inventory_2026_05_21",
  "json=0","runtime=0","promote=0","ts=" + TS,
].join("|");
const fireSha = rowSha(fireBody);
fs.appendFileSync("C:/HyperBEHCS/store/autopilot-fires.hbp", fireBody + "|row_hash=" + fireSha + "\n");

console.log("=== PERMANENT GPU CANON LOCK COMPLETE ===");
console.log("1. CANON LEDGER:", CANON);
console.log("   sha:", canonSha, "rows:", canonRows.length + 1, "tip:", canonTip);
console.log("2. 3D MAP VOXEL:", VOXEL_PATH);
console.log("   sha:", voxelSha);
console.log("3. CUBE ENTRY:", CUBE_PATH);
console.log("   sha:", cubeSha);
console.log("4. PROF+SUPERVISOR FIX:", FIX_PATH);
console.log("   sha:", fixSha, "rows:", fixRows.length + 1);
console.log("5. AUTOPILOT-FIRES row:", fireSha);
console.log("");
console.log("ANCHOR PID:", ANCHOR_PID);
console.log("Brown-Hilbert position:", HCOORD, "(D14 ENERGY, cube prime 43, cube value 79507)");
console.log("Responsible: PROF-GPU-INVENTORY-CANON under supervisor forge (band 704-799)");
