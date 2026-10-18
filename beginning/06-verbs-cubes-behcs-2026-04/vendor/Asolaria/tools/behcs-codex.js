#!/usr/bin/env node
"use strict";
/**
 * behcs-codex.js — BEHCS codex for liris colony.
 * LP-001: Full BEHCS codex install.
 *
 * Exports:
 *   buildBehcsTuple(actor, verb, target, risk, layer, gate, state, tags, wave, dialect, proof, scope, surface, energy)
 *   parseBehcsTuple(tuple)
 *   validateTuple(tuple)
 *   hilbertAddress
 *   BEHCS_LAWS
 *   TUPLE_FIELDS
 */

const TUPLE_FIELDS = [
  "actor",    // D1  — who
  "verb",     // D2  — what action
  "target",   // D3  — what object
  "risk",     // D4  — 0-9
  "layer",    // D5  — chip/os/runtime/app/agent/colony/civilization/cloud
  "gate",     // D6  — hookwall/gnn/shannon/sovereignty/omni/cosign
  "state",    // D7  — proposed/queued/gated/executing/completed/failed/blocked/cancelled
  "tags",     // D8  — array of chain/context tags
  "wave",     // D9  — single/broadcast/scatter/gather/relay/pulse/flood
  "dialect",  // D10 — IX/LX/FA/ASO/RO/AM/TX/GA
  "proof",    // D11 — none/log/screenshot/hash/test/witness/code/live_probe/chain/structural_invariant
  "scope",    // D12 — instant/session/persistent/permanent/boot/operational/foundational/ephemeral
  "surface",  // D13 — endpoint surface identifier
  "energy"   // D14 — free/light/medium/heavy/massive
];

const TUPLE_LENGTH = TUPLE_FIELDS.length; // 14

/**
 * Hilbert address for liris node — matches 47D spec.
 */
const hilbertAddress = {
  D1:  "liris",
  D7:  4913,
  D13: 68921,
  D15: 103823,
  D19: "192.168.100.2",
  D25: 912673,
  D35: 3307949,
  D44: 7189057,
  D47: 9393931
};

/**
 * BEHCS laws — the three axioms of the bus.
 */
const BEHCS_LAWS = {
  LAW_001: "every message carries a tuple",
  LAW_002: "every tuple maps to hilbert address",
  LAW_003: "triad mesh - silent >120s = escalation"
};

/**
 * Build a 14-field BEHCS tuple array matching the format used in Falcon heartbeats.
 * @returns {Array} 14-element tuple
 */
function buildBehcsTuple(actor, verb, target, risk, layer, gate, state, tags, wave, dialect, proof, scope, surface, energy) {
  return [actor, verb, target, risk, layer, gate, state, tags, wave, dialect, proof, scope, surface, energy];
}

/**
 * Parse a 14-element tuple array into a named object.
 * @param {Array} tuple — 14-element array
 * @returns {Object} named fields
 */
function parseBehcsTuple(tuple) {
  const obj = {};
  for (let i = 0; i < TUPLE_FIELDS.length; i++) {
    obj[TUPLE_FIELDS[i]] = tuple[i];
  }
  return obj;
}

/**
 * Validate a tuple: all 14 fields must be present (not undefined/null).
 * @param {Array} tuple
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTuple(tuple) {
  const errors = [];

  if (!Array.isArray(tuple)) {
    return { valid: false, errors: ["tuple is not an array"] };
  }

  if (tuple.length !== TUPLE_LENGTH) {
    errors.push("expected " + TUPLE_LENGTH + " fields, got " + tuple.length);
  }

  for (let i = 0; i < TUPLE_LENGTH; i++) {
    if (tuple[i] === undefined || tuple[i] === null) {
      errors.push("field " + TUPLE_FIELDS[i] + " (index " + i + ") is missing");
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  buildBehcsTuple,
  parseBehcsTuple,
  validateTuple,
  hilbertAddress,
  BEHCS_LAWS,
  TUPLE_FIELDS
};
