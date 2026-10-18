// Emit the 5 promotion gates for frozen-brain-slice federation activation.
// Each gate is a descriptor file documenting status + what's required to unlock.
//
// Anchor: ASOLARIA-FROZEN-BRAIN-SLICE-ARCH-V1-PID-2026-05-21
// Component 10 (ARCH-10).

import fs from 'node:fs';
import crypto from 'node:crypto';

const GATE_DIR = 'C:/HyperBEHCS/store/gates';
fs.mkdirSync(GATE_DIR, { recursive: true });

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-FROZEN-BRAIN-SLICE-ARCH-V1-PID-2026-05-21';

function sha16(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }

const GATES = [
  {
    name: 'HRM_GPU_OK',
    status: 'closed',
    unlocks: 'Live GPU inference via Gemma 4B INT4 on GTX 1050 11.9 GB total addressable',
    requires: 'Operator-witness cosign + nvidia-smi green + ORT-DML smoke test pass',
    when_open: 'Gemma full-pass fallback path becomes live (was descriptor-stub); microsecond response target achievable',
    next_action: 'Operator runs `node C:/HyperBEHCS/bin/gpu-probe-enhanced.cjs` + cosigns the resulting receipt; touch this gate file with witness sha',
  },
  {
    name: 'MTP_OWNER_PID',
    status: 'pending',
    unlocks: 'HRM-MTP group spawning beyond descriptor-stub (real MTP heads with real logits)',
    requires: 'Close AGT-C13-DIONYSUS-MTP-OWNER ticket; assign PID owner with operator cosign',
    when_open: 'HRM-MTP group predicts with real model logits instead of bridge-stub frame hashes; confidence aggregation becomes accurate',
    next_action: 'Operator assigns PID ownership; commit ownership entry to cosign chain seq=193+',
  },
  {
    name: 'LAZY_MINT_OPERATOR_WITNESS',
    status: 'per-call-witness',
    unlocks: 'Batch slice-address minting at scale (1024+ slice addresses per witness window)',
    requires: 'Operator-keyboard-live-ack within 600s per Dan approval_guard (SECRET-tier discipline)',
    when_open: 'Big-Pickle 100B portal harness pattern fully active; PROF-OMNISPINDLE-equivalent spawning lives',
    next_action: 'Operator establishes scheduled witness window OR builds PROF-OMNISPINDLE program to assume the role',
  },
  {
    name: 'SIDECAR_TRINITY',
    status: 'discipline-rule',
    unlocks: 'Every emission produces .hbp + .hbi + .sha256 + .hex sidecar trinity (Codex hot-path canon)',
    requires: 'Code-side enforcement: all writes go through sidecar-trinity emitter (not raw fs.writeFile)',
    when_open: 'Federation-wide HyperBEHCS hot-path discipline locked; JSON cold-egress only',
    next_action: 'Refactor existing .hbp-emitting code to use sidecar-trinity helper; add lint rule',
  },
  {
    name: 'BILATERAL_LAZY_MINT_SHA_VERIFY',
    status: 'pending-self-test',
    unlocks: 'Cross-vantage lazy-mint determinism verified (same content → same PID on acer + liris)',
    requires: 'Self-test fixture mints same content on acer + liris and asserts SHA equivalence',
    when_open: 'Bilateral federation proof complete; lazy-mint content-determinism canon-locked',
    next_action: 'Write fixture at packages/revolver-10k/tests/bilateral-lazy-mint-self-test.mjs; run on both vantages; cosign result',
  },
];

const summary = {
  ok: true,
  anchor_pid: ANCHOR,
  ts: TS,
  gate_count: GATES.length,
  gates_open: GATES.filter(g => g.status === 'open').length,
  gates_closed: GATES.filter(g => g.status === 'closed').length,
  gates_partial: GATES.filter(g => !['open', 'closed'].includes(g.status)).length,
  gates: GATES,
};

// Emit per-gate file
for (const g of GATES) {
  const gatePath = `${GATE_DIR}/${g.name}.gate.json`;
  const gateContent = { ...g, anchor_pid: ANCHOR, ts: TS, sha16: sha16(g.name + TS) };
  fs.writeFileSync(gatePath, JSON.stringify(gateContent, null, 2));
  console.log(`  ${g.name.padEnd(36)} ${g.status.padEnd(20)} → ${gatePath}`);
}

// Emit summary
const summaryPath = `${GATE_DIR}/SUMMARY.json`;
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nSummary: ${summaryPath}`);
console.log(`Open: ${summary.gates_open}, Closed: ${summary.gates_closed}, Partial: ${summary.gates_partial}`);
