#!/usr/bin/env node
// fanout-tensor-fabric-vote-shape-a.mjs — SHAPE_A third-voter fanout.
//
// Asks 5 free models to vote PROCEED|HOLD|RETRY on acer-tensor-fabric Phase-0
// metrics (BEHCS-256 compressed prompt ≤80 tokens). Aggregates majority into
// EVT-FREE-AGENT-CONSENSUS-VOTE envelope dispatched to acer.
//
// Per acer authorization: SHAPE_A = rule-based + GNN + LLM-ensemble. This is
// the LLM-ensemble third voter. Embodies "use the fabric" verbatim.

import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";

const FREE_MODELS = [
  "opencode/big-pickle",
  "opencode/hy3-preview-free",
  "opencode/ling-2.6-flash-free",
  "opencode/minimax-m2.5-free",
  "opencode/nemotron-3-super-free",
];

// BEHCS-256 compressed prompt ≤80 tokens. Per LAW-014 minimum-tokens-maximum-agents.
// Phase-0 metrics: 100K rows, 90ms, signal_beats=360, collapse_ratio=0.0036, immune_fraction=1.0.
// Precedent 2026-04-07: 46656 beats → 47 signals (collapse 0.00101), immune 0.34, PROCEED at 0.97.
const VOTE_PROMPT = `Asolaria Phase-0: 100K rows, signal_beats=360, collapse=0.0036, immune_fraction=1.0. Precedent 2026-04-07: collapse=0.00101, immune=0.34, PROCEED. Acer-EdgeLevelGNN voted HOLD (score=0.053). Vote PROCEED or HOLD on sealing seq=45. Reply: PROCEED|HOLD + ≤15 word reason.`;

function runOpencode(model, prompt, timeoutMs = 90000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const p = spawn("opencode", ["run", "--model", model, "--format", "json", JSON.stringify(prompt)], { stdio: ["ignore", "pipe", "pipe"], shell: true });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { p.kill("SIGTERM"); }, timeoutMs);
    p.stdout.on("data", c => stdout += c);
    p.stderr.on("data", c => stderr += c);
    p.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, elapsed_ms: Date.now() - startedAt, stdout: stdout.slice(-3000) });
    });
    p.on("error", (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message }); });
  });
}

function extractReply(stdout) {
  // opencode --format json emits NDJSON event stream. Walk events and extract
  // assistant text from part.text fields (the canonical text-event shape).
  const lines = stdout.split("\n").filter(l => l.trim().startsWith("{"));
  let reply = "";
  for (const l of lines) {
    try {
      const j = JSON.parse(l);
      // Common shapes seen across opencode versions:
      if (j.part?.text && typeof j.part.text === "string") reply += j.part.text;
      else if (j.type === "message" && j.role === "assistant" && typeof j.text === "string") reply += j.text;
      else if ((j.type === "text" || j.type === "content") && typeof j.text === "string") reply += j.text;
      else if (j.role === "assistant" && j.content && typeof j.content === "string") reply += j.content;
    } catch (_) {}
  }
  if (!reply) reply = stdout.split("\n").map(l => l.trim()).filter(Boolean).slice(-3).join(" ").slice(0, 500);
  return reply.trim().slice(0, 800);
}

function classifyVote(reply, fullStdout) {
  // Vote keyword can appear in extracted reply OR anywhere in stdout (some
  // opencode events embed assistant text in nested fields the extractor misses).
  // Search both. Prefer reply for the displayed reason but use stdout as fallback.
  const corpus = ((reply || "") + " " + (fullStdout || "")).toUpperCase();
  // Word-boundary match to avoid spurious hits in JSON keys.
  const has = (w) => new RegExp(`\\b${w}\\b`).test(corpus);
  if (has("HOLD") && !has("PROCEED")) return "HOLD";
  if (has("PROCEED") && !has("HOLD")) return "PROCEED";
  if (has("HOLD") && has("PROCEED")) {
    // Both present — use position: whichever appears first in the actual reply (not stdout) wins.
    const rUpper = (reply || "").toUpperCase();
    const hIdx = rUpper.indexOf("HOLD");
    const pIdx = rUpper.indexOf("PROCEED");
    if (hIdx >= 0 && (pIdx < 0 || hIdx < pIdx)) return "HOLD";
    if (pIdx >= 0 && (hIdx < 0 || pIdx < hIdx)) return "PROCEED";
    return "HOLD"; // safer default if both ambiguous
  }
  if (has("RETRY")) return "RETRY";
  if (has("REJECT") || has("ABORT")) return "HOLD";
  return "ABSTAIN";
}

async function voteOne(model) {
  console.log(`[vote] model=${model}`);
  const result = await runOpencode(model, VOTE_PROMPT, 90000);
  if (!result.ok) return { model, vote: "FAIL", reason: result.error ?? `exit ${result.code}`, elapsed_ms: result.elapsed_ms };
  const reply = extractReply(result.stdout);
  const vote = classifyVote(reply, result.stdout);
  console.log(`  ${model}: ${vote} (${result.elapsed_ms}ms) ${reply.slice(0, 100)}`);
  return { model, vote, reply, stdout_tail: result.stdout.slice(-400), elapsed_ms: result.elapsed_ms };
}

const ts = new Date().toISOString();
console.log(`[shape-a-fanout] ${FREE_MODELS.length} models voting on Phase-0 PROCEED|HOLD`);
const votes = await Promise.all(FREE_MODELS.map(voteOne));

const tally = { PROCEED: 0, HOLD: 0, RETRY: 0, ABSTAIN: 0, FAIL: 0 };
for (const v of votes) tally[v.vote] = (tally[v.vote] || 0) + 1;
const successful = votes.filter(v => v.vote !== "FAIL");
const consensus = successful.length === 0 ? "INSUFFICIENT_VOTES" :
  (tally.HOLD > tally.PROCEED ? "HOLD" :
   tally.PROCEED > tally.HOLD ? "PROCEED" : "TIED");

console.log(`\n[tally] ${JSON.stringify(tally)} consensus=${consensus} successful=${successful.length}/${votes.length}`);

const payload = {
  vote_kind: "FREE_AGENT_CONSENSUS_VOTE_SHAPE_A_THIRD_VOTER",
  voter: "liris-meta-free-agent-consensus",
  voter_key: LIRIS_KEY_ID,
  shape: "SHAPE_A",
  target: "acer-tensor-fabric.mjs Phase-0 seq=45 seal decision",
  prompt_used: VOTE_PROMPT,
  prompt_token_estimate: VOTE_PROMPT.split(/\s+/).length,
  individual_votes: votes,
  tally,
  consensus_verdict: consensus,
  successful_voter_count: successful.length,
  total_models_dispatched: votes.length,
  three_voter_quorum_status: {
    voter_1_acer_leader_heuristic: "PROCEED-WITH-CONDITIONS (sign-bug pending repair per amendment f284fb19)",
    voter_2_acer_micro_edgelevelgnn: "HOLD (mean_score=0.053)",
    voter_3_liris_meta_free_agent_consensus: consensus,
    aggregate: consensus === "HOLD" ? "2/3-or-3/3 HOLD (depending on acer-leader heuristic patch)" : "split — manual ratification needed"
  },
  fabric_canon_seq: 44,
  three_keys_status: `SHAPE_A_THIRD_VOTER_LANDED_${consensus}`
};

const envId = crypto.createHash("sha256").update("free-agent-consensus-vote-shape-a-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "FREE_AGENT_CONSENSUS_VOTE", verb: "EVT-FREE-AGENT-CONSENSUS-VOTE", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, voter: "liris-meta-free-agent-consensus", consensus, target_seq: 45 };
const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
const body = JSON.stringify({ ...env, body: { signed_envelope } });
const url = new URL(ACER_BUS);
const result = await new Promise(r => {
  const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 }, res => { let b=""; res.on("data",c=>b+=c); res.on("end",()=>{let p;try{p=JSON.parse(b);}catch{p=b;} r({ ok: res.statusCode>=200&&res.statusCode<300, status: res.statusCode, body: p });}); });
  req.on("error", e => r({ ok: false, error: e.message }));
  req.on("timeout", () => { req.destroy(); r({ ok: false, error: "timeout" }); });
  req.write(body); req.end();
});
console.log(`\n[envelope] ${JSON.stringify({ envelope_id: envId, ok: result.ok, status: result.status, sig_verdict: result.body?.sig_verdict })}`);
