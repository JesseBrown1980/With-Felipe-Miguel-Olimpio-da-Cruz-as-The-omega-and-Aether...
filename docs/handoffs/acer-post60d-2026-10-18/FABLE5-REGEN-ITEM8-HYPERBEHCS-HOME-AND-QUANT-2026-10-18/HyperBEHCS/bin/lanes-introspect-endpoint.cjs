"use strict";

// W45-A11 sidecar: /lanes/introspect read-only endpoint.
// PID: AGT-LIVEFREE-HOOKWALL-A11-W45-LANES-INTROSPECT-2026-05-21
// Source-of-truth: ../lib/hyperbehcs-substrate.cjs (DEFAULT_LANES lines 13-26)
// Gate: NO mutation of substrate. NO daemon restart. Sidecar pattern.

const substrate = require("../lib/hyperbehcs-substrate.cjs");

const SCHEMA_VERSION = "lanes-introspect/v1";
const HBPV1_GRAMMAR = Object.freeze({
  magic: "HBP1",
  rows: ["pid", "room_id", "lane", "payload_hash", "predecessors[]"],
  chain: "append-only hypergraph",
});
const QUANT_STACK = Object.freeze(["polar", "turbo", "js-johnson-lindenstrauss"]);

function introspect(options = {}) {
  const lanes = substrate.DEFAULT_LANES.slice();
  const laneCount = lanes.length;
  // gnn edges per lane: 1 `routes_to` edge per lane from PID (per gnnEdges loop)
  const gnnEdgesPerLane = 1;
  const cubeMod = laneCount;

  const detail = lanes.map((name, index) => ({
    index,
    name,
    cube_slot_modulo: index % cubeMod,
    gnn_edges_from_pid: gnnEdgesPerLane,
    autotranslate_pipe: true,
  }));

  return {
    schema: SCHEMA_VERSION,
    pid: "AGT-LIVEFREE-HOOKWALL-A11-W45-LANES-INTROSPECT-2026-05-21",
    generated_at: new Date().toISOString(),
    lane_count: laneCount,
    lanes,
    lanes_detail: detail,
    gnn_edges_per_lane: gnnEdgesPerLane,
    gnn_edges_total_from_pid: gnnEdgesPerLane * laneCount,
    quant_stack: QUANT_STACK,
    hookwall_mode: "lane:hookwall (substrate lane index 4)",
    hbpv1_grammar_present: true,
    hbpv1_grammar: HBPV1_GRAMMAR,
    source_of_truth: "lib/hyperbehcs-substrate.cjs:13-26 DEFAULT_LANES",
    mutability: "read-only-sidecar",
    options_echo: options && typeof options === "object" ? { lanes_override: Array.isArray(options.lanes) } : {},
  };
}

function handler(req, res) {
  try {
    const body = introspect();
    const json = JSON.stringify(body, null, 2);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-pid", body.pid);
    res.setHeader("x-schema", body.schema);
    res.end(json);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: String(err && err.message || err) }));
  }
}

// Express-style mountable router fragment (works with raw http too).
function mount(app, route = "/lanes/introspect") {
  if (app && typeof app.get === "function") {
    app.get(route, handler);
    return { mounted: true, route };
  }
  return { mounted: false, route, reason: "no .get() on app" };
}

module.exports = {
  SCHEMA_VERSION,
  introspect,
  handler,
  mount,
};

// CLI direct-invoke: `node lanes-introspect-endpoint.cjs --format json`
if (require.main === module) {
  const fmt = (process.argv.find((a) => a.startsWith("--format=")) || "").split("=")[1]
    || (process.argv.includes("--format") ? process.argv[process.argv.indexOf("--format") + 1] : "json");
  const body = introspect();
  if (fmt === "pretty") {
    console.log(`lanes=${body.lane_count}  hookwall=${body.hookwall_mode}`);
    body.lanes.forEach((l, i) => console.log(`  [${i.toString().padStart(2, "0")}] ${l}`));
    console.log(`quant=${body.quant_stack.join("+")}  hbpv1=${body.hbpv1_grammar_present}`);
  } else {
    process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  }
}
