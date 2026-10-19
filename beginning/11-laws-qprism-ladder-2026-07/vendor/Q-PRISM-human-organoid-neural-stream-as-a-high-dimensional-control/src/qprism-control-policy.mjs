import { createHash } from 'node:crypto';

export function hashUnit(seed, label) {
  const hex = createHash('sha256').update(`${seed}|${label}`).digest('hex').slice(0, 13);
  return parseInt(hex, 16) / 0xfffffffffffff;
}

export function syntheticNeuralStream(seed, dims = 16) {
  return Array.from({ length: dims }, (_, i) => {
    const u = hashUnit(seed, `dim:${i}`);
    return Math.sin(2 * Math.PI * u) * 0.5 + Math.cos(7 * Math.PI * u) * 0.5;
  });
}

export function prismSchedule(seed, steps = 32) {
  const stream = syntheticNeuralStream(seed, 24);
  return Array.from({ length: steps }, (_, i) => {
    const a = stream[i % stream.length];
    const b = stream[(i * 5 + 3) % stream.length];
    const c = hashUnit(seed, `step:${i}`);
    return {
      step: i,
      gratingPhaseRad: wrapRad((a + c) * Math.PI),
      laserPowerScale: clamp(1 + 0.16 * b, 0.75, 1.25),
      velocityBinShift: Math.round((c - 0.5) * 4),
      analysisWindow: clamp(0.5 + 0.35 * Math.abs(a - b), 0.35, 0.95),
    };
  });
}

export function randomSchedule(seed, steps = 32) {
  return Array.from({ length: steps }, (_, i) => ({
    step: i,
    gratingPhaseRad: 2 * Math.PI * hashUnit(seed, `random-phase:${i}`),
    laserPowerScale: clamp(0.75 + 0.5 * hashUnit(seed, `random-power:${i}`), 0.75, 1.25),
    velocityBinShift: Math.round((hashUnit(seed, `random-velocity:${i}`) - 0.5) * 4),
    analysisWindow: clamp(0.35 + 0.6 * hashUnit(seed, `random-window:${i}`), 0.35, 0.95),
  }));
}

export function classicalSchedule(steps = 32) {
  return Array.from({ length: steps }, (_, i) => ({
    step: i,
    gratingPhaseRad: (2 * Math.PI * i) / steps,
    laserPowerScale: 1,
    velocityBinShift: 0,
    analysisWindow: 0.7,
  }));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wrapRad(v) {
  const tau = 2 * Math.PI;
  return ((v % tau) + tau) % tau;
}

