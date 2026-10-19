import { classicalSchedule, prismSchedule, randomSchedule } from './qprism-control-policy.mjs';

const H = 6.62607015e-34;
const DALTON_KG = 1.66053906660e-27;

export function deBroglieWavelength({ massDa, velocityMps }) {
  return H / (massDa * DALTON_KG * velocityMps);
}

export function simulateInterferometer(params = {}, schedule = classicalSchedule()) {
  const cfg = {
    massDa: 170_000,
    atoms: 7_000,
    velocityMps: 180,
    gratingPeriodM: 78.8e-9,
    gratingSpacingM: 0.98,
    decoherenceRate: 0.08,
    thermalNoise: 0.03,
    ...params,
  };
  const lambda = deBroglieWavelength(cfg);
  const talbotLength = cfg.gratingPeriodM ** 2 / lambda;
  const idealPhase = (2 * Math.PI * cfg.gratingSpacingM) / talbotLength;

  const points = schedule.map((s) => {
    const phase = idealPhase + s.gratingPhaseRad + s.velocityBinShift * 0.037;
    const decoherence = Math.exp(-cfg.decoherenceRate * cfg.atoms / 7_000);
    const powerPenalty = Math.exp(-Math.abs(s.laserPowerScale - 1) * 0.35);
    const windowPenalty = 1 - Math.abs(s.analysisWindow - 0.7) * 0.22;
    const visibility = clamp(decoherence * powerPenalty * windowPenalty - cfg.thermalNoise, 0, 1);
    const fringe = 0.5 + 0.5 * visibility * Math.cos(phase);
    return {
      step: s.step,
      phase,
      visibility,
      fringe,
      controls: s,
    };
  });

  const meanVisibility = mean(points.map((p) => p.visibility));
  const fringeContrast = max(points.map((p) => p.fringe)) - min(points.map((p) => p.fringe));
  const phaseStability = 1 / (1 + std(points.map((p) => p.phase)));

  return {
    config: cfg,
    lambdaM: lambda,
    talbotLengthM: talbotLength,
    meanVisibility,
    fringeContrast,
    phaseStability,
    score: meanVisibility * 0.5 + fringeContrast * 0.35 + phaseStability * 0.15,
    points,
  };
}

export function comparePolicies(seed = 'q-prism-demo') {
  const policies = {
    classical: classicalSchedule(),
    random: randomSchedule(seed),
    prism: prismSchedule(seed),
  };
  return Object.fromEntries(
    Object.entries(policies).map(([name, schedule]) => [name, summarize(simulateInterferometer({}, schedule))])
  );
}

function summarize(result) {
  return {
    score: round(result.score),
    meanVisibility: round(result.meanVisibility),
    fringeContrast: round(result.fringeContrast),
    phaseStability: round(result.phaseStability),
    lambdaM: result.lambdaM,
    talbotLengthM: result.talbotLengthM,
  };
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function min(xs) {
  return xs.reduce((a, b) => Math.min(a, b), Infinity);
}

function max(xs) {
  return xs.reduce((a, b) => Math.max(a, b), -Infinity);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v) {
  return Math.round(v * 1_000_000) / 1_000_000;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('qprism-simulator.mjs')) {
  console.log(JSON.stringify(comparePolicies(process.argv[2] || 'q-prism-demo'), null, 2));
}

