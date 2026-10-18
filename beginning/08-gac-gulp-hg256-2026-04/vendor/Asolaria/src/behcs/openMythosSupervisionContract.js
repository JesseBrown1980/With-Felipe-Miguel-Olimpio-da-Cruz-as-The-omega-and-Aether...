"use strict";

const { sha256, stableStringify } = require("./bimlFeedbackContract");
const { evaluateSpectralStability, LAW_ID } = require("../gac/laws/spectral-stability");

const CONTRACT_ID = "openmythos-supervision-contract.v1";

function clip(value, max = 500) {
  return String(value === null || value === undefined ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function buildMythosContract(input = {}) {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const loops = Number.isFinite(Number(input.loops)) ? Number(input.loops) : 8;
  const spectralRadius = Number.isFinite(Number(input.spectralRadius)) ? Number(input.spectralRadius) : 0.5;
  const contract = {
    contractId: CONTRACT_ID,
    generatedAt,
    engine: "openmythos",
    pid: clip(input.pid || "BH.MYTHOS.SUPERVISED.0001", 200),
    glyphVerb: clip(input.glyphVerb || "MYTHOS_THINK", 120),
    supervisor: clip(input.supervisor || "Hermes OpenMythos Supervisor", 240),
    law: LAW_ID,
    loops,
    spectralRadius,
    atlasSurface: clip(input.atlasSurface || "deep_reasoning", 160),
    executionDefault: input.weightsPresent === true && input.configPresent === true
      ? "gated_runtime_available_after_law099"
      : "execution_blocked_missing_weights_or_config",
    requiredGates: [
      "pid_binding",
      "law099_spectral_stability",
      "drift_broadcast",
      "gac",
      "shannon",
      "white_room"
    ],
    drift: {
      monitor: "spectral_radius",
      hardAt: 0.95,
      haltAt: 1.0,
      action: "halt_and_rollback_on_unstable_recurrence"
    }
  };
  return {
    ...contract,
    digest: sha256(stableStringify(contract))
  };
}

function validateMythosContract(contract = {}) {
  const lawResult = evaluateSpectralStability(
    { engine: "openmythos", loops: contract.loops, spectralRadius: contract.spectralRadius },
    { engine: "openmythos", loops: contract.loops, spectralRadius: contract.spectralRadius }
  );
  const errors = [];
  if (contract.contractId !== CONTRACT_ID) errors.push("wrong_contract_id");
  if (!contract.pid) errors.push("missing_pid");
  if (!contract.glyphVerb) errors.push("missing_glyph_verb");
  if (!lawResult.passed) errors.push(`law099_${lawResult.action}`);
  if (!contract.supervisor) errors.push("missing_supervisor");
  return {
    ok: errors.length === 0,
    contractId: CONTRACT_ID,
    lawResult,
    errors,
    digest: contract.digest || sha256(stableStringify(contract))
  };
}

module.exports = {
  CONTRACT_ID,
  buildMythosContract,
  validateMythosContract
};
