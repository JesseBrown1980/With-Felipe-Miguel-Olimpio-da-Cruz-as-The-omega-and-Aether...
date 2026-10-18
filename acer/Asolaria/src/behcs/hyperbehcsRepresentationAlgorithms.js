"use strict";

const crypto = require("crypto");

const CATALOG_ID = "hyperbehcs-representation-algorithms.v1";
const ZERO_AUTHORITY_COUNTERS = Object.freeze({
  hardware_mutations: 0,
  route_mutations: 0,
  provider_calls: 0,
  mcp_tool_calls: 0,
  runtime_authority_grants: 0
});

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function fingerprint(value) {
  return sha256Hex(stableStringify(value)).slice(0, 16);
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const number = Math.round(finiteNumber(value, fallback));
  return Math.min(max, Math.max(min, number));
}

function quantBits(value, fallback = 8) {
  return positiveInteger(value, fallback, 1, 24);
}

function toNumericArray(values) {
  if (values && typeof values === "object" && !Array.isArray(values)) {
    if (Array.isArray(values.vector)) return values.vector.map((value) => finiteNumber(value, 0));
    if (Array.isArray(values.values)) return values.values.map((value) => finiteNumber(value, 0));
    if (Array.isArray(values.pairs)) return values.pairs.flat().map((value) => finiteNumber(value, 0));
  }
  if (!Array.isArray(values)) return [];
  return values.map((value) => finiteNumber(value, 0));
}

function splitPayloadAndOptions(values, options = {}) {
  if (values && typeof values === "object" && !Array.isArray(values)) {
    const { vector, values: nestedValues, pairs, triples, ...rest } = values;
    const payload = Array.isArray(vector) ? vector : Array.isArray(nestedValues) ? nestedValues : Array.isArray(pairs) ? pairs.flat() : Array.isArray(triples) ? triples.flat() : values;
    return { payload, options: { ...rest, ...options } };
  }
  return { payload: values, options };
}

function withSoftwareAuthority(record) {
  const sealed = {
    ...record,
    descriptor_only: true,
    descriptorOnly: true,
    software_only: true,
    softwareOnly: true,
    authority_grants: [],
    authorityGrants: [],
    authorityCounters: { ...ZERO_AUTHORITY_COUNTERS },
    authority_counters: { ...ZERO_AUTHORITY_COUNTERS },
    ...ZERO_AUTHORITY_COUNTERS
  };
  return { ...sealed, fingerprint: fingerprint(sealed) };
}

function roundNumber(value, places = 12) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function normalizeNumericVector(values) {
  const raw = toNumericArray(values);
  const l2Norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0));
  const normalized = l2Norm === 0 ? raw.map(() => 0) : raw.map((value) => roundNumber(value / l2Norm));
  const result = {
    algorithm: "numeric-vector-normalize-l2.v1",
    dimension: raw.length,
    l2Norm: roundNumber(l2Norm),
    zeroVector: l2Norm === 0,
    values: normalized
  };
  return { ...result, fingerprint: fingerprint(result) };
}

function hashBucket(seed, row, col, buckets = 6) {
  const digest = sha256Hex(`${seed}|${row}|${col}`);
  return Number.parseInt(digest.slice(0, 12), 16) % buckets;
}

function achlioptasWeight(seed, row, col) {
  const bucket = hashBucket(seed, row, col, 6);
  if (bucket === 0) return Math.sqrt(3);
  if (bucket === 1) return -Math.sqrt(3);
  return 0;
}

function buildJohnsonLindenstraussProjection(values, options = {}) {
  const normalizedInput = splitPayloadAndOptions(values, options);
  const source = normalizeNumericVector(normalizedInput.payload).values;
  const seed = String(normalizedInput.options.seed ?? "hyperbehcs-jl-v1");
  const targetDimensions = positiveInteger(
    normalizedInput.options.targetDimensions ?? normalizedInput.options.targetDimension ?? normalizedInput.options.dimensions,
    Math.max(1, Math.min(source.length || 1, Math.ceil(Math.log2((source.length || 0) + 2) * 4))),
    1,
    4096
  );
  const scale = 1 / Math.sqrt(targetDimensions);
  const projected = [];

  for (let row = 0; row < targetDimensions; row += 1) {
    let sum = 0;
    for (let col = 0; col < source.length; col += 1) {
      sum += achlioptasWeight(seed, row, col) * source[col];
    }
    projected.push(roundNumber(sum * scale));
  }

  const result = {
    id: "johnson_lindenstrauss_projection",
    algorithm: "johnson-lindenstrauss-achlioptas-sparse.v1",
    seed,
    sourceDimensions: source.length,
    source_dimension: source.length,
    targetDimensions,
    target_dimension: targetDimensions,
    projection: projected,
    projected_vector: projected,
    projectedVector: projected,
    values: projected,
    metadata: {
      source_dimension: source.length,
      distribution: "sqrt(3),0,-sqrt(3) with probabilities 1/6,2/3,1/6",
      scale: roundNumber(scale),
      hash: "sha256(seed|row|col)"
    }
  };
  return withSoftwareAuthority(result);
}

function valueRange(values, options = {}) {
  const raw = toNumericArray(values);
  const observedMin = raw.length ? Math.min(...raw) : 0;
  const observedMax = raw.length ? Math.max(...raw) : 0;
  const min = finiteNumber(options.min, observedMin);
  const max = finiteNumber(options.max, observedMax);
  return min <= max ? { min, max } : { min: max, max: min };
}

function uniformQuantize(values, options = {}) {
  const raw = toNumericArray(values);
  const bits = quantBits(options.bits, 8);
  const maxCode = 2 ** bits - 1;
  const levels = maxCode + 1;
  const { min, max } = valueRange(raw, options);
  const scale = max === min ? 1 : (max - min) / maxCode;
  const zeroPoint = max === min ? 0 : Math.round(-min / scale);
  const codes = raw.map((value) => {
    if (max === min) return 0;
    return Math.min(maxCode, Math.max(0, Math.round((value - min) / scale)));
  });
  return {
    bits,
    levels,
    maxCode,
    min: roundNumber(min),
    max: roundNumber(max),
    scale: roundNumber(scale),
    zeroPoint,
    codes
  };
}

function buildTurboQuant(values, options = {}) {
  const normalizedInput = splitPayloadAndOptions(values, options);
  const quant = uniformQuantize(normalizedInput.payload, {
    ...normalizedInput.options,
    bits: normalizedInput.options.bits ?? (normalizedInput.options.levels ? Math.ceil(Math.log2(Number(normalizedInput.options.levels))) : undefined)
  });
  const dequantized = quant.codes.map((code) => roundNumber(quant.min + code * quant.scale));
  const result = {
    id: "turbo_quant",
    algorithm: "turbo-uniform-quant.v1",
    dimension: quant.codes.length,
    codes: quant.codes,
    quantized: quant.codes,
    quantized_values: quant.codes,
    dequantized,
    dequantized_values: dequantized,
    metadata: {
      bits: quant.bits,
      min: quant.min,
      max: quant.max,
      scale: quant.scale,
      zeroPoint: quant.zeroPoint,
      levels: quant.levels,
      maxCode: quant.maxCode
    }
  };
  return withSoftwareAuthority(result);
}

function quantizeUnitInterval(value, bits) {
  const levels = 2 ** bits - 1;
  return Math.min(levels, Math.max(0, Math.round(value * levels)));
}

function buildPolarQuant(values, options = {}) {
  const normalizedInput = splitPayloadAndOptions(values, options);
  const raw = toNumericArray(normalizedInput.payload);
  const radiusBits = quantBits(normalizedInput.options.radiusBits ?? normalizedInput.options.bits, 8);
  const angleBits = quantBits(normalizedInput.options.angleBits ?? normalizedInput.options.bits, 8);
  const radiusLevels = 2 ** radiusBits - 1;
  const angleLevels = 2 ** angleBits - 1;
  const pairs = [];
  const radii = [];

  for (let index = 0; index < raw.length; index += 2) {
    const x = raw[index] ?? 0;
    const y = raw[index + 1] ?? 0;
    const radius = Math.sqrt(x * x + y * y);
    radii.push(radius);
    pairs.push({ radius, angle: Math.atan2(y, x) < 0 ? Math.atan2(y, x) + Math.PI * 2 : Math.atan2(y, x) });
  }

  const maxRadius = Math.max(0, finiteNumber(normalizedInput.options.maxRadius, radii.length ? Math.max(...radii) : 0));
  const radiusScale = maxRadius === 0 ? 1 : maxRadius / radiusLevels;
  const rows = pairs.map((pair) => ({
    radius: roundNumber(pair.radius),
    angle: roundNumber(pair.angle),
    r: roundNumber(pair.radius),
    theta: roundNumber(pair.angle),
    code: [
      maxRadius === 0 ? 0 : Math.min(radiusLevels, Math.max(0, Math.round(pair.radius / radiusScale))),
      quantizeUnitInterval(pair.angle / (Math.PI * 2), angleBits)
    ]
  }));
  const result = {
    id: "polar_quant",
    algorithm: "polar-pair-quant.v1",
    dimension: raw.length,
    pairCount: pairs.length,
    codes: rows.map((row) => row.code),
    rows,
    pairs: rows,
    polar_rows: rows,
    metadata: {
      radiusBits,
      angleBits,
      maxRadius: roundNumber(maxRadius),
      radiusScale: roundNumber(radiusScale),
      angleScaleRadians: roundNumber((Math.PI * 2) / angleLevels),
      centers: {
        radius: "code * radiusScale",
        angleRadians: "code * angleScaleRadians"
      }
    }
  };
  return withSoftwareAuthority(result);
}

function buildTripleQuant(values, options = {}) {
  const normalizedInput = splitPayloadAndOptions(values, options);
  const raw = toNumericArray(normalizedInput.payload);
  const radiusBits = quantBits(normalizedInput.options.radiusBits ?? normalizedInput.options.bits, 8);
  const thetaBits = quantBits(normalizedInput.options.thetaBits ?? normalizedInput.options.bits, 8);
  const phiBits = quantBits(normalizedInput.options.phiBits ?? normalizedInput.options.bits, 8);
  const radiusLevels = 2 ** radiusBits - 1;
  const thetaLevels = 2 ** thetaBits - 1;
  const phiLevels = 2 ** phiBits - 1;
  const triples = [];
  const radii = [];

  for (let index = 0; index < raw.length; index += 3) {
    const x = raw[index] ?? 0;
    const y = raw[index + 1] ?? 0;
    const z = raw[index + 2] ?? 0;
    const radius = Math.sqrt(x * x + y * y + z * z);
    const theta = radius === 0 ? 0 : Math.acos(Math.min(1, Math.max(-1, z / radius)));
    const phiRaw = Math.atan2(y, x);
    const phi = phiRaw < 0 ? phiRaw + Math.PI * 2 : phiRaw;
    radii.push(radius);
    triples.push({ radius, theta, phi });
  }

  const maxRadius = Math.max(0, finiteNumber(normalizedInput.options.maxRadius, radii.length ? Math.max(...radii) : 0));
  const radiusScale = maxRadius === 0 ? 1 : maxRadius / radiusLevels;
  const codes = triples.map((triple) => [
    maxRadius === 0 ? 0 : Math.min(radiusLevels, Math.max(0, Math.round(triple.radius / radiusScale))),
    quantizeUnitInterval(triple.theta / Math.PI, thetaBits),
    quantizeUnitInterval(triple.phi / (Math.PI * 2), phiBits)
  ]);
  const levels = [
    { id: "coarse", name: "coarse", bits: Math.max(2, Math.min(4, radiusBits)), role: "fast_cpu_gpu_placement_hint" },
    { id: "medium", name: "medium", bits: Math.max(4, Math.min(8, radiusBits)), role: "balanced_receipt_transport" },
    { id: "fine", name: "fine", bits: radiusBits, role: "reviewable_fallback_precision" }
  ];
  const result = {
    id: "triple_quant",
    algorithm: "triple-spherical-quant.v1",
    dimension: raw.length,
    tripleCount: triples.length,
    codes,
    lanes: levels,
    levels,
    metadata: {
      radiusBits,
      thetaBits,
      phiBits,
      maxRadius: roundNumber(maxRadius),
      radiusScale: roundNumber(radiusScale),
      thetaScaleRadians: roundNumber(Math.PI / thetaLevels),
      phiScaleRadians: roundNumber((Math.PI * 2) / phiLevels),
      centers: {
        radius: "code * radiusScale",
        thetaRadians: "code * thetaScaleRadians",
        phiRadians: "code * phiScaleRadians"
      }
    }
  };
  return withSoftwareAuthority(result);
}

function reconstructTripleQuant(record = {}) {
  const codes = Array.isArray(record.codes) ? record.codes : [];
  const metadata = record.metadata || {};
  const radiusScale = finiteNumber(metadata.radiusScale, 1);
  const thetaScaleRadians = finiteNumber(metadata.thetaScaleRadians, Math.PI);
  const phiScaleRadians = finiteNumber(metadata.phiScaleRadians, Math.PI * 2);
  return codes.flatMap((code) => {
    const [radiusCode = 0, thetaCode = 0, phiCode = 0] = Array.isArray(code) ? code : [];
    const radius = finiteNumber(radiusCode, 0) * radiusScale;
    const theta = finiteNumber(thetaCode, 0) * thetaScaleRadians;
    const phi = finiteNumber(phiCode, 0) * phiScaleRadians;
    const sinTheta = Math.sin(theta);
    return [
      roundNumber(radius * sinTheta * Math.cos(phi)),
      roundNumber(radius * sinTheta * Math.sin(phi)),
      roundNumber(radius * Math.cos(theta))
    ];
  }).slice(0, positiveInteger(record.dimension, codes.length * 3, 0));
}

function buildRepresentationReceipt(payload, options = {}) {
  const seed = String(options.seed ?? "hyperbehcs-receipt-v1");
  const canonicalPayload = payload === undefined ? null : payload;
  const body = {
    receiptId: "hyperbehcs-representation-receipt.v1",
    descriptor_only: true,
    descriptorOnly: true,
    software_only: true,
    softwareOnly: true,
    seed,
    payloadFingerprint: fingerprint(canonicalPayload),
    authorityCounters: { ...ZERO_AUTHORITY_COUNTERS },
    authority_counters: { ...ZERO_AUTHORITY_COUNTERS },
    ...ZERO_AUTHORITY_COUNTERS
  };
  return { ...body, fingerprint: fingerprint(body) };
}

function buildRepresentationAlgorithmCatalog(options = {}) {
  const seed = String(options.seed ?? "hyperbehcs-catalog-v1");
  const sampleValues = Array.isArray(options.sampleValues) ? options.sampleValues : [1, -2, 3, 5, 8, -13];
  const algorithms = [
    {
      id: "normalize_numeric_vector",
      name: "normalizeNumericVector",
      contract: "numeric-vector-normalize-l2.v1",
      description: "Converts finite numeric inputs to a deterministic L2-normalized JSON vector."
    },
    {
      id: "johnson_lindenstrauss_projection",
      name: "buildJohnsonLindenstraussProjection",
      contract: "johnson-lindenstrauss-achlioptas-sparse.v1",
      description: "Uses sha256(seed|row|col) buckets for sparse Achlioptas projection weights."
    },
    {
      id: "turbo_quant",
      name: "buildTurboQuant",
      contract: "turbo-uniform-quant.v1",
      description: "Uniform scalar quantization with bits, min, max, scale, and zeroPoint metadata."
    },
    {
      id: "polar_quant",
      name: "buildPolarQuant",
      contract: "polar-pair-quant.v1",
      description: "Quantizes adjacent pairs into radius and angle codes."
    },
    {
      id: "triple_quant",
      name: "buildTripleQuant",
      contract: "triple-spherical-quant.v1",
      description: "Quantizes adjacent triples into radius, theta, and phi codes."
    },
    {
      name: "buildRepresentationReceipt",
      contract: "hyperbehcs-representation-receipt.v1",
      description: "Builds deterministic sha256-sliced receipt fingerprints without runtime authority."
    }
  ];
  const sampleFingerprints = {
    normalized: normalizeNumericVector(sampleValues).fingerprint,
    jl: buildJohnsonLindenstraussProjection(sampleValues, { seed }).fingerprint,
    turbo: buildTurboQuant(sampleValues, options).fingerprint,
    polar: buildPolarQuant(sampleValues, options).fingerprint,
    triple: buildTripleQuant(sampleValues, options).fingerprint
  };
  const catalog = {
    catalogId: CATALOG_ID,
    seed,
    dependencyPolicy: "node-builtins-only",
    authorityCounters: { ...ZERO_AUTHORITY_COUNTERS },
    authority_counters: { ...ZERO_AUTHORITY_COUNTERS },
    ...ZERO_AUTHORITY_COUNTERS,
    descriptor_only: true,
    software_only: true,
    backendTargets: [
      { id: "c_drive_asolaria", label: "C:/Users/acer/Asolaria", kind: "canonical_source_and_backend_planner", hardware_mutation_allowed: false },
      { id: "d_drive_behcs_gc", label: "D:/Asolaria-BEHCS-GC", kind: "evidence_spill_and_benchmark_artifacts", hardware_mutation_allowed: false },
      { id: "usb_sovlinux", label: "USB/SovLinux", kind: "portable_read_only_projection_target", hardware_mutation_allowed: false }
    ],
    algorithms,
    sampleFingerprints
  };
  return { ...catalog, fingerprint: fingerprint(catalog) };
}

module.exports = {
  normalizeNumericVector,
  buildJohnsonLindenstraussProjection,
  buildTurboQuant,
  buildPolarQuant,
  buildTripleQuant,
  reconstructTripleQuant,
  buildRepresentationReceipt,
  buildRepresentationAlgorithmCatalog
};
