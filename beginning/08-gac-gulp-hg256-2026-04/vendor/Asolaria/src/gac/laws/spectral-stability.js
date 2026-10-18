"use strict";

const LAW_ID = "LAW-099-openmythos-recurrence-stability";
const DEFAULT_MAX_LOOPS = 16;

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluateSpectralStability(action = {}, context = {}) {
  const engine = String(action.engine || context.engine || "").trim().toLowerCase();
  if (engine && engine !== "mythos" && engine !== "openmythos") {
    return { passed: true, law: LAW_ID, action: "ALLOW", reason: "not_openmythos" };
  }

  const loops = numberOrNull(action.loops ?? context.loops);
  const maxLoops = numberOrNull(context.maxLoops) || DEFAULT_MAX_LOOPS;
  if (loops != null && loops > maxLoops) {
    return {
      passed: false,
      law: LAW_ID,
      action: "THROTTLE",
      reason: `loop count ${loops} exceeds max ${maxLoops}`
    };
  }

  const spectralRadius = numberOrNull(context.spectralRadius ?? action.spectralRadius);
  if (spectralRadius == null) {
    return {
      passed: false,
      law: LAW_ID,
      action: "HALT",
      reason: "No spectral radius measurement available"
    };
  }

  if (spectralRadius >= 1.0) {
    return {
      passed: false,
      law: LAW_ID,
      action: "HALT_AND_ROLLBACK",
      reason: `Spectral radius ${spectralRadius} >= 1.0; unstable recurrence`
    };
  }

  if (spectralRadius >= 0.95) {
    return {
      passed: true,
      law: LAW_ID,
      action: "LOG_DRIFT_HARD",
      warning: `Spectral radius ${spectralRadius} near instability threshold`
    };
  }

  return {
    passed: true,
    law: LAW_ID,
    action: "ALLOW",
    spectralRadius
  };
}

const SPECTRAL_STABILITY_LAW = Object.freeze({
  id: LAW_ID,
  name: "Mathematical stability of recurrent cognitive engines",
  type: "MATHEMATICAL_INVARIANT",
  enforcement: "PRE_EXECUTION_AND_DRIFT_OBSERVATION",
  thresholds: {
    hardDriftAt: 0.95,
    haltAt: 1.0,
    defaultMaxLoops: DEFAULT_MAX_LOOPS
  },
  check: evaluateSpectralStability
});

module.exports = {
  LAW_ID,
  DEFAULT_MAX_LOOPS,
  SPECTRAL_STABILITY_LAW,
  evaluateSpectralStability
};
