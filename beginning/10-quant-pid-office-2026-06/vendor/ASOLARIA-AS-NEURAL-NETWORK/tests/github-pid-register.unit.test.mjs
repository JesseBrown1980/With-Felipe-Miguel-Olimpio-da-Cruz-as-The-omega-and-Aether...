import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_TYPES, KIND_BITS, KINDS, ROLES, RUNTIMES, SECTORS,
  classifyAgentType, emitAgentRow, emitRegistrationRows, mintPid, mintTriad, registerAgent, selfTest, tuplePreimage,
} from '../tools/behcs/github-pid-register.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('mints the LIVE fabric PID format (matches :4949 AgentTerms lanes)', () => {
  const p = mintPid({ role: 'AGT', name: 'shannon', tier: 4, prime: 1 });
  assert.match(p.pid, /^AGT-SHANNON-PID-H[0-9A-F]{4}-A04-W1024-P01-N00001$/);
  assert.equal(p.hex.endsWith('C'), true); // AGT -> C suffix (live)
});

test('deterministic + stateless: same name mints byte-identical PID (bilateral parity)', () => {
  assert.equal(mintPid({ role: 'SUP', name: 'LAW-STUB-AND-RUN' }).pid, mintPid({ role: 'SUP', name: 'law stub and run' }).pid);
});

test('divisions: yin/yang mod-2, prime-lane mod-3, quad mod-4, sector mod-113', () => {
  const p = mintPid({ role: 'AGT', name: 'x', kind: 'real' });
  assert.ok(KINDS.includes(p.yin_yang));
  assert.equal(p.yin_yang_bit, KIND_BITS.real);
  assert.ok([0, 1, 2].includes(p.lane));
  assert.ok([0, 1, 2, 3].includes(p.quad));
  assert.ok(p.sector >= 0 && p.sector < SECTORS);
});

test('triad shares hex base, role suffixes C/A/B (AGT/SUP/PROF)', () => {
  const t = mintTriad({ name: 'LAW-STUB-AND-RUN' });
  const base = t.AGT.hex.slice(0, 4);
  assert.equal(t.SUP.hex.slice(0, 4), base);
  assert.equal(t.PROF.hex.slice(0, 4), base);
  assert.equal(t.AGT.hex.at(-1), ROLES.AGT);
  assert.equal(t.SUP.hex.at(-1), ROLES.SUP);
  assert.equal(t.PROF.hex.at(-1), ROLES.PROF);
});

test('registration rows are HBP-only, json=0 terminated, no inlined newlines', () => {
  const rows = emitRegistrationRows(mintPid({ role: 'AGT', name: 'x' }));
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('\n')));
  assert.ok(rows.some((r) => r.startsWith('PIDDIV|') && r.includes('|yin_yang_bit=0|')));
});

test('universal open registry: known runtimes including gemini plus any model', () => {
  for (const rt of RUNTIMES) assert.equal(registerAgent({ runtime: rt, name: 'reasoner' }).runtime, rt);
  assert.ok(RUNTIMES.includes('gemini'));
  const any = registerAgent({ runtime: 'mistral.next', name: 'r' });
  assert.equal(any.known_runtime, false);
  assert.ok(AGENT_TYPES.includes(any.agent_type));
  assert.throws(() => registerAgent({ runtime: '', name: 'x' }));
});

test('separation law: yin/yang + prime route to logical, frozen, or real-free', () => {
  assert.equal(classifyAgentType({ yin_yang: 'logical', prime: 0 }), 'LOGICAL-WAVE');
  assert.equal(classifyAgentType({ yin_yang: 'real', prime: 0 }), 'FROZEN-BRAIN');
  assert.equal(classifyAgentType({ yin_yang: 'real', prime: 1 }), 'REAL-FREE');
  assert.ok(emitAgentRow(registerAgent({ runtime: 'claude', name: 'x' })).endsWith('|json=0'));
});

test('kind is load-bearing for agent PID identity', () => {
  const logical = registerAgent({ runtime: 'claude', name: 'worker', kind: 'logical', prime: 0 });
  const frozen = registerAgent({ runtime: 'claude', name: 'worker', kind: 'real', prime: 0 });
  const realFree = registerAgent({ runtime: 'claude', name: 'worker', kind: 'real', prime: 1 });
  assert.notEqual(logical.pid, frozen.pid);
  assert.notEqual(frozen.pid, realFree.pid);
  assert.notEqual(logical.pid, realFree.pid);
  assert.equal(logical.agent_type, 'LOGICAL-WAVE');
  assert.equal(frozen.agent_type, 'FROZEN-BRAIN');
  assert.equal(realFree.agent_type, 'REAL-FREE');
});

test('registerAgent uses unambiguous tuple identity and closes hyphen split alias', () => {
  const a = registerAgent({ runtime: 'claude', name: 'LOGICAL-WAVE-WORKER', kind: 'logical' });
  const b = registerAgent({ runtime: 'claude-logical-wave', name: 'WORKER', kind: 'logical' });
  assert.notEqual(a.pid, b.pid);
  assert.match(a.register_identity_sha16, /^[0-9a-f]{16}$/);
  assert.match(b.register_identity_sha16, /^[0-9a-f]{16}$/);
  assert.notEqual(tuplePreimage(['REGISTER_AGENT', 'claude', 'LOGICAL-WAVE', 'LOGICAL-WAVE-WORKER', 'logical', '0']),
    tuplePreimage(['REGISTER_AGENT', 'claude-logical-wave', 'LOGICAL-WAVE', 'WORKER', 'logical', '0']));
  assert.ok(emitAgentRow(a).includes(`register_identity_sha16=${a.register_identity_sha16}`));
});
