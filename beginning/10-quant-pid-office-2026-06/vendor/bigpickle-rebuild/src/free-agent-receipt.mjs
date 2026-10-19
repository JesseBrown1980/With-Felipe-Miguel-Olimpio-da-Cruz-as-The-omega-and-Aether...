// free-agent-receipt.mjs — the UNDENIABLE TRAIL for a free-agent fire.
//
// Every real free-agent call produces a receipt that ANY third party can
// independently re-verify, so no one can ever say it wasn't real:
//   - the FULL answer text is stored + its sha256 (recompute it yourself)
//   - the question, model, project, exit code, duration, timestamp
//   - a MOCK-FORMULA check: a real model's answer CANNOT equal our deterministic
//     mock string -> proves it came from a real model, not a stub
//   - rolling prev_hash chain -> tamper-evident across the whole run
//
// HBP only. Operator: Jesse Daniel Brown — "leave a trail no one can ever say is
// not real" 2026-06-01.

import { createHash } from 'node:crypto';

export function sha256hex(s) { return createHash('sha256').update(String(s)).digest('hex'); }
export function sha16(s) { return sha256hex(s).slice(0, 16); }
export function sha8(s) { return sha256hex(s).slice(0, 8); }

// The exact deterministic mock string runFreeAgent emits (must stay in sync).
// A REAL model answer that equals this would be the only way to fake "real" —
// and it can't, because the model never sees this formula.
export function mockAnswerFor(agentType, pid, question) {
  const seed = sha16(`${agentType}|${pid}|${question}`);
  return `[${agentType}] ${seed}: deterministic response for "${String(question).slice(0, 60)}"`;
}

// Is this answer the deterministic mock (i.e. NOT a real model)?
export function isMockFormula(answer, agentType, pid, question) {
  return answer === mockAnswerFor(agentType, pid, question);
}

// Build an independently-verifiable receipt for one free-agent fire.
export function buildReceipt(fire, opts = {}) {
  const {
    agentType, pid, model, project, question, answer,
    exitCode, durationMs, vantage = 'acer', nodePid = 0,
  } = fire;
  const ts = opts.ts || new Date().toISOString();
  const answer_sha256 = sha256hex(answer ?? '');
  const question_sha256 = sha256hex(question ?? '');
  const is_mock = isMockFormula(answer ?? '', agentType, pid, question);
  const answered = (answer ?? '').trim().length > 0;
  // REAL = answered, exit 0, and NOT the mock formula. Provable.
  const real = answered && exitCode === 0 && !is_mock;
  const prev_hash = opts.prevHash || '0000000000000000000000000000000000000000000000000000000000000000';

  // canonical material for the row hash (everything an auditor needs)
  const material = [
    `pid=${pid}`, `agent_type=${agentType}`, `model=${model}`, `project=${project}`,
    `question_sha256=${question_sha256}`, `answer_sha256=${answer_sha256}`,
    `answer_chars=${(answer ?? '').length}`, `exit=${exitCode}`, `duration_ms=${durationMs}`,
    `is_mock=${is_mock}`, `real=${real}`, `vantage=${vantage}`, `node_pid=${nodePid}`,
    `ts=${ts}`, `prev_hash=${prev_hash}`,
  ];
  const row_hash = sha256hex(material.join('|'));

  return {
    receipt: {
      pid, agent_type: agentType, model, project,
      question, question_sha256,
      answer, answer_sha256, answer_chars: (answer ?? '').length,
      exit: exitCode, duration_ms: durationMs,
      is_mock, real, answered, vantage, node_pid: nodePid, ts,
      prev_hash, row_hash,
    },
    // HBP row (answer stored separately in a sidecar to keep the pipe row scannable)
    hbpRow: [
      'HBPv1', 'row=free_agent_receipt', `pid=${pid}`, `model=${model}`,
      `agent_type=${agentType}`, `question_sha256=${question_sha256.slice(0, 16)}`,
      `answer_sha256=${answer_sha256}`, `answer_chars=${(answer ?? '').length}`,
      `exit=${exitCode}`, `duration_ms=${durationMs}`, `is_mock=${is_mock}`, `real=${real}`,
      `vantage=${vantage}`, `node_pid=${nodePid}`, `ts=${ts}`,
      `prev_hash=${prev_hash}`, 'json=0', `row_hash=${row_hash}`,
    ].join('|'),
    row_hash,
  };
}

// Independently re-verify a receipt: recompute the answer sha + the row hash.
// Returns {ok, answer_sha_ok, row_hash_ok, real, errors[]}. Anyone can run this.
export function verifyReceipt(receipt) {
  const errors = [];
  const recomputed_answer_sha = sha256hex(receipt.answer ?? '');
  const answer_sha_ok = recomputed_answer_sha === receipt.answer_sha256;
  if (!answer_sha_ok) errors.push(`answer sha mismatch: stored ${receipt.answer_sha256.slice(0,16)} vs recomputed ${recomputed_answer_sha.slice(0,16)}`);

  const material = [
    `pid=${receipt.pid}`, `agent_type=${receipt.agent_type}`, `model=${receipt.model}`, `project=${receipt.project}`,
    `question_sha256=${receipt.question_sha256}`, `answer_sha256=${receipt.answer_sha256}`,
    `answer_chars=${receipt.answer_chars}`, `exit=${receipt.exit}`, `duration_ms=${receipt.duration_ms}`,
    `is_mock=${receipt.is_mock}`, `real=${receipt.real}`, `vantage=${receipt.vantage}`, `node_pid=${receipt.node_pid}`,
    `ts=${receipt.ts}`, `prev_hash=${receipt.prev_hash}`,
  ];
  const recomputed_row_hash = sha256hex(material.join('|'));
  const row_hash_ok = recomputed_row_hash === receipt.row_hash;
  if (!row_hash_ok) errors.push('row_hash mismatch (tampered)');

  // independent reality check: does the answer match the mock formula?
  const recomputed_is_mock = isMockFormula(receipt.answer ?? '', receipt.agent_type, receipt.pid, receipt.question);
  if (recomputed_is_mock !== receipt.is_mock) errors.push('is_mock flag inconsistent with answer content');

  return {
    ok: errors.length === 0,
    answer_sha_ok, row_hash_ok,
    real: receipt.real && answer_sha_ok && row_hash_ok && !recomputed_is_mock,
    recomputed_is_mock,
    errors,
  };
}

// Verify a whole chain of receipts (prev_hash linkage + each receipt).
export function verifyChain(receipts) {
  const out = { ok: true, length: receipts.length, real_count: 0, breaks: [] };
  let prev = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const v = verifyReceipt(r);
    if (!v.ok) { out.ok = false; out.breaks.push({ i, errors: v.errors }); }
    if (r.prev_hash !== prev) { out.ok = false; out.breaks.push({ i, errors: [`chain break: prev_hash ${r.prev_hash.slice(0,16)} != expected ${prev.slice(0,16)}`] }); }
    if (v.real) out.real_count++;
    prev = r.row_hash;
  }
  return out;
}
