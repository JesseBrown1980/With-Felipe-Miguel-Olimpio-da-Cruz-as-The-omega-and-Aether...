"use strict";

const DEFAULT_MAX_LOOPS = 16;

const GLYPH_VERBS = Object.freeze({
  MYTHOS_THINK: "MYTHOS_THINK",
  MYTHOS_REASON: "MYTHOS_REASON",
  MYTHOS_LOOP: "MYTHOS_LOOP",
  MYTHOS_STATUS: "MYTHOS_STATUS",
  MYTHOS_DRIFT: "MYTHOS_DRIFT"
});

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizePid(pid) {
  return String(pid || "BH.COGNITIVE.OPENMYTHOS.PID.0000000001").trim();
}

function validateOpenMythosGac(task = {}) {
  const loops = clampInteger(task.loops, 8, 1, DEFAULT_MAX_LOOPS);
  const maxTokens = clampInteger(task.maxTokens || task.max_new_tokens, 256, 1, 2048);
  const errors = [];
  const warnings = [];

  if (loops > DEFAULT_MAX_LOOPS) {
    errors.push("openmythos_loop_limit_exceeded");
  }
  if (maxTokens > 2048) {
    errors.push("openmythos_token_limit_exceeded");
  }
  if (task.spectralRadius != null && Number(task.spectralRadius) >= 1) {
    errors.push("openmythos_spectral_radius_unstable");
  }
  if (!task.prompt && task.verb !== GLYPH_VERBS.MYTHOS_STATUS && task.verb !== GLYPH_VERBS.MYTHOS_DRIFT) {
    warnings.push("openmythos_prompt_missing");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: {
      loops,
      maxTokens,
      pid: normalizePid(task.pid)
    }
  };
}

function buildOpenMythosGlyphTask(task = {}) {
  const validation = validateOpenMythosGac(task);
  const verb = String(task.verb || GLYPH_VERBS.MYTHOS_THINK).trim();
  const pid = validation.normalized.pid;
  const prompt = String(task.prompt || "").replace(/\s+/g, " ").trim();
  return {
    engine: "openmythos",
    status: validation.ok ? "READY_GATED" : "BLOCKED_BY_GAC",
    pid,
    verb,
    glyphSentence: prompt ? `${verb} ${pid} ${prompt}` : `${verb} ${pid}`,
    loops: validation.normalized.loops,
    maxTokens: validation.normalized.maxTokens,
    gac: validation
  };
}

function manifest() {
  return {
    id: "openmythos",
    title: "OpenMythos recurrent-depth cognitive engine",
    description: "Gated adapter contract for the OpenMythos PyTorch recurrent-depth transformer package.",
    capabilities: ["deep_reasoning", "recurrent_depth", "latent_looping", "drift_signal"],
    glyphVerbs: GLYPH_VERBS,
    gacLaws: ["LAW-099-openmythos-recurrence-stability"],
    runtime: {
      language: "python",
      package: "open-mythos",
      import: "open_mythos.main",
      execution: "blocked_until_package_weights_and_smoke_test_exist"
    },
    constraints: {
      maxLoops: DEFAULT_MAX_LOOPS,
      spectralRadiusMustBeBelow: 1,
      noRawHiddenStatePersistence: true,
      noModelClaimWithoutWeightsAndBenchmark: true
    }
  };
}

module.exports = {
  GLYPH_VERBS,
  DEFAULT_MAX_LOOPS,
  buildOpenMythosGlyphTask,
  validateOpenMythosGac,
  manifest
};
