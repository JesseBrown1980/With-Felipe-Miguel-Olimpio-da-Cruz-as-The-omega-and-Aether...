#!/usr/bin/env node
// gnn-predictions-emitter.mjs
//
// Heuristic predictor for the GNN-dispatch-bridge skeleton. Until a real GNN
// model writes to data/behcs/gnn-predictions-fixture.json, this emitter
// produces predictions deterministically from current fabric state:
//   - Reads supervisor index for ASSUMED supervisors
//   - For each, proposes a concrete "exercise this authority" action
//   - Tier-classifies each prediction by inspecting the action's PID prefix
//   - Writes to the fixture path the bridge reads
//
// The bridge's tier-policy filter then filters T3, fires T1, queues T2.
//
// Per real-time fabric self-improvement loop init (cosign seq=43) tick-2.
// named_agent: liris-T2-gnn-predictions-emitter-heuristic

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SUPERVISOR_INDEX = "C:/Users/rayss/Asolaria/data/behcs/pid-fabric/index/supervisor-pid-indicator-index-latest.json";
const FIXTURE_PATH = "C:/Users/rayss/Asolaria/data/behcs/state/gnn-predictions-fixture.json";
const COSIGN_CHAIN = "C:/Users/rayss/.claude/projects/C--/memory/COSIGN_CHAIN.ndjson";

function flatSupervisors(o, out = []) {
  if (Array.isArray(o)) { for (const x of o) flatSupervisors(x, out); return out; }
  if (o && typeof o === "object") {
    if (o.indicatorPid && o.authority) {
      out.push({
        pid: o.indicatorPid,
        role: o.role,
        authority: o.authority,
        status: o.status,
        d11: o.d11_level ?? "ASSUMED",
      });
    }
    for (const k in o) flatSupervisors(o[k], out);
  }
  return out;
}

// Authority → exercise-action mapping (which concrete action exercises each authority).
// PID prefixes for tier classification:
//   BH.OPERATIONAL.* → T1 (bus-send, gulp, heartbeat, watch, reconcile)
//   BH.SUPERVISOR.* → T2 (fabric query needed)
//   T3 forbidden verbs hard-coded in bridge already.
const AUTHORITY_EXERCISES = {
  preserve_family_boundaries: {
    pid: "BH.OPERATIONAL.WATCH.GLYPH-FAMILY-INVARIANT",
    verb: "EVT-WATCH-GLYPH-FAMILY-CHECK",
    description: "Periodic check that recent envelope verbs maintain family-boundary separation",
    idempotent: true,
  },
  plan_only_until_supervisor_gates_clear: {
    pid: "BH.OPERATIONAL.RECONCILE.APEX-GATE-CLEARANCE",
    verb: "EVT-RECONCILE-APEX-GATE-CLEARANCE-CHECK",
    description: "Verify all subordinate gates are clear before next apex action",
    idempotent: true,
  },
  require_packet_before_action: {
    pid: "BH.OPERATIONAL.WATCH.PACKET-BOUNDARY",
    verb: "EVT-WATCH-PACKET-BOUNDARY-CHECK",
    description: "Verify each next-step is wrapped in a ratifiable packet",
    idempotent: true,
  },
  block_multi_peer_promotion: {
    pid: "BH.OPERATIONAL.WATCH.TRUST-SEQUENCING",
    verb: "EVT-WATCH-TRUST-SEQUENCING-CHECK",
    description: "Verify only one trust decision in flight at a time",
    idempotent: true,
  },
  deny_write_class_until_cosigned: {
    pid: "BH.OPERATIONAL.WATCH.WRITE-CLASS-COSIGN",
    verb: "EVT-WATCH-WRITE-CLASS-COSIGN-CHECK",
    description: "Verify write-class actions carry cosign reference",
    idempotent: true,
  },
};

function buildPredictionsFromSupervisors() {
  if (!fs.existsSync(SUPERVISOR_INDEX)) return [];
  const idx = JSON.parse(fs.readFileSync(SUPERVISOR_INDEX, "utf-8"));
  const sups = flatSupervisors(idx);
  const observedAuths = new Set(); // dedup
  const predictions = [];
  for (const s of sups) {
    const exercise = AUTHORITY_EXERCISES[s.authority];
    if (!exercise) continue;
    if (observedAuths.has(s.authority)) continue;
    observedAuths.add(s.authority);
    predictions.push({
      pid: exercise.pid,
      verb: exercise.verb,
      d11: "PROVEN", // these checks are deterministic + observable
      idempotent: exercise.idempotent === true,
      to: "acer",
      description: exercise.description,
      exercises_supervisor: s.pid,
      exercises_authority: s.authority,
      generated_by: "liris-gnn-predictions-emitter-heuristic",
      generated_at: new Date().toISOString(),
    });
  }
  return predictions;
}

function buildPredictionsFromCosignTrend() {
  // Mine cosign chain entry-kind sequences for cross-kind patterns. Predict
  // the next-likely kind from the most-recent observed pair.
  // Per acer tick-2 follow-on: filter same-kind self-loops (heartbeat→heartbeat
  // 561× is noise; only cross-kind transitions are signal).
  if (!fs.existsSync(COSIGN_CHAIN)) return [];
  const all = fs.readFileSync(COSIGN_CHAIN, "utf-8").split("\n").filter(l => l.trim());
  const entries = all.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (entries.length < 3) return [];

  // Build kind→nextKind frequency table excluding self-loops.
  const transitions = new Map(); // "kindA→kindB" → count
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i].kind ?? entries[i].type ?? entries[i].event ?? "?";
    const b = entries[i + 1].kind ?? entries[i + 1].type ?? entries[i + 1].event ?? "?";
    if (a === b) continue; // FILTER same-kind self-loops per acer rule
    if (a === "?" || b === "?") continue;
    const key = `${a}→${b}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
  }

  // Most recent kind → predict the most-frequent next-kind from history
  const lastKind = entries[entries.length - 1].kind ?? entries[entries.length - 1].type ?? entries[entries.length - 1].event ?? "?";
  if (lastKind === "?") return [];

  // Find candidates from lastKind
  const candidates = [];
  for (const [key, count] of transitions.entries()) {
    if (key.startsWith(lastKind + "→")) {
      candidates.push({ next: key.slice(lastKind.length + 1), count });
    }
  }
  if (candidates.length === 0) return [];
  candidates.sort((a, b) => b.count - a.count);
  const top = candidates[0];

  // Only emit if confidence > 1 occurrence
  if (top.count < 2) return [];

  return [{
    pid: `BH.OPERATIONAL.WATCH.COSIGN-CHAIN-NEXT-KIND-${top.next.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`,
    verb: `EVT-WATCH-COSIGN-CHAIN-NEXT-KIND-PREDICTED`,
    d11: "PROVEN",
    idempotent: true,
    to: "acer",
    description: `Watch for next-kind '${top.next}' to follow last-kind '${lastKind}' (observed ${top.count}× in chain history)`,
    exercises_supervisor: "BH.SUPERVISOR.PID.FED.REINTEGRATION.HERMES.PACKET",
    exercises_authority: "require_packet_before_action",
    miner: "cosign-chain-cross-kind-frequency",
    same_kind_self_loops_filtered: true,
    last_observed_kind: lastKind,
    predicted_next_kind: top.next,
    confidence_count: top.count,
    generated_by: "liris-gnn-predictions-emitter-cross-kind-miner",
    generated_at: new Date().toISOString(),
  }];
}

const predictions = [...buildPredictionsFromSupervisors(), ...buildPredictionsFromCosignTrend()];

const fixture = {
  generated_at: new Date().toISOString(),
  generated_by: "gnn-predictions-emitter (heuristic — placeholder until live GNN model lands)",
  fabric_canon_seq: 43,
  count: predictions.length,
  predictions,
};

fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
console.log(`[emitter] wrote ${predictions.length} predictions to ${FIXTURE_PATH}`);
for (const p of predictions) {
  console.log(`  - ${p.pid} ${p.verb} (exercises ${p.exercises_authority})`);
}
