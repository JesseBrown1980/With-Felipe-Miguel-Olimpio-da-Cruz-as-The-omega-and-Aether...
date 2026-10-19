import assert from 'node:assert/strict';
import test from 'node:test';
import { classicalSchedule, prismSchedule, randomSchedule, syntheticNeuralStream } from '../src/qprism-control-policy.mjs';
import { comparePolicies, deBroglieWavelength, simulateInterferometer } from '../src/qprism-simulator.mjs';

test('deBroglie wavelength is positive for sodium nanoparticle parameters', () => {
  const lambda = deBroglieWavelength({ massDa: 170_000, velocityMps: 180 });
  assert.ok(lambda > 0);
  assert.ok(lambda < 1e-10);
});

test('policy generators produce bounded schedules', () => {
  for (const schedule of [classicalSchedule(8), randomSchedule('x', 8), prismSchedule('x', 8)]) {
    assert.equal(schedule.length, 8);
    for (const s of schedule) {
      assert.ok(s.gratingPhaseRad >= 0 && s.gratingPhaseRad < 2 * Math.PI);
      assert.ok(s.laserPowerScale >= 0.75 && s.laserPowerScale <= 1.25);
      assert.ok(s.analysisWindow >= 0.35 && s.analysisWindow <= 0.95);
    }
  }
});

test('synthetic neural stream is deterministic', () => {
  assert.deepEqual(syntheticNeuralStream('same', 6), syntheticNeuralStream('same', 6));
  assert.notDeepEqual(syntheticNeuralStream('same', 6), syntheticNeuralStream('different', 6));
});

test('simulator returns finite scores for all baseline policies', () => {
  const comparison = comparePolicies('smoke');
  for (const result of Object.values(comparison)) {
    assert.ok(Number.isFinite(result.score));
    assert.ok(result.score >= 0 && result.score <= 1);
    assert.ok(result.meanVisibility >= 0 && result.meanVisibility <= 1);
  }
});

test('direct simulation exposes per-step fringe records', () => {
  const result = simulateInterferometer({}, prismSchedule('records', 5));
  assert.equal(result.points.length, 5);
  assert.ok(result.points.every((p) => Number.isFinite(p.fringe)));
});

