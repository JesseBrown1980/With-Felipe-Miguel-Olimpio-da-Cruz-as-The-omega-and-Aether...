// Phase 2: Noun training via HRM bridge
// Reads 36 PID-prompt node features + farm contribution files,
// calls bridgeHrm() per PID, emits ndjson of HRM BPI frames.
// Descriptor-only protocol (Python runtime adapter pending).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bridgeHrm, hrmAvailable, state as hrmState } from "./planes/hrm.mjs";

const NODE_FEATURES = "C:/HyperBEHCS/data/catalogs/pid-prompt-node-features.ndjson";
const FARM_DIR = "D:/AsolariaGuides/100-pid-startup-prompt-W113";
const OUT = "C:/HyperBEHCS/data/catalogs/pid-prompt-noun-training-hrm-frames.ndjson";

console.log("HRM available:", hrmAvailable());
console.log("HRM state:", hrmState());

const nodes = fs.readFileSync(NODE_FEATURES, "utf8")
  .trim().split("\n").map(l => JSON.parse(l));

console.log("nodes loaded:", nodes.length);

const frames = [];
for (const node of nodes) {
  const farmFile = path.join(FARM_DIR, node.source_file);
  let prompt = "";
  try {
    prompt = fs.readFileSync(farmFile, "utf8");
  } catch (e) {
    console.log("  SKIP (no source):", node.pid, "->", node.source_file);
    continue;
  }
  // Bridge to HRM — descriptor frame per PID
  const frame = await bridgeHrm(prompt, { model: "gemma-4b-hrm-mtp" });
  frames.push({
    pid: node.pid,
    level: node.level,
    sup: node.sup,
    role: node.role,
    h: node.h,
    room: node.room,
    prompt_sha16: crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16),
    prompt_len: prompt.length,
    hrm_frame_bytes: frame.length,
    hrm_frame_b64: Buffer.from(frame).toString("base64").slice(0, 80) + "...",
    hrm_model: "gemma-4b-hrm-mtp",
    descriptor_protocol: "hrm-bpi-frame-v1",
    ts: new Date().toISOString(),
    source_file: node.source_file,
  });
  console.log("  bridged:", node.pid.padEnd(40), "frame=" + frame.length + "B");
}

fs.writeFileSync(OUT, frames.map(f => JSON.stringify(f)).join("\n") + "\n");
const sha = crypto.createHash("sha256").update(fs.readFileSync(OUT)).digest("hex").slice(0, 16);
console.log("---");
console.log("frames written:", frames.length);
console.log("output:", OUT);
console.log("sha:", sha);
console.log("HRM final state:", hrmState());
