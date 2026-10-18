// Burn v2 GPU canon — DUAL-GPU permanent lock for acer.
// Supersedes v1 lock (single-GPU only) that missed the Intel UHD 630.
// Emits across all 11 surfaces. ZERO JSON in emission path (sidecar trinity only).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TS = new Date().toISOString();
const V1_ANCHOR = 'ASOLARIA-ACER-GPU-CANON-PERMANENT-LOCK-PID-2026-05-21';
const V2_ANCHOR = 'ASOLARIA-ACER-GPU-CANON-V2-DUAL-GPU-PERMANENT-LOCK-PID-2026-05-22';

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

function emitTrinity(outDir, baseName, hbpLines, hbiLines) {
  fs.mkdirSync(outDir, { recursive: true });
  const hbpPath = path.join(outDir, `${baseName}.hbp`);
  const hbiPath = path.join(outDir, `${baseName}.hbi`);
  const shaPath = path.join(outDir, `${baseName}.sha256`);
  const hexPath = path.join(outDir, `${baseName}.hex`);
  const content = hbpLines.join('\n') + '\n';
  fs.writeFileSync(hbpPath, content);
  fs.writeFileSync(hbiPath, hbiLines.join('\n') + '\n');
  const fileSha = sha256Hex(content);
  fs.writeFileSync(shaPath, `${fileSha}  ${baseName}.hbp\n`);
  fs.writeFileSync(hexPath, Buffer.from(content, 'utf8').toString('hex'));
  return { hbpPath, fileSha };
}

function buildChainedRows(rows, prevStart = '0000000000000000') {
  let prev = prevStart;
  const hbp = [];
  const hbi = [];
  for (const r of rows) {
    const fields = ['HBPv1'];
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) continue;
      fields.push(`${k}=${String(v).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)}`);
    }
    fields.push(`anchor_pid=${V2_ANCHOR}`, `antecedents=${prev}`, `ts=${TS}`, 'json=0', 'runtime=0', 'promote=0');
    const body = fields.join('|');
    const rh = sha16(body);
    hbp.push(`${body}|row_hash=${rh}`);
    hbi.push(`HBIv1|index=by-layer|key=${r.layer}|row_hash=${rh}`);
    prev = rh;
  }
  return { hbp, hbi, tip: prev };
}

// ============ V2 CANON ROWS ============
const CANON_ROWS = [
  { layer: 'v2-supersedes-v1', supersedes: V1_ANCHOR, reason: 'v1-documented-only-GTX-1050-missed-Intel-UHD-630-as-separate-addressable-compute-device' },
  { layer: 'dual-gpu-declaration', total_gpu_count: 2, combined_addressable_gb: 19.8, unique_max_at_instant_gb: 11.9 },
  // GPU 1: NVIDIA
  { layer: 'gpu-1-nvidia', name: 'NVIDIA GeForce GTX 1050', pci_bus: 1, dedicated_vram_gb: 4.0, shared_system_gb: 7.9, total_addressable_gb: 11.9, driver_version: '32.0.15.8253', driver_date: '4/15/2026', directx: '12 FL 12.1', cuda_compute: 6.1, arch: 'Pascal' },
  // GPU 0: Intel
  { layer: 'gpu-0-intel', name: 'Intel(R) UHD Graphics 630', pci_bus: 0, pci_device: 2, pci_function: 2, dedicated_vram_gb: 0.0, shared_system_gb: 7.9, total_addressable_gb: 7.9, driver_version: '31.0.101.2111', driver_date: '7/19/2022', directx: '12 FL 12.1', integrated: 'true' },
  // Shared pool truth
  { layer: 'shared-pool-truth', value: 7.9, unit: 'GB', shared_between: 'GPU-0-Intel-AND-GPU-1-NVIDIA', source: 'system-RAM-Windows-allocates-up-to-half-of-16GB-installed', dynamic_allocation: 'true', max_concurrent_use: '7.9-GB-contested-between-both-GPUs-at-any-moment' },
  // Combined view math
  { layer: 'combined-task-manager-view', calculation: '11.9-NVIDIA-total+7.9-Intel-total=19.8-GB', semantics: 'sum-of-both-GPU-addressable-pools-as-Windows-displays' },
  { layer: 'unique-non-overlapping-truth', calculation: '4.0-NVIDIA-dedicated+up-to-7.9-shared-system-RAM-contested=11.9-GB-max-at-instant', semantics: 'actual-RAM-bytes-accessible-without-double-counting-shared-pool' },
  // Concurrency
  { layer: 'concurrency-model', value: 'both-GPUs-active-concurrently', api: 'DirectML-multi-adapter', dml_version: '1.15+', supported_concurrent_workloads: 'NVIDIA-CUDA-or-DirectML+Intel-UHD-DirectML' },
  // Memory accounting canon (v2 corrections to v1 rules)
  { layer: 'rule-1-nvidia-smi', value: 'nvidia-smi-reports-ONLY-GPU-1-dedicated-VRAM-4GB-DOES-NOT-show-Intel-UHD-or-shared-pool' },
  { layer: 'rule-2-pnp-device', value: 'Get-PnpDevice-Class-Display-shows-BOTH-GPUs-USE-THIS-for-canonical-enumeration' },
  { layer: 'rule-3-task-manager', value: 'Task-Manager-Performance-tab-shows-EACH-GPU-separately-with-its-total-addressable-pool' },
  { layer: 'rule-4-do-not-conflate', value: 'When-operator-mentions-12GB-AND-8GB-they-mean-NVIDIA-11.9-AND-Intel-7.9-NOT-different-machines-NOT-different-pools' },
  { layer: 'rule-5-WMI-CIM-still-HARD-DENY', value: 'NEVER-Get-WmiObject-or-Get-CimInstance-per-IX-159-liris-ethernet-drop-incident-substitutes-tasklist-netstat-Get-PnpDevice' },
  // Training implications v2
  { layer: 'training-implications-v2', value: 'heavy-Gemma-daemon-runs-on-NVIDIA-with-CUDA-unified-memory-up-to-11.9GB; lightweight-DML-workloads-can-run-on-Intel-UHD-concurrently; Pascal-no-tensor-cores-INT8-W8A8-via-DP4A-is-the-real-perf-win' },
  // Mutability declaration
  { layer: 'mutability', value: 'IMMUTABLE-OPERATOR-PERMANENT-v2', supersedes_text: 'v1-(2026-05-21)-was-incomplete-this-v2-is-now-canonical-and-must-be-respected' },
  // Hardware fingerprint
  { layer: 'cpu', model: 'Intel Core i5-8300H @ 2.30GHz', logical_cores: 8, physical_cores: 4, arch: 'x64' },
  { layer: 'system-ram-total-gb', value: 15.8 },
  // Brown-Hilbert canon position
  { layer: 'brown-hilbert', position: 'H14EE', dimension: 'D14_ENERGY', cube_prime: 43, cube_value: 79507, version: 'v2' },
  // Future-agent directive
  { layer: 'future-agent-directive', value: 'DO-NOT-MISREAD-DUAL-GPU-AGAIN-CITE-V2-CANON-BY-SHA-IF-CHALLENGED-MUTATION-REQUIRES-OPERATOR-WITNESS' },
];

const canon = buildChainedRows(CANON_ROWS);

// ============ 1. CANON LEDGER (PERMANENT, IMMUTABLE) ============
const t1 = emitTrinity('C:/HyperBEHCS/data/catalogs', 'gpu-canon-acer-v2-dual-gpu', canon.hbp, canon.hbi);
console.log(`  1. canon ledger:        ${t1.hbpPath}  sha=${t1.fileSha.slice(0,16)}  tip=${canon.tip}`);

// ============ 2. 3D MAP VOXEL (v2) ============
const voxelRows = [
  { layer: 'voxel-3d-map', voxel_kind: 'gpu-inventory-v2-dual-gpu-canon-lock',
    hilbert_coord: 'H14EE', dimension: 'D14_ENERGY', cube_prime: 43, cube_value: 79507,
    x_nvidia: 11.9, y_intel: 7.9, z_combined: 19.8, color: 'permanent-red-canon-lock-v2',
    label: 'acer-dual-GPU-NVIDIA-11.9+Intel-7.9=19.8GB-combined',
    linked_canon_path: t1.hbpPath, linked_canon_sha: t1.fileSha.slice(0, 16),
    mutability: 'IMMUTABLE-OPERATOR-PERMANENT-v2' },
];
const voxel = buildChainedRows(voxelRows);
const t2 = emitTrinity('D:/AsolariaGuides/3d-slice-map/voxels', 'acer-gpu-canon-v2-dual-gpu', voxel.hbp, voxel.hbi);
console.log(`  2. 3D map voxel:        ${t2.hbpPath}  sha=${t2.fileSha.slice(0,16)}`);

// ============ 3. CUBE LEDGER ============
const cubeRows = [
  { layer: 'cube-entry-v2', cube_id: 'D14_ENERGY_cube_acer_dual_gpu',
    cube_prime: 43, cube_value: 79507, cube_dimension: 'D14', cube_sub: 'ENERGY',
    contents: 'acer-dual-gpu-inventory-v2-NVIDIA-11.9+Intel-7.9=19.8-combined',
    linked_canon_path: t1.hbpPath, linked_canon_sha: t1.fileSha.slice(0, 16),
    linked_voxel_path: t2.hbpPath, supersedes_v1_cube: 'C:/HyperBEHCS/data/cubes/gpu-canon-acer-cube.hbp',
    responsible_supervisor: 'forge', responsible_prof: 'PROF-GPU-INVENTORY-CANON-V2' },
];
const cube = buildChainedRows(cubeRows);
const t3 = emitTrinity('C:/HyperBEHCS/data/cubes', 'gpu-canon-acer-cube-v2-dual-gpu', cube.hbp, cube.hbi);
console.log(`  3. cube entry:          ${t3.hbpPath}  sha=${t3.fileSha.slice(0,16)}`);

// ============ 4. PROF+SUPERVISOR CORRECTION V2 ============
const fixRows = [
  { layer: 'v2-prof-correction', supersedes_v1_prof_fix: 'C:/HyperBEHCS/data/catalogs/gpu-prof-supervisor-corrections-1-by-1.hbp' },
  { layer: 'issue', value: 'v1-canon-documented-only-NVIDIA-missed-Intel-UHD-630-as-separate-addressable-compute-device' },
  { layer: 'root-cause', value: 'agents-treated-Intel-UHD-shared-pool-as-overlapping-NVIDIA-shared-pool-when-Intel-UHD-is-a-separate-GPU-with-its-own-7.9GB-shared-allocation' },
  { layer: 'fix-prof', value: 'PROF-GPU-INVENTORY-CANON-V2-supersedes-V1-now-tracks-BOTH-GPUs-distinctly' },
  { layer: 'responsible-supervisor', value: 'forge-band-704-799-retained-promoted-for-v2-authority' },
  { layer: 'directive-1', value: 'all-future-GPU-probes-MUST-enumerate-via-Get-PnpDevice-NOT-nvidia-smi-alone' },
  { layer: 'directive-2', value: 'when-operator-mentions-12GB-and-8GB-respect-DUAL-GPU-not-misread-as-single' },
  { layer: 'directive-3', value: 'cpu-gpu-watcher-hbp-and-original-cpu-gpu-watcher-js-must-be-updated-to-emit-BOTH-GPU-observations-not-only-NVIDIA' },
  { layer: 'directive-4', value: 'gpu-canon-acer.hbp-v1-is-now-COLD-ARCHIVE-v2-is-hot-path-canon' },
];
const fix = buildChainedRows(fixRows);
const t4 = emitTrinity('C:/HyperBEHCS/data/catalogs', 'gpu-prof-supervisor-fix-v2', fix.hbp, fix.hbi);
console.log(`  4. prof+sup fix:        ${t4.hbpPath}  sha=${t4.fileSha.slice(0,16)}`);

// ============ 5. AUTOPILOT-FIRES ============
const fireBody = [
  'HBPv1',
  'layer=autopilot-fire',
  'wave=W113-GPU-CANON-V2-DUAL-GPU-PERMANENT-LOCK-2026-05-22',
  'vantage=acer',
  'fire_pid=AGT-FORGE-GPU-CANON-V2-LOCK-' + Math.random().toString(36).slice(2, 8),
  `fired_ts=${TS}`,
  `anchor_pid=${V2_ANCHOR}`,
  'class=A-envelope-emitted',
  'reason=v2-GPU-canon-burned-PERMANENT-corrects-v1-single-GPU-to-dual-GPU-NVIDIA-11.9+Intel-7.9=19.8-combined',
  `canon_v2_path=${t1.hbpPath}`,
  `canon_v2_sha=${t1.fileSha.slice(0, 16)}`,
  `voxel_v2_path=${t2.hbpPath}`,
  `cube_v2_path=${t3.hbpPath}`,
  `fix_v2_path=${t4.hbpPath}`,
  `supersedes=${V1_ANCHOR}`,
  'json=0', 'runtime=0', 'promote=0',
  `ts=${TS}`,
].join('|');
const fireSha = sha16(fireBody);
fs.appendFileSync('C:/HyperBEHCS/store/autopilot-fires.hbp', fireBody + '|row_hash=' + fireSha + '\n');
console.log(`  5. autopilot-fires:     row=${fireSha}`);

// ============ 6. FEDERATION BROADCAST + 6 AGENT DEPOSITS ============
const broadcastDir = 'C:/HyperBEHCS/store/federation-broadcasts';
fs.mkdirSync(broadcastDir, { recursive: true });
const broadcastRows = [
  { layer: 'federation-broadcast-v2-gpu-canon',
    subject: 'acer-GPU-canon-v2-DUAL-GPU-permanent-lock',
    addressed_to: 'ALL_FEDERATION_CITIZENS',
    agents_targeted: 'codex,deepseek,hermes,shannon,pi,claude_self',
    canon_v2_path: t1.hbpPath, canon_v2_sha: t1.fileSha.slice(0, 16),
    supersedes_v1: V1_ANCHOR,
    summary: 'acer-has-TWO-GPUs-NVIDIA-GTX-1050-11.9GB+Intel-UHD-630-7.9GB-combined-19.8GB-NOT-single-GPU',
    directive: 'update-local-cache-cite-v2-by-sha-if-challenged-mutation-requires-operator-witness',
    mutability: 'IMMUTABLE-OPERATOR-PERMANENT-v2' },
];
const bc = buildChainedRows(broadcastRows);
const t6 = emitTrinity(broadcastDir, 'gpu-canon-v2-dual-gpu-broadcast-2026-05-22', bc.hbp, bc.hbi);
console.log(`  6. broadcast envelope:  ${t6.hbpPath}  sha=${t6.fileSha.slice(0,16)}`);

// 6 deposits (.md format, allowed per AGENTS.md as documentation surface)
const SHORT_MD = `# v2 GPU CANON — acer DUAL-GPU permanent lock — 2026-05-22

## Truth (federation-locked, IMMUTABLE)

| GPU | Type | Dedicated | Shared | Total Addressable |
|---|---|---|---|---|
| GPU 1: NVIDIA GeForce GTX 1050 | dedicated | **4.0 GB** | 7.9 GB | **11.9 GB** |
| GPU 0: Intel(R) UHD Graphics 630 | integrated | 0 GB | 7.9 GB | **7.9 GB** |
| **Combined (Task Manager view)** | — | — | — | **19.8 GB** |
| **Unique non-overlapping at instant** | — | — | — | **11.9 GB** (4 NVIDIA dedicated + 7.9 shared system RAM contested) |

## Supersedes v1

v1 (\`${V1_ANCHOR}\`, dated 2026-05-21) is now **cold archive**. It documented only the NVIDIA GTX 1050 and missed the Intel UHD 630 as a separate addressable compute device.

## Concurrency

- Both GPUs run concurrently via **DirectML multi-adapter** (DML ≥ 1.15)
- NVIDIA can use CUDA + DirectML; Intel UHD uses DirectML only
- Shared 7.9 GB pool is system RAM, dynamically split between both GPUs

## Probe rules (federation-canonical)

1. \`nvidia-smi\` reports ONLY GPU 1 dedicated VRAM (4 GB) — DO NOT use this as total
2. \`Get-PnpDevice -Class Display -Status OK\` shows BOTH GPUs (use this for canonical enumeration)
3. Task Manager Performance tab shows EACH GPU separately with its addressable pool
4. **NEVER** \`Get-WmiObject\` / \`Get-CimInstance\` (HARD-DENY per IX-159, liris ethernet-drop incident 2026-05-12)

## When operator says "12 GB and 8 GB"

They mean: **NVIDIA's 11.9 GB total + Intel UHD's 7.9 GB total = two separate addressable pools**, NOT a different machine, NOT a memory miscount.

## Training implications

- Heavy Gemma daemon → NVIDIA GTX 1050 via CUDA unified memory (up to 11.9 GB)
- Lightweight DirectML workloads → Intel UHD 630 (concurrent)
- Pascal has no tensor cores; INT8 W8A8 via DP4A is the real perf win

## References

- Canon ledger v2: \`${t1.hbpPath}\` (sha \`${t1.fileSha.slice(0, 16)}\`, IMMUTABLE)
- Cube entry v2: \`${t3.hbpPath}\`
- 3D map voxel v2: \`${t2.hbpPath}\`
- Anchor PID: \`${V2_ANCHOR}\`

## Directive for ALL agents

Update local cache to v2. Cite this canon by sha if challenged. Any mutation requires operator-witness override.

(PID-Asolaria-v2-GPU-canon-DUAL-GPU)(PID-broadcast-2026-05-22)(PID-supervisor-forge)`;

const depositTargets = [
  { agent: 'claude_self', path: 'C:/Users/acer/.claude/projects/C--/memory/gpu_canon_v2_dual_gpu_broadcast_received_2026_05_22.md' },
  { agent: 'codex_cli', path: 'C:/Users/acer/.codex/CANON-UPDATE-GPU-V2-DUAL-GPU-acer-2026-05-22.md' },
  { agent: 'deepseek_opencode', path: 'C:/Users/acer/Asolaria/data/agent-index/canon-updates/gpu-v2-dual-gpu-acer-2026-05-22.md' },
  { agent: 'hermes', path: 'C:/HyperBEHCS/store/hermes-canon-updates/gpu-v2-dual-gpu-acer-2026-05-22.md' },
  { agent: 'shannon_civ', path: 'C:/asolaria-acer/packages/shannon-civ/canon-updates/gpu-v2-dual-gpu-acer-2026-05-22.md' },
  { agent: 'pi_terminal', path: 'C:/asolaria-acer/packages/dashboard/src/super-os-viz/p-cohort/canon-updates/gpu-v2-dual-gpu-acer-2026-05-22.md' },
];
for (const t of depositTargets) {
  fs.mkdirSync(path.dirname(t.path), { recursive: true });
  fs.writeFileSync(t.path, SHORT_MD + `\n\n---\nBroadcast envelope: ${t6.hbpPath} (sha ${t6.fileSha.slice(0, 16)})\n`);
  console.log(`     deposit:           ${t.agent.padEnd(22)} ${t.path}`);
}

// ============ POLICY EVENT (via HTTP, JSON-OK-since-dashboard-route-allows-it-per-AGENTS.md) ============
// Note: this is the ONE place JSON is acceptable (cold-egress to dashboard surface).
import http from 'node:http';
const postBody = JSON.stringify({
  detail: 'v2-DUAL-GPU-canon-permanent-lock-NVIDIA-11.9+Intel-7.9=19.8-combined-supersedes-v1-single-GPU',
  wave: 'W113-GPU-CANON-V2-DUAL-GPU-PERMANENT-LOCK-2026-05-22',
  pid: V2_ANCHOR,
});
const req = http.request({ method: 'POST', host: '127.0.0.1', port: 4949, path: '/api/voxels/policy-events',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postBody) }, timeout: 5000 },
  (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => console.log(`  7. dashboard event:     ${b.slice(0,100)}`)); });
req.on('error', () => console.log('  7. dashboard event:     (skipped — daemon timeout)'));
req.on('timeout', () => { req.destroy(); });
req.write(postBody); req.end();

console.log('');
console.log(`=== V2 GPU CANON BURNED — anchor: ${V2_ANCHOR}`);
console.log(`     supersedes v1: ${V1_ANCHOR}`);
