// gnn-ensemble.test.mjs
// Tests for realInferEnsemble() — wires :4792 (L0) and :4793 (L4 GSLGNN) as dual voters.
//
// Run: node --test D:\bigpickle-rebuild\tests\unit\gnn-ensemble.test.mjs
// Expected before fix: FAIL (realInferEnsemble not exported yet)
// Expected after fix:  PASS

import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// We mock the http module used inside fabric-thinker-gnn.mjs so no real network is needed.
// Strategy: use module-level mock.method on postInfer by re-exporting internals via
// a thin wrapper. Since postInfer is not exported, we intercept at the http layer
// by mocking realInfer directly in a controlled test double approach.
//
// Node:test does not support module-level ESM mocking without loader hooks.
// So we test the PUBLIC contract of realInferEnsemble() by passing custom
// opts.gnn_port values and a tiny HTTP stub server per test group.

import http from 'node:http';

// ─── Helpers: tiny stub HTTP servers ─────────────────────────────────────────

function makeStubServer(responseBody) {
  const server = http.createServer((req, _res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      _res.writeHead(200, { 'Content-Type': 'application/json' });
      _res.end(JSON.stringify(responseBody));
    });
  });
  return server;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

// ─── Import subject (may fail before fix — that is expected) ─────────────────

let realInferEnsemble;
try {
  ({ realInferEnsemble } = await import('../../src/fabric-thinker-gnn.mjs'));
} catch (e) {
  // module load error — tests will handle undefined gracefully
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('realInferEnsemble — export contract', () => {
  test('realInferEnsemble is exported from fabric-thinker-gnn.mjs', () => {
    assert.ok(
      typeof realInferEnsemble === 'function',
      `Expected realInferEnsemble to be a function; got ${typeof realInferEnsemble}. ` +
      'Add realInferEnsemble() export to src/fabric-thinker-gnn.mjs.'
    );
  });
});

describe('realInferEnsemble — both servers healthy', () => {
  let s0, s4, p0, p4;

  // Both stub servers return ok:true with known scores
  beforeEach(async () => {
    s0 = makeStubServer({ ok: true, scores: 0.8, allow: true, final_verdict: 'benign', cascade_depth: 1, layers: ['L0'], elapsed_ms: 1 });
    s4 = makeStubServer({ ok: true, scores: 0.6, allow: true, final_verdict: 'benign', cascade_depth: 1, layers: ['L4'], elapsed_ms: 2 });
    p0 = await listen(s0);
    p4 = await listen(s4);
  });

  afterEach(async () => {
    await close(s0);
    await close(s4);
  });

  test('returns l0_score, l4_score, ensemble_score, gnn_real', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-001', 'classify this', {
      l0_port: p0,
      l4_port: p4,
      timeout_ms: 3000,
    });

    assert.ok('l0_score' in result, 'result must have l0_score');
    assert.ok('l4_score' in result, 'result must have l4_score');
    assert.ok('ensemble_score' in result, 'result must have ensemble_score');
    assert.ok('gnn_real' in result, 'result must have gnn_real');

    assert.ok(typeof result.l0_score === 'number', 'l0_score must be a number');
    assert.ok(typeof result.l4_score === 'number', 'l4_score must be a number');
    assert.ok(typeof result.ensemble_score === 'number', 'ensemble_score must be a number');
    assert.ok(typeof result.gnn_real === 'boolean', 'gnn_real must be a boolean');
  });

  test('ensemble_score is average of l0_score and l4_score', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-002', 'average check', {
      l0_port: p0,
      l4_port: p4,
      timeout_ms: 3000,
    });

    // Stub servers: l0=0.8, l4=0.6 → ensemble=0.7
    const expectedEnsemble = (result.l0_score + result.l4_score) / 2;
    assert.ok(
      Math.abs(result.ensemble_score - expectedEnsemble) < 1e-9,
      `ensemble_score ${result.ensemble_score} must equal (l0+l4)/2 = ${expectedEnsemble}`
    );
  });

  test('gnn_real is true when at least one server responds ok', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-003', 'real-flag check', {
      l0_port: p0,
      l4_port: p4,
      timeout_ms: 3000,
    });
    assert.strictEqual(result.gnn_real, true, 'gnn_real must be true when servers respond ok');
  });
});

describe('realInferEnsemble — graceful fallback when one server is down', () => {
  let s0, p0;

  // Only L0 server up; L4 port is unreachable (use port 1 which is refused)
  beforeEach(async () => {
    s0 = makeStubServer({ ok: true, scores: 0.75, allow: true, final_verdict: 'benign', cascade_depth: 1, layers: ['L0'], elapsed_ms: 1 });
    p0 = await listen(s0);
  });

  afterEach(async () => {
    await close(s0);
  });

  test('returns valid result when L4 is unreachable', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-004', 'l4-down test', {
      l0_port: p0,
      l4_port: 1, // port 1 is always refused on any OS
      timeout_ms: 1000,
    });

    assert.ok('ensemble_score' in result, 'must return ensemble_score even when L4 down');
    assert.ok('l0_score' in result, 'must return l0_score');
    assert.ok('l4_score' in result, 'must return l4_score (0 when L4 down)');
    assert.strictEqual(result.l4_score, 0, 'l4_score must be 0 when L4 server unreachable');
    // gnn_real should be true because L0 responded
    assert.strictEqual(result.gnn_real, true, 'gnn_real must be true since L0 responded ok');
  });

  test('ensemble_score when l4 down = (l0_score + 0) / 2', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-005', 'fallback avg', {
      l0_port: p0,
      l4_port: 1,
      timeout_ms: 1000,
    });
    const expected = result.l0_score / 2;
    assert.ok(
      Math.abs(result.ensemble_score - expected) < 1e-9,
      `ensemble_score ${result.ensemble_score} must equal l0_score/2 = ${expected} when l4 down`
    );
  });
});

describe('realInferEnsemble — both servers down', () => {
  test('returns valid shape with score=0 and gnn_real=false when both down', async () => {
    if (typeof realInferEnsemble !== 'function') {
      assert.fail('realInferEnsemble not exported — implement it first');
    }
    const result = await realInferEnsemble('PID-TEST-006', 'both-down test', {
      l0_port: 1,
      l4_port: 1,
      timeout_ms: 500,
    });

    assert.ok('ensemble_score' in result, 'must have ensemble_score');
    assert.strictEqual(result.l0_score, 0, 'l0_score must be 0 when L0 down');
    assert.strictEqual(result.l4_score, 0, 'l4_score must be 0 when L4 down');
    assert.strictEqual(result.ensemble_score, 0, 'ensemble_score must be 0 when both down');
    assert.strictEqual(result.gnn_real, false, 'gnn_real must be false when both servers down');
  });
});
