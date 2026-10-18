//! Integrated four-floor Omega archive container (isolated v0 assembly).
//!
//! This file implements the exact AOCWM001 + STG1 grammar, the four nested
//! floors, all 40 catalog operators at every floor, deterministic per-floor
//! languages, family and combined Omega commitments, and strict reverse
//! replay.  RAW and a strictly-causal fixed-width Path-3 residual hook are
//! executable.  MODE_PATH123 is deliberately rejected until the separately
//! reviewed Path 1/2/3 module is wired; therefore this source does not claim
//! the integrated Whole-Monty gate has passed.

use std::convert::TryInto;
use std::env;
use std::fs;
use std::io;
use std::path::Path;
use std::sync::OnceLock;

#[path = "../omega-operator-catalog-v0/omega_operator_catalog.rs"]
mod operator_catalog;

use operator_catalog::{apply_symbols, Family, OPERATORS, OPERATOR_COUNT};

type AppResult<T> = Result<T, String>;

const FILE_MAGIC: &[u8; 8] = b"AOCWM001";
const STAGE_MAGIC: &[u8; 4] = b"STG1";
const FILE_VERSION: u16 = 1;
const FILE_HEADER_LEN: usize = 92;
const STAGE_FIXED_LEN: usize = 108;
const FILE_FLAGS: u8 = 0;
const RESET_INTERVAL: usize = 256;

const MODE_RAW: u8 = 0;
const MODE_PATH3_HOOK: u8 = 3;
const MODE_PATH123: u8 = 4;

const CONTROL_UNIQUE: u8 = 0;
const CONTROL_DUPLICATE: u8 = 1;
const CONTROL_SHUFFLE: u8 = 2;
const CONTROL_RESET: u8 = 3;
const CONTROL_PERSISTENT: u8 = 4;

const CONTRACT_SHA_HEX: &str =
    "b2cb1a7e17eccf279021a22ca570a39bc18d2498f3babefb91343568121733bc";
const OPERATOR_SOURCE_SHA_HEX: &str =
    "883ca7ec964e609933c3cb9ac71d1f9fb02ade9f314f7902d0c0547dd3da6e1b";
const CORE_SOURCE_SHA_HEX: &str =
    "47dcf2f9f617f46fd8181257123f878b1fbf6cf8d7ec41119d27ea523bc64b08";

const OPERATOR_SOURCE: &[u8] =
    include_bytes!("../omega-operator-catalog-v0/omega_operator_catalog.rs");
const CORE_SOURCE: &[u8] = include_bytes!("../omega-floor-codec-v0/omega_floor_codec_v0.rs");
const CONTRACT_SOURCE: &[u8] = include_bytes!(
    "../omega-floor-codec-contract-v0/INTEGRATED-OMEGA-FLOOR-CODEC-CONTRACT.hbp"
);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Floor {
    id: u8,
    bits: u8,
    step: u8,
    label: u16,
}

const FLOORS: [Floor; 4] = [
    Floor { id: 0, bits: 6, step: 2, label: 64 },
    Floor { id: 1, bits: 8, step: 4, label: 256 },
    Floor { id: 2, bits: 10, step: 8, label: 1024 },
    Floor { id: 3, bits: 12, step: 16, label: 4096 },
];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Mode {
    Raw,
    Path3Hook,
    Path123,
}

impl Mode {
    fn code(self) -> u8 {
        match self {
            Self::Raw => MODE_RAW,
            Self::Path3Hook => MODE_PATH3_HOOK,
            Self::Path123 => MODE_PATH123,
        }
    }

    fn parse(code: u8) -> AppResult<Self> {
        match code {
            MODE_RAW => Ok(Self::Raw),
            MODE_PATH3_HOOK => Ok(Self::Path3Hook),
            MODE_PATH123 => Ok(Self::Path123),
            _ => Err(format!("unknown stage mode {code}")),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Raw => "RAW",
            Self::Path3Hook => "PATH3_HOOK_FIXEDWIDTH",
            Self::Path123 => "PATH123_PENDING_MODULE",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Control {
    Unique,
    DuplicateSharedState,
    ShufflePriorHistory,
    Reset,
    Persistent,
}

impl Control {
    fn code(self) -> u8 {
        match self {
            Self::Unique => CONTROL_UNIQUE,
            Self::DuplicateSharedState => CONTROL_DUPLICATE,
            Self::ShufflePriorHistory => CONTROL_SHUFFLE,
            Self::Reset => CONTROL_RESET,
            Self::Persistent => CONTROL_PERSISTENT,
        }
    }

    fn parse(code: u8) -> AppResult<Self> {
        match code {
            CONTROL_UNIQUE => Ok(Self::Unique),
            CONTROL_DUPLICATE => Ok(Self::DuplicateSharedState),
            CONTROL_SHUFFLE => Ok(Self::ShufflePriorHistory),
            CONTROL_RESET => Ok(Self::Reset),
            CONTROL_PERSISTENT => Ok(Self::Persistent),
            _ => Err(format!("unknown stage control {code}")),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Unique => "UNIQUE_40",
            Self::DuplicateSharedState => "DUPLICATE_SHARED_STATE",
            Self::ShufflePriorHistory => "SHUFFLE_DETERMINISTIC_PRIOR_HISTORY",
            Self::Reset => "RESET",
            Self::Persistent => "PERSISTENT_WITHIN_STAGE",
        }
    }
}

#[derive(Clone, Debug)]
struct StageHeader {
    floor: Floor,
    mode: Mode,
    control: Control,
    pass_count: u64,
    decoded_len: usize,
    payload_len: usize,
    seed_omega: [u8; 32],
    decoded_sha: [u8; 32],
    model_len: usize,
}

#[derive(Clone, Debug)]
struct FloorOmega {
    cube8: [u8; 32],
    tri12: [u8; 32],
    pi20: [u8; 32],
    combined: [u8; 32],
    catalog_sha: [u8; 32],
    direction_digests: [[u8; 32]; OPERATOR_COUNT],
}

#[derive(Clone, Debug)]
struct StageResult {
    decoded: Vec<u8>,
    header: StageHeader,
    omega: FloorOmega,
}

#[derive(Clone, Debug)]
struct FileHeader {
    flags: u8,
    original_len: usize,
    original_sha: [u8; 32],
    omega4096: [u8; 32],
    outer_len: usize,
}

#[derive(Clone, Debug)]
struct DecodeReport {
    original_len: usize,
    original_sha: [u8; 32],
    archive_len: usize,
    archive_sha: [u8; 32],
    model_bytes_in_archive: usize,
    stages_outer_to_inner: Vec<FloorOmega>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Codebook {
    multiplier: u16,
    offset: u16,
    digest: [u8; 32],
}

#[derive(Clone, Debug)]
struct ExpertBank {
    weights: [u16; OPERATOR_COUNT],
    exact_hits: [u64; OPERATOR_COUNT],
    observations: [u64; OPERATOR_COUNT],
}

impl ExpertBank {
    fn new() -> Self {
        Self {
            weights: [1; OPERATOR_COUNT],
            exact_hits: [0; OPERATOR_COUNT],
            observations: [0; OPERATOR_COUNT],
        }
    }

    fn predict(
        &self,
        history: &[u16],
        position: usize,
        floor: Floor,
        seed: &[u8; 32],
        control: Control,
        codebooks: &[Codebook; OPERATOR_COUNT],
    ) -> AppResult<(u16, [u16; OPERATOR_COUNT])> {
        let mut candidates = [0u16; OPERATOR_COUNT];
        if history.is_empty() {
            return Ok((0, candidates));
        }
        let base_start = history.len().saturating_sub(20);
        let mut base = history[base_start..].to_vec();
        if control == Control::ShufflePriorHistory {
            deterministic_shuffle(&mut base, seed, floor, position);
        }
        let mask = (1u16 << floor.bits) - 1;
        let mut weighted_sum = 0u64;
        let mut weight_total = 0u64;
        let effective: Vec<usize> = if control == Control::DuplicateSharedState {
            vec![0]
        } else {
            (0..OPERATOR_COUNT).collect()
        };
        for operator in effective.iter().copied() {
            let view = apply_canonical_window(operator as u8, floor.bits, &base)?;
            let raw = view[(position.wrapping_add(operator)) % view.len()];
            let book = if control == Control::DuplicateSharedState {
                codebooks[0]
            } else {
                codebooks[operator]
            };
            let candidate = affine_encode(raw, book, mask);
            candidates[operator] = candidate;
            let weight_index = if control == Control::DuplicateSharedState { 0 } else { operator };
            let weight = self.weights[weight_index] as u64;
            let contribution = (candidate as u64).checked_mul(weight)
                .ok_or_else(|| "expert contribution overflow".to_string())?;
            weighted_sum = weighted_sum
                .checked_add(contribution)
                .ok_or_else(|| "expert weighted sum overflow".to_string())?;
            weight_total = weight_total
                .checked_add(weight)
                .ok_or_else(|| "expert weight total overflow".to_string())?;
        }
        if weight_total == 0 {
            return Err("empty expert weight total".into());
        }
        Ok((((weighted_sum + weight_total / 2) / weight_total) as u16 & mask, candidates))
    }

    fn update(&mut self, actual: u16, candidates: &[u16; OPERATOR_COUNT], control: Control) {
        let effective: Vec<usize> = if control == Control::DuplicateSharedState {
            vec![0]
        } else {
            (0..OPERATOR_COUNT).collect()
        };
        for operator in effective {
            let state = if control == Control::DuplicateSharedState { 0 } else { operator };
            self.observations[state] = self.observations[state].saturating_add(1);
            if candidates[operator] == actual {
                self.exact_hits[state] = self.exact_hits[state].saturating_add(1);
                self.weights[state] = self.weights[state].saturating_add(3).min(32_767);
            } else {
                self.weights[state] = self.weights[state].saturating_sub(1).max(1);
            }
        }
    }
}

fn floor_for_id(id: u8) -> AppResult<Floor> {
    FLOORS
        .iter()
        .copied()
        .find(|floor| floor.id == id)
        .ok_or_else(|| format!("unknown floor id {id}"))
}

fn floor_for_bits(bits: u8) -> AppResult<Floor> {
    FLOORS
        .iter()
        .copied()
        .find(|floor| floor.bits == bits)
        .ok_or_else(|| format!("unknown floor width {bits}"))
}

fn family_code(family: Family) -> u8 {
    match family {
        Family::RnqC2xC2xC2 => 8,
        Family::SectorCyclic => 12,
        Family::RadialLens => 20,
    }
}

fn parse_pinned_hash(hex_text: &str) -> [u8; 32] {
    let bytes = hex_text.as_bytes();
    assert_eq!(bytes.len(), 64);
    let mut output = [0u8; 32];
    for index in 0..32 {
        output[index] = (hex_nibble(bytes[index * 2]) << 4) | hex_nibble(bytes[index * 2 + 1]);
    }
    output
}

fn hex_nibble(value: u8) -> u8 {
    match value {
        b'0'..=b'9' => value - b'0',
        b'a'..=b'f' => value - b'a' + 10,
        b'A'..=b'F' => value - b'A' + 10,
        _ => panic!("invalid compiled hex digit"),
    }
}

fn provenance_hashes() -> ([u8; 32], [u8; 32], [u8; 32]) {
    (
        parse_pinned_hash(CONTRACT_SHA_HEX),
        parse_pinned_hash(OPERATOR_SOURCE_SHA_HEX),
        parse_pinned_hash(CORE_SOURCE_SHA_HEX),
    )
}

fn genesis_omega() -> [u8; 32] {
    let (contract, catalog, core) = provenance_hashes();
    domain_hash(
        b"AOC-FLOOR-GENESIS-V1",
        &[&contract, &catalog, &core],
    )
}

fn canonical_catalog_sha() -> [u8; 32] {
    let mut rows = Vec::new();
    for spec in OPERATORS {
        rows.push(spec.id);
        rows.push(spec.inverse_id);
        rows.push(family_code(spec.family));
        put_u64(&mut rows, spec.name.len() as u64);
        rows.extend_from_slice(spec.name.as_bytes());
    }
    domain_hash(b"AOC-OPERATOR-CATALOG-V1", &[&rows])
}

fn build_model_blob(mode: Mode) -> Vec<u8> {
    let (contract, catalog, core) = provenance_hashes();
    let mut output = Vec::with_capacity(104);
    output.extend_from_slice(b"MDL1");
    output.push(1);
    output.push(mode.code());
    output.extend_from_slice(&[0, 0]);
    output.extend_from_slice(&contract);
    output.extend_from_slice(&catalog);
    output.extend_from_slice(&core);
    output
}

fn validate_model_blob(bytes: &[u8], mode: Mode) -> AppResult<()> {
    if bytes.len() != 104 {
        return Err(format!("model blob length mismatch: {}", bytes.len()));
    }
    if &bytes[..4] != b"MDL1" || bytes[4] != 1 || bytes[5] != mode.code() {
        return Err("model blob identity mismatch".into());
    }
    if bytes[6..8].iter().any(|value| *value != 0) {
        return Err("model blob reserved bytes are nonzero".into());
    }
    let (contract, catalog, core) = provenance_hashes();
    if bytes[8..40] != contract || bytes[40..72] != catalog || bytes[72..104] != core {
        return Err("model blob provenance commitment mismatch".into());
    }
    Ok(())
}

fn derive_codebooks(seed: &[u8; 32], floor: Floor) -> AppResult<[Codebook; OPERATOR_COUNT]> {
    let mut result = [Codebook { multiplier: 1, offset: 0, digest: [0; 32] }; OPERATOR_COUNT];
    let mut seen = Vec::<(u16, u16)>::new();
    let mask = (1u16 << floor.bits) - 1;
    for spec in OPERATORS {
        let family = [family_code(spec.family)];
        let operator = [spec.id];
        let floor_fields = [floor.id, floor.bits, floor.step];
        let mut nonce = 0u32;
        let (multiplier, offset, digest) = loop {
            let nonce_bytes = nonce.to_le_bytes();
            let digest = domain_hash(
                b"LANGUAGE_GENESIS_V2",
                &[seed, &floor_fields, &family, &operator, &nonce_bytes],
            );
            let multiplier = (u16::from_le_bytes([digest[0], digest[1]]) | 1) & mask;
            let multiplier = if multiplier == 0 { 1 } else { multiplier };
            let offset = u16::from_le_bytes([digest[2], digest[3]]) & mask;
            if !seen.contains(&(multiplier, offset)) {
                break (multiplier, offset, digest);
            }
            nonce = nonce.checked_add(1).ok_or_else(|| "codebook nonce overflow".to_string())?;
        };
        seen.push((multiplier, offset));
        result[spec.id as usize] = Codebook { multiplier, offset, digest };
    }
    if seen.len() != OPERATOR_COUNT {
        return Err("codebook distinctness gate failed".into());
    }
    Ok(result)
}

fn affine_encode(value: u16, codebook: Codebook, mask: u16) -> u16 {
    value.wrapping_mul(codebook.multiplier).wrapping_add(codebook.offset) & mask
}

fn deterministic_shuffle(values: &mut [u16], seed: &[u8; 32], floor: Floor, position: usize) {
    if values.len() < 2 {
        return;
    }
    let mut state = u64::from_le_bytes(seed[..8].try_into().unwrap())
        ^ (floor.label as u64).rotate_left(17)
        ^ (position as u64).rotate_left(31);
    for index in (1..values.len()).rev() {
        state = mix64(state.wrapping_add(index as u64));
        values.swap(index, state as usize % (index + 1));
    }
}

/// Derive and cache TRI12/PI20 position maps by invoking the reviewed catalog
/// itself on canonical identity vectors. RNQ changes symbol values, so those
/// eight operators continue to call the catalog on every causal window.
fn apply_canonical_window(id: u8, bits: u8, input: &[u16]) -> AppResult<Vec<u16>> {
    if id < 8 {
        return apply_symbols(id, bits, input).map_err(|error| error.to_string());
    }
    static MAPS: OnceLock<[[[u8; 20]; 21]; OPERATOR_COUNT]> = OnceLock::new();
    let maps = MAPS.get_or_init(|| {
        let mut output = [[[0u8; 20]; 21]; OPERATOR_COUNT];
        for operator in 8..OPERATOR_COUNT {
            for length in 1..=20 {
                let identity = (0..length).map(|value| value as u16).collect::<Vec<_>>();
                let view = apply_symbols(operator as u8, 12, &identity)
                    .expect("reviewed catalog accepts canonical identity vector");
                for (position, source_index) in view.into_iter().enumerate() {
                    output[operator][length][position] = source_index as u8;
                }
            }
        }
        output
    });
    if input.len() > 20 {
        return Err("causal operator window exceeds 20 symbols".into());
    }
    Ok((0..input.len())
        .map(|position| input[maps[id as usize][input.len()][position] as usize])
        .collect())
}

fn mix64(mut value: u64) -> u64 {
    value ^= value >> 30;
    value = value.wrapping_mul(0xbf58_476d_1ce4_e5b9);
    value ^= value >> 27;
    value = value.wrapping_mul(0x94d0_49bb_1331_11eb);
    value ^ (value >> 31)
}

struct FixedBitWriter {
    bytes: Vec<u8>,
    current: u8,
    used: u8,
}

impl FixedBitWriter {
    fn new() -> Self {
        Self { bytes: Vec::new(), current: 0, used: 0 }
    }

    fn write_value(&mut self, value: u16, width: u8) {
        for shift in (0..width).rev() {
            self.current = (self.current << 1) | ((value >> shift) as u8 & 1);
            self.used += 1;
            if self.used == 8 {
                self.bytes.push(self.current);
                self.current = 0;
                self.used = 0;
            }
        }
    }

    fn finish(mut self) -> Vec<u8> {
        if self.used != 0 {
            self.current <<= 8 - self.used;
            self.bytes.push(self.current);
        }
        self.bytes
    }
}

struct FixedBitReader<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> FixedBitReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    fn read_value(&mut self, width: u8) -> AppResult<u16> {
        let end = self.position.checked_add(width as usize)
            .ok_or_else(|| "bit position overflow".to_string())?;
        let total_bits = self.bytes.len().checked_mul(8)
            .ok_or_else(|| "fixed-width input bit length overflow".to_string())?;
        if end > total_bits {
            return Err("truncated fixed-width residual".into());
        }
        let mut value = 0u16;
        for _ in 0..width {
            let byte = self.bytes[self.position / 8];
            let bit = (byte >> (7 - (self.position % 8))) & 1;
            self.position += 1;
            value = (value << 1) | bit as u16;
        }
        Ok(value)
    }

    fn validate_zero_padding(&self) -> AppResult<()> {
        let total_bits = self.bytes.len().checked_mul(8)
            .ok_or_else(|| "fixed-width padding length overflow".to_string())?;
        for position in self.position..total_bits {
            let bit = (self.bytes[position / 8] >> (7 - (position % 8))) & 1;
            if bit != 0 {
                return Err("nonzero fixed-width padding".into());
            }
        }
        Ok(())
    }
}

fn bytes_to_symbols(bytes: &[u8], bits: u8) -> AppResult<Vec<u16>> {
    if bytes.is_empty() {
        return Ok(Vec::new());
    }
    let bit_count = bytes.len().checked_mul(8)
        .ok_or_else(|| "byte-to-symbol bit length overflow".to_string())?;
    let symbol_count = bit_count.checked_add(bits as usize - 1)
        .ok_or_else(|| "byte-to-symbol ceiling overflow".to_string())? / bits as usize;
    let mut output = Vec::with_capacity(symbol_count);
    for symbol_index in 0..symbol_count {
        let mut value = 0u16;
        for offset in 0..bits as usize {
            let position = symbol_index * bits as usize + offset;
            let bit = if position < bit_count {
                (bytes[position / 8] >> (7 - (position % 8))) & 1
            } else {
                0
            };
            value = (value << 1) | bit as u16;
        }
        output.push(value);
    }
    Ok(output)
}

fn symbols_to_bytes(symbols: &[u16], bits: u8, decoded_len: usize) -> AppResult<Vec<u8>> {
    let required_bits = decoded_len.checked_mul(8).ok_or_else(|| "decoded bit length overflow".to_string())?;
    let supplied_bits = symbols.len().checked_mul(bits as usize)
        .ok_or_else(|| "symbol bit length overflow".to_string())?;
    if supplied_bits < required_bits || supplied_bits.saturating_sub(required_bits) >= bits as usize {
        return Err("noncanonical symbol count for decoded length".into());
    }
    let mut output = vec![0u8; decoded_len];
    for position in 0..supplied_bits {
        let symbol = symbols[position / bits as usize];
        let bit = (symbol >> (bits as usize - 1 - position % bits as usize)) & 1;
        if position < required_bits {
            output[position / 8] |= (bit as u8) << (7 - (position % 8));
        } else if bit != 0 {
            return Err("nonzero symbol tail padding".into());
        }
    }
    Ok(output)
}

fn p3_encode(
    input: &[u8],
    floor: Floor,
    seed: &[u8; 32],
    control: Control,
    pass_count: u64,
) -> AppResult<Vec<u8>> {
    if pass_count != 1 {
        return Err("Path3 hook implements one causal online pass only".into());
    }
    let symbols = bytes_to_symbols(input, floor.bits)?;
    let codebooks = derive_codebooks(seed, floor)?;
    let mut history = Vec::<u16>::with_capacity(symbols.len());
    let mut bank = ExpertBank::new();
    let mut writer = FixedBitWriter::new();
    let remainder_bits = floor.step.trailing_zeros() as u8;
    let quotient_bits = floor.bits - remainder_bits;
    for (position, actual) in symbols.iter().copied().enumerate() {
        if control == Control::Reset && position != 0 && position % RESET_INTERVAL == 0 {
            bank = ExpertBank::new();
            history.clear();
        }
        let (prediction, candidates) = bank.predict(
            &history, position, floor, seed, control, &codebooks,
        )?;
        let mask = (1u16 << floor.bits) - 1;
        let residual = actual.wrapping_sub(prediction) & mask;
        let quotient = residual / floor.step as u16;
        let remainder = residual % floor.step as u16;
        writer.write_value(quotient, quotient_bits);
        writer.write_value(remainder, remainder_bits);
        bank.update(actual, &candidates, control);
        history.push(actual);
    }
    let body = writer.finish();
    let expected_body = symbols.len().checked_mul(floor.bits as usize)
        .and_then(|value| value.checked_add(7))
        .ok_or_else(|| "Path3 body length overflow".to_string())? / 8;
    if body.len() != expected_body {
        return Err("internal Path3 body length mismatch".into());
    }
    let mut output = Vec::with_capacity(20 + body.len());
    output.extend_from_slice(b"P3H1");
    put_u64(&mut output, symbols.len() as u64);
    put_u64(&mut output, body.len() as u64);
    output.extend_from_slice(&body);
    Ok(output)
}

fn p3_decode(
    payload: &[u8],
    decoded_len: usize,
    floor: Floor,
    seed: &[u8; 32],
    control: Control,
    pass_count: u64,
) -> AppResult<Vec<u8>> {
    if pass_count != 1 {
        return Err("Path3 hook implements one causal online pass only".into());
    }
    let mut cursor = 0usize;
    if take(payload, &mut cursor, 4)? != b"P3H1" {
        return Err("Path3 hook magic mismatch".into());
    }
    let symbol_count = usize_from_u64(get_u64(payload, &mut cursor)?, "Path3 symbol count")?;
    let body_len = usize_from_u64(get_u64(payload, &mut cursor)?, "Path3 body length")?;
    let body = take(payload, &mut cursor, body_len)?;
    if cursor != payload.len() {
        return Err("trailing Path3 hook bytes".into());
    }
    let expected_symbols = if decoded_len == 0 { 0 } else {
        decoded_len.checked_mul(8)
            .and_then(|value| value.checked_add(floor.bits as usize - 1))
            .ok_or_else(|| "decoded symbol-count overflow".to_string())? / floor.bits as usize
    };
    if symbol_count != expected_symbols {
        return Err("Path3 symbol count is noncanonical".into());
    }
    let expected_body = symbol_count.checked_mul(floor.bits as usize)
        .and_then(|value| value.checked_add(7))
        .ok_or_else(|| "Path3 body length overflow".to_string())? / 8;
    if body_len != expected_body {
        return Err("Path3 body length is noncanonical".into());
    }
    let codebooks = derive_codebooks(seed, floor)?;
    let mut causal_history = Vec::<u16>::with_capacity(symbol_count.min(RESET_INTERVAL));
    let mut decoded_symbols = Vec::<u16>::with_capacity(symbol_count);
    let mut bank = ExpertBank::new();
    let mut reader = FixedBitReader::new(body);
    let remainder_bits = floor.step.trailing_zeros() as u8;
    let quotient_bits = floor.bits - remainder_bits;
    for position in 0..symbol_count {
        if control == Control::Reset && position != 0 && position % RESET_INTERVAL == 0 {
            bank = ExpertBank::new();
            causal_history.clear();
        }
        let (prediction, candidates) = bank.predict(
            &causal_history, position, floor, seed, control, &codebooks,
        )?;
        let quotient = reader.read_value(quotient_bits)?;
        let remainder = reader.read_value(remainder_bits)?;
        if remainder >= floor.step as u16 {
            return Err("Path3 remainder out of range".into());
        }
        let residual = quotient.checked_mul(floor.step as u16)
            .and_then(|value| value.checked_add(remainder))
            .ok_or_else(|| "Path3 residual overflow".to_string())?;
        if residual >= (1u16 << floor.bits) {
            return Err("Path3 residual outside floor alphabet".into());
        }
        let actual = prediction.wrapping_add(residual) & ((1u16 << floor.bits) - 1);
        bank.update(actual, &candidates, control);
        causal_history.push(actual);
        decoded_symbols.push(actual);
    }
    reader.validate_zero_padding()?;
    symbols_to_bytes(&decoded_symbols, floor.bits, decoded_len)
}

fn p3_prediction_trace(
    input: &[u8],
    floor: Floor,
    seed: &[u8; 32],
    control: Control,
) -> AppResult<Vec<u16>> {
    let symbols = bytes_to_symbols(input, floor.bits)?;
    let codebooks = derive_codebooks(seed, floor)?;
    let mut causal_history = Vec::<u16>::with_capacity(symbols.len().min(RESET_INTERVAL));
    let mut bank = ExpertBank::new();
    let mut trace = Vec::with_capacity(symbols.len());
    for (position, actual) in symbols.iter().copied().enumerate() {
        if control == Control::Reset && position != 0 && position % RESET_INTERVAL == 0 {
            bank = ExpertBank::new();
            causal_history.clear();
        }
        let (prediction, candidates) = bank.predict(
            &causal_history, position, floor, seed, control, &codebooks,
        )?;
        trace.push(prediction);
        bank.update(actual, &candidates, control);
        causal_history.push(actual);
    }
    Ok(trace)
}

fn replay_expert_state(
    symbols: &[u16],
    floor: Floor,
    seed: &[u8; 32],
    control: Control,
) -> AppResult<ExpertBank> {
    let codebooks = derive_codebooks(seed, floor)?;
    let mut bank = ExpertBank::new();
    let mut history = Vec::with_capacity(symbols.len());
    for (position, actual) in symbols.iter().copied().enumerate() {
        if control == Control::Reset && position != 0 && position % RESET_INTERVAL == 0 {
            bank = ExpertBank::new();
            history.clear();
        }
        let (_, candidates) = bank.predict(&history, position, floor, seed, control, &codebooks)?;
        bank.update(actual, &candidates, control);
        history.push(actual);
    }
    Ok(bank)
}

fn derive_floor_omega(
    decoded: &[u8],
    header: &StageHeader,
    model: &[u8],
    payload: &[u8],
) -> AppResult<FloorOmega> {
    let catalog_sha = canonical_catalog_sha();
    let symbols = bytes_to_symbols(decoded, header.floor.bits)?;
    let codebooks = derive_codebooks(&header.seed_omega, header.floor)?;
    let bank = replay_expert_state(
        &symbols, header.floor, &header.seed_omega, header.control,
    )?;
    let mut direction_digests = [[0u8; 32]; OPERATOR_COUNT];
    for spec in OPERATORS {
        let view = apply_symbols(spec.id, header.floor.bits, &symbols)
            .map_err(|error| error.to_string())?;
        let view_bytes = pack_u16_le(&view);
        let state_index = if header.control == Control::DuplicateSharedState { 0 } else { spec.id as usize };
        let weight = bank.weights[state_index].to_le_bytes();
        let hits = bank.exact_hits[state_index].to_le_bytes();
        let observations = bank.observations[state_index].to_le_bytes();
        let operator = [spec.id];
        let family = [family_code(spec.family)];
        let state_digest = domain_hash(
            b"AOC-DIRECTION-STATE-V1",
            &[&operator, &family, &weight, &hits, &observations],
        );
        let view_digest = domain_hash(
            b"AOC-DIRECTION-VIEW-V1",
            &[&operator, &family, &view_bytes],
        );
        direction_digests[spec.id as usize] = domain_hash(
            b"AOC-CODEBOOK-VIEW-STATE-V1",
            &[&operator, &family, &codebooks[spec.id as usize].digest, &view_digest, &state_digest],
        );
    }
    let cube8 = family_omega(b"CUBE8_RNQ", &direction_digests[0..8]);
    let tri12 = family_omega(b"TRI12_SECTORS", &direction_digests[8..20]);
    let pi20 = family_omega(b"PI20_ICOSAHEDRAL_LENSES", &direction_digests[20..40]);
    let mut sorted = direction_digests.to_vec();
    sorted.sort();
    let sorted_bytes = join_hashes(&sorted);
    let floor_fields = [header.floor.id, header.floor.bits, header.floor.step];
    let control = [header.control.code()];
    let pass_count = header.pass_count.to_le_bytes();
    let decoded_len = (header.decoded_len as u64).to_le_bytes();
    let path1_digest = domain_hash(b"AOC-PATH1-STATE-V1", &[b"NOT_WIRED_V0"]);
    let path2_digest = domain_hash(b"AOC-PATH2-STATE-V1", &[b"NOT_WIRED_V0"]);
    let path3_label: &[u8] = match header.mode {
        Mode::Raw => b"RAW_NO_PATH3",
        Mode::Path3Hook => b"FIXEDWIDTH_CAUSAL_HOOK_NOT_FINAL_PATH3",
        Mode::Path123 => b"PATH123_MODULE_PENDING",
    };
    let path3_digest = domain_hash(
        b"AOC-PATH3-STATE-V1",
        &[path3_label, &join_expert_state(&bank)],
    );
    let model_sha = sha256(model);
    let payload_sha = sha256(payload);
    let combined = domain_hash(
        b"AOC-FLOOR-OMEGA-V1",
        &[
            &floor_fields,
            &header.seed_omega,
            &catalog_sha,
            &control,
            &pass_count,
            &decoded_len,
            &header.decoded_sha,
            &sorted_bytes,
            &path1_digest,
            &path2_digest,
            &path3_digest,
            &model_sha,
            &payload_sha,
        ],
    );
    Ok(FloorOmega { cube8, tri12, pi20, combined, catalog_sha, direction_digests })
}

fn family_omega(label: &[u8], digests: &[[u8; 32]]) -> [u8; 32] {
    let mut sorted = digests.to_vec();
    sorted.sort();
    domain_hash(b"AOC-FAMILY-OMEGA-V1", &[label, &join_hashes(&sorted)])
}

fn join_hashes(hashes: &[[u8; 32]]) -> Vec<u8> {
    let mut output = Vec::with_capacity(hashes.len() * 32);
    for hash in hashes {
        output.extend_from_slice(hash);
    }
    output
}

fn join_expert_state(bank: &ExpertBank) -> Vec<u8> {
    let mut output = Vec::with_capacity(OPERATOR_COUNT * 18);
    for index in 0..OPERATOR_COUNT {
        output.extend_from_slice(&bank.weights[index].to_le_bytes());
        output.extend_from_slice(&bank.exact_hits[index].to_le_bytes());
        output.extend_from_slice(&bank.observations[index].to_le_bytes());
    }
    output
}

fn pack_u16_le(values: &[u16]) -> Vec<u8> {
    let mut output = Vec::with_capacity(values.len() * 2);
    for value in values {
        output.extend_from_slice(&value.to_le_bytes());
    }
    output
}

fn encode_stage(
    decoded: &[u8],
    floor: Floor,
    mode: Mode,
    control: Control,
    pass_count: u64,
    seed_omega: [u8; 32],
) -> AppResult<(Vec<u8>, FloorOmega)> {
    if pass_count == 0 {
        return Err("pass_count must be positive".into());
    }
    let payload = match mode {
        Mode::Raw => decoded.to_vec(),
        Mode::Path3Hook => p3_encode(decoded, floor, &seed_omega, control, pass_count)?,
        Mode::Path123 => return Err("Path123 mode is held until the reviewed module is wired".into()),
    };
    let model = build_model_blob(mode);
    let header = StageHeader {
        floor,
        mode,
        control,
        pass_count,
        decoded_len: decoded.len(),
        payload_len: payload.len(),
        seed_omega,
        decoded_sha: sha256(decoded),
        model_len: model.len(),
    };
    let stage = serialize_stage(&header, &model, &payload)?;
    let omega = derive_floor_omega(decoded, &header, &model, &payload)?;
    Ok((stage, omega))
}

fn serialize_stage(header: &StageHeader, model: &[u8], payload: &[u8]) -> AppResult<Vec<u8>> {
    if model.len() != header.model_len || payload.len() != header.payload_len {
        return Err("stage header/body length disagreement".into());
    }
    let total = STAGE_FIXED_LEN
        .checked_add(model.len()).and_then(|value| value.checked_add(payload.len()))
        .ok_or_else(|| "stage length overflow".to_string())?;
    let mut output = Vec::with_capacity(total);
    output.extend_from_slice(STAGE_MAGIC);
    output.push(header.floor.id);
    output.push(header.floor.bits);
    output.push(header.floor.step);
    output.push(header.mode.code());
    output.push(header.control.code());
    output.extend_from_slice(&[0, 0, 0]);
    put_u64(&mut output, header.pass_count);
    put_u64(&mut output, header.decoded_len as u64);
    put_u64(&mut output, header.payload_len as u64);
    output.extend_from_slice(&header.seed_omega);
    output.extend_from_slice(&header.decoded_sha);
    put_u64(&mut output, header.model_len as u64);
    output.extend_from_slice(model);
    output.extend_from_slice(payload);
    if output.len() != total {
        return Err("internal STG1 serialization length mismatch".into());
    }
    Ok(output)
}

fn parse_stage(stage: &[u8]) -> AppResult<(StageHeader, &[u8], &[u8])> {
    if stage.len() < STAGE_FIXED_LEN {
        return Err("truncated STG1 stage".into());
    }
    let mut cursor = 0usize;
    if take(stage, &mut cursor, 4)? != STAGE_MAGIC {
        return Err("STG1 magic mismatch".into());
    }
    let floor = floor_for_id(take(stage, &mut cursor, 1)?[0])?;
    let bits = take(stage, &mut cursor, 1)?[0];
    let step = take(stage, &mut cursor, 1)?[0];
    if bits != floor.bits || step != floor.step {
        return Err("floor id/bits/step tuple mismatch".into());
    }
    let mode = Mode::parse(take(stage, &mut cursor, 1)?[0])?;
    let control = Control::parse(take(stage, &mut cursor, 1)?[0])?;
    if take(stage, &mut cursor, 3)?.iter().any(|byte| *byte != 0) {
        return Err("nonzero STG1 reserved bytes".into());
    }
    let pass_count = get_u64(stage, &mut cursor)?;
    if pass_count == 0 {
        return Err("zero STG1 pass count".into());
    }
    let decoded_len = usize_from_u64(get_u64(stage, &mut cursor)?, "decoded length")?;
    let payload_len = usize_from_u64(get_u64(stage, &mut cursor)?, "payload length")?;
    let seed_omega = take_hash(stage, &mut cursor)?;
    let decoded_sha = take_hash(stage, &mut cursor)?;
    let model_len = usize_from_u64(get_u64(stage, &mut cursor)?, "model length")?;
    if cursor != STAGE_FIXED_LEN {
        return Err("internal STG1 parser offset mismatch".into());
    }
    let expected = STAGE_FIXED_LEN.checked_add(model_len)
        .and_then(|value| value.checked_add(payload_len))
        .ok_or_else(|| "STG1 total length overflow".to_string())?;
    if stage.len() != expected {
        return Err(format!("STG1 length mismatch: expected {expected}, found {}", stage.len()));
    }
    let model = &stage[STAGE_FIXED_LEN..STAGE_FIXED_LEN + model_len];
    let payload = &stage[STAGE_FIXED_LEN + model_len..];
    validate_model_blob(model, mode)?;
    Ok((StageHeader {
        floor, mode, control, pass_count, decoded_len, payload_len,
        seed_omega, decoded_sha, model_len,
    }, model, payload))
}

fn decode_stage(stage: &[u8]) -> AppResult<StageResult> {
    let (header, model, payload) = parse_stage(stage)?;
    let decoded = match header.mode {
        Mode::Raw => {
            if payload.len() != header.decoded_len {
                return Err("RAW payload length must equal decoded length".into());
            }
            payload.to_vec()
        }
        Mode::Path3Hook => p3_decode(
            payload, header.decoded_len, header.floor, &header.seed_omega,
            header.control, header.pass_count,
        )?,
        Mode::Path123 => return Err("Path123 mode is held until the reviewed module is wired".into()),
    };
    if decoded.len() != header.decoded_len || sha256(&decoded) != header.decoded_sha {
        return Err("restored STG1 decoded length/SHA mismatch".into());
    }
    let omega = derive_floor_omega(&decoded, &header, model, payload)?;
    Ok(StageResult { decoded, header, omega })
}

fn encode_file(input: &[u8], mode: Mode, control: Control, pass_count: u64) -> AppResult<Vec<u8>> {
    let mut child = input.to_vec();
    let mut seed = genesis_omega();
    for floor in FLOORS {
        let (stage, omega) = encode_stage(&child, floor, mode, control, pass_count, seed)?;
        seed = omega.combined;
        child = stage;
    }
    let total = FILE_HEADER_LEN.checked_add(child.len())
        .ok_or_else(|| "file archive length overflow".to_string())?;
    let mut output = Vec::with_capacity(total);
    output.extend_from_slice(FILE_MAGIC);
    put_u16(&mut output, FILE_VERSION);
    output.push(FLOORS.len() as u8);
    output.push(FILE_FLAGS);
    put_u64(&mut output, input.len() as u64);
    output.extend_from_slice(&sha256(input));
    output.extend_from_slice(&seed);
    put_u64(&mut output, child.len() as u64);
    output.extend_from_slice(&child);
    if output.len() != total {
        return Err("internal AOCWM001 length mismatch".into());
    }
    Ok(output)
}

fn parse_file(archive: &[u8]) -> AppResult<(FileHeader, &[u8])> {
    if archive.len() < FILE_HEADER_LEN {
        return Err("truncated AOCWM001 file".into());
    }
    let mut cursor = 0usize;
    if take(archive, &mut cursor, 8)? != FILE_MAGIC {
        return Err("AOCWM001 magic mismatch".into());
    }
    let version = get_u16(archive, &mut cursor)?;
    if version != FILE_VERSION {
        return Err(format!("unsupported AOCWM001 version {version}"));
    }
    let floor_count = take(archive, &mut cursor, 1)?[0];
    if floor_count != 4 {
        return Err(format!("AOCWM001 floor count mismatch: {floor_count}"));
    }
    let flags = take(archive, &mut cursor, 1)?[0];
    if flags != FILE_FLAGS {
        return Err(format!("unknown AOCWM001 flags {flags:#x}"));
    }
    let original_len = usize_from_u64(get_u64(archive, &mut cursor)?, "original length")?;
    let original_sha = take_hash(archive, &mut cursor)?;
    let omega4096 = take_hash(archive, &mut cursor)?;
    let outer_len = usize_from_u64(get_u64(archive, &mut cursor)?, "outer length")?;
    if cursor != FILE_HEADER_LEN {
        return Err("internal AOCWM001 parser offset mismatch".into());
    }
    let expected = FILE_HEADER_LEN.checked_add(outer_len)
        .ok_or_else(|| "AOCWM001 total length overflow".to_string())?;
    if archive.len() != expected {
        return Err(format!("AOCWM001 length/trailing mismatch: expected {expected}, found {}", archive.len()));
    }
    Ok((FileHeader { flags, original_len, original_sha, omega4096, outer_len }, &archive[FILE_HEADER_LEN..]))
}

fn decode_file(archive: &[u8]) -> AppResult<(Vec<u8>, DecodeReport)> {
    let (file_header, outer) = parse_file(archive)?;
    let mut current = outer.to_vec();
    let mut expected_omega = file_header.omega4096;
    let mut reports = Vec::with_capacity(4);
    let mut model_bytes = 0usize;
    for expected_floor in FLOORS.iter().rev().copied() {
        let (preflight, _, _) = parse_stage(&current)?;
        if preflight.floor != expected_floor {
            return Err(format!(
                "nested floor order mismatch: expected {}, found {}",
                expected_floor.label, preflight.floor.label
            ));
        }
        let result = decode_stage(&current)?;
        if result.omega.combined != expected_omega {
            return Err(format!("combined Omega mismatch at floor {}", expected_floor.label));
        }
        model_bytes = model_bytes.checked_add(result.header.model_len)
            .ok_or_else(|| "model accounting overflow".to_string())?;
        expected_omega = result.header.seed_omega;
        reports.push(result.omega);
        current = result.decoded;
    }
    if expected_omega != genesis_omega() {
        return Err("floor-64 seed does not equal compiled genesis Omega".into());
    }
    if current.len() != file_header.original_len || sha256(&current) != file_header.original_sha {
        return Err("AOCWM001 original length/SHA mismatch".into());
    }
    let report = DecodeReport {
        original_len: current.len(),
        original_sha: sha256(&current),
        archive_len: archive.len(),
        archive_sha: sha256(archive),
        model_bytes_in_archive: model_bytes,
        stages_outer_to_inner: reports,
    };
    Ok((current, report))
}

fn put_u16(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn put_u64(output: &mut Vec<u8>, value: u64) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn take<'a>(bytes: &'a [u8], cursor: &mut usize, count: usize) -> AppResult<&'a [u8]> {
    let end = cursor.checked_add(count).ok_or_else(|| "archive offset overflow".to_string())?;
    if end > bytes.len() {
        return Err("truncated archive field".into());
    }
    let value = &bytes[*cursor..end];
    *cursor = end;
    Ok(value)
}

fn get_u16(bytes: &[u8], cursor: &mut usize) -> AppResult<u16> {
    Ok(u16::from_le_bytes(take(bytes, cursor, 2)?.try_into().unwrap()))
}

fn get_u64(bytes: &[u8], cursor: &mut usize) -> AppResult<u64> {
    Ok(u64::from_le_bytes(take(bytes, cursor, 8)?.try_into().unwrap()))
}

fn take_hash(bytes: &[u8], cursor: &mut usize) -> AppResult<[u8; 32]> {
    Ok(take(bytes, cursor, 32)?.try_into().unwrap())
}

fn usize_from_u64(value: u64, label: &str) -> AppResult<usize> {
    usize::try_from(value).map_err(|_| format!("{label} does not fit this platform"))
}

fn domain_hash(domain: &[u8], parts: &[&[u8]]) -> [u8; 32] {
    let mut material = Vec::new();
    put_u64(&mut material, domain.len() as u64);
    material.extend_from_slice(domain);
    for part in parts {
        put_u64(&mut material, part.len() as u64);
        material.extend_from_slice(part);
    }
    sha256(&material)
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(DIGITS[(byte >> 4) as usize] as char);
        output.push(DIGITS[(byte & 15) as usize] as char);
    }
    output
}

fn sha256(input: &[u8]) -> [u8; 32] {
    const K: [u32; 64] = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
    ];
    let mut state = [0x6a09e667u32,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    let bit_len = (input.len() as u64).wrapping_mul(8);
    let mut padded = input.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 { padded.push(0); }
    padded.extend_from_slice(&bit_len.to_be_bytes());
    for chunk in padded.chunks_exact(64) {
        let mut words = [0u32; 64];
        for i in 0..16 { words[i] = u32::from_be_bytes(chunk[i*4..i*4+4].try_into().unwrap()); }
        for i in 16..64 {
            let s0 = words[i-15].rotate_right(7) ^ words[i-15].rotate_right(18) ^ (words[i-15] >> 3);
            let s1 = words[i-2].rotate_right(17) ^ words[i-2].rotate_right(19) ^ (words[i-2] >> 10);
            words[i] = words[i-16].wrapping_add(s0).wrapping_add(words[i-7]).wrapping_add(s1);
        }
        let (mut a,mut b,mut c,mut d,mut e,mut f,mut g,mut h)=(state[0],state[1],state[2],state[3],state[4],state[5],state[6],state[7]);
        for i in 0..64 {
            let s1=e.rotate_right(6)^e.rotate_right(11)^e.rotate_right(25);
            let ch=(e&f)^((!e)&g);
            let t1=h.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(words[i]);
            let s0=a.rotate_right(2)^a.rotate_right(13)^a.rotate_right(22);
            let maj=(a&b)^(a&c)^(b&c);
            let t2=s0.wrapping_add(maj);
            h=g;g=f;f=e;e=d.wrapping_add(t1);d=c;c=b;b=a;a=t1.wrapping_add(t2);
        }
        for (slot,value) in state.iter_mut().zip([a,b,c,d,e,f,g,h]) { *slot=slot.wrapping_add(value); }
    }
    let mut output=[0u8;32];
    for (i,value) in state.iter().enumerate(){ output[i*4..i*4+4].copy_from_slice(&value.to_be_bytes()); }
    output
}

fn write_atomic(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let temporary = path.with_extension(format!("{}.tmp", path.extension().and_then(|v| v.to_str()).unwrap_or("out")));
    fs::write(&temporary, bytes).map_err(io_error)?;
    if path.exists() { fs::remove_file(path).map_err(io_error)?; }
    fs::rename(&temporary, path).map_err(io_error)
}

fn io_error(error: io::Error) -> String { error.to_string() }

fn executable_size() -> AppResult<u64> {
    let path = env::current_exe().map_err(io_error)?;
    Ok(fs::metadata(path).map_err(io_error)?.len())
}

fn print_report(report: &DecodeReport, decoder_bytes: u64) -> AppResult<()> {
    let total = (report.archive_len as u64).checked_add(decoder_bytes)
        .ok_or_else(|| "charged total overflow".to_string())?;
    println!("AOCWMVERIFY|original_bytes={}|archive_bytes={}|decoder_bytes={}|codebooks_external_bytes=0|catalog_external_bytes=0|learned_state_external_bytes=0|model_external_bytes=0|model_bytes_inside_archive={}|charged_total={}|original_sha256={}|archive_sha256={}|whole_monty=0|integrated_path123=PENDING|json=0|",
        report.original_len, report.archive_len, decoder_bytes, report.model_bytes_in_archive, total,
        hex(&report.original_sha), hex(&report.archive_sha));
    for (index, omega) in report.stages_outer_to_inner.iter().enumerate() {
        let floor = FLOORS[3-index];
        println!("FLOOROMEGA|floor={}|cube8={}|tri12={}|pi20={}|combined={}|catalog_sha={}|directions=40|json=0|",
            floor.label, hex(&omega.cube8), hex(&omega.tri12), hex(&omega.pi20),
            hex(&omega.combined), hex(&omega.catalog_sha));
    }
    Ok(())
}

fn parse_mode(text: &str) -> AppResult<Mode> {
    match text.to_ascii_lowercase().as_str() {
        "raw" => Ok(Mode::Raw),
        "p3" | "path3" => Ok(Mode::Path3Hook),
        "path123" => Ok(Mode::Path123),
        _ => Err(format!("unknown mode {text}")),
    }
}

fn parse_control(text: &str) -> AppResult<Control> {
    match text.to_ascii_lowercase().as_str() {
        "unique" => Ok(Control::Unique),
        "duplicate" | "dup" => Ok(Control::DuplicateSharedState),
        "shuffle" => Ok(Control::ShufflePriorHistory),
        "reset" => Ok(Control::Reset),
        "persistent" => Ok(Control::Persistent),
        _ => Err(format!("unknown control {text}")),
    }
}

fn usage() -> &'static str {
    "omega_hyper_codec_v0 pack <input> <archive> [raw|p3] [unique|duplicate|shuffle|reset|persistent]\n\
omega_hyper_codec_v0 unpack <archive> <output>\n\
omega_hyper_codec_v0 inspect <archive>\n\
omega_hyper_codec_v0 self-test"
}

fn runtime_self_test() -> AppResult<()> {
    let samples = [Vec::new(), b"a".to_vec(), b"Omega floor exact replay".repeat(17)];
    for mode in [Mode::Raw, Mode::Path3Hook] {
        for control in [Control::Unique, Control::DuplicateSharedState, Control::ShufflePriorHistory, Control::Reset, Control::Persistent] {
            for sample in &samples {
                let archive = encode_file(sample, mode, control, 1)?;
                let (restored, _) = decode_file(&archive)?;
                if restored != *sample { return Err("runtime roundtrip mismatch".into()); }
            }
        }
    }
    println!("AOCWMSELFTEST|ok=1|grammar=AOCWM001+STG1|floors=64,256,1024,4096|directions_per_floor=40|raw=PASS|path3_hook=PASS|path123=PENDING|whole_monty=0|json=0|");
    Ok(())
}

fn real_main() -> AppResult<()> {
    let args = env::args().collect::<Vec<_>>();
    if args.len() < 2 { return Err(usage().into()); }
    match args[1].as_str() {
        "pack" => {
            if !(4..=6).contains(&args.len()) { return Err(usage().into()); }
            let input = fs::read(&args[2]).map_err(io_error)?;
            let mode = if args.len() >= 5 { parse_mode(&args[4])? } else { Mode::Path3Hook };
            let control = if args.len() >= 6 { parse_control(&args[5])? } else { Control::Unique };
            let archive = encode_file(&input, mode, control, 1)?;
            write_atomic(Path::new(&args[3]), &archive)?;
            let (_, report) = decode_file(&archive)?;
            print_report(&report, executable_size()?)?;
            println!("PACKDONE|mode={}|control={}|path123=PENDING|whole_monty=0|json=0|", mode.label(), control.label());
        }
        "unpack" => {
            if args.len() != 4 { return Err(usage().into()); }
            let archive = fs::read(&args[2]).map_err(io_error)?;
            let (restored, report) = decode_file(&archive)?;
            write_atomic(Path::new(&args[3]), &restored)?;
            print_report(&report, executable_size()?)?;
        }
        "inspect" => {
            if args.len() != 3 { return Err(usage().into()); }
            let archive = fs::read(&args[2]).map_err(io_error)?;
            let (_, report) = decode_file(&archive)?;
            print_report(&report, executable_size()?)?;
        }
        "self-test" => runtime_self_test()?,
        _ => return Err(usage().into()),
    }
    Ok(())
}

fn main() {
    if let Err(error) = real_main() {
        eprintln!("ERROR|{}", error.replace('|', "%7C"));
        std::process::exit(1);
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn sample(length: usize, salt: u64) -> Vec<u8> {
        let mut state = salt;
        (0..length).map(|index| {
            state = mix64(state.wrapping_add(index as u64));
            (state ^ (index as u64).rotate_left((index % 63) as u32)) as u8
        }).collect()
    }

    fn reject(archive: &[u8], fragment: &str) {
        let error = decode_file(archive).expect_err("tampered archive must fail");
        assert!(error.contains(fragment), "expected {fragment:?}, got {error:?}");
    }

    #[test]
    fn provenance_sources_match_pins() {
        assert_eq!(sha256(CONTRACT_SOURCE), parse_pinned_hash(CONTRACT_SHA_HEX));
        assert_eq!(sha256(OPERATOR_SOURCE), parse_pinned_hash(OPERATOR_SOURCE_SHA_HEX));
        assert_eq!(sha256(CORE_SOURCE), parse_pinned_hash(CORE_SOURCE_SHA_HEX));
    }

    #[test]
    fn sha256_standard_vectors() {
        assert_eq!(hex(&sha256(b"")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        assert_eq!(hex(&sha256(b"abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn pack_unpack_floor_symbols_all_tails() {
        for bits in [6u8,8,10,12] {
            for length in 0..65 {
                let bytes = sample(length, bits as u64 * 97 + length as u64);
                let symbols = bytes_to_symbols(&bytes, bits).unwrap();
                assert_eq!(symbols_to_bytes(&symbols, bits, length).unwrap(), bytes);
            }
        }
    }

    #[test]
    fn forty_codebooks_are_distinct_per_floor() {
        let seed = genesis_omega();
        for floor in FLOORS {
            let books = derive_codebooks(&seed, floor).unwrap();
            let mut pairs = books.iter().map(|book| (book.multiplier, book.offset)).collect::<Vec<_>>();
            pairs.sort(); pairs.dedup();
            assert_eq!(pairs.len(), 40);
        }
    }

    #[test]
    fn raw_and_path3_nested_roundtrip_all_controls() {
        for mode in [Mode::Raw, Mode::Path3Hook] {
            for control in [Control::Unique, Control::DuplicateSharedState, Control::ShufflePriorHistory, Control::Reset, Control::Persistent] {
                for length in [0usize,1,2,7,31,257,777] {
                    let input = sample(length, length as u64 + mode.code() as u64 * 1000 + control.code() as u64 * 10000);
                    let archive = encode_file(&input, mode, control, 1).unwrap();
                    let (restored, report) = decode_file(&archive).unwrap();
                    assert_eq!(restored, input);
                    assert_eq!(report.stages_outer_to_inner.len(), 4);
                    assert!(report.stages_outer_to_inner.iter().all(|omega| omega.direction_digests.len() == 40));
                }
            }
        }
    }

    #[test]
    fn exact_file_and_stage_grammar_offsets() {
        let archive = encode_file(b"grammar", Mode::Raw, Control::Unique, 1).unwrap();
        assert_eq!(&archive[..8], FILE_MAGIC);
        assert_eq!(FILE_HEADER_LEN, 92);
        assert_eq!(u16::from_le_bytes(archive[8..10].try_into().unwrap()), 1);
        assert_eq!(archive[10], 4);
        assert_eq!(archive[11], 0);
        assert_eq!(u64::from_le_bytes(archive[12..20].try_into().unwrap()), 7);
        assert_eq!(&archive[20..52], &sha256(b"grammar"));
        assert_eq!(
            u64::from_le_bytes(archive[84..92].try_into().unwrap()) as usize,
            archive.len() - 92
        );
        let (_, outer) = parse_file(&archive).unwrap();
        assert_eq!(&outer[..4], STAGE_MAGIC);
        assert_eq!(STAGE_FIXED_LEN, 108);
        assert_eq!(outer[4], 3);
        assert_eq!(outer[5], 12);
        assert_eq!(outer[6], 16);
        assert_eq!(outer[7], MODE_RAW);
        assert_eq!(outer[8], CONTROL_UNIQUE);
        assert_eq!(&outer[9..12], &[0, 0, 0]);
        assert_eq!(u64::from_le_bytes(outer[12..20].try_into().unwrap()), 1);
        let decoded_len = u64::from_le_bytes(outer[20..28].try_into().unwrap()) as usize;
        let payload_len = u64::from_le_bytes(outer[28..36].try_into().unwrap()) as usize;
        assert_eq!(&outer[36..68], &parse_stage(outer).unwrap().0.seed_omega);
        assert_eq!(&outer[68..100], &parse_stage(outer).unwrap().0.decoded_sha);
        assert_eq!(u64::from_le_bytes(outer[100..108].try_into().unwrap()), 104);
        let (header, model, payload) = parse_stage(outer).unwrap();
        assert_eq!(header.floor.label, 4096);
        assert_eq!(decoded_len, header.decoded_len);
        assert_eq!(payload_len, header.payload_len);
        assert_eq!(model.len(), 104);
        assert_eq!(outer.len(), STAGE_FIXED_LEN + model.len() + payload.len());
    }

    #[test]
    fn seed_chain_is_genesis_to_omega4096() {
        let archive = encode_file(&sample(99, 77), Mode::Path3Hook, Control::Unique, 1).unwrap();
        let (file, outer) = parse_file(&archive).unwrap();
        let mut current = outer.to_vec();
        let mut expected = file.omega4096;
        for floor in FLOORS.iter().rev().copied() {
            let result = decode_stage(&current).unwrap();
            assert_eq!(result.header.floor, floor);
            assert_eq!(result.omega.combined, expected);
            expected = result.header.seed_omega;
            current = result.decoded;
        }
        assert_eq!(expected, genesis_omega());
    }

    #[test]
    fn suffix_poison_does_not_change_causal_prefix_prediction() {
        let floor = FLOORS[2];
        let seed = genesis_omega();
        let codebooks = derive_codebooks(&seed, floor).unwrap();
        let prefix = bytes_to_symbols(b"causal prefix", floor.bits).unwrap();
        let mut left = prefix.clone(); left.extend(bytes_to_symbols(b"AAA", floor.bits).unwrap());
        let mut right = prefix.clone(); right.extend(bytes_to_symbols(b"ZZZ", floor.bits).unwrap());
        let bank = ExpertBank::new();
        let a = bank.predict(&left[..prefix.len()], prefix.len(), floor, &seed, Control::Unique, &codebooks).unwrap().0;
        let b = bank.predict(&right[..prefix.len()], prefix.len(), floor, &seed, Control::Unique, &codebooks).unwrap().0;
        assert_eq!(a, b);
    }

    #[test]
    fn actual_path3_trace_is_suffix_poison_invariant_with_fixed_seed() {
        let floor = FLOORS[1];
        let seed = genesis_omega();
        let prefix = b"same transmitted prefix";
        let mut left = prefix.to_vec(); left.extend_from_slice(b"AAAA poison");
        let mut right = prefix.to_vec(); right.extend_from_slice(b"ZZZZ poison");
        let left_trace = p3_prediction_trace(&left, floor, &seed, Control::Unique).unwrap();
        let right_trace = p3_prediction_trace(&right, floor, &seed, Control::Unique).unwrap();
        assert_eq!(&left_trace[..prefix.len()], &right_trace[..prefix.len()]);
    }

    #[test]
    fn reset_keeps_full_output_above_interval_at_every_floor() {
        let input = sample(700, 0x5eed);
        for floor in FLOORS {
            assert!(bytes_to_symbols(&input, floor.bits).unwrap().len() > RESET_INTERVAL);
            let seed = genesis_omega();
            let payload = p3_encode(&input, floor, &seed, Control::Reset, 1).unwrap();
            let restored = p3_decode(
                &payload, input.len(), floor, &seed, Control::Reset, 1,
            ).unwrap();
            assert_eq!(restored, input, "reset replay failed at floor {}", floor.label);
        }
    }

    #[test]
    fn strict_file_parser_rejects_flags_trailing_and_length() {
        let archive = encode_file(b"strict", Mode::Raw, Control::Unique, 1).unwrap();
        let mut flags = archive.clone(); flags[11] = 1; reject(&flags, "flags");
        let mut trailing = archive.clone(); trailing.push(0); reject(&trailing, "length/trailing");
        let mut length = archive.clone(); length[84] ^= 1; reject(&length, "length/trailing");
    }

    #[test]
    fn stage_reserved_mode_floor_and_payload_tamper_fail_closed() {
        let archive = encode_file(&sample(64, 5), Mode::Raw, Control::Unique, 1).unwrap();
        let outer_start = FILE_HEADER_LEN;
        let mut reserved = archive.clone(); reserved[outer_start + 9] = 1; reject(&reserved, "reserved");
        let mut mode = archive.clone(); mode[outer_start + 7] = 99; reject(&mode, "mode");
        let mut floor = archive.clone();
        floor[outer_start + 4] = 0;
        floor[outer_start + 5] = 6;
        floor[outer_start + 6] = 2;
        reject(&floor, "floor order");
        let mut payload = archive.clone(); let last = payload.len()-1; payload[last] ^= 0x80; reject(&payload, "decoded length/SHA");
    }

    #[test]
    fn final_and_parent_omega_tamper_fail_closed() {
        let archive = encode_file(&sample(80, 33), Mode::Path3Hook, Control::Unique, 1).unwrap();
        let mut final_omega = archive.clone(); final_omega[52] ^= 1; reject(&final_omega, "combined Omega");
        let mut parent_seed = archive.clone(); parent_seed[FILE_HEADER_LEN + 36] ^= 1;
        assert!(decode_file(&parent_seed).is_err());
    }

    #[test]
    fn path123_cannot_be_mislabeled_pass() {
        let error = encode_file(b"held", Mode::Path123, Control::Unique, 1).unwrap_err();
        assert!(error.contains("held"));
    }

    #[test]
    fn pass_count_above_one_is_held_by_path3_hook() {
        let error = encode_file(b"passes", Mode::Path3Hook, Control::Unique, 16).unwrap_err();
        assert!(error.contains("one causal online pass"));
    }

    #[test]
    fn deterministic_archives_and_omegas() {
        let input = sample(333, 1234);
        let a = encode_file(&input, Mode::Path3Hook, Control::ShufflePriorHistory, 1).unwrap();
        let b = encode_file(&input, Mode::Path3Hook, Control::ShufflePriorHistory, 1).unwrap();
        assert_eq!(a, b);
        let (_, ra) = decode_file(&a).unwrap();
        let (_, rb) = decode_file(&b).unwrap();
        assert_eq!(ra.archive_sha, rb.archive_sha);
    }
}
