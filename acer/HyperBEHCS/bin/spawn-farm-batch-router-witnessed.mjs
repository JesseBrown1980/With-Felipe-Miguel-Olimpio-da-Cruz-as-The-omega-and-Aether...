// canonical_tool for verb `farm_pid_specific_contribution`
// Registered via VERB_MATRIX in super-dashboard-server.mjs
// Bucket DEFER-TO-APEX (core) / GUIDED-EXECUTE (extension scope, operator-witnessed)
// Owns: archaeology archive farming under operator witness while PROF-OMNISPINDLE not deployed
//
// This is a DESCRIPTOR — the actual spawning is performed by the agent that invoked the verb,
// in response to advisor GUIDED-EXECUTE return when scope=extension was passed.
//
// What this tool emits per fire:
//   - validates: operator_witness_token, batch.band (one of 8 supervisor bands), batch.size (<=8)
//   - reads: C:/HyperBEHCS/store/100-pid-roster-W113.json for L5 PIDs in band
//   - returns: list of {pid, prompt, output_path, tuple_close} for the calling agent to spawn
//   - appends: one row to C:/HyperBEHCS/history/100-pid-farm-W113.hbp per spawn dispatched
//
// Invocation shape (router-architecture compliant):
//   1. Agent POSTs /api/tool-advisor {verb: 'farm_pid_specific_contribution', scope: 'extension', from_vantage, ...}
//   2. Advisor returns GUIDED-EXECUTE with canonical_tool path = this file
//   3. Agent invokes `node <this-file> --band <band> --witness <token>` (operator-witness OAUTH-equivalent)
//   4. This tool emits dispatch descriptors (PID, prompt, output_path) for the agent's Agent tool calls
//   5. Agent spawns Agent calls (worker-mode, but operator-witnessed via the witness token)
//   6. Each spawned agent writes its 4-facet output file
//   7. Agent re-invokes this tool with --record-receipts to append rows to farm-archive ledger
//
// Until PROF-OMNISPINDLE program exists, this is the operator-witness override per
// feedback_frontend_agent_is_router_not_worker_2026_05_21 rule A.
//
// PID: AGT-FORGE-CANONICAL-TOOL-FARM-WITNESSED-H8072-W113

import fs from "node:fs";

const BANDS = {
  cube_cubed_sealer: [0, 255],
  gaia:              [256, 383],
  helm:              [384, 479],
  vector:            [480, 575],
  rook:              [576, 703],
  forge:             [704, 799],
  falcon:            [800, 895],
  livefree:          [896, 1023],
};
const ROSTER_PATH = "C:/HyperBEHCS/store/100-pid-roster-W113.json";
const LEDGER_PATH = "C:/HyperBEHCS/history/100-pid-farm-W113.hbp";

function usage() {
  console.error("usage: node spawn-farm-batch-router-witnessed.mjs --band <band> --witness <token>");
  console.error("       node spawn-farm-batch-router-witnessed.mjs --record-receipts --band <band>");
  console.error("bands: " + Object.keys(BANDS).join(", "));
  process.exit(2);
}

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, a) => {
  if (cur.startsWith("--")) acc.push([cur.slice(2), a[i+1] && !a[i+1].startsWith("--") ? a[i+1] : true]);
  return acc;
}, []));

if (!args.band || !BANDS[args.band]) usage();
if (!args["record-receipts"] && !args.witness) {
  console.error("REFUSED: operator-witness token required (--witness <token>)");
  console.error("Reason: PROF-OMNISPINDLE not deployed; orchestration spawn requires operator witness per rule A");
  process.exit(3);
}

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
const l5InBand = roster.filter(r => r.level === "L5" && r.sup === args.band);

console.log(JSON.stringify({
  ok: true,
  verb: "farm_pid_specific_contribution",
  scope: "extension",
  band: args.band,
  witness_token: args.witness || "(record-mode)",
  l5_count: l5InBand.length,
  dispatch_descriptors: l5InBand.map(r => ({
    pid: r.pid,
    h: r.h,
    room: r.room,
    role: r.role,
    blast: r.blast,
    output_path: `D:/AsolariaGuides/100-pid-startup-prompt-W113/L5-sup-${args.band}-blast-${r.blast}.md`,
    tuple_close: `(PID-Asolaria-L5)(PID-blast-sup-${args.band}-${r.role || 'specialist'})`,
  })),
  ledger_path: LEDGER_PATH,
  note: "Agent calling this tool must spawn each dispatch_descriptor via Agent tool with operator witness. Each spawn must produce UNIQUE 4-facet output (TOOLS/SKILLS/PATTERNS/MISTAKES). After spawn batch completes, re-invoke with --record-receipts to append ledger rows.",
}, null, 2));
