#!/usr/bin/env node
"use strict";
/**
 * test-behcs-codex.js — Tests for behcs-codex.js
 * LP-001 validation.
 */

const {
  buildBehcsTuple,
  parseBehcsTuple,
  validateTuple,
  hilbertAddress,
  BEHCS_LAWS,
  TUPLE_FIELDS
} = require("./behcs-codex.js");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log("  PASS: " + label);
    passed++;
  } else {
    console.log("  FAIL: " + label);
    failed++;
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// --- Test 1: TUPLE_FIELDS has 14 entries ---
console.log("\n[1] TUPLE_FIELDS");
assert(TUPLE_FIELDS.length === 14, "TUPLE_FIELDS has 14 entries");
assert(TUPLE_FIELDS[0] === "actor", "first field is actor");
assert(TUPLE_FIELDS[13] === "energy", "last field is energy");

// --- Test 2: buildBehcsTuple ---
console.log("\n[2] buildBehcsTuple");
const tuple = buildBehcsTuple(
  "liris", "behcs.heartbeat", "asolaria", 0,
  "colony", "hookwall", "pulsing",
  ["LX-489", "BEHCS-class-5", "triad-node-3"],
  "pulse", "LX", "signed", "permanent", "ethernet-direct", "free"
);
assert(Array.isArray(tuple), "returns an array");
assert(tuple.length === 14, "tuple has 14 elements");
assert(tuple[0] === "liris", "actor = liris");
assert(tuple[1] === "behcs.heartbeat", "verb = behcs.heartbeat");
assert(tuple[3] === 0, "risk = 0");
assert(tuple[13] === "free", "energy = free");
assert(Array.isArray(tuple[7]), "tags is an array");

// --- Test 3: parseBehcsTuple ---
console.log("\n[3] parseBehcsTuple");
const parsed = parseBehcsTuple(tuple);
assert(typeof parsed === "object", "returns an object");
assert(parsed.actor === "liris", "parsed.actor = liris");
assert(parsed.verb === "behcs.heartbeat", "parsed.verb = behcs.heartbeat");
assert(parsed.target === "asolaria", "parsed.target = asolaria");
assert(parsed.risk === 0, "parsed.risk = 0");
assert(parsed.layer === "colony", "parsed.layer = colony");
assert(parsed.gate === "hookwall", "parsed.gate = hookwall");
assert(parsed.state === "pulsing", "parsed.state = pulsing");
assert(deepEqual(parsed.tags, ["LX-489", "BEHCS-class-5", "triad-node-3"]), "parsed.tags matches");
assert(parsed.wave === "pulse", "parsed.wave = pulse");
assert(parsed.dialect === "LX", "parsed.dialect = LX");
assert(parsed.proof === "signed", "parsed.proof = signed");
assert(parsed.scope === "permanent", "parsed.scope = permanent");
assert(parsed.surface === "ethernet-direct", "parsed.surface = ethernet-direct");
assert(parsed.energy === "free", "parsed.energy = free");

// --- Test 4: Round-trip ---
console.log("\n[4] Round-trip build -> parse -> rebuild");
const rebuilt = buildBehcsTuple(
  parsed.actor, parsed.verb, parsed.target, parsed.risk,
  parsed.layer, parsed.gate, parsed.state, parsed.tags,
  parsed.wave, parsed.dialect, parsed.proof, parsed.scope,
  parsed.surface, parsed.energy
);
assert(deepEqual(tuple, rebuilt), "round-trip produces identical tuple");

// --- Test 5: validateTuple ---
console.log("\n[5] validateTuple — valid tuple");
const v1 = validateTuple(tuple);
assert(v1.valid === true, "valid tuple returns valid=true");
assert(v1.errors.length === 0, "valid tuple has 0 errors");

console.log("\n[6] validateTuple — short tuple");
const v2 = validateTuple(["liris", "ping"]);
assert(v2.valid === false, "short tuple returns valid=false");
assert(v2.errors.length > 0, "short tuple has errors");

console.log("\n[7] validateTuple — null field");
const badTuple = [...tuple];
badTuple[5] = null;
const v3 = validateTuple(badTuple);
assert(v3.valid === false, "null field returns valid=false");
assert(v3.errors.some(e => e.includes("gate")), "error mentions gate field");

console.log("\n[8] validateTuple — not an array");
const v4 = validateTuple("not_array");
assert(v4.valid === false, "string returns valid=false");
assert(v4.errors[0].includes("not an array"), "error says not an array");

// --- Test 6: hilbertAddress ---
console.log("\n[9] hilbertAddress");
assert(hilbertAddress.D1 === "liris", "D1 = liris");
assert(hilbertAddress.D7 === 4913, "D7 = 4913");
assert(hilbertAddress.D13 === 68921, "D13 = 68921");
assert(hilbertAddress.D15 === 103823, "D15 = 103823");
assert(hilbertAddress.D19 === "192.168.100.2", "D19 = 192.168.100.2");
assert(hilbertAddress.D25 === 912673, "D25 = 912673");
assert(hilbertAddress.D35 === 3307949, "D35 = 3307949");
assert(hilbertAddress.D44 === 7189057, "D44 = 7189057");
assert(hilbertAddress.D47 === 9393931, "D47 = 9393931");

// --- Test 7: BEHCS_LAWS ---
console.log("\n[10] BEHCS_LAWS");
assert(BEHCS_LAWS.LAW_001 === "every message carries a tuple", "LAW_001 correct");
assert(BEHCS_LAWS.LAW_002 === "every tuple maps to hilbert address", "LAW_002 correct");
assert(BEHCS_LAWS.LAW_003 === "triad mesh - silent >120s = escalation", "LAW_003 correct");

// --- Summary ---
console.log("\n========================================");
console.log("  TOTAL: " + (passed + failed) + "  PASS: " + passed + "  FAIL: " + failed);
console.log("========================================");
process.exit(failed > 0 ? 1 : 0);
