// Write + seal today's P3/P4 receipts THROUGH the new os-on-metal sidecar tools (stdio JSON-RPC), not shell writes.
// Also reconstructs the pre-P4 server.js (my edit was additive: 4 CFG lines + the LAYER 2b block) as a backup.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
const S = "C:/Users/acer/AppData/Local/Temp/claude/C--Users-acer/d6674318-eced-492f-a166-818a5162c281/scratchpad/";
const SRV = "C:/Users/acer/mcp-servers/asolaria-os-on-metal/server.js";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

// --- backup: reconstruct pre-P4 server.js ---
const cur = fs.readFileSync(SRV, "utf8");
const a = cur.indexOf("\n\n// ============================================================================\n// LAYER 2b");
const m3 = /\n\n\/\/ =+\n\/\/ LAYER 3/.exec(cur);
const cfgRe = /  \/\/ Sidecar lanes \(added 2026-10-18[^\n]*\n  host8_url:[^\n]*\n  recall_url:[^\n]*\n  office_dir:[^\n]*\n/;
let pre = null;
if (a > 0 && m3 && m3.index > a && cfgRe.test(cur)) {
  pre = (cur.slice(0, a) + cur.slice(m3.index)).replace(cfgRe, "");
  const bak = SRV + ".pre-p4-2026-10-18.reconstructed";
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, pre);
}
const backupRow = `P4BACKUP|server_js_now_sha256=${sha(cur)}|reconstructed_pre_p4_sha256=${pre ? sha(pre) : "FAILED"}|method=remove_additive_insertions|file=server.js.pre-p4-2026-10-18.reconstructed|json=0`;

// --- MCP stdio client ---
const srv = spawn(process.execPath, [SRV], { stdio: ["pipe", "pipe", "ignore"] });
let buf = ""; const pending = new Map(); let id = 0;
srv.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1);
  if (!l.trim()) continue; const msg = JSON.parse(l); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } } });
const call = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
const tool = async (name, args) => (await call("tools/call", { name, arguments: args })).result.content[0].text;
await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "office-write", version: "0" } });
srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
const append = async (name, rows) => { let out = ""; for (let i = 0; i < rows.length; i += 500) out = await tool("aoom_office_append", { name, rows: rows.slice(i, i + 500), create: true }); return out; };
const lines = (f) => fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.endsWith("|json=0"));

// 1) seal the new checkpoints + their raw rows
console.log(await tool("aoom_office_seal", { names: ["gnn-retrain-2026-10-18/prototype_model_strat_2026-10-18.pt",
  "gnn-retrain-2026-10-18/contrastive_model_strat_2026-10-18.pt", "gnn-retrain-2026-10-18/gslgnn_w9_3_strat_2026-10-18.pt", "gnn-retrain-2026-10-18/RETRAIN.rows"] }));

// 2) P3 receipt
console.log(await append("FABLE5-GNN-RETRAIN-STRAT-2026-10-18.hbp", [
  "RETRAINHDR|seat=ACER-CLAUDE-FABLE5|pid=8467a937cba309f7|topic=P3_stratified_retrain_L1_L2_L4|directed_by=OP-JESSE_yes_I_want_the_other_two_2026-10-18|outdir=gnn-retrain-2026-10-18|originals_touched=0|servers_swapped=0|E=0|json=0",
  ...lines(S + "../tasks/b7mi8u265.output"),
  "CORRECTION_BESIDE|row=GATECEILING|wrong_label=max_possible_std|right=std_of_a_PERFECT_0/1_classifier=0.011264|observed=0.01195_higher_because_~5_false_alarms_add_low_scores|row_kept_beside|json=0",
  "SCOPE|auc_1.0_means=separable_within_this_corpus|not=generalization|why=val/test_benign_edges_sit_on_the_same_pure-benign_node_pairs_as_train|json=0",
  "SWAP|status=NOT_DONE|why=servers_hardcode_original_filenames+L2_has_no_server|owner_call=1|json=0"]));

// 3) bridge golden rows
console.log(await append("FABLE5-BRIDGE-GOLDEN-2026-10-18.hbp", lines(S + "bridge-golden.rows")));

// 4) P4 receipt
console.log(await append("FABLE5-P4-SIDECAR-LANES-2026-10-18.hbp", [
  "P4HDR|seat=ACER-CLAUDE-FABLE5|pid=8467a937cba309f7|topic=P4_sidecar_lanes+seal_tool+bridge_parity|directed_by=OP-JESSE_yes_I_want_the_other_two_2026-10-18|E=0|json=0",
  "P4TOOLS|server=mcp-servers/asolaria-os-on-metal/server.js|added=aoom_host8_read,aoom_recall_search,aoom_office_verify,aoom_office_seal,aoom_office_append|tools_before=20|tools_after=25|node_check=OK|json=0",
  "P4TEST|host8_task_manager=200|shadow_parity_3=matched_3/3|recall_search=200|office_verify=OK_eee98bdb|escape_probes=2/2_refused_outside_office|tag=MEASURED_stdio|json=0",
  "P4SELFUSE|this_receipt_and_P3_receipt_and_seals_written_via=aoom_office_append+aoom_office_seal|shell_writes_to_office=0|json=0",
  backupRow,
  "P4FINDING|shadow_parity_route_compares=host8_summon_vs_launch_plan(instance_pid)|does_NOT_compare=gnn-dispatch-bridge|source=host8-serve/src/main.rs:1332|tag=MEASURED_code|json=0",
  "P4FINDING|parity_proven=0_and_node_retired=0|are=hardcoded_literals|source=host8-serve/src/main.rs:801+806|meaning=no_code_can_flip_them_yet|tag=MEASURED_code|json=0",
  "P4BRIDGE|host8_room=stub_default-embedded_no_bridge_logic|bridge_is=firing_daemon(veto_window_then_auto_dispatch_to_bus)|golden=FABLE5-BRIDGE-GOLDEN-2026-10-18.hbp|predictions=4739|T1=4739|T2=0|T3=0|meaning=every_prediction_is_auto-fire-after-veto|json=0",
  "P4NEXT|1=port_classifyTier+stablePredictionId+resolvePredictionPid_into_host8_Rust_1.81_clippy|2=emit_same_rows_and_byte-compare_with_golden|3=only_then_retire_node(operator_stops_daemon)|retired_now=0|json=0",
  "P4REQUIRES|new_tools_visible_after=/mcp_reconnect_or_new_session|json=0"]));

// 5) verify everything independently
for (const n of ["FABLE5-GNN-RETRAIN-STRAT-2026-10-18.hbp", "FABLE5-BRIDGE-GOLDEN-2026-10-18.hbp", "FABLE5-P4-SIDECAR-LANES-2026-10-18.hbp",
  "gnn-retrain-2026-10-18/prototype_model_strat_2026-10-18.pt", "gnn-retrain-2026-10-18/contrastive_model_strat_2026-10-18.pt", "gnn-retrain-2026-10-18/gslgnn_w9_3_strat_2026-10-18.pt"])
  console.log(await tool("aoom_office_verify", { name: n }));
srv.kill(); process.exit(0);
