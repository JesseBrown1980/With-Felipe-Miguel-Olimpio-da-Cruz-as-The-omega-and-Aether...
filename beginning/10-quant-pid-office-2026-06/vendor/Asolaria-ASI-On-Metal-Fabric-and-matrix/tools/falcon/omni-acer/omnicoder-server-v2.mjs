// Omnicoder server v2 — falcon-side canon upgrade.
// Per operator-directive 2026-05-27: replace JSON-only stack with HBPv1 hot path
// + Polar+Turbo+JL triple-quant + cosign proxy + universal-route dual-emit.
// Reuses D:/HyperBEHCS/lib/hyperbehcs-core.cjs (pure-node, Termux-compatible).
// Legacy /api/packet preserved for back-compat.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const core = require("./lib/hyperbehcs-core.cjs");
const zeta = await import("./lib/zeta-process.mjs");
const hrm = await import("./lib/hrm-slow-fast.mjs");
const mtp = await import("./lib/mtp-heads.mjs");

const PORT = Number(process.env.OMNICODER_PORT || 8789);
const HOST = process.env.OMNICODER_HOST || "0.0.0.0";
const ROOT = process.env.OMNICODER_ROOT || "/sdcard/Asolaria";
const ACER_COSIGN = process.env.OMNICODER_ACER_COSIGN || "http://127.0.0.1:4953/api/cosign/append";
const AI_MEMORY_URL = process.env.OMNICODER_AI_MEMORY || "http://127.0.0.1:49374";
const PUBLIC_DIR = path.join(__dirname, "public");
const OMNICODER_DIR = path.join(ROOT, "omnicoder");
const PACKET_DIR = path.join(OMNICODER_DIR, "packets");
const WHITE_ROOM_DIR = path.join(OMNICODER_DIR, "white-rooms");
const INBOX_DIR = path.join(ROOT, "_auto_inbox");
const ROOM40_DIR = path.join(ROOT, "room-40");
const HBP_FILE = path.join(OMNICODER_DIR, "packets.hbp");
const HOOKWALL_FILE = path.join(OMNICODER_DIR, "hookwall-observations.ndjson");
const GNN_FILE = path.join(OMNICODER_DIR, "gnn-live-edges.ndjson");
const COSIGN_LOG = path.join(OMNICODER_DIR, "cosign-seals.ndjson");

const SCHEMA_VERSION = "omnicoder-server.v2";
const CANON_BUNDLE = Object.freeze({
  "hyperbehcs-core.cjs": "668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08",
  "primes.mjs":          "1284ce7aff8844321d462c0e9975ae1598779b95419f74295fd3e85c0dce6291",
  "zeta-process.mjs":    "77d6a53aa27bf21945bed6f8254f69e3e8e480fd57498a4701c60109eeaf3a26",
  "hilbert.mjs":         "61a4c4ae6bed569576bd7edf2ef15f7e804490f5a40f8f9b56d6e8bad839ec0a",
  "hrm-slow-fast.mjs":   "a5ec3b7b9176aadcd6d213d474128642a76cba3b799594b697b0bdcc609141ba",
  "mtp-heads.mjs":       "63559e1c605e626ffce08ca7456eca54653b12ce5641b2618355b89461e79490",
});

const VALID_EDGE_CLASSES = new Set(["proof_edge", "prediction_edge", "action_edge"]);
const VALID_SOURCE_CLASSES = new Set(["backend_row", "pixel_screenshot", "legacy_image"]);
const VALID_AUTHORITY_LEVELS = new Set(["pre-dev", "dev", "staging", "prod"]);
const VALID_IMAGE_CLASSES = new Set(["runtime_proof", "historical_evidence", "none"]);

function ensureDirs() {
  for (const dir of [OMNICODER_DIR, PACKET_DIR, WHITE_ROOM_DIR, INBOX_DIR, ROOM40_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function json(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error("body_too_large"));
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}

function safeName(input) {
  return String(input || "packet")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "packet";
}

function sha16(value) {
  return core.sha16(typeof value === "string" ? value : JSON.stringify(value));
}

function listLatest(dir, limit = 12) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const full = path.join(dir, entry.name);
        const st = fs.statSync(full);
        return { name: entry.name, bytes: st.size, mtime: st.mtime.toISOString() };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function countFiles(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).length; } catch { return 0; }
}

function countLines(file) {
  try {
    const buf = fs.readFileSync(file, "utf8");
    if (!buf) return 0;
    return buf.split("\n").filter((line) => line.length > 0).length;
  } catch { return 0; }
}

function safeMimeCell(value) {
  return String(value || "").replace(/[\r\n|]/g, "_");
}

function emitHbpRow(payload) {
  ensureDirs();
  const ts = new Date().toISOString();
  const fingerprint = sha16(payload);
  const cells = [
    "HBPv1",
    `schema=${SCHEMA_VERSION}`,
    `row=packet`,
    `fingerprint=${fingerprint}`,
    `device=falcon-s24fe`,
    `kind=${safeMimeCell(payload.kind || "white_room")}`,
    `title=${safeMimeCell(String(payload.title || "").slice(0, 80))}`,
    `bytes=${Buffer.byteLength(JSON.stringify(payload), "utf8")}`,
    `ts=${ts}`,
  ];
  const row = cells.join("|") + "\n";
  fs.appendFileSync(HBP_FILE, row, "utf8");
  return { fingerprint, ts, row, schema: SCHEMA_VERSION };
}

function emitUniversalRoute(payload, opts = {}) {
  ensureDirs();
  const ts = new Date().toISOString();
  const subnetH = opts.subnet_h || "H9100";
  const channel = opts.channel || "falcon-omnicoder/unspecified";
  const event = payload && typeof payload === "object" ? payload.event : null;

  const edgeClass = VALID_EDGE_CLASSES.has(opts.edgeClass) ? opts.edgeClass : "proof_edge";
  const sourceClass = VALID_SOURCE_CLASSES.has(opts.sourceClass) ? opts.sourceClass : "backend_row";
  const authorityLevel = VALID_AUTHORITY_LEVELS.has(opts.authorityLevel) ? opts.authorityLevel : "dev";
  const imageClass = VALID_IMAGE_CLASSES.has(opts.imageClass) ? opts.imageClass : "none";

  if (sourceClass === "pixel_screenshot" && !opts.backendRowPid) {
    return { ok: false, error: "pixel_screenshot_requires_backendRowPid" };
  }

  const hookwallRow = {
    schema: "hookwall-observation.v1",
    ts,
    subnet_h: subnetH,
    channel,
    event,
    vantage: "falcon",
    cosign_seq: opts.cosignSeq ?? null,
    cosign_row: opts.cosignRow ?? null,
    sourceClass,
    backendRowPid: opts.backendRowPid ?? null,
    authorityLevel,
    imageClass,
    gate: "omnicoder-v2-universal-route",
    passed_at: Date.now(),
  };
  const gnnRow = {
    schema: "gnn-live-edge.v1",
    ts,
    subnet_h: subnetH,
    edgeClass,
    sourceClass,
    authorityLevel,
    imageClass,
    from: opts.gnnFrom || `falcon_${event || "event"}`,
    to: opts.gnnTo || `channel_${channel.replace(/[^a-z0-9_]/gi, "_")}`,
    verb: opts.gnnVerb || event || "omnicoder_v2_emit",
    weight: typeof opts.gnnWeight === "number" ? opts.gnnWeight : 1.0,
    vantage: "falcon",
    cosign_seq: opts.cosignSeq ?? null,
    cosign_row: opts.cosignRow ?? null,
  };
  let hookwallOk = true; let gnnOk = true;
  try { fs.appendFileSync(HOOKWALL_FILE, JSON.stringify(hookwallRow) + "\n", "utf8"); } catch { hookwallOk = false; }
  try { fs.appendFileSync(GNN_FILE, JSON.stringify(gnnRow) + "\n", "utf8"); } catch { gnnOk = false; }
  return {
    ok: hookwallOk && gnnOk,
    hookwall_path: HOOKWALL_FILE,
    gnn_path: GNN_FILE,
    both_lanes_ok: hookwallOk && gnnOk,
    edgeClass, sourceClass, authorityLevel, imageClass,
  };
}

function quadQuantFingerprint(input) {
  const vector = input.text ? core.vectorFromText(String(input.text)) : core.toVector(input.vector);
  if (!vector || !vector.length) return { ok: false, error: "no_vector" };
  const opts = input.options || {};
  const polar = core.polarQuant(vector, opts);
  const turbo = core.turboQuant(vector, opts);
  const jl = core.johnsonLindenstrauss(vector, opts);
  const triple = core.tripleQuant(vector, opts);
  const cpEnd = Math.min(1023, Math.max(2, vector.length));
  const zetaSig = { cp_start: 2, cp_end: cpEnd, weight: zeta.bandWeight(2, cpEnd) };
  return {
    ok: true,
    schema: "quad-quant.fingerprint.v1",
    polar: { algorithm: polar.algorithm, fingerprint: core.sha16(polar.codes) },
    turbo: { algorithm: turbo.algorithm, fingerprint: core.sha16(turbo.codes) },
    jl: { algorithm: "johnson-lindenstrauss.v1", target_dim: jl.length, fingerprint: core.sha16(jl) },
    triple: { algorithm: triple.algorithm, fingerprint: core.sha16(triple.codes_flat) },
    zeta: zetaSig,
    fingerprint: core.sha16({ p: polar.codes, t: turbo.codes, j: jl, tr: triple.codes_flat, z: zetaSig }),
    vector_len: vector.length,
    quadruple: true,
  };
}

function zetaQuery(input) {
  const cp = Number(input.cp || 0);
  if (!Number.isInteger(cp) || cp < 2) return { ok: false, error: "cp_must_be_integer_ge_2" };
  return {
    ok: true,
    schema: "zeta-process.v1",
    cp,
    vonMangoldt: zeta.vonMangoldt(cp),
    nuLambda: zeta.nuLambda(cp),
    next: zeta.vonMangoldtNext(cp, input.options || {}),
  };
}

function hrmShape(input) {
  const result = hrm.hrmShapedPrediction({
    envelopeType: String(input.envelopeType || "default"),
    agentProf: String(input.agentProf || ""),
    currentCp: Number(input.currentCp || 2),
    history: Array.isArray(input.history) ? input.history : [],
    k: Number(input.k || 4),
    fastIters: Number(input.fastIters || 15),
    seed: Number(input.seed || 0),
  });
  return { ok: true, schema: "hrm-slow-fast.v1", ...result };
}

function mtpPredict(input) {
  const heads = mtp.mtpHeads(Number(input.cp0 || 2), input.options || {});
  return { ok: true, schema: "mtp-heads.v1", heads };
}

async function proxyAiMemory(req, body) {
  const target = `${AI_MEMORY_URL}${req.url.replace(/^\/api\/memory/, "")}`;
  try {
    const init = {
      method: req.method,
      headers: { "content-type": "application/json" },
    };
    if (req.method === "POST" && body) init.body = JSON.stringify(body);
    const res = await fetch(target, init);
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; }
    catch { return { ok: res.ok, status: res.status, body: text }; }
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), hint: "ensure_adb_reverse_tcp_49374_tcp_49374" };
  }
}

async function proxyCosign(payload) {
  const acerUrl = ACER_COSIGN;
  try {
    const res = await fetch(acerUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    try {
      fs.appendFileSync(COSIGN_LOG, JSON.stringify({ ts: new Date().toISOString(), payload, response: body }) + "\n", "utf8");
    } catch {}
    return { ok: !!(body && body.ok), seq: body && body.seq, row_hash: body && body.row_hash, antecedent_prev: body && body.antecedent_prev };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), hint: "ensure_adb_reverse_tcp_4953_tcp_4953" };
  }
}

function status() {
  ensureDirs();
  return {
    ok: true,
    service: "omnicoder",
    schema: SCHEMA_VERSION,
    device: "falcon-s24fe",
    root: ROOT,
    port: PORT,
    routes: [
      "GET /", "GET /api/status",
      "GET /api/packets", "POST /api/packet",
      "POST /api/hbp", "POST /api/quant", "POST /api/cosign", "POST /api/route",
      "POST /api/zeta", "POST /api/hrm", "POST /api/mtp",
      "ANY /api/memory/*",
      "GET /api/canon",
    ],
    canon: {
      bundle_sha256: CANON_BUNDLE,
      core_exports: Object.keys(core),
      zeta_exports: Object.keys(zeta),
      hrm_exports: Object.keys(hrm),
      mtp_exports: Object.keys(mtp),
      quad_quant_ready: typeof core.tripleQuant === "function" && typeof zeta.vonMangoldt === "function",
      zeta_ready: true,
      hrm_ready: typeof hrm.hrmShapedPrediction === "function",
      mtp_ready: typeof mtp.mtpHeads === "function",
      universal_route_active: true,
      ai_memory_url: AI_MEMORY_URL,
    },
    hbp: {
      file: HBP_FILE,
      rows: countLines(HBP_FILE),
    },
    hookwall: { file: HOOKWALL_FILE, rows: countLines(HOOKWALL_FILE) },
    gnn: { file: GNN_FILE, rows: countLines(GNN_FILE) },
    cosign_log: { file: COSIGN_LOG, rows: countLines(COSIGN_LOG) },
    white_room: { dir: WHITE_ROOM_DIR, count: countFiles(WHITE_ROOM_DIR), latest: listLatest(WHITE_ROOM_DIR, 8) },
    room40: { dir: ROOM40_DIR, count: countFiles(ROOM40_DIR), latest: listLatest(ROOM40_DIR, 8) },
    inbox: { dir: INBOX_DIR, count: countFiles(INBOX_DIR), latest: listLatest(INBOX_DIR, 8) },
    packets: { dir: PACKET_DIR, count: countFiles(PACKET_DIR), latest: listLatest(PACKET_DIR, 12) },
    truth_boundary: "OMNICODER v2 writes white-room HBPv1 rows + dual-emits hookwall+GNN + proxies cosign to acer; execution remains gated by writer authority.",
  };
}

function createLegacyPacket(input) {
  ensureDirs();
  const now = new Date().toISOString();
  const seed = JSON.stringify(input || {}) + now;
  const id = `omnicoder-${sha16(seed)}`;
  const title = String(input.title || input.objective || "OMNICODER packet").slice(0, 180);
  const packet = {
    id, type: "OMNICODER_WHITE_ROOM_PACKET", verb: "EVT-OMNICODER-WHITE-ROOM-PACKET",
    from: "falcon", actor: "falcon-omnicoder", mode: "real", ts: now,
    body: {
      title,
      pilot: String(input.pilot || "acer-pilot-agent").slice(0, 80),
      target: String(input.target || "behcs-1024").slice(0, 120),
      lane: String(input.lane || "white_room").slice(0, 80),
      language: String(input.language || "plain").slice(0, 40),
      objective: String(input.objective || "").slice(0, 20_000),
      code: String(input.code || "").slice(0, 200_000),
      notes: String(input.notes || "").slice(0, 20_000),
      command: String(input.command || "").slice(0, 4_000),
      route: ["hookwall", "forward_gnn", "reverse_gain_gnn", "omnishannon", "omniwhite_room", "gc"],
      writer_authority_required: ["Hookwall", "Shannon", "OmniWhiteRoom", "GNN"],
      white_room: { state: "draft", fail_closed: true, proof_mode: "append_only", source_surface: "falcon_visual_frontend" },
      capabilities: { visual_frontend: true, filesystem_participant: true, native_android_codex: false, backend_codex_route: "acer_or_liris" },
      truth_boundary: "This packet is an operator-visible coding request. It is not execution authority.",
    },
  };
  const fileBase = `${now.replace(/[:.]/g, "-")}_${id}_${safeName(title)}.json`;
  const payload = JSON.stringify(packet, null, 2);
  const paths = {
    packet: path.join(PACKET_DIR, fileBase),
    white_room: path.join(WHITE_ROOM_DIR, fileBase),
    inbox: path.join(INBOX_DIR, fileBase),
    room40: path.join(ROOM40_DIR, `OMNICODER-${fileBase}`),
  };
  for (const targetPath of Object.values(paths)) fs.writeFileSync(targetPath, payload);
  fs.writeFileSync(path.join(OMNICODER_DIR, "latest.json"), payload);
  // v2 ALSO emits HBPv1 row + universal-route observation for every legacy packet
  const hbp = emitHbpRow({ title, kind: "legacy_packet", id });
  const route = emitUniversalRoute({ event: "legacy_packet_created", channel: "falcon-omnicoder/legacy", id }, { edgeClass: "proof_edge" });
  return { ok: true, packet, paths, hbp, route };
}

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) return json(res, 403, { ok: false, error: "forbidden" });
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return json(res, 404, { ok: false, error: "not_found" });
  const ext = path.extname(full).toLowerCase();
  const type = ext === ".html" ? "text/html; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : ext === ".js" ? "text/javascript; charset=utf-8" : "application/octet-stream";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  fs.createReadStream(full).pipe(res);
}

const IS_CLI = process.argv[1] && process.argv[1].endsWith("omnicoder-server-v2.mjs");

if (IS_CLI) ensureDirs();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  try {
    if (req.method === "GET" && url.pathname === "/api/status") return json(res, 200, status());
    if (req.method === "GET" && url.pathname === "/api/canon") {
      return json(res, 200, {
        ok: true,
        schema: SCHEMA_VERSION,
        bundle_sha256: CANON_BUNDLE,
        core_exports: Object.keys(core),
        zeta_exports: Object.keys(zeta),
        hrm_exports: Object.keys(hrm),
        mtp_exports: Object.keys(mtp),
        hbp_rows: countLines(HBP_FILE),
        hookwall_rows: countLines(HOOKWALL_FILE),
        gnn_rows: countLines(GNN_FILE),
        cosign_seals: countLines(COSIGN_LOG),
        quad_quant_ready: true,
        zeta_ready: true,
        hrm_ready: true,
        mtp_ready: true,
        universal_route_active: true,
        ai_memory_url: AI_MEMORY_URL,
      });
    }
    if (req.method === "GET" && url.pathname === "/api/packets") return json(res, 200, { ok: true, packets: listLatest(PACKET_DIR, 50) });
    if (req.method === "POST" && url.pathname === "/api/packet") return json(res, 200, createLegacyPacket(await readBody(req)));
    if (req.method === "POST" && url.pathname === "/api/hbp") {
      const body = await readBody(req);
      const result = emitHbpRow(body);
      // dual-emit universal-route per ship
      const route = emitUniversalRoute({ event: "hbp_row_written", channel: "falcon-omnicoder/hbp" }, { edgeClass: "action_edge" });
      return json(res, 200, { ok: true, ...result, route });
    }
    if (req.method === "POST" && url.pathname === "/api/quant") {
      const body = await readBody(req);
      const result = quadQuantFingerprint(body);
      if (result.ok) emitUniversalRoute({ event: "quad_quant_computed", channel: "falcon-omnicoder/quant" }, { edgeClass: "prediction_edge" });
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/cosign") {
      const body = await readBody(req);
      const result = await proxyCosign(body);
      if (result.ok) emitUniversalRoute({ event: "cosign_proxied", channel: "falcon-omnicoder/cosign" }, { edgeClass: "action_edge", cosignSeq: result.seq, cosignRow: result.row_hash });
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/route") {
      const body = await readBody(req);
      const result = emitUniversalRoute(body.payload || {}, body.opts || {});
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/zeta") {
      const body = await readBody(req);
      const result = zetaQuery(body);
      if (result.ok) emitUniversalRoute({ event: "zeta_query", channel: "falcon-omnicoder/zeta" }, { edgeClass: "prediction_edge" });
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/hrm") {
      const body = await readBody(req);
      const result = hrmShape(body);
      if (result.ok) emitUniversalRoute({ event: "hrm_shape_predicted", channel: "falcon-omnicoder/hrm" }, { edgeClass: "prediction_edge" });
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/mtp") {
      const body = await readBody(req);
      const result = mtpPredict(body);
      if (result.ok) emitUniversalRoute({ event: "mtp_heads_computed", channel: "falcon-omnicoder/mtp" }, { edgeClass: "prediction_edge" });
      return json(res, 200, result);
    }
    if (url.pathname.startsWith("/api/memory")) {
      const body = req.method === "POST" ? await readBody(req) : null;
      const result = await proxyAiMemory(req, body);
      if (result.ok) emitUniversalRoute({ event: "ai_memory_proxied", channel: "falcon-omnicoder/memory" }, { edgeClass: "action_edge" });
      return json(res, result.status || 200, result);
    }
    if (req.method === "GET") return serveStatic(req, res, url.pathname);
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (err) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
});

if (IS_CLI) {
  server.listen(PORT, HOST, () => {
    const bundleKeys = Object.keys(CANON_BUNDLE);
    console.log(`[omnicoder v2] listening http://${HOST}:${PORT} root=${ROOT} canon=${bundleKeys.length}files quad=ON zeta=ON hrm=ON mtp=ON memory=${AI_MEMORY_URL}`);
  });
}

export { emitHbpRow, emitUniversalRoute, quadQuantFingerprint, zetaQuery, hrmShape, mtpPredict, status, SCHEMA_VERSION, CANON_BUNDLE };
