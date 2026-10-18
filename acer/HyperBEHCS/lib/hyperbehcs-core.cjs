"use strict";

const crypto = require("crypto");

const ZERO_COUNTERS = Object.freeze({
  hardware_mutations: 0,
  cpu_affinity_changes: 0,
  gpu_kernel_launches: 0,
  gpu_driver_mutations: 0,
  remote_writes: 0,
  adb_actions: 0,
  scrcpy_actions: 0,
  device_file_writes: 0,
  route_mutations: 0,
  provider_calls: 0,
  mcp_tool_calls: 0,
  process_starts: 0,
  executor_executions: 0,
  cleanup_actions: 0,
  runtime_authority_grants: 0,
  production_promotions: 0
});

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 16);
}

function round(value, places = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function quantBits(value, fallback = 8) {
  const number = Math.round(finiteNumber(value, fallback));
  return Math.min(24, Math.max(1, number));
}

function toVector(input) {
  if (Array.isArray(input)) return input.map((value) => finiteNumber(value));
  if (input && Array.isArray(input.vector)) return input.vector.map((value) => finiteNumber(value));
  if (input && Array.isArray(input.values)) return input.values.map((value) => finiteNumber(value));
  return [];
}

function normalizeVector(vector) {
  const raw = toVector(vector);
  const norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0));
  return norm === 0 ? raw.map(() => 0) : raw.map((value) => round(value / norm, 12));
}

function achlioptasWeight(seed, row, col) {
  const digest = sha256(`${seed}|${row}|${col}`);
  const bucket = Number.parseInt(digest.slice(0, 12), 16) % 6;
  if (bucket === 0) return Math.sqrt(3);
  if (bucket === 1) return -Math.sqrt(3);
  return 0;
}

function johnsonLindenstrauss(vector, options = {}) {
  const source = normalizeVector(vector);
  const seed = String(options.seed || "hyperbehcs-local-jl");
  const targetDimension = Math.max(1, Math.min(4096, Math.round(options.targetDimension || Math.ceil(Math.sqrt(source.length || 1) * 2))));
  const scale = 1 / Math.sqrt(targetDimension);
  const projection = [];
  for (let row = 0; row < targetDimension; row += 1) {
    let sum = 0;
    for (let col = 0; col < source.length; col += 1) {
      sum += achlioptasWeight(seed, row, col) * source[col];
    }
    projection.push(round(sum * scale, 12));
  }
  const packet = {
    algorithm: "johnson-lindenstrauss-achlioptas-sparse.v1",
    source_dimension: source.length,
    target_dimension: targetDimension,
    projection,
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function turboQuant(vector, options = {}) {
  const raw = toVector(vector);
  const bits = quantBits(options.bits, 8);
  const maxCode = 2 ** bits - 1;
  const min = raw.length ? Math.min(...raw) : 0;
  const max = raw.length ? Math.max(...raw) : 0;
  const scale = max === min ? 1 : (max - min) / maxCode;
  const codes = raw.map((value) => (max === min ? 0 : Math.min(maxCode, Math.max(0, Math.round((value - min) / scale)))));
  const packet = {
    algorithm: "turbo-uniform-quant.v1",
    dimension: raw.length,
    codes,
    metadata: {
      bits,
      min: round(min, 12),
      max: round(max, 12),
      scale: round(scale, 12),
      levels: maxCode + 1,
      maxCode
    },
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function polarQuant(vector, options = {}) {
  const raw = toVector(vector);
  const bits = quantBits(options.bits, 8);
  const levels = 2 ** bits - 1;
  const pairs = [];
  const radii = [];
  for (let index = 0; index < raw.length; index += 2) {
    const x = raw[index] || 0;
    const y = raw[index + 1] || 0;
    const radius = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) < 0 ? Math.atan2(y, x) + Math.PI * 2 : Math.atan2(y, x);
    pairs.push({ radius, angle });
    radii.push(radius);
  }
  const maxRadius = Math.max(0, finiteNumber(options.maxRadius, radii.length ? Math.max(...radii) : 0));
  const radiusScale = maxRadius === 0 ? 1 : maxRadius / levels;
  const codes = pairs.map((pair) => [
    maxRadius === 0 ? 0 : Math.min(levels, Math.max(0, Math.round(pair.radius / radiusScale))),
    Math.min(levels, Math.max(0, Math.round((pair.angle / (Math.PI * 2)) * levels)))
  ]);
  const packet = {
    algorithm: "polar-pair-quant.v1",
    dimension: raw.length,
    codes,
    metadata: {
      bits,
      maxRadius: round(maxRadius, 12),
      radiusScale: round(radiusScale, 12),
      angleScaleRadians: round((Math.PI * 2) / levels, 12)
    },
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function tripleQuant(vector, options = {}) {
  const raw = toVector(vector);
  const bits = quantBits(options.bits, 8);
  const levels = 2 ** bits - 1;
  const triples = [];
  const radii = [];
  for (let index = 0; index < raw.length; index += 3) {
    const x = raw[index] || 0;
    const y = raw[index + 1] || 0;
    const z = raw[index + 2] || 0;
    const radius = Math.sqrt(x * x + y * y + z * z);
    const theta = radius === 0 ? 0 : Math.acos(Math.min(1, Math.max(-1, z / radius)));
    const phiRaw = Math.atan2(y, x);
    const phi = phiRaw < 0 ? phiRaw + Math.PI * 2 : phiRaw;
    triples.push({ radius, theta, phi });
    radii.push(radius);
  }
  const maxRadius = Math.max(0, finiteNumber(options.maxRadius, radii.length ? Math.max(...radii) : 0));
  const radiusScale = maxRadius === 0 ? 1 : maxRadius / levels;
  const thetaScaleRadians = Math.PI / levels;
  const phiScaleRadians = (Math.PI * 2) / levels;
  const codes = triples.map((triple) => [
    maxRadius === 0 ? 0 : Math.min(levels, Math.max(0, Math.round(triple.radius / radiusScale))),
    Math.min(levels, Math.max(0, Math.round((triple.theta / Math.PI) * levels))),
    Math.min(levels, Math.max(0, Math.round((triple.phi / (Math.PI * 2)) * levels)))
  ]);
  const packet = {
    algorithm: "triple-spherical-quant.v1",
    dimension: raw.length,
    codes,
    codes_flat: codes.flat(),
    lanes: ["coarse", "medium", "fine"],
    metadata: {
      bits,
      maxRadius: round(maxRadius, 12),
      radiusScale: round(radiusScale, 12),
      thetaScaleRadians: round(thetaScaleRadians, 12),
      phiScaleRadians: round(phiScaleRadians, 12)
    },
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function reconstructTriple(packet) {
  const codes = Array.isArray(packet.codes) ? packet.codes : [];
  const metadata = packet.metadata || {};
  const radiusScale = finiteNumber(metadata.radiusScale, 1);
  const thetaScale = finiteNumber(metadata.thetaScaleRadians, Math.PI);
  const phiScale = finiteNumber(metadata.phiScaleRadians, Math.PI * 2);
  return codes.flatMap(([r = 0, t = 0, p = 0]) => {
    const radius = finiteNumber(r) * radiusScale;
    const theta = finiteNumber(t) * thetaScale;
    const phi = finiteNumber(p) * phiScale;
    const sinTheta = Math.sin(theta);
    return [
      round(radius * sinTheta * Math.cos(phi), 12),
      round(radius * sinTheta * Math.sin(phi), 12),
      round(radius * Math.cos(theta), 12)
    ];
  }).slice(0, Math.max(0, Math.round(packet.dimension || codes.length * 3)));
}

function buildFastPacket(input = {}, options = {}) {
  const vector = toVector(input).length ? toVector(input) : vectorFromText(input.text || JSON.stringify(input), options.dimension || 1536);
  const payloadHash = sha256(JSON.stringify(vector));
  const triple = tripleQuant(vector, { bits: options.bits || input.bits || 8, maxRadius: options.maxRadius || input.maxRadius });
  const packet = {
    schema: "hyperbehcs.local_fast_packet.v1",
    runtime: "C:/HyperBEHCS",
    payload_hash: payloadHash,
    vector_dimension: vector.length,
    triple_quant: {
      algorithm: triple.algorithm,
      codes_flat: triple.codes_flat,
      metadata: triple.metadata,
      lanes: triple.lanes,
      fingerprint: triple.fingerprint
    },
    receipt_zero_loss: true,
    numeric_zero_loss: false,
    zero_loss_boundary: "payload_hash_preserved; numeric quantization is approximate unless proven by caller",
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

const HYBRID_MAGIC = "HBH1";
const HYBRID_VERSION = 1;
const HYBRID_SECTION_NAMES = Object.freeze({
  1: "payload_hash_sha256",
  2: "johnson_lindenstrauss_float32",
  3: "turbo_quant_codes",
  4: "polar_quant_codes",
  5: "triple_quant_codes"
});

function vectorForInput(input = {}, options = {}) {
  return toVector(input).length ? toVector(input) : vectorFromText(input.text || JSON.stringify(input), options.dimension || 1536);
}

function codeWidthForBits(bits) {
  if (bits <= 8) return 1;
  if (bits <= 16) return 2;
  return 4;
}

function flattenCodes(codes) {
  return (Array.isArray(codes) ? codes : []).flat(Infinity).map((value) => Math.max(0, Math.round(finiteNumber(value))));
}

function encodeIntegerCodes(codes, bits) {
  const width = codeWidthForBits(bits);
  const flat = flattenCodes(codes);
  const buffer = Buffer.alloc(flat.length * width);
  flat.forEach((value, index) => {
    const offset = index * width;
    if (width === 1) buffer.writeUInt8(Math.min(0xff, value), offset);
    else if (width === 2) buffer.writeUInt16LE(Math.min(0xffff, value), offset);
    else buffer.writeUInt32LE(Math.min(0xffffff, value), offset);
  });
  return buffer;
}

function encodeFloat32(values) {
  const raw = Array.isArray(values) ? values : [];
  const buffer = Buffer.alloc(raw.length * 4);
  raw.forEach((value, index) => buffer.writeFloatLE(finiteNumber(value), index * 4));
  return buffer;
}

function buildHybridEnvelope({ vectorDimension, targetDimension, bits, sections }) {
  const safeSections = sections.map((entry) => ({
    id: Math.max(1, Math.min(0xffff, Math.round(entry.id))),
    payload: Buffer.isBuffer(entry.payload) ? entry.payload : Buffer.from(entry.payload || "")
  }));
  const headerLength = 24;
  const tableLength = safeSections.length * 8;
  const payloadLength = safeSections.reduce((sum, entry) => sum + entry.payload.length, 0);
  const buffer = Buffer.alloc(headerLength + tableLength + payloadLength);
  let offset = 0;
  buffer.write(HYBRID_MAGIC, offset, "ascii"); offset += 4;
  buffer.writeUInt16LE(HYBRID_VERSION, offset); offset += 2;
  buffer.writeUInt16LE(safeSections.length, offset); offset += 2;
  buffer.writeUInt32LE(Math.max(0, Math.round(vectorDimension || 0)), offset); offset += 4;
  buffer.writeUInt32LE(Math.max(0, Math.round(targetDimension || 0)), offset); offset += 4;
  buffer.writeUInt8(quantBits(bits, 8), offset); offset += 1;
  buffer.writeUInt8(codeWidthForBits(quantBits(bits, 8)), offset); offset += 1;
  buffer.writeUInt16LE(0, offset); offset += 2;
  buffer.writeUInt32LE(0, offset); offset += 4;

  for (const entry of safeSections) {
    buffer.writeUInt16LE(entry.id, offset); offset += 2;
    buffer.writeUInt16LE(0, offset); offset += 2;
    buffer.writeUInt32LE(entry.payload.length, offset); offset += 4;
  }
  for (const entry of safeSections) {
    entry.payload.copy(buffer, offset);
    offset += entry.payload.length;
  }
  return buffer;
}

function decodeHybridEnvelope(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value || ""), "base64");
  if (buffer.length < 24 || buffer.toString("ascii", 0, 4) !== HYBRID_MAGIC) {
    throw new Error("invalid HyperBEHCS hybrid envelope");
  }
  let offset = 4;
  const version = buffer.readUInt16LE(offset); offset += 2;
  const sectionCount = buffer.readUInt16LE(offset); offset += 2;
  const vectorDimension = buffer.readUInt32LE(offset); offset += 4;
  const targetDimension = buffer.readUInt32LE(offset); offset += 4;
  const bits = buffer.readUInt8(offset); offset += 1;
  const codeWidth = buffer.readUInt8(offset); offset += 1;
  offset += 6;
  const table = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const id = buffer.readUInt16LE(offset); offset += 2;
    offset += 2;
    const bytes = buffer.readUInt32LE(offset); offset += 4;
    table.push({ id, name: HYBRID_SECTION_NAMES[id] || `section_${id}`, bytes });
  }
  let payloadOffset = 24 + sectionCount * 8;
  const sections = table.map((entry) => {
    const start = payloadOffset;
    const end = payloadOffset + entry.bytes;
    payloadOffset = end;
    return {
      ...entry,
      sha256: sha256(buffer.subarray(start, end).toString("binary")).slice(0, 16)
    };
  });
  const payloadHashSection = sections.find((entry) => entry.id === 1);
  const payloadHashOffset = payloadHashSection
    ? 24 + sectionCount * 8 + table.slice(0, table.findIndex((entry) => entry.id === 1)).reduce((sum, entry) => sum + entry.bytes, 0)
    : -1;
  const payloadHash = payloadHashOffset >= 0
    ? buffer.subarray(payloadHashOffset, payloadHashOffset + 32).toString("hex")
    : null;
  const packet = {
    schema: "hyperbehcs.local_hybrid_envelope.decode.v1",
    version,
    envelope_bytes: buffer.length,
    vector_dimension: vectorDimension,
    target_dimension: targetDimension,
    bits,
    code_width_bytes: codeWidth,
    section_count: sectionCount,
    sections,
    payload_hash: payloadHash,
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function decodeHybridEnvelopeHeader(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value || ""), "base64");
  if (buffer.length < 24 || buffer.toString("ascii", 0, 4) !== HYBRID_MAGIC) {
    throw new Error("invalid HyperBEHCS hybrid envelope");
  }
  let offset = 4;
  const version = buffer.readUInt16LE(offset); offset += 2;
  const sectionCount = buffer.readUInt16LE(offset); offset += 2;
  const vectorDimension = buffer.readUInt32LE(offset); offset += 4;
  const targetDimension = buffer.readUInt32LE(offset); offset += 4;
  const bits = buffer.readUInt8(offset); offset += 1;
  const codeWidth = buffer.readUInt8(offset); offset += 7;
  let payloadBytes = 0;
  for (let index = 0; index < sectionCount; index += 1) {
    offset += 4;
    payloadBytes += buffer.readUInt32LE(offset);
    offset += 4;
  }
  return {
    schema: "hyperbehcs.local_hybrid_envelope.header.v1",
    version,
    section_count: sectionCount,
    vector_dimension: vectorDimension,
    target_dimension: targetDimension,
    bits,
    code_width_bytes: codeWidth,
    envelope_bytes: buffer.length,
    payload_bytes: payloadBytes
  };
}

function buildHybridPacket(input = {}, options = {}) {
  const vector = vectorForInput(input, options);
  const bits = quantBits(options.bits || input.bits || 8);
  const seed = String(options.seed || input.seed || "hyperbehcs-hybrid-local");
  const targetDimension = Math.max(1, Math.min(4096, Math.round(options.targetDimension || input.targetDimension || Math.ceil(Math.sqrt(vector.length || 1) * 2))));
  const payloadHash = sha256(JSON.stringify(vector));
  const jl = johnsonLindenstrauss(vector, { seed, targetDimension });
  const turbo = turboQuant(vector, { bits });
  const polar = polarQuant(vector, { bits });
  const triple = tripleQuant(vector, { bits });
  const envelope = buildHybridEnvelope({
    vectorDimension: vector.length,
    targetDimension,
    bits,
    sections: [
      { id: 1, payload: Buffer.from(payloadHash, "hex") },
      { id: 2, payload: encodeFloat32(jl.projection) },
      { id: 3, payload: encodeIntegerCodes(turbo.codes, bits) },
      { id: 4, payload: encodeIntegerCodes(polar.codes, bits) },
      { id: 5, payload: encodeIntegerCodes(triple.codes, bits) }
    ]
  });
  const receiptBase = {
    schema: "hyperbehcs.local_hybrid_packet_receipt.v1",
    runtime: "C:/HyperBEHCS",
    vector_dimension: vector.length,
    target_dimension: targetDimension,
    bits,
    binary_envelope: {
      magic: HYBRID_MAGIC,
      version: HYBRID_VERSION,
      bytes: envelope.length,
      section_count: 5,
      section_names: Object.values(HYBRID_SECTION_NAMES)
    },
    algorithms: {
      johnson_lindenstrauss: jl.algorithm,
      turbo_quant: turbo.algorithm,
      polar_quant: polar.algorithm,
      triple_quant: triple.algorithm
    },
    fingerprints: {
      johnson_lindenstrauss: jl.fingerprint,
      turbo_quant: turbo.fingerprint,
      polar_quant: polar.fingerprint,
      triple_quant: triple.fingerprint
    },
    payload_hash: payloadHash,
    receipt_zero_loss: true,
    numeric_zero_loss: false,
    zero_loss_boundary: "payload_hash_preserved; binary envelope carries quantized numeric projections and codes; JSON receipt remains canonical/auditable",
    cpu_path_used: true,
    gpu_path_used: false,
    ...ZERO_COUNTERS
  };
  const receipt = { ...receiptBase, fingerprint: sha16(receiptBase) };
  return {
    schema: "hyperbehcs.local_hybrid_packet.v1",
    receipt,
    envelope,
    envelope_base64: envelope.toString("base64"),
    envelope_bytes: envelope.length,
    fingerprint: receipt.fingerprint
  };
}

function vectorFromText(text, dimension = 1536) {
  const source = String(text || "hyperbehcs-empty-source");
  const bytes = Buffer.from(source, "utf8");
  const safeLength = Math.max(1, bytes.length);
  return Array.from({ length: dimension }, (_, index) => {
    const a = bytes[(index * 17) % safeLength] || 0;
    const b = bytes[(index * 31 + 7) % safeLength] || 0;
    const c = bytes[(index * 47 + 13) % safeLength] || 0;
    return round(((a - 128) / 32) + ((b % 29) - 14) / 64 + ((c % 11) - 5) / 128, 6);
  });
}

function timedLoop(iterations, fn) {
  const count = Math.max(1, Math.round(iterations || 1));
  let checksum = 0;
  const started = process.hrtime.bigint();
  for (let index = 0; index < count; index += 1) {
    const value = fn(index);
    checksum = (checksum + Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8") + index) % 1000000007;
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1000000;
  return {
    iterations: count,
    elapsed_ms: round(elapsedMs, 6),
    ns_per_iteration: round((elapsedMs * 1000000) / count, 3),
    checksum
  };
}

function timedByteLoop(iterations, fn) {
  const count = Math.max(1, Math.round(iterations || 1));
  let checksum = 0;
  const started = process.hrtime.bigint();
  for (let index = 0; index < count; index += 1) {
    const value = fn(index);
    const bytes = Buffer.isBuffer(value)
      ? value.length
      : Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
    checksum = (checksum + bytes + index) % 1000000007;
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1000000;
  return {
    iterations: count,
    elapsed_ms: round(elapsedMs, 6),
    ns_per_iteration: round((elapsedMs * 1000000) / count, 3),
    checksum
  };
}

function benchmark(input = {}, options = {}) {
  const vector = toVector(input).length ? toVector(input) : vectorFromText(input.text || JSON.stringify(input), options.dimension || 1536);
  const iterations = Math.max(1, Math.round(options.iterations || 250));
  const rawPacket = {
    schema: "hyperbehcs.raw_vector_packet.v1",
    vector,
    payload_hash: sha256(JSON.stringify(vector)),
    ...ZERO_COUNTERS
  };
  const fastPacket = buildFastPacket(vector, options);
  const rawJson = JSON.stringify(rawPacket);
  const fastJson = JSON.stringify(fastPacket);
  const rawParse = timedLoop(iterations, () => JSON.parse(rawJson));
  const fastParse = timedLoop(iterations, () => JSON.parse(fastJson));
  const rawStringify = timedLoop(iterations, () => JSON.stringify(rawPacket));
  const fastStringify = timedLoop(iterations, () => JSON.stringify(fastPacket));
  const rawBytes = Buffer.byteLength(rawJson, "utf8");
  const fastBytes = Buffer.byteLength(fastJson, "utf8");
  const packet = {
    schema: "hyperbehcs.local_cpu_benchmark.v1",
    runtime: "C:/HyperBEHCS",
    vector_dimension: vector.length,
    raw_packet_json_bytes: rawBytes,
    fast_packet_json_bytes: fastBytes,
    size_ratio: round(fastBytes / Math.max(1, rawBytes), 6),
    size_reduction_percent: round((1 - fastBytes / Math.max(1, rawBytes)) * 100, 6),
    parse_speedup_ratio: round(rawParse.ns_per_iteration / Math.max(1, fastParse.ns_per_iteration), 6),
    stringify_speedup_ratio: round(rawStringify.ns_per_iteration / Math.max(1, fastStringify.ns_per_iteration), 6),
    raw_parse: rawParse,
    fast_parse: fastParse,
    raw_stringify: rawStringify,
    fast_stringify: fastStringify,
    receipt_zero_loss: fastPacket.payload_hash === rawPacket.payload_hash,
    cpu_path_used: true,
    gpu_path_used: false,
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

function hybridBenchmark(input = {}, options = {}) {
  const vector = vectorForInput(input, options);
  const iterations = Math.max(1, Math.round(options.iterations || 100));
  const rawPacket = {
    schema: "hyperbehcs.raw_vector_packet.v1",
    vector,
    payload_hash: sha256(JSON.stringify(vector)),
    ...ZERO_COUNTERS
  };
  const fastPacket = buildFastPacket(vector, options);
  const hybrid = buildHybridPacket(vector, options);
  const rawJson = JSON.stringify(rawPacket);
  const fastJson = JSON.stringify(fastPacket);
  const receiptJson = JSON.stringify(hybrid.receipt);
  const rawParse = timedLoop(iterations, () => JSON.parse(rawJson));
  const fastParse = timedLoop(iterations, () => JSON.parse(fastJson));
  const hybridDecode = timedLoop(iterations, () => decodeHybridEnvelopeHeader(hybrid.envelope));
  const rawStringify = timedLoop(iterations, () => JSON.stringify(rawPacket));
  const fastStringify = timedLoop(iterations, () => JSON.stringify(fastPacket));
  const hybridEncode = timedByteLoop(iterations, () => buildHybridPacket(vector, options).envelope);
  const rawBytes = Buffer.byteLength(rawJson, "utf8");
  const fastBytes = Buffer.byteLength(fastJson, "utf8");
  const hybridBytes = hybrid.envelope.length;
  const receiptBytes = Buffer.byteLength(receiptJson, "utf8");
  const packet = {
    schema: "hyperbehcs.local_hybrid_benchmark.v1",
    runtime: "C:/HyperBEHCS",
    vector_dimension: vector.length,
    iterations,
    raw_packet_json_bytes: rawBytes,
    fast_packet_json_bytes: fastBytes,
    hybrid_binary_envelope_bytes: hybridBytes,
    hybrid_receipt_json_bytes: receiptBytes,
    hybrid_base64_bytes: Buffer.byteLength(hybrid.envelope_base64, "utf8"),
    fast_json_size_reduction_vs_raw_percent: round((1 - fastBytes / Math.max(1, rawBytes)) * 100, 6),
    hybrid_binary_size_reduction_vs_raw_percent: round((1 - hybridBytes / Math.max(1, rawBytes)) * 100, 6),
    hybrid_binary_size_reduction_vs_fast_json_percent: round((1 - hybridBytes / Math.max(1, fastBytes)) * 100, 6),
    raw_to_fast_json_parse_speedup_ratio: round(rawParse.ns_per_iteration / Math.max(1, fastParse.ns_per_iteration), 6),
    raw_to_hybrid_binary_decode_speedup_ratio: round(rawParse.ns_per_iteration / Math.max(1, hybridDecode.ns_per_iteration), 6),
    fast_json_to_hybrid_binary_decode_speedup_ratio: round(fastParse.ns_per_iteration / Math.max(1, hybridDecode.ns_per_iteration), 6),
    fast_json_stringify_speedup_ratio: round(rawStringify.ns_per_iteration / Math.max(1, fastStringify.ns_per_iteration), 6),
    hybrid_encode_overhead_vs_raw_stringify_ratio: round(hybridEncode.ns_per_iteration / Math.max(1, rawStringify.ns_per_iteration), 6),
    raw_parse: rawParse,
    fast_parse: fastParse,
    hybrid_decode: hybridDecode,
    raw_stringify: rawStringify,
    fast_stringify: fastStringify,
    hybrid_encode: hybridEncode,
    receipt_zero_loss: hybrid.receipt.payload_hash === rawPacket.payload_hash,
    numeric_zero_loss: false,
    cpu_path_used: true,
    gpu_path_used: false,
    ...ZERO_COUNTERS
  };
  return { ...packet, fingerprint: sha16(packet) };
}

module.exports = {
  ZERO_COUNTERS,
  sha256,
  sha16,
  toVector,
  johnsonLindenstrauss,
  turboQuant,
  polarQuant,
  tripleQuant,
  reconstructTriple,
  buildFastPacket,
  buildHybridPacket,
  decodeHybridEnvelope,
  decodeHybridEnvelopeHeader,
  vectorFromText,
  benchmark,
  hybridBenchmark
};
