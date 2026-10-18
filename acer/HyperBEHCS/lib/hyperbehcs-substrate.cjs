"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const core = require("./hyperbehcs-core.cjs");

const ROOT = path.resolve(__dirname, "..");
const STORE_DIR = path.join(ROOT, "store");
const STORE_PATH = path.join(STORE_DIR, "hyperbehcs-substrate.v1.hbs");
const STORE_MAGIC = "HBS1";

const DEFAULT_LANES = Object.freeze([
  "agent",
  "mcp",
  "webmcp",
  "memory",
  "hookwall",
  "gnn",
  "cube",
  "pid",
  "hilbert",
  "crypto",
  "shellless",
  "leworld_pixels"
]);

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value || ""), Buffer.isBuffer(value) ? undefined : "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" || Buffer.isBuffer(value) ? value : stableStringify(value)).slice(0, 16);
}

function canonicalPayload(input = {}) {
  if (typeof input === "string") return { text: input };
  if (Buffer.isBuffer(input)) return { binary_base64: input.toString("base64") };
  if (input && typeof input === "object") return input;
  return { value: input };
}

function hilbertIndex(x, y, bits = 16) {
  let d = 0;
  let xi = x >>> 0;
  let yi = y >>> 0;
  for (let s = 1 << (bits - 1); s > 0; s >>= 1) {
    const rx = (xi & s) > 0 ? 1 : 0;
    const ry = (yi & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        xi = (1 << bits) - 1 - xi;
        yi = (1 << bits) - 1 - yi;
      }
      const t = xi;
      xi = yi;
      yi = t;
    }
  }
  return d >>> 0;
}

function pidMap(payloadHash) {
  const x = Number.parseInt(payloadHash.slice(0, 4), 16);
  const y = Number.parseInt(payloadHash.slice(4, 8), 16);
  const room = Number.parseInt(payloadHash.slice(8, 12), 16) % 10000;
  return {
    pid: `pid:${payloadHash.slice(0, 16)}`,
    room_id: `room:${String(room).padStart(4, "0")}`,
    hilbert: {
      bits: 16,
      x,
      y,
      index: hilbertIndex(x, y, 16)
    }
  };
}

function cubeTuple(payloadHash, lanes = DEFAULT_LANES) {
  const bytes = Buffer.from(payloadHash, "hex");
  return Array.from({ length: 48 }, (_, index) => {
    const a = bytes[index % bytes.length] || 0;
    const b = bytes[(index * 7 + 3) % bytes.length] || 0;
    return {
      dim: `D${String(index).padStart(2, "0")}`,
      lane: lanes[index % lanes.length],
      value: ((a << 8) | b) % 65536
    };
  });
}

function hookwallContract(options = {}) {
  const allowWrite = options.commit === true;
  return {
    schema: "hyperbehcs.hookwall.contract.v1",
    mode: allowWrite ? "central_store_append_only" : "read_only_packet_build",
    allowed_effects: allowWrite ? ["append_one_central_hbs_frame"] : [],
    forbidden_effects: [
      "kernel_driver_install",
      "dll_injection",
      "global_process_hook",
      "filesystem_filter_driver",
      "network_filter_driver",
      "arbitrary_app_mutation",
      "sidecar_file_fanout"
    ],
    bloat_guard: {
      sidecars_created: 0,
      per_entity_files_created: 0,
      central_store_only: allowWrite
    },
    ...core.ZERO_COUNTERS,
    runtime_authority_grants: 0
  };
}

function gnnEdges({ pid, roomId, lanes }) {
  const rows = [
    [pid, roomId, "located_by_hilbert_room"],
    [pid, "hyperbehcs:quant-stack", "encoded_by"],
    [pid, "hyperbehcs:hookwall", "guarded_by"],
    [pid, "hyperbehcs:crypto-sha256", "attested_by"]
  ];
  for (const lane of lanes) rows.push([pid, `lane:${lane}`, "routes_to"]);
  return rows.map(([from, to, relation]) => ({
    schema: "hyperbehcs.substrate.gnn_edge.v1",
    from,
    to,
    relation,
    grants_authority: false,
    fingerprint: sha16(`${from}|${relation}|${to}`)
  }));
}

function buildSubstratePacket(input = {}, options = {}) {
  const payload = canonicalPayload(input);
  const canonical = stableStringify(payload);
  const payloadHash = sha256(canonical);
  const lanes = Array.isArray(options.lanes) && options.lanes.length ? options.lanes.map(String) : DEFAULT_LANES;
  const hybrid = core.buildHybridPacket(payload, {
    dimension: options.dimension || payload.dimension || 768,
    bits: options.bits || payload.bits || 8,
    targetDimension: options.targetDimension || payload.targetDimension,
    seed: options.seed || payload.seed || "hyperbehcs-substrate"
  });
  const pid = pidMap(payloadHash);
  const cube = cubeTuple(payloadHash, lanes);
  const hookwall = hookwallContract(options);
  const receiptBase = {
    schema: "hyperbehcs.substrate.packet.v1",
    runtime: ROOT,
    generated_at: new Date().toISOString(),
    payload_hash: payloadHash,
    payload_sha16: payloadHash.slice(0, 16),
    pid: pid.pid,
    room_id: pid.room_id,
    hilbert: pid.hilbert,
    lanes,
    quant_stack: {
      johnson_lindenstrauss: hybrid.receipt.algorithms.johnson_lindenstrauss,
      turbo_quant: hybrid.receipt.algorithms.turbo_quant,
      polar_quant: hybrid.receipt.algorithms.polar_quant,
      triple_quant: hybrid.receipt.algorithms.triple_quant,
      fingerprints: hybrid.receipt.fingerprints
    },
    binary_transport: {
      envelope_schema: "hyperbehcs.local_hybrid_packet.v1",
      envelope_magic: hybrid.receipt.binary_envelope.magic,
      envelope_bytes: hybrid.envelope_bytes,
      envelope_sha256: sha256(hybrid.envelope)
    },
    crypto: {
      payload_sha256: payloadHash,
      receipt_sha256_mode: "stable-json-sha256",
      envelope_sha256_mode: "binary-sha256"
    },
    hookwall,
    cube_tuple: cube,
    gnn_edges: gnnEdges({ pid: pid.pid, roomId: pid.room_id, lanes }),
    autotranslate_pipes: Object.fromEntries(lanes.map((lane) => [lane, {
      accepted: true,
      transport: "hyperbehcs.hybrid_binary_envelope.v1",
      receipt: "json_audit_receipt",
      token_cost_strategy: "binary_or_quantized_transport_before_text_expansion"
    }])),
    bloat_guard: {
      single_central_store: STORE_PATH,
      sidecars_created: 0,
      per_entity_files_created: 0
    },
    receipt_zero_loss: true,
    numeric_zero_loss: false,
    zero_loss_boundary: "payload hash and binary envelope hash are exact; quantized numeric representations are approximate unless separately proven",
    cpu_path_used: true,
    gpu_path_used: false,
    ...core.ZERO_COUNTERS
  };
  const receipt = { ...receiptBase, fingerprint: sha16(receiptBase) };
  return {
    schema: "hyperbehcs.substrate.envelope.v1",
    receipt,
    envelope: hybrid.envelope,
    envelope_base64: hybrid.envelope_base64,
    fingerprint: receipt.fingerprint
  };
}

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, Buffer.from(STORE_MAGIC, "ascii"));
}

function appendSubstratePacket(packet) {
  ensureStore();
  const record = {
    schema: "hyperbehcs.substrate.store_frame.v1",
    appended_at: new Date().toISOString(),
    receipt: packet.receipt,
    envelope_base64: packet.envelope_base64
  };
  const bytes = Buffer.from(stableStringify(record), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(bytes.length, 0);
  fs.appendFileSync(STORE_PATH, Buffer.concat([header, bytes]));
  return {
    ok: true,
    schema: "hyperbehcs.substrate.append_result.v1",
    store_path: STORE_PATH,
    frame_bytes: bytes.length,
    receipt_fingerprint: packet.receipt.fingerprint,
    store_size_bytes: fs.statSync(STORE_PATH).size
  };
}

function storeStatus() {
  const exists = fs.existsSync(STORE_PATH);
  let frames = 0;
  let validMagic = false;
  if (exists) {
    const fd = fs.openSync(STORE_PATH, "r");
    try {
      const magic = Buffer.alloc(4);
      fs.readSync(fd, magic, 0, 4, 0);
      validMagic = magic.toString("ascii") === STORE_MAGIC;
      let offset = 4;
      const stat = fs.fstatSync(fd);
      const length = Buffer.alloc(4);
      while (offset + 4 <= stat.size) {
        fs.readSync(fd, length, 0, 4, offset);
        const frameBytes = length.readUInt32LE(0);
        offset += 4 + frameBytes;
        if (frameBytes <= 0 || offset > stat.size) break;
        frames += 1;
      }
    } finally {
      fs.closeSync(fd);
    }
  }
  return {
    ok: true,
    schema: "hyperbehcs.substrate.status.v1",
    runtime_root: ROOT,
    store_path: STORE_PATH,
    store_exists: exists,
    store_magic_valid: exists ? validMagic : false,
    frames,
    store_size_bytes: exists ? fs.statSync(STORE_PATH).size : 0,
    lanes: DEFAULT_LANES,
    quant_stack: ["johnson_lindenstrauss", "turbo_quant", "polar_quant", "triple_quant"],
    bloat_guard: "single central binary store; no per-file sidecar fanout",
    ...core.ZERO_COUNTERS
  };
}

module.exports = {
  DEFAULT_LANES,
  STORE_PATH,
  buildSubstratePacket,
  appendSubstratePacket,
  storeStatus
};
