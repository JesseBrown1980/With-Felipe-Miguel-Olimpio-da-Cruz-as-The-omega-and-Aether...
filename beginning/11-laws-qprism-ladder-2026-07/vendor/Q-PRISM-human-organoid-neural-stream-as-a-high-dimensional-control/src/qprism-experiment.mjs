import { classicalSchedule, prismSchedule, randomSchedule } from './qprism-control-policy.mjs';
import { simulateInterferometer } from './qprism-simulator.mjs';

export function defaultSeeds(count = 24) {
  return Array.from({ length: count }, (_, i) => `qprism-${String(i).padStart(3, '0')}`);
}

export function runComparison({ seeds = defaultSeeds(), steps = 32, params = {} } = {}) {
  const rows = [];
  for (const seed of seeds) {
    const schedules = {
      classical: classicalSchedule(steps),
      random: randomSchedule(seed, steps),
      prism: prismSchedule(seed, steps),
    };
    for (const [policy, schedule] of Object.entries(schedules)) {
      const result = simulateInterferometer(params, schedule);
      rows.push({
        seed,
        policy,
        score: result.score,
        meanVisibility: result.meanVisibility,
        fringeContrast: result.fringeContrast,
        phaseStability: result.phaseStability,
      });
    }
  }

  const policies = summarizePolicies(rows);
  const ranked = Object.entries(policies).sort((a, b) => b[1].meanScore - a[1].meanScore);
  const winner = ranked[0][0];
  const second = ranked[1][0];
  const scoreDelta = policies[winner].meanScore - policies[second].meanScore;
  const ledgerRow = [
    'QPRISM_COMPARE',
    'schema=qprism.compare.v1',
    `seeds=${seeds.length}`,
    `steps=${steps}`,
    `winner=${winner}`,
    `runner_up=${second}`,
    `score_delta=${round(scoreDelta)}`,
    'evidence=MEASURED_SIM',
    'json=0',
  ].join('|');

  return {
    schema: 'qprism.compare.v1',
    seeds,
    steps,
    policies,
    winner,
    runnerUp: second,
    scoreDelta: round(scoreDelta),
    ledgerRow,
  };
}

function summarizePolicies(rows) {
  const out = {};
  for (const policy of [...new Set(rows.map((r) => r.policy))]) {
    const slice = rows.filter((r) => r.policy === policy);
    out[policy] = {
      meanScore: round(mean(slice.map((r) => r.score))),
      meanVisibility: round(mean(slice.map((r) => r.meanVisibility))),
      meanFringeContrast: round(mean(slice.map((r) => r.fringeContrast))),
      meanPhaseStability: round(mean(slice.map((r) => r.phaseStability))),
      trials: slice.length,
    };
  }
  return out;
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round(v) {
  return Math.round(v * 1_000_000) / 1_000_000;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('qprism-experiment.mjs')) {
  const result = runComparison();
  console.log(JSON.stringify(result, null, 2));
  console.log(result.ledgerRow);
}
