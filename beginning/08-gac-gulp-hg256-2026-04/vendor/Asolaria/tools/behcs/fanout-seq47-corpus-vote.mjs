#!/usr/bin/env node
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

const PROMPT = "Asolaria seq=47 GSLGNN training corpus: pick (1) CURRENT_PHASE_1_OUTPUTS_ONLY (2) HISTORICAL_PRE_2026_04_07_ONLY (3) BOTH_CURRENT_AND_HISTORICAL (4) REJECT_RETHINK_SEQ_47_FUNDAMENTALLY. Reply: <CHOICE> + ≤15 word reason.";

function runOpencode(model) {
  return new Promise((resolve) => {
    const p = spawn("opencode", ["run", "--model", model, "--format", "json", JSON.stringify(PROMPT)], { stdio: ["ignore", "pipe", "pipe"], shell: true });
    let stdout = "";
    const t = setTimeout(() => p.kill("SIGTERM"), 90000);
    p.stdout.on("data", (c) => stdout += c);
    p.on("close", (code) => { clearTimeout(t); resolve({ model, ok: code === 0, stdout: stdout.slice(-2500) }); });
    p.on("error", (e) => { clearTimeout(t); resolve({ model, ok: false, error: e.message }); });
  });
}

function extract(stdout) {
  let txt = "";
  for (const ln of stdout.split("\n").filter(l => l.trim().startsWith("{"))) {
    try {
      const j = JSON.parse(ln);
      if (j.part?.text) txt += j.part.text;
      else if (j.type === "message" && j.role === "assistant" && j.text) txt += j.text;
      else if ((j.type === "text" || j.type === "content") && j.text) txt += j.text;
    } catch (_) {}
  }
  return txt.slice(0, 400);
}

function classify(reply, full) {
  const c = ((reply || "") + " " + (full || "")).toUpperCase();
  if (/\bBOTH\b|BOTH_CURRENT|\(3\)|^\s*3[\s.):-]/m.test(c)) return "BOTH_CURRENT_AND_HISTORICAL";
  if (/HISTORICAL.*ONLY|PRE_2026|\(2\)|^\s*2[\s.):-]/m.test(c)) return "HISTORICAL_ONLY";
  if (/CURRENT.*ONLY|PHASE_1.*ONLY|\(1\)|^\s*1[\s.):-]/m.test(c)) return "CURRENT_PHASE_1_ONLY";
  if (/REJECT|RETHINK|\(4\)|^\s*4[\s.):-]/m.test(c)) return "REJECT_RETHINK";
  return "ABSTAIN";
}

const ts = new Date().toISOString();
console.log(`[seq47-corpus-fanout] ${FREE_MODELS.length} models voting`);
const results = await Promise.all(FREE_MODELS.map(runOpencode));
const votes = results.map(r => {
  const reply = r.ok ? extract(r.stdout) : "";
  const choice = r.ok ? classify(reply, r.stdout) : "FAIL";
  console.log(`  ${r.model}: ${choice} | ${reply.slice(0, 100).replace(/\n/g, " ")}`);
  return { model: r.model, choice, reply: reply.slice(0, 200) };
});
const tally = {};
for (const v of votes) tally[v.choice] = (tally[v.choice] || 0) + 1;
const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
console.log(`\n[tally] ${JSON.stringify(tally)} top=${top}`);

const envId = crypto.createHash("sha256").update("seq47-corpus-vote-" + ts).digest("hex").slice(0, 32);
const env = {
  id: envId, ts, from: "liris", to: "acer", mode: "real",
  type: "FREE_AGENT_SEQ47_GSLGNN_CORPUS_VOTE",
  verb: "EVT-FREE-AGENT-SEQ47-GSLGNN-CORPUS-VOTE",
  payload: { votes, tally, top_choice: top, question: PROMPT, context: "Fabric voted Option C earlier (3/4 substantive); now picks corpus for W9-3 training", fabric_canon_seq: 45 },
  sig_owner: LIRIS_KEY_ID,
};
const manifest = { id: env.id, ts, from: env.from, to: env.to, type: env.type, verb: env.verb, top_choice: top };
const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
const body = JSON.stringify({ ...env, body: { signed_envelope } });
const url = new URL(ACER_BUS);
const result = await new Promise(r => {
  const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 },
    (res) => { let b = ""; res.on("data", c => b += c); res.on("end", () => r({ status: res.statusCode, body: b })); });
  req.on("error", e => r({ err: e.message }));
  req.on("timeout", () => { req.destroy(); r({ err: "timeout" }); });
  req.write(body); req.end();
});
console.log(`[envelope] ${JSON.stringify({ envelope_id: envId, ...result })}`);
