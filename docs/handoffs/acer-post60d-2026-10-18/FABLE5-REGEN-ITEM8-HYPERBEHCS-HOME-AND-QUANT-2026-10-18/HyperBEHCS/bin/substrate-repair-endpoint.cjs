"use strict";

// W45-A10 substrate repair-frame headers — mountable sidecar.
// PID: AGT-FALCON-FABRIC_QUERY-A10-W45-SUBSTRATE-HEAL-2026-05-21
// Authority: OP-JESSE root (atlas cp 260). Operator-witness REQUIRED before commit.
//
// Endpoints (mount in hyperbehcs-daemon.js via a single require + handle() call):
//   GET  /substrate/repair-frame-headers          -> list corruption events + committed repair-frames (read-only).
//   POST /substrate/repair-frame-headers/plan     -> build a frame_repair_op.v1 envelope (no write).
//   POST /substrate/repair-frame-headers/commit   -> NotImplementedError until operator witness + daemon mount.
//
// Schema: hyperbehcs.substrate.frame_repair_op.v1 (see A10/spec.md)
// Invariants: append-only; never mutate bytes < substrate_size_at_issue; never restart daemon.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const SUBSTRATE_PATH = "C:/HyperBEHCS/store/hyperbehcs-substrate.v1.hbs";
const WALKER_PATH = "C:/HyperBEHCS/store/substrate-walker-repair-2026-05-20.py";
const MANIFEST_PATH = SUBSTRATE_PATH + ".recovery-manifest.json";

function jsonResp(res, status, payload) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readManifestIfFresh() {
  // Read-only consumer of the walker's sidecar manifest. Does NOT run the walker.
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    const stat = fs.statSync(MANIFEST_PATH);
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    return { stat, manifest: JSON.parse(raw) };
  } catch (err) {
    return { error: String(err && err.message || err) };
  }
}

function substrateSize() {
  try { return fs.statSync(SUBSTRATE_PATH).size; } catch (_) { return null; }
}

function buildRepairPlan(manifest) {
  const out = {
    schema_planned: "hyperbehcs.substrate.frame_repair_op.v1",
    substrate_path: SUBSTRATE_PATH,
    substrate_size_at_plan: substrateSize(),
    walker_tool: manifest && manifest.tool ? manifest.tool : null,
    corruption_count: manifest && manifest.corruption_events ? manifest.corruption_events.length : 0,
    repair_envelopes: []
  };
  if (!manifest || !manifest.corruption_events) return out;
  let seq = 0;
  for (const ev of manifest.corruption_events) {
    if (ev.type !== "unframed_orphan_json") continue;
    const orphanSha16 = ev.orphan_sha16 || "unknown";
    const envelope = {
      schema: "hyperbehcs.substrate.frame_repair_op.v1",
      repair_id: `repair-${orphanSha16}-${String(seq).padStart(3, "0")}`,
      issued_at: new Date().toISOString(),
      substrate_path: SUBSTRATE_PATH,
      substrate_size_at_issue: out.substrate_size_at_plan,
      corruption: {
        type: ev.type,
        bad_length_off: ev.bad_length_off,
        bad_length_value: ev.bad_length_value,
        orphan_start: ev.orphan_start,
        orphan_end: ev.orphan_end,
        orphan_bytes: ev.orphan_bytes,
        orphan_sha16: ev.orphan_sha16,
        orphan_head_60: ev.orphan_head_60,
        resume_off: ev.resume_off
      },
      recovered_body_b64: null,  // populated only on commit (read of fixed byte range)
      recovered_body_sha256: null,
      walker_tool: manifest.tool,
      walker_manifest_sha256: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
      operator_witness: { required: true, granted_by: null, granted_at: null, cosign_pair: null },
      cosign_chain_row: null,
      previous_repair_id: seq > 0 ? `repair-${orphanSha16}-${String(seq - 1).padStart(3, "0")}` : null,
      notes: "Append-only annotation. Prior bytes UNCHANGED. PLAN ONLY — not committed."
    };
    out.repair_envelopes.push(envelope);
    seq++;
  }
  return out;
}

async function readPostBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}

// Mount entry. Returns true if handled.
async function handle(req, res, url) {
  if (!url.pathname.startsWith("/substrate/repair-frame-headers")) return false;

  if (req.method === "GET" && url.pathname === "/substrate/repair-frame-headers") {
    const mf = readManifestIfFresh();
    return jsonResp(res, 200, {
      schema: "hyperbehcs.substrate.repair_frame_headers_listing.v1",
      substrate_path: SUBSTRATE_PATH,
      substrate_size: substrateSize(),
      walker_manifest_present: !!(mf && mf.manifest),
      walker_manifest_mtime: mf && mf.stat ? mf.stat.mtime : null,
      corruption_events: mf && mf.manifest ? mf.manifest.corruption_events : [],
      committed_repair_frames: [],  // populated post-mount once chain rows exist
      gate: { daemon_mounted: false, operator_witness_granted: false }
    });
  }

  if (req.method === "POST" && url.pathname === "/substrate/repair-frame-headers/plan") {
    const mf = readManifestIfFresh();
    if (!mf || !mf.manifest) {
      return jsonResp(res, 409, { error: "walker manifest missing; run substrate-walker-repair first", manifest_path: MANIFEST_PATH });
    }
    const plan = buildRepairPlan(mf.manifest);
    return jsonResp(res, 200, { schema: "hyperbehcs.substrate.repair_plan.v1", ok: true, plan });
  }

  if (req.method === "POST" && url.pathname === "/substrate/repair-frame-headers/commit") {
    // GATE — A10 scaffold MUST NOT write. Block until daemon mount + operator witness.
    let body = {};
    try { body = await readPostBody(req); } catch (_) { body = {}; }
    const witness = body && body.operator_witness;
    return jsonResp(res, 501, {
      schema: "hyperbehcs.substrate.repair_commit_blocked.v1",
      error: "NotImplementedError",
      reason: "A10 scaffold — commit path disabled until daemon mount + operator-witness in writing",
      gate: {
        daemon_mounted: false,
        operator_witness_present: Boolean(witness && witness.granted_by),
        require_operator_witness: ["OP-JESSE", "OP-RAYSSA"],
        require_cosign_pair_with: "liris"
      },
      doc: "D:/AsolariaGuides/autopilot-overnight-2026-05-20/W45-REFOCUS-18-MAINS/A10-SUBSTRATE-HEAL/spec.md"
    });
  }

  return false;
}

module.exports = { handle, SUBSTRATE_PATH, MANIFEST_PATH };
