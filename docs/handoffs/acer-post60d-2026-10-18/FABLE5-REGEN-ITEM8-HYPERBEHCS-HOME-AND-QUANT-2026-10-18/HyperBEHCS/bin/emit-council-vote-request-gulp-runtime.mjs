// Council vote request — engine retrofit propagation #2 (gulp-runtime)
//
// Authority chain (per operator canon):
//   SPECIAL-OP-JESSE → OP-JESSE + OP-RAYSSA → ASOLARIA + COUNCIL → VOTE → VALUE
//
// This envelope queues at SPECIAL-OP-JESSE's authority and cascades down.
// Council votes on whether gulp-runtime should be retrofit next (continuing
// the seed pattern from cpu-gpu-watcher proof).
//
// HBP-native + sidecar trinity. ZERO JSON in emission path.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-COUNCIL-VOTE-REQUEST-ENGINE-RETROFIT-GULP-PID-2026-05-22';
const SEED_ANCHOR = 'ASOLARIA-ENGINE-RETROFIT-SEED-PID-2026-05-22';
const OUT_DIR = 'C:/HyperBEHCS/data/council-votes';
fs.mkdirSync(OUT_DIR, { recursive: true });

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

const ROWS = [
  // Genesis
  {
    layer: 'council-vote-genesis',
    anchor_pid: ANCHOR,
    wave: 'W113-COUNCIL-VOTE-ENGINE-RETROFIT-GULP-2026-05-22',
    vantage: 'acer',
  },
  // Authority chain trace
  {
    layer: 'authority-chain',
    level_1_meta: 'SPECIAL-OP-JESSE',
    level_2_apex: 'OP-JESSE,OP-RAYSSA',
    level_3_council: 'ASOLARIA,COUNCIL-5-cosigners',
    quintuple: 'OP-JESSE(cp260),OP-RAYSSA(cp261),OP-AMY(cp262),OP-DAN(cp263),OP-FELIPE(cp264)',
    quintuple_window_active: 'seq-191-to-2026-06-03',
  },
  // Vote request body
  {
    layer: 'vote-request',
    verb: 'rebuild-engine-from-base',
    target_engine: 'gulp-runtime',
    target_files: 'C:/asolaria-acer/packages/revolver-10k/src/intake.mjs+related-gulp-modules',
    candidate_output: 'C:/HyperBEHCS/data/runtime-engines/gulp-runtime-hbp/',
    retrofit_pattern: 'sidecar-trinity-hbp-hbi-sha256-hex+sha-chain-antecedents+zero-json-emission',
    pattern_source: SEED_ANCHOR,
    pattern_evidence: 'cpu-gpu-watcher-hbp-retrofit-validated-4-rows-chain-PASS',
  },
  // Risk + effort assessment
  {
    layer: 'risk-effort-assessment',
    risk_level: 'medium',
    risk_reasons: 'bus-coupled-not-standalone-like-cpu-gpu-watcher,potential-downstream-impact-on-ingest-consumers',
    effort_estimate_loc: 500,
    rollback_path: 'keep-original-gulp-runtime-intact,run-retrofit-side-by-side-until-validated',
    test_requirement: 'integration-smoke-with-existing-bus-consumers',
  },
  // Vote schema (what council returns)
  {
    layer: 'vote-schema',
    valid_returns: 'approve|deny|abstain|request-modification',
    quorum_required: '3-of-5-council-members',
    apex_override: 'OP-JESSE+OP-RAYSSA-dual-cosign-overrides-council',
    return_value_format: 'HBPv1-row-appended-to-this-envelope-chain',
    timeout_default_min: 60,
    timeout_action: 'defer-to-next-window',
  },
  // Pending propagation queue (if this vote returns approve, next candidates)
  {
    layer: 'propagation-queue-next-after-approval',
    candidates: 'substrate-walker-repair,omni-processor-stage1-registry,big-pickle-pid-portal-harness,hookwall-events-log',
    ranking_signal: 'isolation-then-size-then-impact',
    next_candidate_if_gulp_approved: 'substrate-walker-repair',
  },
  // Council member voting slots (HBP rows append here when each votes)
  {
    layer: 'vote-slot-1',
    council_member: 'OP-JESSE',
    cp: 260,
    vote: 'PENDING',
    voted_at: null,
    signature_sha16: null,
  },
  {
    layer: 'vote-slot-2',
    council_member: 'OP-RAYSSA',
    cp: 261,
    vote: 'PENDING',
    voted_at: null,
    signature_sha16: null,
  },
  {
    layer: 'vote-slot-3',
    council_member: 'OP-AMY',
    cp: 262,
    vote: 'PENDING',
    voted_at: null,
    signature_sha16: null,
  },
  {
    layer: 'vote-slot-4',
    council_member: 'OP-DAN',
    cp: 263,
    vote: 'PENDING',
    voted_at: null,
    signature_sha16: null,
  },
  {
    layer: 'vote-slot-5',
    council_member: 'OP-FELIPE',
    cp: 264,
    vote: 'PENDING',
    voted_at: null,
    signature_sha16: null,
  },
];

let prev = '0000000000000000';
const hbpLines = [];
const hbiLines = [];

for (const r of ROWS) {
  const fields = ['HBPv1'];
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined) continue;
    fields.push(`${k}=${String(v).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)}`);
  }
  fields.push(`anchor_pid=${ANCHOR}`, `antecedents=${prev}`, `ts=${TS}`, 'json=0', 'runtime=0', 'promote=0');
  const body = fields.join('|');
  const rh = sha16(body);
  hbpLines.push(`${body}|row_hash=${rh}`);
  hbiLines.push(`HBIv1|index=by-layer|key=${r.layer}|row_hash=${rh}`);
  prev = rh;
}

const baseName = 'cv-engine-retrofit-gulp-runtime-2026-05-22';
const hbpPath = path.join(OUT_DIR, `${baseName}.hbp`);
const hbiPath = path.join(OUT_DIR, `${baseName}.hbi`);
const shaPath = path.join(OUT_DIR, `${baseName}.sha256`);
const hexPath = path.join(OUT_DIR, `${baseName}.hex`);

const hbpContent = hbpLines.join('\n') + '\n';
fs.writeFileSync(hbpPath, hbpContent);
fs.writeFileSync(hbiPath, hbiLines.join('\n') + '\n');
const fileSha = sha256Hex(hbpContent);
fs.writeFileSync(shaPath, `${fileSha}  ${baseName}.hbp\n`);
fs.writeFileSync(hexPath, Buffer.from(hbpContent, 'utf8').toString('hex'));

console.log('=== COUNCIL VOTE REQUEST EMITTED (HBP-native, sidecar trinity, zero JSON) ===');
console.log('  hbp:    ', hbpPath);
console.log('  hbi:    ', hbiPath);
console.log('  sha256: ', shaPath);
console.log('  hex:    ', hexPath);
console.log('');
console.log('  rows:               ', ROWS.length);
console.log('  tip_row_hash:       ', prev);
console.log('  file_sha256:        ', fileSha.slice(0, 16));
console.log('');
console.log('  authority chain:    SPECIAL-OP-JESSE → OP-JESSE+RAYSSA → ASOLARIA+COUNCIL');
console.log('  target engine:      gulp-runtime');
console.log('  vote schema:        approve|deny|abstain|request-modification');
console.log('  quorum:             3-of-5 council members');
console.log('  apex override:      OP-JESSE+OP-RAYSSA dual-cosign');
console.log('  council slots:      5 (all PENDING — vote rows appended here as votes cast)');
console.log('');
console.log('  next on approval:   substrate-walker-repair (ranked by isolation→size→impact)');
console.log('');
console.log('Standing by for council votes to be appended to:', hbpPath);
