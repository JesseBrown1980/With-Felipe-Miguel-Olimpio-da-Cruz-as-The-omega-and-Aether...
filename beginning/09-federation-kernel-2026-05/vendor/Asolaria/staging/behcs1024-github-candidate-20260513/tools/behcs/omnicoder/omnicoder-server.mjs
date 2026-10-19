import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.OMNICODER_PORT || 8789);
const HOST = process.env.OMNICODER_HOST || "0.0.0.0";
const ROOT = process.env.OMNICODER_ROOT || "${ANDROID_ASOLARIA_ROOT}";
const PUBLIC_DIR = path.join(__dirname, "public");
const OMNICODER_DIR = path.join(ROOT, "omnicoder");
const PACKET_DIR = path.join(OMNICODER_DIR, "packets");
const WHITE_ROOM_DIR = path.join(OMNICODER_DIR, "white-rooms");
const INBOX_DIR = path.join(ROOT, "_auto_inbox");
const ROOM40_DIR = path.join(ROOT, "room-40");

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
    "access-control-allow-headers": "content-type"
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
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
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

function status() {
  ensureDirs();
  return {
    ok: true,
    service: "omnicoder",
    device: "falcon-${BEHCS_DEVICE_MODEL}",
    root: ROOT,
    port: PORT,
    routes: ["/", "/api/status", "/api/packet", "/api/packets"],
    white_room: {
      dir: WHITE_ROOM_DIR,
      count: countFiles(WHITE_ROOM_DIR),
      latest: listLatest(WHITE_ROOM_DIR, 8)
    },
    room40: {
      dir: ROOM40_DIR,
      count: countFiles(ROOM40_DIR),
      latest: listLatest(ROOM40_DIR, 8)
    },
    inbox: {
      dir: INBOX_DIR,
      count: countFiles(INBOX_DIR),
      latest: listLatest(INBOX_DIR, 8)
    },
    packets: {
      dir: PACKET_DIR,
      count: countFiles(PACKET_DIR),
      latest: listLatest(PACKET_DIR, 12)
    },
    truth_boundary: "OMNICODER writes white-room work packets; execution remains gated by Hookwall, GNN, Shannon, OmniWhiteRoom, and GC."
  };
}

function createPacket(input) {
  ensureDirs();
  const now = new Date().toISOString();
  const seed = JSON.stringify(input || {}) + now;
  const id = `omnicoder-${sha16(seed)}`;
  const title = String(input.title || input.objective || "OMNICODER packet").slice(0, 180);
  const packet = {
    id,
    type: "OMNICODER_WHITE_ROOM_PACKET",
    verb: "EVT-OMNICODER-WHITE-ROOM-PACKET",
    from: "falcon",
    actor: "falcon-omnicoder",
    mode: "real",
    ts: now,
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
      white_room: {
        state: "draft",
        fail_closed: true,
        proof_mode: "append_only",
        source_surface: "falcon_visual_frontend"
      },
      capabilities: {
        visual_frontend: true,
        filesystem_participant: true,
        native_android_codex: false,
        backend_codex_route: "acer_or_liris"
      },
      truth_boundary: "This packet is an operator-visible coding request. It is not execution authority."
    }
  };
  const fileBase = `${now.replace(/[:.]/g, "-")}_${id}_${safeName(title)}.json`;
  const payload = JSON.stringify(packet, null, 2);
  const paths = {
    packet: path.join(PACKET_DIR, fileBase),
    white_room: path.join(WHITE_ROOM_DIR, fileBase),
    inbox: path.join(INBOX_DIR, fileBase),
    room40: path.join(ROOM40_DIR, `OMNICODER-${fileBase}`)
  };
  for (const targetPath of Object.values(paths)) fs.writeFileSync(targetPath, payload);
  fs.writeFileSync(path.join(OMNICODER_DIR, "latest.json"), payload);
  return { ok: true, packet, paths };
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

ensureDirs();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  try {
    if (req.method === "GET" && url.pathname === "/api/status") return json(res, 200, status());
    if (req.method === "GET" && url.pathname === "/api/packets") return json(res, 200, { ok: true, packets: listLatest(PACKET_DIR, 50) });
    if (req.method === "POST" && url.pathname === "/api/packet") return json(res, 200, createPacket(await readBody(req)));
    if (req.method === "GET") return serveStatic(req, res, url.pathname);
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (err) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[omnicoder] listening http://${HOST}:${PORT} root=${ROOT}`);
});
