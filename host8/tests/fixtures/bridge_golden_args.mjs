// docs/handoffs/p4-sidecar-lanes-2026-10-18/bridge_golden.mjs (sha256 876d9af9...) with its lines 1-3 replaced
// by this note and its bridge path, ledger path, output path and predictions label (lines 7-8, 14, 26) taken
// from argv; the other lines are unchanged. Cold-lane check only: it wrote bridge-edge.golden.hbp with node
// 22.22.0, from host8/:
//   node tests/fixtures/bridge_golden_args.mjs ../acer/Asolaria/tools/behcs/gnn-dispatch-bridge.mjs \
//     tests/fixtures/bridge-edge.ndjson tests/fixtures/bridge-edge.golden.hbp fixtures/bridge-edge.ndjson
import fs from "node:fs";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const [, , BRIDGE, PRED_PATH, OUT, PRED = "C:/Users/acer/Asolaria/data/behcs/gnn-predictions.ndjson"] = process.argv;
const { classifyTier, stablePredictionId, resolvePredictionPid } = await import(pathToFileURL(BRIDGE).href);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const clean = (v) => String(v ?? "").replace(/[|\r\n\t]/g, "_").slice(0, 160);
const rows = [];
const bridgeBytes = fs.readFileSync(BRIDGE);
let raw = Buffer.alloc(0); try { raw = fs.readFileSync(PRED_PATH); } catch {}
const lines = raw.toString("utf8").split(/\r?\n/).filter((l) => l.trim());
const preds = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } });
const tiers = { T1: 0, T2: 0, T3: 0 }; let bad = 0;
preds.forEach((p, i) => {
  if (!p) { bad++; return; }
  const id = stablePredictionId(p), tier = classifyTier(p), pid = resolvePredictionPid(p, id);
  tiers[tier] = (tiers[tier] || 0) + 1;
  rows.push(`BRIDGEGOLD|i=${i}|pred_id=${clean(id)}|tier=${tier}|prediction_pid=${clean(pid)}|verb=${clean(p.predicted_verb || p.verb)}|target=${clean(p.predicted_target || p.target)}|json=0`);
});
rows.unshift(`BRIDGEGOLDHDR|bridge=tools/behcs/gnn-dispatch-bridge.mjs|bridge_sha256=${sha(bridgeBytes)}|predictions=${PRED.replace(/\|/g, "_")}|pred_sha256=${sha(raw)}|rows=${preds.length}|unparseable=${bad}|T1=${tiers.T1}|T2=${tiers.T2}|T3=${tiers.T3}|fns=stablePredictionId+classifyTier+resolvePredictionPid|bus_posts=0|fire=0|json=0`);
rows.push(`BRIDGEGOLDFTR|rows_sha256=${sha(rows.join("\n"))}|parity_rule=host8_port_must_emit_identical_pred_id+tier+prediction_pid_per_row_before_node_retire|json=0`);
fs.writeFileSync(OUT, rows.join("\n") + "\n");
console.log(rows[0]); console.log(rows[rows.length - 1]); console.log(`ROWS=${rows.length}`);
