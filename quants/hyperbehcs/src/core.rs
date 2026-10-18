//! hyperbehcs-core.cjs lines 1-213 and 239-249, statement by statement (cited as `core:<line>`).

use crate::fdlibm;
use crate::number::Number;
use crate::text::json_number;
use sha2::{Digest, Sha256};

/// `ZERO_COUNTERS` (core:5-22): sixteen fields, each `0`, spread into every packet.
pub const ZERO_COUNTERS: [&str; 16] = [
    "hardware_mutations",
    "cpu_affinity_changes",
    "gpu_kernel_launches",
    "gpu_driver_mutations",
    "remote_writes",
    "adb_actions",
    "scrcpy_actions",
    "device_file_writes",
    "route_mutations",
    "provider_calls",
    "mcp_tool_calls",
    "process_starts",
    "executor_executions",
    "cleanup_actions",
    "runtime_authority_grants",
    "production_promotions",
];

/// The `lanes` field of a triple packet (core:183).
pub const TRIPLE_LANES: [&str; 3] = ["coarse", "medium", "fine"];

/// The option fields the four quants read (`options.bits`, `.maxRadius`, `.targetDimension`,
/// `.seed`); `None` is an absent property. The served caller passes one object to all four
/// (omnicoder-server-v2.mjs:210-214).
#[derive(Clone, Copy, Debug, Default)]
pub struct Options<'a> {
    /// `options.bits` (core:94, 119, 154).
    pub bits: Option<Number>,
    /// `options.maxRadius` (core:131, 169).
    pub max_radius: Option<Number>,
    /// `options.targetDimension` (core:72).
    pub target_dimension: Option<Number>,
    /// `options.seed` as the string `String(options.seed)` gives (core:71).
    pub seed: Option<&'a str>,
}

/// `sha256(value)` (core:24-26) as lowercase hex.
pub fn sha256_hex(text: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let digest = Sha256::digest(text.as_bytes());
    let mut out = String::with_capacity(64);
    for b in digest {
        out.push(char::from(HEX[usize::from(b >> 4)]));
        out.push(char::from(HEX[usize::from(b & 15)]));
    }
    out
}

/// `sha16(value)` (core:28-30) of a packet whose `JSON.stringify` text is `preimage`.
pub fn sha16(preimage: &str) -> String {
    sha256_hex(preimage)[..16].to_string()
}

/// `round(value, places)` (core:32-36).
pub fn round(value: Number, places: u32) -> Number {
    if !value.is_finite() {
        return Number::ZERO;
    }
    let factor = Number::from_u64(10u64.pow(places));
    (value * factor).js_round() / factor
}

/// `finiteNumber(value, fallback)` (core:38-41) for a Number or an absent value.
pub fn finite_number(value: Option<Number>, fallback: Number) -> Number {
    match value {
        Some(v) if v.is_finite() => v,
        _ => fallback,
    }
}

/// `quantBits(value, fallback)` (core:43-46).
pub fn quant_bits(value: Option<Number>, fallback: Number) -> Number {
    let number = finite_number(value, fallback).js_round();
    Number::from_u64(24).js_min(Number::ONE.js_max(number))
}

/// `toVector(input)` (core:48-53) for an array of Numbers.
pub fn to_vector(values: &[Number]) -> Vec<Number> {
    values
        .iter()
        .map(|&v| finite_number(Some(v), Number::ZERO))
        .collect()
}

/// `normalizeVector(vector)` (core:55-59).
pub fn normalize_vector(vector: &[Number]) -> Vec<Number> {
    let raw = to_vector(vector);
    let sum = raw
        .iter()
        .fold(Number::ZERO, |sum, &value| sum + value * value);
    let norm = sum.sqrt();
    if norm.js_eq(Number::ZERO) {
        return raw.iter().map(|_| Number::ZERO).collect();
    }
    raw.iter().map(|&value| round(value / norm, 12)).collect()
}

/// `achlioptasWeight(seed, row, col)` (core:61-67): `+sqrt(3)`, `-sqrt(3)` or `0`.
pub fn achlioptas_weight(seed: &str, row: usize, col: usize) -> Number {
    let digest = Sha256::digest(format!("{seed}|{row}|{col}").as_bytes());
    // Number.parseInt(<first 12 hex digits>, 16): the first six digest bytes, big-endian.
    let head = digest[..6]
        .iter()
        .fold(0u64, |acc, &b| (acc << 8) | u64::from(b));
    match head % 6 {
        0 => Number::from_u64(3).sqrt(),
        1 => -Number::from_u64(3).sqrt(),
        _ => Number::ZERO,
    }
}

fn number_list(values: &[Number]) -> String {
    let items: Vec<String> = values.iter().map(|&v| json_number(v)).collect();
    format!("[{}]", items.join(","))
}

fn counters_json() -> String {
    let mut out = String::new();
    for k in ZERO_COUNTERS {
        out.push_str(",\"");
        out.push_str(k);
        out.push_str("\":0");
    }
    out
}

/// The `johnson-lindenstrauss-achlioptas-sparse.v1` packet (core:82-89).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JlPacket {
    /// `source_dimension`.
    pub source_dimension: usize,
    /// `target_dimension`.
    pub target_dimension: usize,
    /// `projection`.
    pub projection: Vec<Number>,
    /// `fingerprint`: `sha16` of the packet without it.
    pub fingerprint: String,
}

impl JlPacket {
    /// `algorithm`.
    pub const ALGORITHM: &'static str = "johnson-lindenstrauss-achlioptas-sparse.v1";

    /// The text `JSON.stringify(packet)` gives before `fingerprint` is added: the bytes upstream
    /// hashes for `fingerprint` (core:89).
    pub fn fingerprint_preimage(&self) -> String {
        format!(
            "{{\"algorithm\":\"{}\",\"source_dimension\":{},\"target_dimension\":{},\"projection\":{}{}}}",
            Self::ALGORITHM,
            self.source_dimension,
            self.target_dimension,
            number_list(&self.projection),
            counters_json()
        )
    }
}

/// `johnsonLindenstrauss(vector, options)` (core:69-90), registry slot 9.
pub fn johnson_lindenstrauss(vector: &[Number], options: &Options) -> JlPacket {
    let source = normalize_vector(vector);
    let seed = match options.seed {
        Some(s) if !s.is_empty() => s,
        _ => "hyperbehcs-local-jl",
    };
    let requested = match options.target_dimension {
        Some(t) if !t.is_nan() && !t.is_zero() => t,
        _ => {
            let n = Number::from_u64(source.len().max(1) as u64);
            (n.sqrt() * Number::from_u64(2)).ceil()
        }
    };
    let target = Number::ONE.js_max(Number::from_u64(4096).js_min(requested.js_round()));
    let target_dimension = target.trunc_i64() as usize;
    let scale = Number::ONE / target.sqrt();
    let mut projection = Vec::with_capacity(target_dimension);
    for row in 0..target_dimension {
        let mut sum = Number::ZERO;
        for (col, &value) in source.iter().enumerate() {
            sum = sum + achlioptas_weight(seed, row, col) * value;
        }
        projection.push(round(sum * scale, 12));
    }
    let mut packet = JlPacket {
        source_dimension: source.len(),
        target_dimension,
        projection,
        fingerprint: String::new(),
    };
    packet.fingerprint = sha16(&packet.fingerprint_preimage());
    packet
}

/// `metadata` of a turbo packet (core:104-111).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TurboMetadata {
    /// `bits`.
    pub bits: Number,
    /// `min`: `round(min, 12)`.
    pub min: Number,
    /// `max`: `round(max, 12)`.
    pub max: Number,
    /// `scale`: `round(scale, 12)`.
    pub scale: Number,
    /// `levels`: `maxCode + 1`.
    pub levels: Number,
    /// `maxCode`: `2 ** bits - 1`.
    pub max_code: Number,
}

/// The `turbo-uniform-quant.v1` packet (core:100-114).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TurboPacket {
    /// `dimension`.
    pub dimension: usize,
    /// `codes`, one per input value.
    pub codes: Vec<Number>,
    /// `metadata`.
    pub metadata: TurboMetadata,
    /// `fingerprint`: `sha16` of the packet without it.
    pub fingerprint: String,
}

impl TurboPacket {
    /// `algorithm`.
    pub const ALGORITHM: &'static str = "turbo-uniform-quant.v1";

    /// The text `JSON.stringify(packet)` gives before `fingerprint` is added (core:114).
    pub fn fingerprint_preimage(&self) -> String {
        let m = &self.metadata;
        format!(
            "{{\"algorithm\":\"{}\",\"dimension\":{},\"codes\":{},\"metadata\":{{\"bits\":{},\"min\":{},\"max\":{},\"scale\":{},\"levels\":{},\"maxCode\":{}}}{}}}",
            Self::ALGORITHM,
            self.dimension,
            number_list(&self.codes),
            json_number(m.bits),
            json_number(m.min),
            json_number(m.max),
            json_number(m.scale),
            json_number(m.levels),
            json_number(m.max_code),
            counters_json()
        )
    }
}

fn pow2_minus_one(bits: Number) -> Number {
    // `2 ** bits - 1` for bits in 1..=24 (quantBits clamps): exact.
    Number::from_u64((1u64 << bits.trunc_i64()) - 1)
}

/// `turboQuant(vector, options)` (core:92-115), registry slot 10.
pub fn turbo_quant(vector: &[Number], options: &Options) -> TurboPacket {
    let raw = to_vector(vector);
    let bits = quant_bits(options.bits, Number::from_u64(8));
    let max_code = pow2_minus_one(bits);
    let (min, max) = if raw.is_empty() {
        (Number::ZERO, Number::ZERO)
    } else {
        (Number::min_of(&raw), Number::max_of(&raw))
    };
    let flat = max.js_eq(min);
    let scale = if flat {
        Number::ONE
    } else {
        (max - min) / max_code
    };
    let codes = raw
        .iter()
        .map(|&value| {
            if flat {
                Number::ZERO
            } else {
                max_code.js_min(Number::ZERO.js_max(((value - min) / scale).js_round()))
            }
        })
        .collect();
    let mut packet = TurboPacket {
        dimension: raw.len(),
        codes,
        metadata: TurboMetadata {
            bits,
            min: round(min, 12),
            max: round(max, 12),
            scale: round(scale, 12),
            levels: max_code + Number::ONE,
            max_code,
        },
        fingerprint: String::new(),
    };
    packet.fingerprint = sha16(&packet.fingerprint_preimage());
    packet
}

/// `metadata` of a polar packet (core:141-146).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PolarMetadata {
    /// `bits`.
    pub bits: Number,
    /// `maxRadius`: `round(maxRadius, 12)`.
    pub max_radius: Number,
    /// `radiusScale`: `round(radiusScale, 12)`.
    pub radius_scale: Number,
    /// `angleScaleRadians`: `round(2 * PI / levels, 12)`.
    pub angle_scale_radians: Number,
}

/// The `polar-pair-quant.v1` packet (core:137-149).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolarPacket {
    /// `dimension`.
    pub dimension: usize,
    /// `codes`: `[radius code, angle code]` per input pair.
    pub codes: Vec<[Number; 2]>,
    /// `metadata`.
    pub metadata: PolarMetadata,
    /// `fingerprint`: `sha16` of the packet without it.
    pub fingerprint: String,
}

impl PolarPacket {
    /// `algorithm`.
    pub const ALGORITHM: &'static str = "polar-pair-quant.v1";

    /// The text `JSON.stringify(packet)` gives before `fingerprint` is added (core:149).
    pub fn fingerprint_preimage(&self) -> String {
        let m = &self.metadata;
        let codes: Vec<String> = self.codes.iter().map(|c| number_list(c)).collect();
        format!(
            "{{\"algorithm\":\"{}\",\"dimension\":{},\"codes\":[{}],\"metadata\":{{\"bits\":{},\"maxRadius\":{},\"radiusScale\":{},\"angleScaleRadians\":{}}}{}}}",
            Self::ALGORITHM,
            self.dimension,
            codes.join(","),
            json_number(m.bits),
            json_number(m.max_radius),
            json_number(m.radius_scale),
            json_number(m.angle_scale_radians),
            counters_json()
        )
    }
}

fn two_pi() -> Number {
    Number::PI * Number::from_u64(2)
}

/// `Math.min(levels, Math.max(0, Math.round(x)))`.
fn clamp_code(x: Number, levels: Number) -> Number {
    levels.js_min(Number::ZERO.js_max(x.js_round()))
}

/// `Math.max(0, finiteNumber(options.maxRadius, radii.length ? Math.max(...radii) : 0))`.
fn max_radius(options: &Options, radii: &[Number]) -> Number {
    let fallback = if radii.is_empty() {
        Number::ZERO
    } else {
        Number::max_of(radii)
    };
    Number::ZERO.js_max(finite_number(options.max_radius, fallback))
}

/// `polarQuant(vector, options)` (core:117-150), registry slot 11.
pub fn polar_quant(vector: &[Number], options: &Options) -> PolarPacket {
    let raw = to_vector(vector);
    let bits = quant_bits(options.bits, Number::from_u64(8));
    let levels = pow2_minus_one(bits);
    let at = |i: usize| raw.get(i).copied().unwrap_or(Number::ZERO).or_zero();
    let mut pairs = Vec::with_capacity(raw.len().div_ceil(2));
    for index in (0..raw.len()).step_by(2) {
        let x = at(index);
        let y = at(index + 1);
        let radius = (x * x + y * y).sqrt();
        // core:127 evaluates Math.atan2(y, x) up to three times; each call returns the same value.
        let atan = fdlibm::atan2(y, x);
        let angle = if atan.lt(Number::ZERO) {
            atan + two_pi()
        } else {
            atan
        };
        pairs.push((radius, angle));
    }
    let radii: Vec<Number> = pairs.iter().map(|p| p.0).collect();
    let max_radius = max_radius(options, &radii);
    let zero_radius = max_radius.js_eq(Number::ZERO);
    let radius_scale = if zero_radius {
        Number::ONE
    } else {
        max_radius / levels
    };
    let codes = pairs
        .iter()
        .map(|&(radius, angle)| {
            [
                if zero_radius {
                    Number::ZERO
                } else {
                    clamp_code(radius / radius_scale, levels)
                },
                clamp_code((angle / two_pi()) * levels, levels),
            ]
        })
        .collect();
    let mut packet = PolarPacket {
        dimension: raw.len(),
        codes,
        metadata: PolarMetadata {
            bits,
            max_radius: round(max_radius, 12),
            radius_scale: round(radius_scale, 12),
            angle_scale_radians: round(two_pi() / levels, 12),
        },
        fingerprint: String::new(),
    };
    packet.fingerprint = sha16(&packet.fingerprint_preimage());
    packet
}

/// `metadata` of a triple packet (core:184-190).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TripleMetadata {
    /// `bits`.
    pub bits: Number,
    /// `maxRadius`: `round(maxRadius, 12)`.
    pub max_radius: Number,
    /// `radiusScale`: `round(radiusScale, 12)`.
    pub radius_scale: Number,
    /// `thetaScaleRadians`: `round(PI / levels, 12)`.
    pub theta_scale_radians: Number,
    /// `phiScaleRadians`: `round(2 * PI / levels, 12)`.
    pub phi_scale_radians: Number,
}

/// The `triple-spherical-quant.v1` packet (core:178-193).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TriplePacket {
    /// `dimension`.
    pub dimension: usize,
    /// `codes`: `[radius code, theta code, phi code]` per input triple.
    pub codes: Vec<[Number; 3]>,
    /// `metadata`.
    pub metadata: TripleMetadata,
    /// `fingerprint`: `sha16` of the packet without it.
    pub fingerprint: String,
}

impl TriplePacket {
    /// `algorithm`.
    pub const ALGORITHM: &'static str = "triple-spherical-quant.v1";

    /// `codes_flat`: `codes.flat()` (core:182).
    pub fn codes_flat(&self) -> Vec<Number> {
        self.codes.iter().flatten().copied().collect()
    }

    /// The text `JSON.stringify(packet)` gives before `fingerprint` is added (core:193).
    pub fn fingerprint_preimage(&self) -> String {
        let m = &self.metadata;
        let codes: Vec<String> = self.codes.iter().map(|c| number_list(c)).collect();
        let lanes: Vec<String> = TRIPLE_LANES.iter().map(|l| format!("\"{l}\"")).collect();
        format!(
            "{{\"algorithm\":\"{}\",\"dimension\":{},\"codes\":[{}],\"codes_flat\":{},\"lanes\":[{}],\"metadata\":{{\"bits\":{},\"maxRadius\":{},\"radiusScale\":{},\"thetaScaleRadians\":{},\"phiScaleRadians\":{}}}{}}}",
            Self::ALGORITHM,
            self.dimension,
            codes.join(","),
            number_list(&self.codes_flat()),
            lanes.join(","),
            json_number(m.bits),
            json_number(m.max_radius),
            json_number(m.radius_scale),
            json_number(m.theta_scale_radians),
            json_number(m.phi_scale_radians),
            counters_json()
        )
    }
}

/// `tripleQuant(vector, options)` (core:152-194), registry slot 12.
pub fn triple_quant(vector: &[Number], options: &Options) -> TriplePacket {
    let raw = to_vector(vector);
    let bits = quant_bits(options.bits, Number::from_u64(8));
    let levels = pow2_minus_one(bits);
    let at = |i: usize| raw.get(i).copied().unwrap_or(Number::ZERO).or_zero();
    let mut triples = Vec::with_capacity(raw.len().div_ceil(3));
    for index in (0..raw.len()).step_by(3) {
        let x = at(index);
        let y = at(index + 1);
        let z = at(index + 2);
        let radius = (x * x + y * y + z * z).sqrt();
        let theta = if radius.js_eq(Number::ZERO) {
            Number::ZERO
        } else {
            fdlibm::acos(Number::ONE.js_min((-Number::ONE).js_max(z / radius)))
        };
        let phi_raw = fdlibm::atan2(y, x);
        let phi = if phi_raw.lt(Number::ZERO) {
            phi_raw + two_pi()
        } else {
            phi_raw
        };
        triples.push((radius, theta, phi));
    }
    let radii: Vec<Number> = triples.iter().map(|t| t.0).collect();
    let max_radius = max_radius(options, &radii);
    let zero_radius = max_radius.js_eq(Number::ZERO);
    let radius_scale = if zero_radius {
        Number::ONE
    } else {
        max_radius / levels
    };
    let theta_scale = Number::PI / levels;
    let phi_scale = two_pi() / levels;
    let codes = triples
        .iter()
        .map(|&(radius, theta, phi)| {
            [
                if zero_radius {
                    Number::ZERO
                } else {
                    clamp_code(radius / radius_scale, levels)
                },
                clamp_code((theta / Number::PI) * levels, levels),
                clamp_code((phi / two_pi()) * levels, levels),
            ]
        })
        .collect();
    let mut packet = TriplePacket {
        dimension: raw.len(),
        codes,
        metadata: TripleMetadata {
            bits,
            max_radius: round(max_radius, 12),
            radius_scale: round(radius_scale, 12),
            theta_scale_radians: round(theta_scale, 12),
            phi_scale_radians: round(phi_scale, 12),
        },
        fingerprint: String::new(),
    };
    packet.fingerprint = sha16(&packet.fingerprint_preimage());
    packet
}

/// `reconstructTriple(packet)` (core:196-213): Cartesian values back from the codes and the
/// rounded metadata scales.
pub fn reconstruct_triple(packet: &TriplePacket) -> Vec<Number> {
    let m = &packet.metadata;
    let radius_scale = finite_number(Some(m.radius_scale), Number::ONE);
    let theta_scale = finite_number(Some(m.theta_scale_radians), Number::PI);
    let phi_scale = finite_number(Some(m.phi_scale_radians), two_pi());
    let mut out = Vec::with_capacity(packet.codes.len() * 3);
    for &[r, t, p] in &packet.codes {
        let radius = finite_number(Some(r), Number::ZERO) * radius_scale;
        let theta = finite_number(Some(t), Number::ZERO) * theta_scale;
        let phi = finite_number(Some(p), Number::ZERO) * phi_scale;
        let sin_theta = fdlibm::sin(theta);
        out.push(round(radius * sin_theta * fdlibm::cos(phi), 12));
        out.push(round(radius * sin_theta * fdlibm::sin(phi), 12));
        out.push(round(radius * fdlibm::cos(theta), 12));
    }
    let keep = if packet.dimension == 0 {
        packet.codes.len() * 3
    } else {
        packet.dimension
    };
    out.truncate(keep);
    out
}

/// `vectorFromText(text, dimension)` (core:239-249).
pub fn vector_from_text(text: &str, dimension: usize) -> Vec<Number> {
    let source = if text.is_empty() {
        "hyperbehcs-empty-source"
    } else {
        text
    };
    let bytes = source.as_bytes();
    let safe_length = bytes.len().max(1);
    let byte = |i: usize| Number::from_u64(u64::from(bytes[i % safe_length]));
    let n = |v: u64| Number::from_u64(v);
    (0..dimension)
        .map(|index| {
            let a = byte(index * 17);
            let b = byte(index * 31 + 7);
            let c = byte(index * 47 + 13);
            // b % 29 and c % 11 on byte values are exact integers.
            let b_mod = n(b.trunc_i64() as u64 % 29);
            let c_mod = n(c.trunc_i64() as u64 % 11);
            let value = (a - n(128)) / n(32) + (b_mod - n(14)) / n(64) + (c_mod - n(5)) / n(128);
            round(value, 6)
        })
        .collect()
}
