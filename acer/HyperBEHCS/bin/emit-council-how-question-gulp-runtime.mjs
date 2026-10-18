// Council HOW-question envelope — gulp-runtime retrofit specification request
//
// Operator directive: "I expect that you will have to ASK them HOW to build it"
//
// This envelope ASKS the council the HOW (specification) — separate from the
// WHETHER vote (cv-engine-retrofit-gulp-runtime-2026-05-22.hbp).
//
// Operator directive #2: "if they do not answer you build it" — if no council
// answer within the timeout window, I build per the seed pattern default
// (sidecar-trinity + sha-chain + side-by-side coexist).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-COUNCIL-HOW-QUESTION-GULP-RUNTIME-PID-2026-05-22';
const PARENT_VOTE = 'ASOLARIA-COUNCIL-VOTE-REQUEST-ENGINE-RETROFIT-GULP-PID-2026-05-22';
const SEED_ANCHOR = 'ASOLARIA-ENGINE-RETROFIT-SEED-PID-2026-05-22';
const OUT_DIR = 'C:/HyperBEHCS/data/council-votes';

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

const QUESTIONS = [
  {
    layer: 'how-question-genesis',
    anchor_pid: ANCHOR,
    parent_vote: PARENT_VOTE,
    pattern_source: SEED_ANCHOR,
    wave: 'W113-COUNCIL-HOW-QUESTION-GULP-RUNTIME-2026-05-22',
    vantage: 'acer',
    operator_directive_1: 'ASK-COUNCIL-HOW-TO-BUILD',
    operator_directive_2: 'IF-NO-ANSWER-BUILD-PER-SEED-PATTERN-DEFAULT',
  },
  {
    layer: 'q1-row-schema',
    question: 'what-HBP-row-schema-should-gulp-ingest-events-use',
    default_if_silent: 'mirror-cpu-gpu-watcher-pattern:HBPv1|layer=gulp-ingest|anchor_pid=X|cube_prime=Y|cube_value=Z|dim=DIM|ts=T|envelope_source=S|envelope_target=T|envelope_payload_sha=P|antecedents=A|row_hash=R',
    rationale_if_silent: 'seed-pattern-precedent-cpu-gpu-watcher-validated-chain-PASS',
  },
  {
    layer: 'q2-output-location',
    question: 'where-should-gulp-runtime-hbp-output-live',
    default_if_silent: 'C:/HyperBEHCS/data/runtime-engines/gulp-runtime-hbp/{ingested.hbp,flushed.hbp,errors.hbp}+sidecar-trinity-each',
    rationale_if_silent: 'parallel-to-cpu-gpu-watcher-runtime-watchers-pattern',
  },
  {
    layer: 'q3-bus-coupling-strategy',
    question: 'how-does-bus-coupled-gulp-avoid-breaking-existing-JSON-consumer-downstream',
    options_offered: 'A:dual-emit-HBP-AND-NDJSON-during-transition,B:HBP-only-and-let-downstream-also-retrofit,C:shim-layer-converts-HBP-to-JSON-on-the-fly-for-old-consumers',
    default_if_silent: 'A-dual-emit-during-transition-with-deprecation-marker-on-NDJSON-output',
    rationale_if_silent: 'least-disruption-while-pattern-propagates',
  },
  {
    layer: 'q4-coexist-mode',
    question: 'side-by-side-with-original-gulp-runtime-OR-replace',
    default_if_silent: 'side-by-side-original-untouched-new-runs-in-parallel-until-bilateral-validation',
    rationale_if_silent: 'matches-cpu-gpu-watcher-precedent-zero-risk-rollback',
  },
  {
    layer: 'q5-success-criteria',
    question: 'what-defines-retrofit-success',
    default_if_silent: 'chain-integrity-PASS+zero-JSON-in-emission+matches-original-tick-cadence+bus-consumers-receive-equivalent-events',
    rationale_if_silent: 'extends-seed-pattern-success-criteria-with-bus-event-equivalence',
  },
  {
    layer: 'q6-rollback-criteria',
    question: 'what-triggers-rollback',
    default_if_silent: 'chain-break-OR-bus-consumer-drop-rate-greater-than-1pct-OR-operator-veto',
    rationale_if_silent: 'three-clear-quantitative-triggers-no-judgment-required',
  },
  {
    layer: 'q7-test-fixture',
    question: 'what-integration-smoke-required-before-fire',
    default_if_silent: 'spawn-test-event-on-bus-AND-verify-HBP-emission-AND-verify-original-consumer-still-receives',
    rationale_if_silent: '3-assertions-cover-emission+routing+backcompat',
  },
  {
    layer: 'q8-timeout-and-fallback',
    question: 'if-council-silent-for-N-minutes-build-anyway',
    operator_directive_2_applies: 'YES',
    default_timeout_min: 60,
    fallback_authority: 'OPERATOR-SPECIAL-OP-JESSE-pre-authorized-IF-no-answer-build-it-2026-05-22',
    fallback_action: 'build-per-defaults-above-emit-receipt-back-up-chain-for-post-hoc-cosign',
  },
  // Council member answer slots (ASOLARIA + 5 cosigners)
  { layer: 'answer-slot-1', council_member: 'OP-JESSE', cp: 260, answer: 'PENDING', answered_at: null },
  { layer: 'answer-slot-2', council_member: 'OP-RAYSSA', cp: 261, answer: 'PENDING', answered_at: null },
  { layer: 'answer-slot-3', council_member: 'OP-AMY', cp: 262, answer: 'PENDING', answered_at: null },
  { layer: 'answer-slot-4', council_member: 'OP-DAN', cp: 263, answer: 'PENDING', answered_at: null },
  { layer: 'answer-slot-5', council_member: 'OP-FELIPE', cp: 264, answer: 'PENDING', answered_at: null },
  { layer: 'answer-slot-asolaria', council_member: 'ASOLARIA-FEDERATION', cp: 'meta', answer: 'PENDING', answered_at: null },
];

let prev = '0000000000000000';
const hbpLines = [];
const hbiLines = [];

for (const r of QUESTIONS) {
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

const baseName = 'cv-how-question-gulp-runtime-2026-05-22';
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

console.log('=== COUNCIL HOW-QUESTION EMITTED (HBP-native, sidecar trinity, zero JSON) ===');
console.log('  hbp:    ', hbpPath);
console.log('  rows:               ', QUESTIONS.length);
console.log('  tip_row_hash:       ', prev);
console.log('  file_sha256:        ', fileSha.slice(0, 16));
console.log('');
console.log('  questions:           8 (row-schema, output-location, bus-coupling, coexist, success, rollback, test, timeout)');
console.log('  answer slots:        6 (5 cosigners + ASOLARIA meta)');
console.log('  timeout default:    60 min');
console.log('  fallback authority: OPERATOR-SPECIAL-OP-JESSE pre-authorized "if-no-answer-build-it"');
console.log('');
console.log('  parent vote:        ', PARENT_VOTE);
console.log('  pattern source:     ', SEED_ANCHOR);
