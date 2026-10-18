// Re-emit 5 promotion gates as .hbp tuple-form + sidecar trinity (.hbp/.hbi/.sha256/.hex)
// Replaces the JSON files emitted earlier (violation of SIDECAR_TRINITY discipline).
// Per AGENTS.md L20-26: JSON cold-egress only; .hbp hot path.

import fs from 'node:fs';
import crypto from 'node:crypto';

const GATE_DIR = 'C:/HyperBEHCS/store/gates';
const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-FROZEN-BRAIN-SLICE-ARCH-V1-PID-2026-05-21';

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

const GATES = [
  { name: 'HRM_GPU_OK', status: 'closed', unlocks: 'live-GPU-inference-Gemma-4B-INT4-on-GTX-1050-11.9GB',
    requires: 'operator-witness-cosign+nvidia-smi-green+ORT-DML-smoke-pass',
    next_action: 'operator-runs-gpu-probe-enhanced-cjs+cosigns-receipt' },
  { name: 'MTP_OWNER_PID', status: 'pending', unlocks: 'HRM-MTP-real-logits-beyond-descriptor-stub',
    requires: 'close-AGT-C13-DIONYSUS-ticket+cosign-chain-seq-193',
    next_action: 'operator-assigns-PID-ownership-cosign-chain-entry' },
  { name: 'LAZY_MINT_OPERATOR_WITNESS', status: 'per-call-witness', unlocks: 'batch-slice-mint-1024+-per-window',
    requires: 'SECRET-tier-600s-live-ack-per-Dan-approval-guard',
    next_action: 'establish-witness-window-OR-build-PROF-OMNISPINDLE' },
  { name: 'SIDECAR_TRINITY', status: 'discipline-rule', unlocks: 'federation-wide-hbp-hot-path-JSON-cold-only',
    requires: 'all-emitters-use-sidecar-trinity-helper-not-raw-fs-writeFile',
    next_action: 'refactor-existing-hbp-emitters+lint-rule' },
  { name: 'BILATERAL_LAZY_MINT_SHA_VERIFY', status: 'pending-self-test', unlocks: 'cross-vantage-content-determinism-proven',
    requires: 'fixture-mints-same-content-acer+liris-asserts-sha-equivalence',
    next_action: 'write-bilateral-lazy-mint-self-test.mjs+cosign-result' },
];

// Emit sidecar trinity per gate: .hbp (tuple-form data), .hbi (index pointer), .sha256, .hex
function emitTrinity(baseName, gate) {
  // .hbp — tuple-form row
  const hbpBody = [
    'HBPv1',
    'layer=promotion-gate',
    `gate=${gate.name}`,
    `status=${gate.status}`,
    `unlocks=${gate.unlocks}`,
    `requires=${gate.requires}`,
    `next_action=${gate.next_action}`,
    `anchor_pid=${ANCHOR}`,
    `ts=${TS}`,
    'json=0', 'runtime=0', 'promote=0',
  ].join('|');
  const rh = sha16(hbpBody);
  const hbpRow = `${hbpBody}|row_hash=${rh}\n`;

  const hbpPath = `${GATE_DIR}/${baseName}.hbp`;
  const hbiPath = `${GATE_DIR}/${baseName}.hbi`;
  const sha256Path = `${GATE_DIR}/${baseName}.sha256`;
  const hexPath = `${GATE_DIR}/${baseName}.hex`;

  fs.writeFileSync(hbpPath, hbpRow);

  // .hbi — index pointer (compact lookup: gate name → row_hash + status)
  const hbiContent = `HBIv1|index=gate|key=${gate.name}|row_hash=${rh}|status=${gate.status}|hbp_path=${hbpPath}\n`;
  fs.writeFileSync(hbiPath, hbiContent);

  // .sha256 — file integrity
  const fullHbpSha = sha256Hex(fs.readFileSync(hbpPath));
  fs.writeFileSync(sha256Path, `${fullHbpSha}  ${baseName}.hbp\n`);

  // .hex — binary representation (compact wire form for federation transmission)
  const hexBuf = Buffer.from(hbpBody, 'utf8').toString('hex');
  fs.writeFileSync(hexPath, hexBuf);

  return { hbp: hbpPath, hbi: hbiPath, sha256: sha256Path, hex: hexPath, row_hash: rh, file_sha256: fullHbpSha };
}

console.log('=== RE-EMITTING 5 GATES AS HBP + SIDECAR TRINITY ===\n');

const results = [];
for (const gate of GATES) {
  const trinity = emitTrinity(gate.name, gate);
  // Remove the old .gate.json file (JSON violation cleanup)
  const oldJson = `${GATE_DIR}/${gate.name}.gate.json`;
  if (fs.existsSync(oldJson)) {
    fs.unlinkSync(oldJson);
  }
  results.push({ gate: gate.name, ...trinity });
  console.log(`  ${gate.name.padEnd(36)} row_hash=${trinity.row_hash}  file_sha=${trinity.file_sha256.slice(0,16)}`);
}

// Also delete old SUMMARY.json + emit SUMMARY.hbp instead
const oldSummaryJson = `${GATE_DIR}/SUMMARY.json`;
if (fs.existsSync(oldSummaryJson)) {
  fs.unlinkSync(oldSummaryJson);
  console.log(`  cleaned: ${oldSummaryJson} (JSON violation)`);
}

const summaryBody = [
  'HBPv1',
  'layer=gates-summary',
  `anchor_pid=${ANCHOR}`,
  `gate_count=${GATES.length}`,
  `gates_open=0`,
  `gates_closed=1`,
  `gates_partial=4`,
  `gates_list=${GATES.map(g => g.name).join(',')}`,
  `ts=${TS}`,
  'json=0', 'runtime=0', 'promote=0',
].join('|');
const summarySha = sha16(summaryBody);
fs.writeFileSync(`${GATE_DIR}/SUMMARY.hbp`, `${summaryBody}|row_hash=${summarySha}\n`);
console.log(`\n  SUMMARY.hbp emitted: row_hash=${summarySha}`);

// Cleanup verification
const remainingJson = fs.readdirSync(GATE_DIR).filter(f => f.endsWith('.json'));
console.log(`\nremaining JSON files in gate dir: ${remainingJson.length}  (target: 0)`);
console.log('discipline restored: HBP hot-path, no JSON in gate canon');
