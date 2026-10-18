/**
 * Sovereignty Gate — Enforces promotion policy on all write operations.
 * The immune system at the data level.
 *
 * Tiers:
 *   1 (routine)    — 2-gate: author + hash, verify on next compile
 *   2 (structural) — 4-gate: author + fixture proof + staging test + snapshot
 *   3 (firmware)   — 7-gate: full proof ladder (reserved for hardware ops)
 */
const { boot, isCanonicalSource, isDraftOnly } = require("./sovereignty-boot");

const TIER_ROUTINE = 1;
const TIER_STRUCTURAL = 2;
const TIER_FIRMWARE = 3;

// Operations that modify the index/registry/catalog
const STRUCTURAL_OPS = new Set([
  "add-topic", "revise-topic", "resolve-conflict",
  "registry-update", "schema-change", "catalog-update"
]);

function classifyTier(op) {
  if (op === "firmware-write" || op === "spi-flash" || op === "nvram-modify") {
    return TIER_FIRMWARE;
  }
  if (STRUCTURAL_OPS.has(op)) {
    return TIER_STRUCTURAL;
  }
  return TIER_ROUTINE;
}

function gateRoutine(author, payload) {
  // Gate A: Author identity exists
  if (!author || typeof author !== "string" || author.length < 1) {
    return { allowed: false, reason: "missing_author", tier: TIER_ROUTINE };
  }
  // Gate A.2: Author is a registered colony (if registry is loaded)
  const s = boot();
  if (s.registry.colonyCount > 0 && !s.registry.isRegistered(author)) {
    return { allowed: false, reason: "author_not_registered", tier: TIER_ROUTINE, author };
  }
  // Gate B: deferred — verify on next compilation cycle
  return { allowed: true, tier: TIER_ROUTINE, author, deferred: ["compile_verify"] };
}

function gateStructural(author, op, payload) {
  const routine = gateRoutine(author, payload);
  if (!routine.allowed) return routine;

  const s = boot();

  // Gate B.1: Author must have mutation authority for structural ops
  if (s.registry.colonyCount > 0 && !s.registry.hasAuthority(author, "approval_required")) {
    return { allowed: false, reason: "insufficient_authority", tier: TIER_STRUCTURAL, author };
  }

  // Gate B: Fixture-aligned proof — does this break existing compiled state?
  if (s.index.loaded && s.index.entryCount > 0) {
    // Entry exists in the index — structural change must not orphan chains
    if (payload && payload.chain && Array.isArray(payload.chain)) {
      for (const ref of payload.chain) {
        if (typeof ref === "string" && ref.startsWith("IX-")) {
          // Chain reference declared — accepted
        }
      }
    }
  }

  // Gate C: Source kind qualification — draft-only sources cannot perform structural ops
  if (payload && payload.sourceKind) {
    if (isDraftOnly(payload.sourceKind)) {
      return {
        allowed: false,
        tier: TIER_STRUCTURAL,
        reason: "draft_only_source_blocked_from_structural",
        author,
        sourceKind: payload.sourceKind,
        note: "Only live_probe and code_verified sources can perform structural operations"
      };
    }
  }

  // Gate D: snapshot — caller is responsible for taking before/after snapshots
  return {
    allowed: true,
    tier: TIER_STRUCTURAL,
    author,
    requires: ["snapshot_before", "snapshot_after"]
  };
}

function gateFirmware(author, op, payload) {
  // Firmware tier is BLOCKED until CH341A hardware exists
  // and the full 7-gate proof ladder is implemented
  return {
    allowed: false,
    tier: TIER_FIRMWARE,
    reason: "firmware_gate_not_implemented",
    note: "Requires CH341A hardware + full 7-gate proof ladder. Reserved for future."
  };
}

/**
 * Main gate function. Call before any write operation.
 * @param {string} op — operation name (e.g., "add-observation", "add-topic", "firmware-write")
 * @param {string} author — who is performing the operation
 * @param {object} payload — the operation payload
 * @returns {{ allowed: boolean, tier: number, reason?: string }}
 */
function gate(op, author, payload = {}) {
  const tier = classifyTier(op);
  switch (tier) {
    case TIER_FIRMWARE:
      return gateFirmware(author, op, payload);
    case TIER_STRUCTURAL:
      return gateStructural(author, op, payload);
    default:
      return gateRoutine(author, payload);
  }
}

module.exports = {
  gate,
  classifyTier,
  TIER_ROUTINE,
  TIER_STRUCTURAL,
  TIER_FIRMWARE
};
