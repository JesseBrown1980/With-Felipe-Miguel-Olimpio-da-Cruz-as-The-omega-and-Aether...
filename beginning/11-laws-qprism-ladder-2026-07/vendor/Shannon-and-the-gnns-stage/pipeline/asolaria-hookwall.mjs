// asolaria-hookwall.mjs — THE UNIFORM ENTRY GATE (the "no bypass" front door).
//
// One of the three keys: HOOKWALL -> PID -> GNN -> self-automation.
// Every action/envelope enters here FIRST. Hookwall is itself a composition of
// the five primitives — it is the canonical front door that wires them:
//
//   envelope --> PID-stamp (ADDRESS) --> SCORE --> gate decision
//            --> observation row (CONTENT + INTEGRITY) --> dual-emit (ROUTE)
//
// Doctrine (universal-route): NEVER silently drop. Every pass emits to BOTH the
// destination AND the observation ledger. A blocked envelope is PRESERVED as
// evidence, never deleted. HBP only — no JSON hot path.
//
// Pairs with asolaria-kernel.mjs (the 5 primitives). Operator: Jesse Daniel Brown 2026-06-01.

import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { score as scorePrimitive, reverseGain } from './asolaria-score.mjs';
import { fischerEval, VERDICT as FISCHER_VERDICT } from './fischer-kernel.mjs';

function sha16(s) { return createHash('sha256').update(String(s)).digest('hex').slice(0, 16); }
function sha8(s) { return sha16(s).slice(0, 8); }
function ts() { return new Date().toISOString(); }

// Gate verdicts — the only three outcomes. No silent fourth path.
export const VERDICT = Object.freeze({
  FARM_GEM: 'FARM_GEM_WITH_GATES',         // pass: promote-eligible
  BLOCK_PRESERVE: 'BLOCK_AND_PRESERVE',     // block: keep as evidence, never delete
  OBSERVE_ONLY: 'OBSERVE_ONLY',             // pass-through observation (no promotion claim)
});

// PID-stamp: every envelope gets a deterministic address on entry (ADDRESS primitive)
export function stampPid(envelope) {
  const basis = `${envelope.actor || 'anon'}|${envelope.verb || 'event'}|${envelope.target || 'fabric'}|${envelope.payload_sha16 || sha16(JSON.stringify(envelope.payload ?? ''))}`;
  return `BH.HOOKWALL.${sha16(basis).toUpperCase()}`;
}

// The observation row — CONTENT + INTEGRITY, tamper-evident, HBP no JSON.
function observationRow(pid, envelope, verdict, sc, prevHash) {
  const base = [
    'HBPv1', 'row=hookwall_observation',
    `pid=${pid}`,
    `actor=${envelope.actor || 'anon'}`,
    `verb=${envelope.verb || 'event'}`,
    `target=${envelope.target || 'fabric'}`,
    `verdict=${verdict}`,
    `score=${sc.composite}`,
    `l0_real=${sc.l0_real}`,
    `mark=${sc.mark}`,
    `reverse_risk=${sc.reverseRisk}`,
    `prev_hash=${prevHash || '0000000000000000'}`,
    `ts=${ts()}`,
    'json=0', 'runtime=0',
  ];
  const rowHash = sha8(base.join('|'));
  base.push(`row_hash=${rowHash}`);
  return { row: base.join('|'), rowHash };
}

// ── THE GATE: every action passes through here. Returns verdict + observation. ─
export async function pass(envelope, opts = {}) {
  if (!envelope || typeof envelope !== 'object') {
    throw new TypeError('hookwall.pass: envelope must be an object');
  }
  // 1. ADDRESS — stamp a PID on entry (no envelope is anonymous in the ledger)
  const pid = envelope.pid || stampPid(envelope);

  // 2. SCORE — content scored by the bulletproof ensemble (L0 real if up)
  const content = typeof envelope.payload === 'string' ? envelope.payload : JSON.stringify(envelope.payload ?? envelope.verb ?? '');
  const sc = await scorePrimitive(pid, content, opts);

  // 2.5 FISCHER-EVAL — anti-blunder gate (PIXELS FIRST: HBI emitted before gate decision)
  const fischer = fischerEval(pid, envelope, sc, { prevHash: opts.prevHash, strict: opts.fischerStrict });
  if (opts.fischerLedgerPath && !opts.dryRun) {
    try {
      if (!existsSync(dirname(opts.fischerLedgerPath))) mkdirSync(dirname(opts.fischerLedgerPath), { recursive: true });
      appendFileSync(opts.fischerLedgerPath, fischer.row + '\n', 'utf8');
    } catch { /* ledger write failure must not crash the gate */ }
  }

  // 3. GATE — three outcomes, informed by both score AND Fischer verdict. Never a silent drop.
  let verdict;
  if (opts.observeOnly) {
    verdict = VERDICT.OBSERVE_ONLY;
  } else if (fischer.verdict === FISCHER_VERDICT.BLOCK || fischer.verdict === FISCHER_VERDICT.REFUTE) {
    verdict = VERDICT.BLOCK_PRESERVE;          // Fischer says blunder/refuted → preserve evidence
  } else if (sc.promoted && fischer.verdict === FISCHER_VERDICT.PROCEED) {
    verdict = VERDICT.FARM_GEM;                // both score AND Fischer agree → promote
  } else {
    verdict = VERDICT.BLOCK_PRESERVE;          // disagreement → conservative preserve
  }

  // 4. CONTENT + INTEGRITY — write the observation row (tamper-evident chain)
  const { row, rowHash } = observationRow(pid, envelope, verdict, sc, opts.prevHash);

  // 5. ROUTE — universal dual-emit: observation ALWAYS written; destination only if pass
  let observed = false;
  if (opts.ledgerPath && !opts.dryRun) {
    try {
      if (!existsSync(dirname(opts.ledgerPath))) mkdirSync(dirname(opts.ledgerPath), { recursive: true });
      appendFileSync(opts.ledgerPath, row + '\n', 'utf8');
      observed = true;
    } catch { /* ledger failure must not crash the gate; observed stays false (honest) */ }
  }

  return {
    pid,
    verdict,
    pass: verdict !== VERDICT.BLOCK_PRESERVE,
    preserved: verdict === VERDICT.BLOCK_PRESERVE, // blocked == preserved evidence, not dropped
    score: sc.composite,
    mark: sc.mark,
    l0_real: sc.l0_real,
    observation: row,
    rowHash,
    observed,
    dual_emit: true, // doctrine: observation + (destination if pass)
  };
}

// ── chain helper: pass a stream of envelopes, linking observation hashes ─────
export async function passChain(envelopes, opts = {}) {
  const results = [];
  let prevHash = opts.prevHash || '0000000000000000';
  for (const env of envelopes) {
    const r = await pass(env, { ...opts, prevHash });
    prevHash = r.rowHash; // rolling chain — tamper-evident across the stream
    results.push(r);
  }
  return results;
}
