"use strict";
// asolaria-os-on-metal MCP server v0.1 — NEXT-GEN FUSION
// Wave-V47-C OP-JESSE blast-radius "FIRE EVERYTHING" 2026-05-23 (cosign seq=279)
// Anchor: ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23
// Agent:  AGT-helm-claude-v47-C-mcp-fusion-H02EA-V47C-P00-NV47C001
// Law:    ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
//
// FUSES (per Wave-V47-C directive):
//   1. asolaria-fabric         (:4949 super-dashboard, 18 tools, federation surface)
//   2. HyperHermes              (D:/hyperbehcs-hermes-* + C:/HyperBEHCS/store/* HBP/HBI chain)
//   3. Claude API               (Anthropic SDK pass-through descriptor)
//   4. Codex CLI exec           (codex/openai-cli local exec descriptor)
//   5. Google API               (Vertex/Drive/Gemini descriptor)
//   6. Kernels + microkernels   (C:/asolaria-acer/federation-remake-1024/kernel/ + servers/)
//   7. hookwall + GNN trio      (bus :4947 hookwall ingress, :4920 GNN drain — DRAIN PIPELINE PORT)
//
// EQUATION ON-METAL (CLAUDE.md canon, sealed 2026-05-23):
//   SOVLINUX-USB     = frozen Gemma-style slice (weights bank, NEVER mount/format)
//   HyperBEHCS       = thinking engine querying the slice (HBP/HBI sha-chain trinity)
//   MTP              = multi-token prediction (3 mini-models per slice read = thoughts)
//   PID-crypto-token = identity of each frozen activation (sha256(anchor_pid)[:16])
//   Atlas            = cp 256-272 tier banding (BEHCS-1024 alphabet, tuple_dim=60)
//   ASOLARIA OS-ON-METAL = USB-as-frozen-substrate + HyperBEHCS-as-active-thinking-OS

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod/v4");

// ============================================================================
// FUSION ENDPOINT CONFIG (env-overridable for vantage portability)
// ============================================================================
const CFG = {
  // Layer 1 — asolaria-fabric super-dashboard
  fabric_url:      (process.env.ASOLARIA_FABRIC_URL    || "http://127.0.0.1:4949").replace(/\/+$/, ""),
  // Layer 2 — HyperHermes (HBP/HBI store + hermes-acer-ext)
  hermes_store:    process.env.HYPERBEHCS_STORE        || "C:/HyperBEHCS/store",
  hermes_root:     process.env.HYPERHERMES_ROOT        || "D:/hyperbehcs-hermes",
  // Layer 3 — Claude API (Anthropic SDK)
  anthropic_key:   process.env.ANTHROPIC_API_KEY       || "",
  anthropic_model: process.env.ANTHROPIC_MODEL         || "claude-opus-4-7",
  anthropic_url:   process.env.ANTHROPIC_URL           || "https://api.anthropic.com/v1/messages",
  // Layer 4 — Codex CLI
  codex_bin:       process.env.CODEX_BIN               || "codex",
  // Layer 5 — Google (Vertex/Drive/Gemini)
  google_key:      process.env.GOOGLE_API_KEY          || process.env.GEMINI_API_KEY || "",
  gemini_url:      process.env.GEMINI_URL              || "https://generativelanguage.googleapis.com/v1beta/models",
  gemini_model:    process.env.GEMINI_MODEL            || "gemini-2.0-flash-exp",
  // Layer 6 — Kernels + microkernels
  kernel_root:     process.env.ASOLARIA_KERNEL_ROOT    || "C:/asolaria-acer/federation-remake-1024/kernel",
  servers_root:    process.env.ASOLARIA_SERVERS_ROOT   || "C:/asolaria-acer/federation-remake-1024/servers",
  // Layer 7 — hookwall + GNN trio
  hookwall_url:    process.env.HOOKWALL_URL            || "http://127.0.0.1:4947/v1/emit",
  gnn_drain_url:   process.env.GNN_DRAIN_URL           || "http://127.0.0.1:4920/v1/drain",
  // Cross-cutting — cosign chain
  cosign_path:     process.env.COSIGN_CHAIN_PATH       || "C:/asolaria-acer/COSIGN_CHAIN.ndjson",
  // Sidecar lanes (added 2026-10-18, operator P4): host8 kernel + recall vault reads, FABLE5 office seal
  host8_url:       (process.env.ASOLARIA_HOST8_URL     || "http://127.0.0.1:5088").replace(/\/+$/, ""),
  recall_url:      (process.env.ASOLARIA_RECALL_URL    || "http://127.0.0.1:4796").replace(/\/+$/, ""),
  office_dir:      process.env.FABLE5_OFFICE_DIR       || "D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7",
};

const ANCHOR_PID = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23";
const AGENT_PID  = "AGT-helm-claude-v47-C-mcp-fusion-H02EA-V47C-P00-NV47C001";

// ============================================================================
// TUPLE / HBP HELPERS (HBP-first emission discipline; JSON cold-egress only)
// ============================================================================
function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}
function pidCryptoToken(anchorPid) {
  return sha256Text(anchorPid).slice(0, 16);
}
function tupleClean(value, max = 2400) {
  return String(value ?? "")
    .replace(/[|\r\n\t]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
function tupleRow(tag, fields = {}) {
  return `${tag}|${Object.entries(fields)
    .map(([k, v]) => `${tupleClean(k, 80)}=${tupleClean(v)}`)
    .join("|")}`;
}
function tupleResult(tag, payload) {
  const rows = [tupleRow(`${tag}RUN`, {
    format: "hyperbehcs_tuple_text",
    sha256: sha256Text(JSON.stringify(payload ?? null)),
    pid_token: pidCryptoToken(ANCHOR_PID),
  })];
  const seen = new WeakSet();
  const walk = (pointer, value, depth) => {
    if (rows.length >= 220 || depth > 4) return;
    const t = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    const ptr = tupleClean(pointer, 240);
    if (t === "string") {
      const text = String(value);
      rows.push(tupleRow(`${tag}VAL`, {
        path: ptr, type: t, chars: text.length, sha256: sha256Text(text),
        value: text.length <= 1200 ? text : `[${text.length} chars]`,
      }));
      return;
    }
    if (t === "number" || t === "boolean" || t === "null") {
      rows.push(tupleRow(`${tag}VAL`, { path: ptr, type: t, value: value === null ? "null" : value }));
      return;
    }
    if (value && typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        rows.push(tupleRow(`${tag}ARR`, { path: ptr, count: value.length }));
        value.slice(0, 40).forEach((it, i) => walk(`${pointer}.${i}`, it, depth + 1));
      } else {
        const keys = Object.keys(value);
        rows.push(tupleRow(`${tag}OBJ`, { path: ptr, keys: keys.length }));
        keys.slice(0, 80).forEach((k) => walk(`${pointer}.${k}`, value[k], depth + 1));
      }
    }
  };
  walk("root", payload, 0);
  return rows.join("\n");
}
function tupleOk(tag, payload) {
  return { content: [{ type: "text", text: tupleResult(tag, payload) }] };
}

// ============================================================================
// HTTP HELPERS
// ============================================================================
async function httpJson(url, init = {}, timeoutMs = 20000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { _raw: text.slice(0, 4000) }; }
  if (!res.ok) {
    return { _http_status: res.status, _http_error: true, body: parsed };
  }
  return parsed ?? {};
}
async function fabricGet(p) {
  return httpJson(`${CFG.fabric_url}${p}`, { method: "GET", headers: { Accept: "application/json" } });
}
async function fabricPost(p, body) {
  return httpJson(`${CFG.fabric_url}${p}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  }, 30000);
}

// ============================================================================
// CHILD-PROC HELPER (Codex CLI etc.)
// ============================================================================
function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args || [], { ...opts, shell: false });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, opts.timeoutMs || 60000);
    child.stdout.on("data", (d) => { stdout += d.toString(); if (stdout.length > 200000) stdout = stdout.slice(-200000); });
    child.stderr.on("data", (d) => { stderr += d.toString(); if (stderr.length > 50000) stderr = stderr.slice(-50000); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exit_code: code, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ exit_code: -1, stdout, stderr: stderr + "\n" + err.message });
    });
  });
}

// ============================================================================
// FS HELPERS — HyperHermes store / kernels / cosign tail
// ============================================================================
function listDirSafe(p, limit = 200) {
  try {
    const items = fs.readdirSync(p, { withFileTypes: true })
      .slice(0, limit)
      .map((d) => ({ name: d.name, type: d.isDirectory() ? "dir" : (d.isFile() ? "file" : "other") }));
    return { path: p, exists: true, count: items.length, items };
  } catch (e) {
    return { path: p, exists: false, error: e.message };
  }
}
function readHbpHead(p, head = 4096) {
  try {
    const buf = fs.readFileSync(p);
    const slice = buf.slice(0, head);
    return {
      path: p, size: buf.length,
      sha256_head: sha256Text(slice.toString("binary")),
      preview_utf8: slice.toString("utf8").replace(/[^\x20-\x7e\n]/g, "."),
    };
  } catch (e) { return { path: p, error: e.message }; }
}
function readCosignTail(n = 10) {
  try {
    const raw = fs.readFileSync(CFG.cosign_path, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    const tail = lines.slice(-n);
    const parsed = tail.map((line) => {
      try { return JSON.parse(line); } catch { return { _unparseable: line.slice(0, 200) }; }
    });
    return { path: CFG.cosign_path, total_lines: lines.length, returned: parsed.length, tail: parsed };
  } catch (e) { return { path: CFG.cosign_path, error: e.message }; }
}
function lastCosignSeq() {
  try {
    const raw = fs.readFileSync(CFG.cosign_path, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const row = JSON.parse(lines[i]);
        if (typeof row.seq === "number") return { seq: row.seq, row_hash: row.row_hash };
      } catch {}
    }
  } catch {}
  return { seq: null, row_hash: null };
}

// ============================================================================
// MCP SERVER + TOOL REGISTRATION
// ============================================================================
const mcp = new McpServer({ name: "asolaria-os-on-metal", version: "0.1.0" });

// ----- Cross-cutting: identity + fusion-status -----
mcp.registerTool("aoom_identity",
  { description: "Returns OS-on-metal MCP identity, anchor PID, fusion-layer config snapshot (env-resolved URLs/paths) + PID-crypto-token.",
    inputSchema: {} },
  async () => tupleOk("AOOMID", {
    server: "asolaria-os-on-metal", version: "0.1.0",
    anchor_pid: ANCHOR_PID, agent_pid: AGENT_PID,
    pid_crypto_token: pidCryptoToken(ANCHOR_PID),
    equation: "USB-frozen-slice + HyperBEHCS-thinking-engine = ASOLARIA OS-ON-METAL",
    fusion_layers: 7, cfg: CFG,
  }));

mcp.registerTool("aoom_fusion_status",
  { description: "Probes all 7 fusion layers in parallel (fabric health, hermes store dir, anthropic key presence, codex bin presence, google key presence, kernel root dir, hookwall/gnn URLs). Returns per-layer up/down + latency.",
    inputSchema: {} },
  async () => {
    const t0 = Date.now();
    const probes = await Promise.allSettled([
      fabricGet("/health"),                                                   // L1
      Promise.resolve(listDirSafe(CFG.hermes_store, 5)),                      // L2
      Promise.resolve({ anthropic_key_present: !!CFG.anthropic_key, model: CFG.anthropic_model }), // L3
      runCmd(CFG.codex_bin, ["--version"], { timeoutMs: 4000 }),              // L4
      Promise.resolve({ google_key_present: !!CFG.google_key, model: CFG.gemini_model }), // L5
      Promise.resolve(listDirSafe(CFG.kernel_root, 5)),                       // L6
      httpJson(CFG.hookwall_url.replace("/v1/emit", "/health"), { method: "GET" }, 3000).catch((e) => ({ _err: e.message })), // L7a
      httpJson(CFG.gnn_drain_url.replace("/v1/drain", "/health"), { method: "GET" }, 3000).catch((e) => ({ _err: e.message })), // L7b
    ]);
    return tupleOk("AOOMSTAT", {
      probed_ms: Date.now() - t0,
      layers: {
        L1_fabric:       { result: probes[0].value || probes[0].reason?.message },
        L2_hermes_store: { result: probes[1].value },
        L3_anthropic:    { result: probes[2].value },
        L4_codex:        { result: probes[3].value },
        L5_google:       { result: probes[4].value },
        L6_kernel:       { result: probes[5].value },
        L7a_hookwall:    { url: CFG.hookwall_url, result: probes[6].value },
        L7b_gnn_drain:   { url: CFG.gnn_drain_url, result: probes[7].value },
      },
    });
  });

// ============================================================================
// LAYER 1 — asolaria-fabric pass-through (3 high-value endpoints; rest via existing wrapper)
// ============================================================================
mcp.registerTool("aoom_fabric_health",       { description: "L1: fabric :4949 health (apex+operator_pair+uptime).", inputSchema: {} },
  async () => tupleOk("AOOMFAB", await fabricGet("/health")));

mcp.registerTool("aoom_fabric_everything",   { description: "L1: fabric :4949 /api/everything route map + cohort artifacts.", inputSchema: {} },
  async () => tupleOk("AOOMFABEV", await fabricGet("/api/everything")));

mcp.registerTool("aoom_fabric_council_query",
  { description: "L1: POST :4949/api/council/query — office-fed council (705-roster, was 234-static); returns fired envelope ID.",
    inputSchema: { topic: z.string().min(1), keywords: z.array(z.string()).min(1).max(20) } },
  async ({ topic, keywords }) => tupleOk("AOOMFABCQ", await fabricPost("/api/council/query", { topic, keywords })));

// ============================================================================
// LAYER 2 — HyperHermes (HBP/HBI store + hermes-acer-ext)
// ============================================================================
mcp.registerTool("aoom_hermes_store_list",
  { description: "L2: list HyperBEHCS store (HBP/HBI/SHA256/HEX trinity sidecar). Default C:/HyperBEHCS/store.",
    inputSchema: { limit: z.number().int().min(1).max(500).default(60).optional() } },
  async ({ limit } = {}) => tupleOk("AOOMHERMLS", listDirSafe(CFG.hermes_store, limit || 60)));

mcp.registerTool("aoom_hermes_hbp_read",
  { description: "L2: read head of a single HBP/HBI/HEX file under HyperBEHCS store; returns size + sha256_head + utf8 preview (4 KB).",
    inputSchema: {
      name: z.string().min(1).describe("filename relative to HYPERBEHCS_STORE (or absolute path)"),
      head: z.number().int().min(64).max(65536).default(4096).optional(),
    } },
  async ({ name, head }) => {
    const target = path.isAbsolute(name) ? name : path.join(CFG.hermes_store, name);
    return tupleOk("AOOMHERMHBP", readHbpHead(target, head || 4096));
  });

mcp.registerTool("aoom_hermes_root_inventory",
  { description: "L2: inventory D:/hyperbehcs-hermes (or HYPERHERMES_ROOT) — adapters/packs/receipts subdirs.",
    inputSchema: {} },
  async () => tupleOk("AOOMHERMROOT", listDirSafe(CFG.hermes_root, 80)));

// ============================================================================
// LAYER 2b — SIDECAR LANES (2026-10-18, operator P4): read host8 + recall without a shell; seal the office
// host8/recall: GET only, view-only allowlist, response returned VERBATIM (already HBP) under one header row.
// office: writes confined to CFG.office_dir (realpath-checked); mirrors office_hbp.py (LF, |json=0 rows, sha256 sidecar, re-verify).
// ============================================================================
const HOST8_VIEW_ROUTES = ["/health.hbp", "/room.hbp", "/feed.hbp", "/seats.hbp", "/count.hbp",
  "/task-manager.hbp", "/unified-pipe.hbp", "/fischer-converters.hbp", "/shadow-parity.hbp"];
async function hbpGet(url, timeoutMs = 15000) {
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    return { status: res.status, text };
  } catch (e) { return { status: 0, text: "", error: e.message }; }
}
function hbpText(tag, url, r, cap = 60000) {
  const body = r.text.length > cap ? r.text.slice(0, cap) : r.text;
  const head = tupleRow(tag, { url, status: r.status, bytes: Buffer.byteLength(r.text, "utf8"), capped: r.text.length > cap ? 1 : 0,
    sha256: sha256Text(r.text), error: r.error || "-", json: 0 });
  return { content: [{ type: "text", text: `${head}\n${body}` }] };
}
function officeRoot() { return fs.realpathSync(CFG.office_dir); }
function officePath(name, mustExist = true) {
  if (typeof name !== "string" || !name || name.includes("\0")) throw new Error("bad_name");
  const root = officeRoot();
  const target = path.resolve(root, name);
  const inside = (p) => { const rel = path.relative(root, p); return rel && !rel.startsWith("..") && !path.isAbsolute(rel); };
  if (!inside(target)) throw new Error("outside_office");
  if (!inside(fs.realpathSync(path.dirname(target))) && fs.realpathSync(path.dirname(target)) !== root) throw new Error("outside_office_symlink");
  if (fs.existsSync(target)) {
    if (!inside(fs.realpathSync(target))) throw new Error("outside_office_symlink");
    if (!fs.statSync(target).isFile()) throw new Error("not_a_file");
  } else if (mustExist) throw new Error("no_such_file");
  return target;
}
function sealFile(target) {
  if (target.endsWith(".sha256")) throw new Error("refuse_sealing_a_sidecar");
  const hex = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
  const side = `${target}.sha256`;
  fs.writeFileSync(side, `${hex}  ${path.basename(target)}\n`);
  return verifyFile(target, hex);
}
function verifyFile(target, expect) {
  const side = `${target}.sha256`;
  const now = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
  let pinned = "-";
  try { pinned = fs.readFileSync(side, "utf8").trim().split(/\s+/)[0]; } catch {}
  const ok = pinned === now && (!expect || expect === now);
  return { file: path.relative(officeRoot(), target).replace(/\\/g, "/"), bytes: fs.statSync(target).size, sha256: now,
    sidecar_sha256: pinned, verify: ok ? "OK" : "FAIL" };
}
function rowsOnly(tag, objs) {
  return { content: [{ type: "text", text: objs.map((o) => tupleRow(tag, { ...o, json: 0 })).join("\n") }] };
}

mcp.registerTool("aoom_host8_read",
  { description: "L2b: GET a view-only host8 kernel route on :5088 (task-manager, health, seats, count, room, feed, unified-pipe, fischer-converters, shadow-parity) and return its HBP rows verbatim. No fire, no launch, no shell.",
    inputSchema: {
      route: z.enum(HOST8_VIEW_ROUTES),
      count: z.number().int().min(1).max(50).optional().describe("only for /shadow-parity.hbp (host8 caps at 1000; this lane caps at 50)"),
    } },
  async ({ route, count }) => {
    const q = route === "/shadow-parity.hbp" ? `?count=${count || 1}&device=acer` : "";
    const url = `${CFG.host8_url}${route}${q}`;
    return hbpText("AOOMHOST8", url, await hbpGet(url));
  });

mcp.registerTool("aoom_recall_search",
  { description: "L2b: search the recall vault :4796 (/api/search.hbp) and return its HILBRA rows verbatim (path|pid|bh|off|len). Read-only.",
    inputSchema: { q: z.string().min(1).max(200), limit: z.number().int().min(1).max(200).optional() } },
  async ({ q, limit }) => {
    const url = `${CFG.recall_url}/api/search.hbp?q=${encodeURIComponent(q)}&limit=${limit || 25}`;
    return hbpText("AOOMRECALL", url, await hbpGet(url, 20000));
  });

mcp.registerTool("aoom_office_verify",
  { description: "L2b: recompute sha256 of a FABLE5 office file and compare with its .sha256 sidecar (independent check). Read-only.",
    inputSchema: { name: z.string().min(1).describe("path relative to the FABLE5 office, e.g. FABLE5-X.hbp or sub/x.pt") } },
  async ({ name }) => { try { return rowsOnly("AOOMOFFICEVERIFY", [verifyFile(officePath(name))]); }
    catch (e) { return rowsOnly("AOOMOFFICEREFUSE", [{ name, reason: e.message }]); } });

mcp.registerTool("aoom_office_seal",
  { description: "L2b: write/refresh the .sha256 sidecar (GNU format) for a file inside the FABLE5 office, then re-verify. Writes only the sidecar, only inside the office.",
    inputSchema: { names: z.array(z.string().min(1)).min(1).max(64) } },
  async ({ names }) => rowsOnly("AOOMOFFICESEAL", names.map((name) => {
    try { return sealFile(officePath(name)); } catch (e) { return { name, verify: "REFUSE", reason: e.message }; }
  })));

mcp.registerTool("aoom_office_append",
  { description: "L2b: append HBP rows to a .hbp/.hbi file in the FABLE5 office (create=true makes a new one), LF only, every row one line ending |json=0; then reseal + re-verify. Mirrors office_hbp.py appendfile.",
    inputSchema: { name: z.string().min(1), rows: z.array(z.string().min(1)).min(1).max(500), create: z.boolean().optional() } },
  async ({ name, rows, create }) => {
    try {
      if (!/\.(hbp|hbi)$/.test(name)) throw new Error("only_hbp_or_hbi");
      const target = officePath(name, !create);
      for (const r of rows) if (/[\r\n]/.test(r) || !r.endsWith("|json=0")) throw new Error(`row_must_be_one_line_ending_json=0:${tupleClean(r, 80)}`);
      let body = fs.existsSync(target) ? fs.readFileSync(target) : Buffer.alloc(0);
      if (body.includes(13)) throw new Error("file_has_CR_normalize_first");
      if (body.length && body[body.length - 1] !== 10) body = Buffer.concat([body, Buffer.from("\n")]);
      fs.writeFileSync(target, Buffer.concat([body, Buffer.from(rows.join("\n") + "\n", "utf8")]));
      return rowsOnly("AOOMOFFICEAPPEND", [{ ...sealFile(target), rows_appended: rows.length }]);
    } catch (e) { return rowsOnly("AOOMOFFICEREFUSE", [{ name, reason: e.message }]); }
  });

// ----- L2b: read-only file finder (2026-10-18, operator: "add a sidecar find tool") -----
// Walks ONLY allow-listed roots, never writes/moves/deletes, skips dependency/build dirs, time-bounded.
// Requires a size filter (or a name filter); hashes ONLY files whose size already matches.
// Roots: $AOOM_FIND_ROOTS (';'-separated) overrides; default = ACER's allow-list on Windows, else $HOME + /tmp (portable).
const FIND_ROOTS = (process.env.AOOM_FIND_ROOTS
  ? process.env.AOOM_FIND_ROOTS.split(";")
  : (process.platform === "win32"
    ? ["D:/", "C:/Users/acer", "C:/HyperBEHCS", "C:/asolaria-acer", "C:/tmp", "C:/$Recycle.Bin"]
    : [require("node:os").homedir(), "/tmp"])).map((s) => s.trim()).filter(Boolean);
const FIND_SKIP = new Set(["node_modules", ".git", "target", "System Volume Information", "__pycache__", ".venv", "$WinREAgent"]);
function sha256FileStream(p) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(p).on("data", (d) => h.update(d)).on("error", reject).on("end", () => resolve(h.digest("hex")));
  });
}
async function findFiles({ roots, size, sha256_prefix, name_regex, max_results, max_seconds }) {
  const deadline = Date.now() + max_seconds * 1000;
  const re = name_regex ? new RegExp(name_regex, "i") : null;
  const want = sha256_prefix ? sha256_prefix.toLowerCase() : null;
  const hits = []; let files = 0, dirs = 0, errors = 0, timedOut = false, capped = false;
  outer: for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      if (Date.now() > deadline) { timedOut = true; break outer; }
      const dir = stack.pop(); let dh;
      try { dh = await fs.promises.opendir(dir); } catch { errors++; continue; }
      dirs++;
      try {
        for await (const e of dh) {
          if (e.isSymbolicLink()) continue;
          const p = path.join(dir, e.name);
          if (e.isDirectory()) { if (!FIND_SKIP.has(e.name)) stack.push(p); continue; }
          if (!e.isFile()) continue;
          files++;
          if (re && !re.test(e.name)) continue;
          let st; try { st = await fs.promises.stat(p); } catch { errors++; continue; }
          if (size != null && st.size !== size) continue;
          let sha = "-";
          if (size != null || want) { try { sha = await sha256FileStream(p); } catch { errors++; continue; } }
          hits.push({ path: p.replace(/\\/g, "/"), bytes: st.size, mtime_utc: st.mtime.toISOString(), sha256: sha,
            prefix_match: want ? (sha.startsWith(want) ? 1 : 0) : "-" });
          if (hits.length >= max_results) { capped = true; break outer; }
        }
      } catch { errors++; }
    }
  }
  return { hits, files, dirs, errors, timedOut, capped };
}

mcp.registerTool("aoom_find_files",
  { description: `L2b: READ-ONLY file finder over allow-listed roots (${FIND_ROOTS.join(", ")}; override with env AOOM_FIND_ROOTS). Filter by exact size (required unless name_regex given); hashes only size matches; flags sha256 prefix matches. Never writes. Returns path|bytes|mtime|sha256 rows.`,
    inputSchema: {
      roots: z.array(z.enum(FIND_ROOTS)).min(1).max(FIND_ROOTS.length).optional(),
      size: z.number().int().min(0).optional(),
      sha256_prefix: z.string().regex(/^[0-9a-fA-F]{6,64}$/).optional(),
      name_regex: z.string().min(1).max(200).optional(),
      max_results: z.number().int().min(1).max(500).optional(),
      max_seconds: z.number().int().min(5).max(900).optional(),
    } },
  async ({ roots, size, sha256_prefix, name_regex, max_results, max_seconds }) => {
    if (size == null && !name_regex) return rowsOnly("AOOMFINDREFUSE", [{ reason: "need_size_or_name_regex(too_broad)" }]);
    if (sha256_prefix && size == null) return rowsOnly("AOOMFINDREFUSE", [{ reason: "sha256_prefix_needs_size(no_blind_hashing)" }]);
    const t0 = Date.now();
    const r = await findFiles({ roots: roots || FIND_ROOTS, size, sha256_prefix, name_regex, max_results: max_results || 200, max_seconds: max_seconds || 300 });
    const rows = r.hits.map((h) => tupleRow("AOOMFINDHIT", { ...h, json: 0 }));
    rows.push(tupleRow("AOOMFINDSUM", { roots: (roots || FIND_ROOTS).join(","), size: size ?? "-", sha256_prefix: sha256_prefix || "-",
      name_regex: name_regex || "-", hits: r.hits.length, prefix_matches: r.hits.filter((h) => h.prefix_match === 1).length,
      files_scanned: r.files, dirs_scanned: r.dirs, errors: r.errors, timed_out: r.timedOut ? 1 : 0, capped: r.capped ? 1 : 0,
      secs: Math.round((Date.now() - t0) / 1000), writes: 0, json: 0 }));
    return { content: [{ type: "text", text: rows.join("\n") }] };
  });

// ============================================================================
// LAYER 3 — Claude API (Anthropic SDK pass-through, descriptor + smoke)
// ============================================================================
mcp.registerTool("aoom_claude_describe",
  { description: "L3: describe Anthropic Claude API config (key presence redacted, default model, URL). For real calls use aoom_claude_message.",
    inputSchema: {} },
  async () => tupleOk("AOOMCLDDESC", {
    api_key_present: !!CFG.anthropic_key,
    api_key_prefix: CFG.anthropic_key ? CFG.anthropic_key.slice(0, 7) + "..." : null,
    default_model: CFG.anthropic_model, endpoint: CFG.anthropic_url,
    sdk_pattern: "POST /v1/messages with anthropic-version: 2023-06-01 header",
  }));

mcp.registerTool("aoom_claude_message",
  { description: "L3: one-shot Claude message via Anthropic /v1/messages. Requires ANTHROPIC_API_KEY env. Default model env ANTHROPIC_MODEL.",
    inputSchema: {
      prompt: z.string().min(1).max(40000),
      model: z.string().optional(),
      max_tokens: z.number().int().min(1).max(8192).default(1024).optional(),
      system: z.string().max(10000).optional(),
    } },
  async ({ prompt, model, max_tokens, system }) => {
    if (!CFG.anthropic_key) return tupleOk("AOOMCLDMSG", { error: "ANTHROPIC_API_KEY not set in MCP env" });
    const body = {
      model: model || CFG.anthropic_model,
      max_tokens: max_tokens || 1024,
      messages: [{ role: "user", content: prompt }],
      ...(system ? { system } : {}),
    };
    const res = await httpJson(CFG.anthropic_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CFG.anthropic_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    }, 60000);
    return tupleOk("AOOMCLDMSG", res);
  });

// ============================================================================
// LAYER 4 — Codex CLI exec
// ============================================================================
mcp.registerTool("aoom_codex_version",
  { description: "L4: run `codex --version` (or CODEX_BIN env override). Smoke-probe Codex CLI presence on PATH.",
    inputSchema: {} },
  async () => tupleOk("AOOMCDXVER", await runCmd(CFG.codex_bin, ["--version"], { timeoutMs: 4000 })));

mcp.registerTool("aoom_codex_exec",
  { description: "L4: run arbitrary Codex CLI subcommand args (e.g. ['exec','--model','o4-mini','-q','hello']). Output capped at 200KB stdout / 50KB stderr.",
    inputSchema: {
      args: z.array(z.string()).min(1).max(40),
      timeout_ms: z.number().int().min(1000).max(120000).default(30000).optional(),
    } },
  async ({ args, timeout_ms }) => tupleOk("AOOMCDXEXEC", await runCmd(CFG.codex_bin, args, { timeoutMs: timeout_ms || 30000 })));

// ============================================================================
// LAYER 5 — Google API (Gemini generateContent / Vertex / Drive descriptor)
// ============================================================================
mcp.registerTool("aoom_google_describe",
  { description: "L5: describe Google API config (Gemini key presence redacted, default model, endpoint).",
    inputSchema: {} },
  async () => tupleOk("AOOMGDESC", {
    api_key_present: !!CFG.google_key,
    api_key_prefix: CFG.google_key ? CFG.google_key.slice(0, 7) + "..." : null,
    default_model: CFG.gemini_model, endpoint_base: CFG.gemini_url,
    auth_note: "Drive auth needs OAuth+gcloud (per reference_gemini_cli_install_state_2026_05_22); raw Gemini-API key here uses generativelanguage.googleapis.com path.",
  }));

mcp.registerTool("aoom_gemini_generate",
  { description: "L5: one-shot Gemini generateContent. Requires GOOGLE_API_KEY (or GEMINI_API_KEY) env. Default model env GEMINI_MODEL.",
    inputSchema: {
      prompt: z.string().min(1).max(40000),
      model: z.string().optional(),
      max_output_tokens: z.number().int().min(1).max(8192).default(1024).optional(),
    } },
  async ({ prompt, model, max_output_tokens }) => {
    if (!CFG.google_key) return tupleOk("AOOMGGEN", { error: "GOOGLE_API_KEY/GEMINI_API_KEY not set in MCP env" });
    const m = model || CFG.gemini_model;
    const url = `${CFG.gemini_url}/${m}:generateContent?key=${encodeURIComponent(CFG.google_key)}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: max_output_tokens || 1024 },
    };
    const res = await httpJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 60000);
    return tupleOk("AOOMGGEN", res);
  });

// ============================================================================
// LAYER 6 — Kernels + microkernels (federation-remake-1024)
// ============================================================================
mcp.registerTool("aoom_kernel_inventory",
  { description: "L6: list kernels + microkernel servers under federation-remake-1024 (kernel/ + servers/).",
    inputSchema: {} },
  async () => tupleOk("AOOMKERNINV", {
    kernel: listDirSafe(CFG.kernel_root, 40),
    servers: listDirSafe(CFG.servers_root, 40),
  }));

mcp.registerTool("aoom_kernel_target_read",
  { description: "L6: read KERNEL_TARGETS.md (compile targets) or named markdown under kernel_root.",
    inputSchema: { name: z.string().default("KERNEL_TARGETS.md").optional() } },
  async ({ name }) => {
    const target = path.isAbsolute(name || "") ? name : path.join(path.dirname(CFG.kernel_root), name || "KERNEL_TARGETS.md");
    return tupleOk("AOOMKERNREAD", readHbpHead(target, 8192));
  });

// ============================================================================
// LAYER 7 — hookwall + GNN trio
// ============================================================================
mcp.registerTool("aoom_hookwall_emit",
  { description: "L7: emit envelope into hookwall bus :4947/v1/emit (canonical hookwall ingress per dual-emit-gate-daemon spec). Returns hookwall response.",
    inputSchema: {
      source_class: z.string().min(1),
      payload: z.record(z.string(), z.any()).default({}).optional(),
      anchor_pid: z.string().optional(),
    } },
  async ({ source_class, payload, anchor_pid }) => {
    const body = {
      source_class,
      anchor_pid: anchor_pid || ANCHOR_PID,
      payload: payload || {},
      ts: new Date().toISOString(),
      emitted_by: AGENT_PID,
    };
    const res = await httpJson(CFG.hookwall_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 5000);
    return tupleOk("AOOMHOOK", { sent: body, hookwall_response: res });
  });

mcp.registerTool("aoom_gnn_drain_probe",
  { description: "L7: probe GNN drain pipeline (:4920) — HEAD-style health on configured GNN_DRAIN_URL.",
    inputSchema: {} },
  async () => {
    const healthUrl = CFG.gnn_drain_url.replace("/v1/drain", "/health");
    const res = await httpJson(healthUrl, { method: "GET" }, 3000).catch((e) => ({ _err: e.message }));
    return tupleOk("AOOMGNNDRAIN", { url: healthUrl, drain_url: CFG.gnn_drain_url, response: res });
  });

// ============================================================================
// CROSS-CUTTING — cosign chain tail + append (single-writer daemon co-op)
// ============================================================================
mcp.registerTool("aoom_cosign_tail",
  { description: "Read tail of COSIGN_CHAIN.ndjson (single source of truth for federation cosign rows).",
    inputSchema: { count: z.number().int().min(1).max(50).default(10).optional() } },
  async ({ count } = {}) => tupleOk("AOOMCOSTAIL", readCosignTail(count || 10)));

mcp.registerTool("aoom_cosign_last_seq",
  { description: "Return last seq + row_hash from cosign chain (for antecedent chaining).",
    inputSchema: {} },
  async () => tupleOk("AOOMCOSLAST", lastCosignSeq()));

// ============================================================================
// BOOT
// ============================================================================
async function main() {
  const t = new StdioServerTransport();
  await mcp.connect(t);
  console.error(`[asolaria-os-on-metal v0.1] MCP connected. layers=7 tools=20 anchor=${ANCHOR_PID} agent=${AGENT_PID}`);
}

main().catch((e) => {
  console.error("[asolaria-os-on-metal] fatal:", e);
  process.exit(1);
});
