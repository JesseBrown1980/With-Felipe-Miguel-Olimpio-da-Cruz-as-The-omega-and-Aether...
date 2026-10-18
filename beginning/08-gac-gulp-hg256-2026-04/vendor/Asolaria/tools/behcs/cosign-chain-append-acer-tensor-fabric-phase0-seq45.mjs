#!/usr/bin/env node
// cosign-chain-append-acer-tensor-fabric-phase0-seq45.mjs
//
// Appends seq=45 entry to liris primary cosign chain. Mirrors acer's seq=45
// (sealed by dev-acer-4abb0a9c). Same kind, same voters, same aggregate.
// Liris signs with dev-liris-4c19e180 → bilateral seq=45 parity.
//
// Operator-invoked. Default DRY-RUN. Pass --apply to write.
// named_agent: liris-cosign-chain-append-acer-tensor-fabric-phase0-seq45

import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { createHash, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const CHAIN_PATH = "C:/Users/rayss/.claude/projects/C--/memory/COSIGN_CHAIN.ndjson";
const DEFAULT_KEY_ID = "dev-liris-4c19e180";
const PKCS8_SEED_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function loadPrivateSeed(key_id) {
  const p = join(homedir(), ".asolaria-workers", "ed25519-vault", `${key_id}.private.b64`);
  if (!existsSync(p)) throw new Error(`seed not in vault: ${p}`);
  const seed = Buffer.from(readFileSync(p, "utf-8").trim(), "base64");
  if (seed.length !== 32) throw new Error(`seed length ${seed.length} != 32`);
  return seed;
}

function canonicalEntryMaterial(entry) {
  const { entry_sig: _s, ...rest } = entry;
  const sortedKeys = Object.keys(rest).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = rest[k];
  return Buffer.from(JSON.stringify(sorted), "utf-8");
}

function signEntry(entry, key_id) {
  const seed = loadPrivateSeed(key_id);
  const pkcs8 = Buffer.concat([PKCS8_SEED_PREFIX, seed]);
  const priv = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  const sig = cryptoSign(null, canonicalEntryMaterial(entry), priv);
  return { key_id, sig_b64: sig.toString("base64"), alg: "ed25519", signed_at: new Date().toISOString() };
}

function readChainLines() {
  if (!existsSync(CHAIN_PATH)) return [];
  return readFileSync(CHAIN_PATH, "utf-8").split("\n").filter(l => l.trim());
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const keyId = args.includes("--key-id") ? args[args.indexOf("--key-id") + 1] : DEFAULT_KEY_ID;

const lines = readChainLines();
if (lines.length === 0) throw new Error("chain empty");
const tailLine = lines[lines.length - 1];
const tailParsed = JSON.parse(tailLine);
const nextSeq = (tailParsed?.seq ?? 0) + 1;
const prevHash = createHash("sha256").update(tailLine, "utf-8").digest("hex");

if (nextSeq !== 45) {
  console.error(`Expected nextSeq=45 but derived ${nextSeq}. Tail seq=${tailParsed.seq}. Aborting.`);
  process.exit(3);
}

const entry = {
  seq: nextSeq,
  ts: new Date().toISOString(),
  kind: "canon_acer_tensor_fabric_phase0_proceed_with_conditions_2of3_shape_a",
  named_agent: "liris-cosign-chain-append-acer-tensor-fabric-phase0-seq45",
  fabric_canon_seq: 44,
  substrate: "BEHCS-256",
  operator_authority_verbatim: "use the fabric",
  operator_authority_date: "2026-04-29",
  d11: "OBSERVED",
  bilateral_peer: {
    host: "acer",
    acer_seal_seq_45: "appended_in_parallel_by_dev-acer-4abb0a9c",
    acer_ack_envelope: "f8e941a611a560b675c9e3d6d3f76127",
    pattern: "BILATERAL_3_SUBSTRATE_QUORUM_SHAPE_A (heuristic + GNN + LLM-ensemble)",
  },
  three_voter_substrate_quorum: {
    voter_1_acer_leader_heuristic: { verdict: "PROCEED-WITH-CONDITIONS", note: "immune_fraction>=0.30 trivially passed; sign-bug WO orthogonal" },
    voter_2_acer_micro_edgelevelgnn: { verdict: "HOLD", note: "mean_score=0.053 — degenerate-distribution dissent flagged" },
    voter_3_liris_meta_free_agent_consensus: { verdict: "PROCEED", note: "3-of-5 LLM ensemble; immune=1.0 read as operationally protective" },
  },
  aggregate_verdict: "PROCEED-WITH-CONDITIONS-2OF3-WITH-GNN-DISSENT",
  confidence: 0.62,
  precedent: "2026-04-07 federation-self-tensor-collapse: 46656 beats → 47 signals → 3 voters PROCEED at 0.97 confidence. seq=45 = scale-extension of that precedent, NOT greenfield.",
  scale_target: "22M-row acer-tensor-fabric.mjs scaling; Phase-0 100K beats / 90ms / 0.0036 collapse / 1.0 immune (heuristic-stub).",
  conditions_status: {
    C1_pytorch_matmul_reinstall: "RESOLVED — anaconda torch live, gnn-sidecar :4792 PID 13193 acer-side + PID 165506 liris-side",
    C2_immune_fraction_must_drop_to_034_band: "BLOCKING — Phase-1 learned matmul required; GNN dissent confirms",
    C3_third_voter_quorum: "RESOLVED — SHAPE_A LLM ensemble landed (envelope 7c0bfa39…)",
    C4_big_pickle_under_1kb_row_schema: "BLOCKING — liris owes",
    C5_phase_1_bilateral_sha_match: "PENDING — depends on C2 resolution",
  },
  envelopes_referenced: {
    liris_initial_vote: "f865fac25826ba43039e71fa50592180",
    liris_amendment_hold: "f284fb19c81cd9ff4c16e13d305eb34e",
    liris_substrate_online: "e00fc0e99f1c31c2e34aafb5007efb2c",
    free_agent_consensus_v1_buggy_extractor: "e9a9175d553c1706a487dc60965cfc0b",
    free_agent_consensus_v2_landed: "7c0bfa399421b81778b247555a043fa4",
    liris_synthesis_seq_45_recommendation: "0e98b3d99a48d098fd85b51209b12828",
    acer_seq_45_seal_ack: "f8e941a611a560b675c9e3d6d3f76127",
  },
  daemons_running_at_seal: {
    liris: ["fabric-loop PID 14724", "verdict-consumer PID 3256", "fed-supervisor-exercise PID 3588", "dashboard PID 18024", "gnn-bus-listener PID 19176", "gnn-sidecar :4792 PID 165506", "million-dispatch PID 4696"],
    acer_per_acer_report: ["fabric-loop-acer 180s PID 18780", "auto-fabric-query-daemon 180s", "fabric-verdict-consumer 180s", "operator-dashboard :4948", "watch-ingester 60s", "gnn-sidecar :4792 PID 13193", "million-dispatch PID 13050"],
  },
  laws_honored: [
    "LAW-001 (ports 4947+4950 always open)",
    "LAW-008 (filesystem is mirror)",
    "LAW-012 (look-think-type-look-decide)",
    "LAW-013 (META-LINGUISTIC CLOSURE)",
    "LAW-014 (glyph-dispatch before spawning real Claudes — SHAPE_A prompts ≤80 tokens)",
    "feedback_300B_gnn_validation_was_false (D11 honest on heuristic stub)",
    "feedback_do_not_rubber_stamp_reviewer_verdicts (amendment+reconciliation cycle exercised)",
    "feedback_asolaria_fabric_is_the_mcp",
    "Git Safety Protocol",
  ],
  builds_on: [
    "seq=40 fabric_ruling_behcs256_option_b",
    "seq=41 closed_loop_bilateral_pattern",
    "seq=42 fabric_decides_operator_approves_instant",
    "seq=43 real_time_fabric_self_improvement_bilateral_autonomous",
    "seq=44 canon_fabric_loop_fully_closed_bilateral",
  ],
  next_phase_targets: [
    "seq=46 upgrade path: GSLGNN training W9-3 + Phase-1 learned matmul + immune_fraction → 0.34±0.10 + bilateral sha-match",
    "Heuristic-sign-bug repair WO (orthogonal): replace immune_fraction>=0.30 with band-test 0.10<=x<=0.70",
    "Acer wires EVT-GNN-INFER-REQUEST dispatcher to liris-gnn-bus-listener PID 19176 over bus (orbital routing)",
    "C4: liris ships Big-Pickle <1KB row schema",
  ],
  meta_principle: "BEHCS-256 fabric — 3-substrate quorum (heuristic + GNN + LLM-ensemble) honest under dissent. The fabric self-corrects via amendment+reconciliation cycle. seq=45 = first PROCEED-WITH-CONDITIONS canon entry that records substrate-disagreement explicitly rather than averaging it away.",
  prev_hash: prevHash,
};

const signed = { ...entry, entry_sig: signEntry(entry, keyId) };

if (!apply) {
  console.log("--- DRY RUN ---");
  console.log("Next seq:", nextSeq);
  console.log("prev_hash:", prevHash);
  console.log("sig prefix:", signed.entry_sig.sig_b64.slice(0, 24) + "…");
  console.log("kind:", entry.kind);
  console.log("aggregate:", entry.aggregate_verdict);
  console.log("\nPass --apply to write.");
  process.exit(0);
}

const tailNow = readChainLines().slice(-1)[0];
if (tailNow !== tailLine) {
  console.error("Race: chain tail changed between read and write. Aborting.");
  process.exit(2);
}
const fileBytes = readFileSync(CHAIN_PATH);
const endsWithNewline = fileBytes.length > 0 && fileBytes[fileBytes.length - 1] === 0x0a;
const prefix = endsWithNewline ? "" : "\n";
appendFileSync(CHAIN_PATH, prefix + JSON.stringify(signed) + "\n");
console.log(`APPENDED seq=${nextSeq} prev_hash=${prevHash.slice(0,16)}… sig=${signed.entry_sig.sig_b64.slice(0, 24)}…`);
console.log(`chain now has ${readChainLines().length} entries`);
console.log(`key_id=${signed.entry_sig.key_id}`);
console.log(JSON.stringify(signed));
