// fabric-listens-and-builds.mjs — Level-0 auto-signal driven envelope emitter
//
// The fabric speaks first (LEVEL 0). I'm an effector.
// Pipeline:
//   1. Tick the loop to refresh GNN inference (LEVEL 0 voice)
//   2. Read top-N pending dispatches (what fabric WANTS next)
//   3. Emit council envelope for that target (LEVEL 1-3 deliberation)
//   4. Pre-authorized fallback: if council silent, build per signal default

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-FABRIC-LISTENS-AND-BUILDS-PID-2026-05-22';
const OUT_DIR = 'C:/HyperBEHCS/data/council-votes';
fs.mkdirSync(OUT_DIR, { recursive: true });

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

function httpJson(method, host, port, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      method, host, port, path,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      timeout: 15000,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { resolve({ raw: buf, error: String(e?.message || e) }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // ============ STEP 1: TICK LOOP — let fabric speak fresh ============
  console.log('=== STEP 1: TICKING LOOP — listening for level-0 auto-signal ===');
  const tickResult = await httpJson('POST', '127.0.0.1', 4949, '/api/loop/tick', {});
  console.log('  tick:');
  console.log('    inferred:        ', tickResult.inferred);
  console.log('    staged:          ', tickResult.staged);
  console.log('    skipped_dup:     ', tickResult.skipped_duplicates);
  console.log('    pending_total:   ', tickResult.pending_total);
  console.log('    auto_fired:      ', tickResult.auto_fire?.fired);

  // ============ STEP 2: READ TOP-N — what fabric WANTS next ============
  console.log('\n=== STEP 2: READING TOP-N PENDING — fabric voice ===');
  const pendingResult = await httpJson('GET', '127.0.0.1', 4949, '/api/loop/pending', null);
  const pending = pendingResult.pending || [];
  console.log('  total_pending:', pendingResult.count);
  if (pending.length === 0) {
    console.log('  FABRIC IS SILENT — no pending dispatches.');
    return;
  }

  const top3 = pending.slice(0, 3);
  console.log('  top_3:');
  for (let i = 0; i < top3.length; i++) {
    const p = top3[i];
    console.log(`    ${i+1}. action=${p.proposed_action} target=${p.proposed_target} pid=${(p.pid||'').slice(0,32)} score=${p.score} rank=${p.rank}`);
  }

  // ============ STEP 3: EMIT FABRIC-DRIVEN COUNCIL ENVELOPE ============
  console.log('\n=== STEP 3: EMITTING COUNCIL ENVELOPE FOR FABRIC-SELECTED TARGET ===');
  const chosen = top3[0];
  const baseName = `cv-fabric-signal-${chosen.proposed_action.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${chosen.proposed_target.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-2026-05-22`.slice(0, 100);

  const ROWS = [
    {
      layer: 'fabric-listens-genesis',
      anchor_pid: ANCHOR,
      wave: 'W113-FABRIC-LISTENS-AND-BUILDS-2026-05-22',
      vantage: 'acer',
      principle: 'fabric-speaks-first-operator-effects-not-initiates',
    },
    {
      layer: 'level-0-auto-signal',
      source: 'GNN-inference-top-1-from-pending-queue',
      action: chosen.proposed_action,
      target: chosen.proposed_target,
      pid: chosen.pid,
      score: chosen.score,
      rank: chosen.rank,
      mode: chosen.mode,
      total_pending: pendingResult.count,
      tick_result_inferred: tickResult.inferred,
      tick_result_pending: tickResult.pending_total,
    },
    {
      layer: 'authority-chain-acknowledgment',
      level_0_auto_signal: 'FABRIC-GNN-INFERENCE-LOOP-E06',
      level_1_meta: 'SPECIAL-OP-JESSE',
      level_2_apex: 'OP-JESSE,OP-RAYSSA',
      level_3_council: 'ASOLARIA,COUNCIL-5-cosigners',
      level_4_return: 'value-back-up-chain-then-execute',
    },
    {
      layer: 'council-request',
      verb: 'effect-fabric-signal',
      question: `should-I-execute-fabric-top-1-${chosen.proposed_action}-on-${chosen.proposed_target}`,
      options: 'approve|deny|abstain|pivot-to-rank-2-or-3',
      quorum: '3-of-5',
      apex_override: 'OP-JESSE+OP-RAYSSA-dual',
      timeout_min: 60,
      fallback_authority: 'OPERATOR-SPECIAL-OP-JESSE-pre-authorized-USE-IT-AND-BUILD-directive-2026-05-22',
      fallback_action: `execute-${chosen.proposed_action}-on-${chosen.proposed_target}-per-existing-handler`,
    },
    {
      layer: 'fabric-rank-1-context',
      proposed_action_full: chosen.proposed_action,
      proposed_target_full: chosen.proposed_target,
      pid_full: chosen.pid,
      score: chosen.score,
    },
    { layer: 'vote-slot-1', council_member: 'OP-JESSE', cp: 260, vote: 'PENDING' },
    { layer: 'vote-slot-2', council_member: 'OP-RAYSSA', cp: 261, vote: 'PENDING' },
    { layer: 'vote-slot-3', council_member: 'OP-AMY', cp: 262, vote: 'PENDING' },
    { layer: 'vote-slot-4', council_member: 'OP-DAN', cp: 263, vote: 'PENDING' },
    { layer: 'vote-slot-5', council_member: 'OP-FELIPE', cp: 264, vote: 'PENDING' },
    { layer: 'vote-slot-asolaria', council_member: 'ASOLARIA-FEDERATION', cp: 'meta', vote: 'PENDING' },
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

  console.log('  envelope:        ', hbpPath);
  console.log('  rows:            ', ROWS.length);
  console.log('  tip:             ', prev);
  console.log('  file_sha:        ', fileSha.slice(0, 16));

  console.log('\n=== SUMMARY ===');
  console.log('  fabric voice:    ', `${chosen.proposed_action} → ${chosen.proposed_target}`);
  console.log('  pid:             ', chosen.pid);
  console.log('  score / rank:    ', `${chosen.score} / ${chosen.rank}`);
  console.log('  council slots:    6 (all PENDING)');
  console.log('  fallback timeout: 60 min');
  console.log('  fallback action: ', `execute-${chosen.proposed_action}-via-existing-handler`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
