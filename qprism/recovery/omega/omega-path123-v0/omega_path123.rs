//! Isolated, dependency-free Path-1/2/3 component for the Omega-per-floor codec.
//!
//! Scope is deliberately narrow: this file proves component-level reversibility,
//! strict causal Path-3 prediction, checked CRT reconstruction, corruption
//! rejection, and explicit byte accounting.  It does not claim a Hutter score,
//! an integrated floor ladder, trained Omega-GNN weights, or physical effects.

use std::error::Error;
use std::fmt;

#[path = "../omega-operator-catalog-v0/omega_operator_catalog.rs"]
pub mod omega_operator_catalog;

use omega_operator_catalog::{apply_symbols, OPERATOR_COUNT};

pub const P123_MAGIC: &[u8; 8] = b"OP123V0\0";
pub const P123_VERSION: u16 = 0;
pub const PATH1_WINDOW: usize = 4096;
pub const PATH1_MIN_MATCH: usize = 3;
pub const PATH1_MAX_MATCH: usize = 258;
pub const PATH3_EXPERTS: usize = OPERATOR_COUNT;
pub const PATH3_HISTORY: usize = 40;
pub const PATH3_WEIGHT_BYTES: usize = PATH3_EXPERTS * 2;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CodecError {
    InvalidFloorBits(u8),
    InvalidLane(u8),
    InvalidP1Mode(u8),
    Truncated(&'static str),
    TrailingBytes(&'static str),
    InvalidToken(u8),
    InvalidMatch { distance: usize, length: usize, produced: usize },
    RequiredMatchMissing,
    LengthOverflow(&'static str),
    LengthMismatch { what: &'static str, expected: usize, actual: usize },
    InvalidResidue { residue: u16, modulus: u16 },
    CrtOutsideFloor { value: u16, bits: u8 },
    NonZeroPadding,
    ArithmeticState(&'static str),
    PayloadDigestMismatch,
    OriginalDigestMismatch,
    UnsupportedVersion(u16),
}

impl fmt::Display for CodecError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidFloorBits(bits) => write!(f, "invalid floor bits {bits}; expected 6, 8, 10, or 12"),
            Self::InvalidLane(lane) => write!(f, "invalid direction lane {lane}"),
            Self::InvalidP1Mode(mode) => write!(f, "invalid Path-1 mode {mode}"),
            Self::Truncated(what) => write!(f, "truncated {what}"),
            Self::TrailingBytes(what) => write!(f, "trailing bytes after {what}"),
            Self::InvalidToken(tag) => write!(f, "invalid Path-1 token tag {tag}"),
            Self::InvalidMatch { distance, length, produced } => write!(
                f,
                "invalid retained-output match distance={distance} length={length} produced={produced}"
            ),
            Self::RequiredMatchMissing => write!(f, "Path-1 require-match mode found no legal retained-output match"),
            Self::LengthOverflow(what) => write!(f, "length overflow for {what}"),
            Self::LengthMismatch { what, expected, actual } => {
                write!(f, "{what} length mismatch: expected {expected}, got {actual}")
            }
            Self::InvalidResidue { residue, modulus } => {
                write!(f, "residue {residue} is not canonical modulo {modulus}")
            }
            Self::CrtOutsideFloor { value, bits } => {
                write!(f, "CRT reconstruction {value} is outside the {bits}-bit floor")
            }
            Self::NonZeroPadding => write!(f, "non-zero padding in floor-symbol stream"),
            Self::ArithmeticState(what) => write!(f, "invalid arithmetic-coder state: {what}"),
            Self::PayloadDigestMismatch => write!(f, "Path-3 payload SHA-256 mismatch"),
            Self::OriginalDigestMismatch => write!(f, "restored original SHA-256 mismatch"),
            Self::UnsupportedVersion(version) => write!(f, "unsupported P123 version {version}"),
        }
    }
}

impl Error for CodecError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum P1Mode {
    Auto = 0,
    LiteralOnly = 1,
    RequireMatch = 2,
}

impl P1Mode {
    fn from_u8(value: u8) -> Result<Self, CodecError> {
        match value {
            0 => Ok(Self::Auto),
            1 => Ok(Self::LiteralOnly),
            2 => Ok(Self::RequireMatch),
            _ => Err(CodecError::InvalidP1Mode(value)),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum DirectionLane {
    Unique = 0,
    DuplicateSharedState = 1,
    ShuffleDeterministicPriorHistory = 2,
}

impl DirectionLane {
    fn from_u8(value: u8) -> Result<Self, CodecError> {
        match value {
            0 => Ok(Self::Unique),
            1 => Ok(Self::DuplicateSharedState),
            2 => Ok(Self::ShuffleDeterministicPriorHistory),
            _ => Err(CodecError::InvalidLane(value)),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum PipelineMode {
    Path1Only = 1,
    Path2Only = 2,
    Path3Only = 3,
    P123 = 4,
}

impl PipelineMode {
    fn from_u8(value: u8) -> Result<Self, CodecError> {
        match value {
            1 => Ok(Self::Path1Only),
            2 => Ok(Self::Path2Only),
            3 => Ok(Self::Path3Only),
            4 => Ok(Self::P123),
            _ => Err(CodecError::ArithmeticState("unknown pipeline-mode tag")),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ChargeSchedule {
    /// The actual standalone decoder/package bytes supplied by the caller.
    pub decoder_bytes: u64,
    /// Catalog bytes not already embedded in the charged decoder.
    pub external_catalog_bytes: u64,
    /// Codebook bytes not regenerated solely from the charged floor seed.
    pub external_codebook_bytes: u64,
    /// Offline learned parameters/state not carried inside the archive.
    pub external_model_bytes: u64,
    /// Any additional learned runtime/checkpoint state not already included
    /// in `external_model_bytes`; kept separate so it cannot disappear inside
    /// a broad model label.
    pub external_learned_state_bytes: u64,
}

impl Default for ChargeSchedule {
    fn default() -> Self {
        Self {
            decoder_bytes: 0,
            external_catalog_bytes: 0,
            external_codebook_bytes: 0,
            external_model_bytes: 0,
            external_learned_state_bytes: 0,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingMetadata {
    pub archive_bytes: u64,
    pub decoder_bytes: u64,
    pub external_catalog_bytes: u64,
    pub external_codebook_bytes: u64,
    pub external_model_bytes: u64,
    pub external_learned_state_bytes: u64,
    pub floor_seed_bytes_in_archive: u64,
    pub regenerated_language_map_bytes: u64,
    pub regenerated_online_mixer_bytes: u64,
    pub operator_slots: u16,
    pub online_weight_budget_bytes: u64,
    pub total_charged_bytes: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct P123Config {
    pub floor_bits: u8,
    /// Supplied by the caller and carried verbatim in the charged archive. It
    /// may be a content-derived upstream Omega commitment, but it is never an
    /// untransmitted decoder oracle: all 32 bytes are serialized and charged.
    pub floor_seed: [u8; 32],
    pub lane: DirectionLane,
    pub p1_mode: P1Mode,
    pub pipeline_mode: PipelineMode,
    pub charges: ChargeSchedule,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct P123Encoded {
    pub archive: Vec<u8>,
    pub accounting: AccountingMetadata,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Path1Token {
    Literal(u8),
    Match { distance: u16, length: u16 },
}

/// Path 1: greedy LZ over bytes that already exist in decoder output.  The
/// only token types are literal and retained-output match.
pub fn encode_path1(input: &[u8], mode: P1Mode) -> Result<Vec<Path1Token>, CodecError> {
    let mut tokens = Vec::new();
    let mut position = 0_usize;
    let mut match_count = 0_usize;
    while position < input.len() {
        let mut best_distance = 0_usize;
        let mut best_length = 0_usize;
        if mode != P1Mode::LiteralOnly {
            let max_distance = position.min(PATH1_WINDOW).min(u16::MAX as usize);
            for distance in 1..=max_distance {
                let mut length = 0_usize;
                while length < PATH1_MAX_MATCH
                    && position + length < input.len()
                    && input[position + length] == input[position + length - distance]
                {
                    length += 1;
                }
                if length > best_length {
                    best_length = length;
                    best_distance = distance;
                }
            }
        }
        if best_length >= PATH1_MIN_MATCH {
            let length = best_length.min(u16::MAX as usize);
            tokens.push(Path1Token::Match {
                distance: best_distance as u16,
                length: length as u16,
            });
            position += length;
            match_count += 1;
        } else {
            tokens.push(Path1Token::Literal(input[position]));
            position += 1;
        }
    }
    if mode == P1Mode::RequireMatch && match_count == 0 {
        return Err(CodecError::RequiredMatchMissing);
    }
    Ok(tokens)
}

pub fn decode_path1(tokens: &[Path1Token], expected_len: usize) -> Result<Vec<u8>, CodecError> {
    let mut output = Vec::with_capacity(expected_len);
    for token in tokens {
        match *token {
            Path1Token::Literal(byte) => {
                if output.len() >= expected_len {
                    return Err(CodecError::LengthMismatch {
                        what: "Path-1 output",
                        expected: expected_len,
                        actual: output.len() + 1,
                    });
                }
                output.push(byte);
            }
            Path1Token::Match { distance, length } => {
                let distance = distance as usize;
                let length = length as usize;
                if distance == 0
                    || distance > output.len()
                    || length < PATH1_MIN_MATCH
                    || output.len().checked_add(length).is_none()
                    || output.len() + length > expected_len
                {
                    return Err(CodecError::InvalidMatch {
                        distance,
                        length,
                        produced: output.len(),
                    });
                }
                for _ in 0..length {
                    let source = output.len() - distance;
                    let byte = output[source];
                    output.push(byte);
                }
            }
        }
    }
    if output.len() != expected_len {
        return Err(CodecError::LengthMismatch {
            what: "Path-1 output",
            expected: expected_len,
            actual: output.len(),
        });
    }
    Ok(output)
}

fn validate_path1_mode(tokens: &[Path1Token], mode: P1Mode) -> Result<(), CodecError> {
    let match_count = tokens
        .iter()
        .filter(|token| matches!(token, Path1Token::Match { .. }))
        .count();
    match mode {
        P1Mode::Auto => Ok(()),
        P1Mode::LiteralOnly if match_count == 0 => Ok(()),
        P1Mode::RequireMatch if match_count > 0 => Ok(()),
        P1Mode::LiteralOnly => Err(CodecError::ArithmeticState(
            "authenticated LiteralOnly stream contains a match token",
        )),
        P1Mode::RequireMatch => Err(CodecError::RequiredMatchMissing),
    }
}

pub fn serialize_path1(tokens: &[Path1Token]) -> Vec<u8> {
    let mut output = Vec::new();
    for token in tokens {
        match *token {
            Path1Token::Literal(byte) => {
                output.push(0);
                output.push(byte);
            }
            Path1Token::Match { distance, length } => {
                output.push(1);
                output.extend_from_slice(&distance.to_le_bytes());
                output.extend_from_slice(&length.to_le_bytes());
            }
        }
    }
    output
}

pub fn deserialize_path1(bytes: &[u8], expected_len: usize) -> Result<Vec<Path1Token>, CodecError> {
    let mut cursor = 0_usize;
    let mut produced = 0_usize;
    let mut tokens = Vec::new();
    while produced < expected_len {
        let tag = *bytes.get(cursor).ok_or(CodecError::Truncated("Path-1 tag"))?;
        cursor += 1;
        match tag {
            0 => {
                let byte = *bytes.get(cursor).ok_or(CodecError::Truncated("Path-1 literal"))?;
                cursor += 1;
                produced += 1;
                if produced > expected_len {
                    return Err(CodecError::LengthMismatch {
                        what: "Path-1 declared output",
                        expected: expected_len,
                        actual: produced,
                    });
                }
                tokens.push(Path1Token::Literal(byte));
            }
            1 => {
                let distance = read_u16(bytes, &mut cursor, "Path-1 match distance")?;
                let length = read_u16(bytes, &mut cursor, "Path-1 match length")?;
                let distance_usize = distance as usize;
                let length_usize = length as usize;
                if distance_usize == 0
                    || distance_usize > produced
                    || length_usize < PATH1_MIN_MATCH
                    || produced.checked_add(length_usize).is_none()
                    || produced + length_usize > expected_len
                {
                    return Err(CodecError::InvalidMatch {
                        distance: distance_usize,
                        length: length_usize,
                        produced,
                    });
                }
                produced += length_usize;
                tokens.push(Path1Token::Match { distance, length });
            }
            other => return Err(CodecError::InvalidToken(other)),
        }
    }
    if cursor != bytes.len() {
        return Err(CodecError::TrailingBytes("Path-1 stream"));
    }
    Ok(tokens)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CrtModuli {
    pub first: u16,
    pub second: u16,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CrtResidue {
    pub first: u16,
    pub second: u16,
}

/// Explicit coprime modulus pairs.  Each product is strictly greater than the
/// corresponding floor's largest symbol, so checked CRT reconstruction is
/// unique in the legal floor range.
pub fn crt_moduli(bits: u8) -> Result<CrtModuli, CodecError> {
    match bits {
        6 => Ok(CrtModuli { first: 7, second: 11 }),      // product 77 > 63
        8 => Ok(CrtModuli { first: 17, second: 19 }),     // product 323 > 255
        10 => Ok(CrtModuli { first: 31, second: 37 }),    // product 1147 > 1023
        12 => Ok(CrtModuli { first: 61, second: 71 }),    // product 4331 > 4095
        other => Err(CodecError::InvalidFloorBits(other)),
    }
}

pub fn encode_path2_crt(symbols: &[u16], bits: u8) -> Result<Vec<CrtResidue>, CodecError> {
    let moduli = crt_moduli(bits)?;
    let limit = 1_u16 << bits;
    let mut output = Vec::with_capacity(symbols.len());
    for &symbol in symbols {
        if symbol >= limit {
            return Err(CodecError::CrtOutsideFloor { value: symbol, bits });
        }
        output.push(CrtResidue {
            first: symbol % moduli.first,
            second: symbol % moduli.second,
        });
    }
    Ok(output)
}

pub fn decode_path2_crt(residues: &[CrtResidue], bits: u8) -> Result<Vec<u16>, CodecError> {
    let moduli = crt_moduli(bits)?;
    let limit = 1_u16 << bits;
    let product = moduli.first as u32 * moduli.second as u32;
    let mut output = Vec::with_capacity(residues.len());
    for residue in residues {
        if residue.first >= moduli.first {
            return Err(CodecError::InvalidResidue {
                residue: residue.first,
                modulus: moduli.first,
            });
        }
        if residue.second >= moduli.second {
            return Err(CodecError::InvalidResidue {
                residue: residue.second,
                modulus: moduli.second,
            });
        }
        let mut candidate = residue.first as u32;
        while candidate < product && candidate % moduli.second as u32 != residue.second as u32 {
            candidate += moduli.first as u32;
        }
        if candidate >= product {
            return Err(CodecError::ArithmeticState("CRT pair has no solution"));
        }
        if candidate >= limit as u32 {
            return Err(CodecError::CrtOutsideFloor {
                value: candidate as u16,
                bits,
            });
        }
        output.push(candidate as u16);
    }
    Ok(output)
}

pub fn serialize_crt(residues: &[CrtResidue]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(residues.len() * 4);
    for residue in residues {
        bytes.extend_from_slice(&residue.first.to_le_bytes());
        bytes.extend_from_slice(&residue.second.to_le_bytes());
    }
    bytes
}

pub fn deserialize_crt(bytes: &[u8], symbol_count: usize) -> Result<Vec<CrtResidue>, CodecError> {
    let expected = symbol_count
        .checked_mul(4)
        .ok_or(CodecError::LengthOverflow("CRT byte stream"))?;
    if bytes.len() != expected {
        return Err(CodecError::LengthMismatch {
            what: "CRT byte stream",
            expected,
            actual: bytes.len(),
        });
    }
    let mut output = Vec::with_capacity(symbol_count);
    let mut cursor = 0;
    for _ in 0..symbol_count {
        let first = read_u16(bytes, &mut cursor, "first CRT residue")?;
        let second = read_u16(bytes, &mut cursor, "second CRT residue")?;
        output.push(CrtResidue { first, second });
    }
    Ok(output)
}

pub fn pack_bytes_to_symbols(bytes: &[u8], bits: u8) -> Result<Vec<u16>, CodecError> {
    crt_moduli(bits)?;
    let total_bits = bytes
        .len()
        .checked_mul(8)
        .ok_or(CodecError::LengthOverflow("packed input bits"))?;
    let symbol_count = if total_bits == 0 { 0 } else { (total_bits + bits as usize - 1) / bits as usize };
    let mut symbols = Vec::with_capacity(symbol_count);
    let mut bit_position = 0_usize;
    for _ in 0..symbol_count {
        let mut symbol = 0_u16;
        for _ in 0..bits {
            symbol <<= 1;
            if bit_position < total_bits {
                let byte = bytes[bit_position / 8];
                let shift = 7 - (bit_position % 8);
                symbol |= ((byte >> shift) & 1) as u16;
            }
            bit_position += 1;
        }
        symbols.push(symbol);
    }
    Ok(symbols)
}

pub fn unpack_symbols_to_bytes(
    symbols: &[u16],
    bits: u8,
    expected_bytes: usize,
) -> Result<Vec<u8>, CodecError> {
    crt_moduli(bits)?;
    let limit = 1_u16 << bits;
    let needed_bits = expected_bytes
        .checked_mul(8)
        .ok_or(CodecError::LengthOverflow("unpacked output bits"))?;
    let expected_symbols = if needed_bits == 0 { 0 } else { (needed_bits + bits as usize - 1) / bits as usize };
    if symbols.len() != expected_symbols {
        return Err(CodecError::LengthMismatch {
            what: "floor symbol stream",
            expected: expected_symbols,
            actual: symbols.len(),
        });
    }
    let mut output = vec![0_u8; expected_bytes];
    let mut bit_position = 0_usize;
    for &symbol in symbols {
        if symbol >= limit {
            return Err(CodecError::CrtOutsideFloor { value: symbol, bits });
        }
        for bit_index in (0..bits).rev() {
            let bit = ((symbol >> bit_index) & 1) as u8;
            if bit_position < needed_bits {
                output[bit_position / 8] |= bit << (7 - bit_position % 8);
            } else if bit != 0 {
                return Err(CodecError::NonZeroPadding);
            }
            bit_position += 1;
        }
    }
    Ok(output)
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LanguageMap {
    forward: [u8; 256],
    inverse: [u8; 256],
}

impl LanguageMap {
    /// The permutation depends only on the supplied, serialized floor seed.
    pub fn from_floor_seed(seed: &[u8; 32]) -> Self {
        let mut forward = std::array::from_fn(|index| index as u8);
        let mut rng = SeedRng::new(seed, 0x4c41_4e47_5541_4745);
        for index in (1..256).rev() {
            let swap = (rng.next_u64() % (index as u64 + 1)) as usize;
            forward.swap(index, swap);
        }
        let mut inverse = [0_u8; 256];
        for (plain, glyph) in forward.iter().copied().enumerate() {
            inverse[glyph as usize] = plain as u8;
        }
        Self { forward, inverse }
    }

    pub fn encode(&self, bytes: &[u8]) -> Vec<u8> {
        bytes.iter().map(|byte| self.forward[*byte as usize]).collect()
    }

    pub fn decode(&self, glyphs: &[u8]) -> Vec<u8> {
        glyphs.iter().map(|glyph| self.inverse[*glyph as usize]).collect()
    }

    pub fn forward_table(&self) -> &[u8; 256] {
        &self.forward
    }
}

#[derive(Clone, Debug)]
struct SeedRng {
    state: u64,
}

impl SeedRng {
    fn new(seed: &[u8; 32], domain: u64) -> Self {
        let mut state = 0x9e37_79b9_7f4a_7c15_u64 ^ domain;
        for (index, byte) in seed.iter().copied().enumerate() {
            state ^= (byte as u64) << ((index % 8) * 8);
            state = state.rotate_left(17).wrapping_mul(0xbf58_476d_1ce4_e5b9);
            state ^= state >> 29;
        }
        if state == 0 {
            state = 0xd1b5_4a32_d192_ed03;
        }
        Self { state }
    }

    fn next_u64(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }
}

pub fn direction_plan(lane: DirectionLane, seed: &[u8; 32]) -> [u8; PATH3_EXPERTS] {
    match lane {
        DirectionLane::Unique => std::array::from_fn(|index| index as u8),
        DirectionLane::DuplicateSharedState => [0_u8; PATH3_EXPERTS],
        DirectionLane::ShuffleDeterministicPriorHistory => {
            let mut ids = std::array::from_fn(|index| index as u8);
            let mut rng = SeedRng::new(seed, 0x4449_5245_4354_494f);
            for index in (1..ids.len()).rev() {
                let swap = (rng.next_u64() % (index as u64 + 1)) as usize;
                ids.swap(index, swap);
            }
            ids
        }
    }
}

pub fn direction_lane_label(lane: DirectionLane) -> &'static str {
    match lane {
        DirectionLane::Unique => "UNIQUE",
        DirectionLane::DuplicateSharedState => "DUPLICATE_SHARED_STATE",
        DirectionLane::ShuffleDeterministicPriorHistory => {
            "SHUFFLE_DETERMINISTIC_PRIOR_HISTORY"
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DirectionControlMetadata {
    pub operator_slots: u16,
    pub distinct_operator_ids: u16,
    pub predictor_state_count: u16,
    pub mixer_weight_budget_bytes: u64,
}

pub fn direction_control_metadata(lane: DirectionLane) -> DirectionControlMetadata {
    DirectionControlMetadata {
        operator_slots: PATH3_EXPERTS as u16,
        distinct_operator_ids: if lane == DirectionLane::DuplicateSharedState { 1 } else { 40 },
        predictor_state_count: if lane == DirectionLane::DuplicateSharedState { 1 } else { 40 },
        mixer_weight_budget_bytes: PATH3_WEIGHT_BYTES as u64,
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Path3TracePoint {
    pub symbol_index: usize,
    pub bit_index: u8,
    pub probability_zero: u16,
    pub predicted_bits_one: u8,
    pub history_len: u8,
    pub operator_evaluations: u8,
    pub consensus_symbol: u16,
    pub null_z: u16,
    pub null_q: u16,
    pub null_r: u16,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct NullResidual {
    pub z: u16,
    pub q: u16,
    pub r: u16,
    pub radix: u16,
}

pub fn split_null_residual(
    symbol: u16,
    consensus: u16,
    floor_bits: u8,
) -> Result<NullResidual, CodecError> {
    crt_moduli(floor_bits)?;
    let limit = 1_u16 << floor_bits;
    if symbol >= limit {
        return Err(CodecError::CrtOutsideFloor { value: symbol, bits: floor_bits });
    }
    if consensus >= limit {
        return Err(CodecError::CrtOutsideFloor { value: consensus, bits: floor_bits });
    }
    let radix = 1_u16 << (floor_bits / 2);
    let z = symbol ^ consensus;
    Ok(NullResidual {
        z,
        q: z / radix,
        r: z % radix,
        radix,
    })
}

pub fn restore_null_residual(
    consensus: u16,
    residual: NullResidual,
    floor_bits: u8,
) -> Result<u16, CodecError> {
    crt_moduli(floor_bits)?;
    let expected_radix = 1_u16 << (floor_bits / 2);
    if residual.radix != expected_radix
        || residual.q >= expected_radix
        || residual.r >= expected_radix
    {
        return Err(CodecError::ArithmeticState("noncanonical null q/r residual"));
    }
    let z = residual
        .q
        .checked_mul(residual.radix)
        .and_then(|value| value.checked_add(residual.r))
        .ok_or(CodecError::ArithmeticState("null q/r reconstruction overflow"))?;
    if z != residual.z {
        return Err(CodecError::ArithmeticState("null z disagrees with q/r"));
    }
    let symbol = consensus ^ z;
    let limit = 1_u16 << floor_bits;
    if consensus >= limit || symbol >= limit {
        return Err(CodecError::CrtOutsideFloor { value: symbol, bits: floor_bits });
    }
    Ok(symbol)
}

#[derive(Clone, Debug)]
struct OnlineMixer {
    weights: [i16; PATH3_EXPERTS],
}

impl OnlineMixer {
    const INITIAL_WEIGHT: i16 = 32;
    const MIN_WEIGHT: i16 = -512;
    const MAX_WEIGHT: i16 = 512;
    const LEARNING_RATE: i16 = 2;

    fn new() -> Self {
        Self {
            weights: [Self::INITIAL_WEIGHT; PATH3_EXPERTS],
        }
    }

    /// Returns (consensus bit, p(null-residual bit == 0)) on the arithmetic
    /// coder's fixed 32768 scale.
    fn residual_zero_probability(
        &self,
        predictions: &[u8; PATH3_EXPERTS],
    ) -> (u8, u16) {
        let mut signed_vote = 0_i64;
        let mut normalization = 0_i64;
        for (prediction, weight) in predictions.iter().zip(self.weights.iter()) {
            let direction = if *prediction == 0 { 1_i64 } else { -1_i64 };
            signed_vote += direction * *weight as i64;
            normalization += (*weight as i64).abs();
        }
        let confidence = if normalization == 0 {
            0
        } else {
            signed_vote.abs().saturating_mul(12_000) / normalization
        };
        let consensus = if signed_vote >= 0 { 0 } else { 1 };
        (
            consensus,
            (16_384_i64 + confidence).clamp(16_384, 31_744) as u16,
        )
    }

    fn update(&mut self, predictions: &[u8; PATH3_EXPERTS], actual: u8) {
        for (prediction, weight) in predictions.iter().zip(self.weights.iter_mut()) {
            let delta = if *prediction == actual {
                Self::LEARNING_RATE
            } else {
                -Self::LEARNING_RATE
            };
            *weight = weight.saturating_add(delta).clamp(Self::MIN_WEIGHT, Self::MAX_WEIGHT);
        }
    }
}

fn expert_predicted_symbols(
    history: &[u16],
    floor_bits: u8,
    directions: &[u8; PATH3_EXPERTS],
    seed: &[u8; 32],
    lane: DirectionLane,
) -> Result<[u16; PATH3_EXPERTS], CodecError> {
    crt_moduli(floor_bits)?;
    let retained = &history[history.len().saturating_sub(PATH3_HISTORY)..];
    let mut shuffled_storage = Vec::new();
    let operator_history: &[u16] = if lane == DirectionLane::ShuffleDeterministicPriorHistory
        && retained.len() > 1
    {
        shuffled_storage.extend_from_slice(retained);
        let mut rng = SeedRng::new(
            seed,
            0x5052_494f_5253_4846 ^ history.len() as u64,
        );
        for index in (1..shuffled_storage.len()).rev() {
            let swap = (rng.next_u64() % (index as u64 + 1)) as usize;
            shuffled_storage.swap(index, swap);
        }
        &shuffled_storage
    } else {
        retained
    };
    let mask = (1_u16 << floor_bits) - 1;
    let mut output = [0_u16; PATH3_EXPERTS];
    for slot in 0..PATH3_EXPERTS {
        let id = directions[slot];
        output[slot] = if operator_history.is_empty() {
            let first = seed[(id as usize * 7 + slot) % seed.len()] as u16;
            let second = seed[(id as usize * 11 + slot + 1) % seed.len()] as u16;
            ((first << 8) | second) & mask
        } else {
            let view = apply_symbols(id, floor_bits, operator_history)
                .map_err(|_| CodecError::ArithmeticState("floor-native operator failed"))?;
            *view.last().ok_or(CodecError::ArithmeticState("empty operator view"))?
        };
    }
    Ok(output)
}

fn expert_predicted_bits(
    predicted_symbols: &[u16; PATH3_EXPERTS],
    floor_bits: u8,
    bit_index: u8,
) -> [u8; PATH3_EXPERTS] {
    std::array::from_fn(|slot| {
        ((predicted_symbols[slot] >> (floor_bits - 1 - bit_index)) & 1) as u8
    })
}

const ARITH_TOTAL: u64 = 32_768;
const ARITH_TOP: u64 = 0xffff_ffff;
const ARITH_HALF: u64 = 0x8000_0000;
const ARITH_FIRST_QUARTER: u64 = 0x4000_0000;
const ARITH_THIRD_QUARTER: u64 = 0xc000_0000;

#[derive(Clone, Debug)]
struct BitWriter {
    bytes: Vec<u8>,
    current: u8,
    used: u8,
}

impl BitWriter {
    fn new() -> Self {
        Self { bytes: Vec::new(), current: 0, used: 0 }
    }

    fn write(&mut self, bit: u8) {
        self.current = (self.current << 1) | (bit & 1);
        self.used += 1;
        if self.used == 8 {
            self.bytes.push(self.current);
            self.current = 0;
            self.used = 0;
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

#[derive(Clone, Debug)]
struct BitReader<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> BitReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    fn read_or_zero(&mut self) -> u8 {
        let bit = if self.position / 8 < self.bytes.len() {
            (self.bytes[self.position / 8] >> (7 - self.position % 8)) & 1
        } else {
            0
        };
        self.position += 1;
        bit
    }
}

#[derive(Clone, Debug)]
struct ArithmeticEncoder {
    low: u64,
    high: u64,
    follow: usize,
    writer: BitWriter,
}

impl ArithmeticEncoder {
    fn new() -> Self {
        Self { low: 0, high: ARITH_TOP, follow: 0, writer: BitWriter::new() }
    }

    fn output_with_follow(&mut self, bit: u8) {
        self.writer.write(bit);
        for _ in 0..self.follow {
            self.writer.write(bit ^ 1);
        }
        self.follow = 0;
    }

    fn encode_bit(&mut self, bit: u8, probability_zero: u16) -> Result<(), CodecError> {
        let p0 = probability_zero as u64;
        if !(1..ARITH_TOTAL).contains(&p0) {
            return Err(CodecError::ArithmeticState("probability outside open interval"));
        }
        let range = self.high - self.low + 1;
        let zero_range = range
            .checked_mul(p0)
            .ok_or(CodecError::ArithmeticState("range multiplication overflow"))?
            / ARITH_TOTAL;
        if zero_range == 0 || zero_range >= range {
            return Err(CodecError::ArithmeticState("degenerate interval"));
        }
        let split = self.low + zero_range - 1;
        if bit == 0 {
            self.high = split;
        } else {
            self.low = split + 1;
        }
        loop {
            if self.high < ARITH_HALF {
                self.output_with_follow(0);
            } else if self.low >= ARITH_HALF {
                self.output_with_follow(1);
                self.low -= ARITH_HALF;
                self.high -= ARITH_HALF;
            } else if self.low >= ARITH_FIRST_QUARTER && self.high < ARITH_THIRD_QUARTER {
                self.follow += 1;
                self.low -= ARITH_FIRST_QUARTER;
                self.high -= ARITH_FIRST_QUARTER;
            } else {
                break;
            }
            self.low <<= 1;
            self.high = (self.high << 1) + 1;
        }
        Ok(())
    }

    fn finish(mut self) -> Vec<u8> {
        self.follow += 1;
        if self.low < ARITH_FIRST_QUARTER {
            self.output_with_follow(0);
        } else {
            self.output_with_follow(1);
        }
        self.writer.finish()
    }
}

#[derive(Clone, Debug)]
struct ArithmeticDecoder<'a> {
    low: u64,
    high: u64,
    value: u64,
    reader: BitReader<'a>,
}

impl<'a> ArithmeticDecoder<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        let mut reader = BitReader::new(bytes);
        let mut value = 0_u64;
        for _ in 0..32 {
            value = (value << 1) | reader.read_or_zero() as u64;
        }
        Self { low: 0, high: ARITH_TOP, value, reader }
    }

    fn decode_bit(&mut self, probability_zero: u16) -> Result<u8, CodecError> {
        let p0 = probability_zero as u64;
        if !(1..ARITH_TOTAL).contains(&p0) {
            return Err(CodecError::ArithmeticState("probability outside open interval"));
        }
        if self.value < self.low || self.value > self.high {
            return Err(CodecError::ArithmeticState("code value outside interval"));
        }
        let range = self.high - self.low + 1;
        let zero_range = range
            .checked_mul(p0)
            .ok_or(CodecError::ArithmeticState("range multiplication overflow"))?
            / ARITH_TOTAL;
        if zero_range == 0 || zero_range >= range {
            return Err(CodecError::ArithmeticState("degenerate interval"));
        }
        let split = self.low + zero_range - 1;
        let bit = if self.value <= split {
            self.high = split;
            0
        } else {
            self.low = split + 1;
            1
        };
        loop {
            if self.high < ARITH_HALF {
                // no translation
            } else if self.low >= ARITH_HALF {
                self.value -= ARITH_HALF;
                self.low -= ARITH_HALF;
                self.high -= ARITH_HALF;
            } else if self.low >= ARITH_FIRST_QUARTER && self.high < ARITH_THIRD_QUARTER {
                self.value -= ARITH_FIRST_QUARTER;
                self.low -= ARITH_FIRST_QUARTER;
                self.high -= ARITH_FIRST_QUARTER;
            } else {
                break;
            }
            self.low <<= 1;
            self.high = (self.high << 1) + 1;
            self.value = (self.value << 1) + self.reader.read_or_zero() as u64;
        }
        Ok(bit)
    }
}

/// Path 3: strictly causal, floor-native 40-slot operator experts with a
/// bounded integer online mixer feeding a binary arithmetic coder.
pub fn encode_path3_symbols(
    input: &[u16],
    floor_bits: u8,
    floor_seed: &[u8; 32],
    lane: DirectionLane,
) -> Result<Vec<u8>, CodecError> {
    crt_moduli(floor_bits)?;
    let limit = 1_u16 << floor_bits;
    if input.iter().any(|symbol| *symbol >= limit) {
        let value = *input.iter().find(|symbol| **symbol >= limit).unwrap();
        return Err(CodecError::CrtOutsideFloor { value, bits: floor_bits });
    }
    let directions = direction_plan(lane, floor_seed);
    let mut mixer = OnlineMixer::new();
    let mut coder = ArithmeticEncoder::new();
    let mut retained = Vec::with_capacity(input.len());
    for &symbol in input {
        let predicted_symbols =
            expert_predicted_symbols(&retained, floor_bits, &directions, floor_seed, lane)?;
        let mut consensus_symbol = 0_u16;
        let mut updates = Vec::with_capacity(floor_bits as usize);
        for bit_index in 0..floor_bits {
            let predictions = expert_predicted_bits(&predicted_symbols, floor_bits, bit_index);
            let (consensus, residual_p0) = mixer.residual_zero_probability(&predictions);
            let actual = ((symbol >> (floor_bits - 1 - bit_index)) & 1) as u8;
            let z_bit = actual ^ consensus;
            coder.encode_bit(z_bit, residual_p0)?;
            consensus_symbol = (consensus_symbol << 1) | consensus as u16;
            updates.push((predictions, actual));
        }
        let residual = split_null_residual(symbol, consensus_symbol, floor_bits)?;
        if restore_null_residual(consensus_symbol, residual, floor_bits)? != symbol {
            return Err(CodecError::ArithmeticState("null residual self-check failed"));
        }
        for (predictions, actual) in updates {
            mixer.update(&predictions, actual);
        }
        retained.push(symbol);
    }
    Ok(coder.finish())
}

pub fn decode_path3_symbols(
    payload: &[u8],
    expected_symbols: usize,
    floor_bits: u8,
    floor_seed: &[u8; 32],
    lane: DirectionLane,
) -> Result<Vec<u16>, CodecError> {
    crt_moduli(floor_bits)?;
    let directions = direction_plan(lane, floor_seed);
    let mut mixer = OnlineMixer::new();
    let mut coder = ArithmeticDecoder::new(payload);
    let mut retained = Vec::with_capacity(expected_symbols);
    for _ in 0..expected_symbols {
        let predicted_symbols =
            expert_predicted_symbols(&retained, floor_bits, &directions, floor_seed, lane)?;
        let mut symbol = 0_u16;
        let mut consensus_symbol = 0_u16;
        let mut z = 0_u16;
        let mut updates = Vec::with_capacity(floor_bits as usize);
        for bit_index in 0..floor_bits {
            let predictions = expert_predicted_bits(&predicted_symbols, floor_bits, bit_index);
            let (consensus, residual_p0) = mixer.residual_zero_probability(&predictions);
            let z_bit = coder.decode_bit(residual_p0)?;
            let actual = z_bit ^ consensus;
            symbol = (symbol << 1) | actual as u16;
            consensus_symbol = (consensus_symbol << 1) | consensus as u16;
            z = (z << 1) | z_bit as u16;
            updates.push((predictions, actual));
        }
        let radix = 1_u16 << (floor_bits / 2);
        let residual = NullResidual {
            z,
            q: z / radix,
            r: z % radix,
            radix,
        };
        if restore_null_residual(consensus_symbol, residual, floor_bits)? != symbol {
            return Err(CodecError::ArithmeticState("decoded null residual mismatch"));
        }
        for (predictions, actual) in updates {
            mixer.update(&predictions, actual);
        }
        retained.push(symbol);
    }
    Ok(retained)
}

pub fn trace_path3_symbols(
    input: &[u16],
    floor_bits: u8,
    floor_seed: &[u8; 32],
    lane: DirectionLane,
) -> Result<Vec<Path3TracePoint>, CodecError> {
    crt_moduli(floor_bits)?;
    let limit = 1_u16 << floor_bits;
    if input.iter().any(|symbol| *symbol >= limit) {
        return Err(CodecError::CrtOutsideFloor {
            value: *input.iter().find(|symbol| **symbol >= limit).unwrap(),
            bits: floor_bits,
        });
    }
    let directions = direction_plan(lane, floor_seed);
    let mut mixer = OnlineMixer::new();
    let mut retained = Vec::with_capacity(input.len());
    let mut trace = Vec::with_capacity(input.len() * floor_bits as usize);
    for (symbol_index, &symbol) in input.iter().enumerate() {
        let predicted_symbols =
            expert_predicted_symbols(&retained, floor_bits, &directions, floor_seed, lane)?;
        let mut rows = Vec::with_capacity(floor_bits as usize);
        let mut consensus_symbol = 0_u16;
        for bit_index in 0..floor_bits {
            let predictions = expert_predicted_bits(&predicted_symbols, floor_bits, bit_index);
            let (consensus, residual_p0) = mixer.residual_zero_probability(&predictions);
            consensus_symbol = (consensus_symbol << 1) | consensus as u16;
            let actual = ((symbol >> (floor_bits - 1 - bit_index)) & 1) as u8;
            rows.push((bit_index, predictions, residual_p0, actual));
        }
        let residual = split_null_residual(symbol, consensus_symbol, floor_bits)?;
        for (bit_index, predictions, residual_p0, actual) in rows {
            trace.push(Path3TracePoint {
                symbol_index,
                bit_index,
                probability_zero: residual_p0,
                predicted_bits_one: predictions.iter().copied().sum(),
                history_len: retained.len().min(PATH3_HISTORY) as u8,
                operator_evaluations: PATH3_EXPERTS as u8,
                consensus_symbol,
                null_z: residual.z,
                null_q: residual.q,
                null_r: residual.r,
            });
            mixer.update(&predictions, actual);
        }
        retained.push(symbol);
    }
    Ok(trace)
}

fn read_exact<'a>(
    bytes: &'a [u8],
    cursor: &mut usize,
    length: usize,
    what: &'static str,
) -> Result<&'a [u8], CodecError> {
    let end = cursor
        .checked_add(length)
        .ok_or(CodecError::LengthOverflow(what))?;
    let slice = bytes.get(*cursor..end).ok_or(CodecError::Truncated(what))?;
    *cursor = end;
    Ok(slice)
}

fn read_u16(bytes: &[u8], cursor: &mut usize, what: &'static str) -> Result<u16, CodecError> {
    let raw = read_exact(bytes, cursor, 2, what)?;
    Ok(u16::from_le_bytes([raw[0], raw[1]]))
}

fn read_u64(bytes: &[u8], cursor: &mut usize, what: &'static str) -> Result<u64, CodecError> {
    let raw = read_exact(bytes, cursor, 8, what)?;
    Ok(u64::from_le_bytes(raw.try_into().expect("slice length checked")))
}

fn usize_from_u64(value: u64, what: &'static str) -> Result<usize, CodecError> {
    usize::try_from(value).map_err(|_| CodecError::LengthOverflow(what))
}

pub fn sha256(input: &[u8]) -> [u8; 32] {
    const INITIAL: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
        0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
        0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
        0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
        0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let bit_len = (input.len() as u64).wrapping_mul(8);
    let mut padded = Vec::with_capacity(input.len() + 72);
    padded.extend_from_slice(input);
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    let mut state = INITIAL;
    for chunk in padded.chunks_exact(64) {
        let mut schedule = [0_u32; 64];
        for index in 0..16 {
            let offset = index * 4;
            schedule[index] = u32::from_be_bytes([
                chunk[offset],
                chunk[offset + 1],
                chunk[offset + 2],
                chunk[offset + 3],
            ]);
        }
        for index in 16..64 {
            let s0 = schedule[index - 15].rotate_right(7)
                ^ schedule[index - 15].rotate_right(18)
                ^ (schedule[index - 15] >> 3);
            let s1 = schedule[index - 2].rotate_right(17)
                ^ schedule[index - 2].rotate_right(19)
                ^ (schedule[index - 2] >> 10);
            schedule[index] = schedule[index - 16]
                .wrapping_add(s0)
                .wrapping_add(schedule[index - 7])
                .wrapping_add(s1);
        }
        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;
        for index in 0..64 {
            let sum1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(sum1)
                .wrapping_add(choose)
                .wrapping_add(K[index])
                .wrapping_add(schedule[index]);
            let sum0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = sum0.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }
    let mut output = [0_u8; 32];
    for (index, word) in state.iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    output
}

fn flatten_residues(residues: &[CrtResidue]) -> Vec<u16> {
    let mut symbols = Vec::with_capacity(residues.len() * 2);
    for residue in residues {
        symbols.push(residue.first);
        symbols.push(residue.second);
    }
    symbols
}

fn pair_residues(symbols: &[u16]) -> Result<Vec<CrtResidue>, CodecError> {
    if symbols.len() % 2 != 0 {
        return Err(CodecError::LengthMismatch {
            what: "flattened CRT residue symbols",
            expected: symbols.len() + 1,
            actual: symbols.len(),
        });
    }
    Ok(symbols
        .chunks_exact(2)
        .map(|pair| CrtResidue { first: pair[0], second: pair[1] })
        .collect())
}

const P123_HEADER_PREFIX_LEN: usize = 152;
const P123_HEADER_LEN: usize = 184;

#[derive(Clone, Debug)]
struct ParsedHeader {
    pipeline_mode: PipelineMode,
    floor_bits: u8,
    lane: DirectionLane,
    p1_mode: P1Mode,
    floor_seed: [u8; 32],
    original_len: usize,
    path1_len: usize,
    floor_symbol_count: usize,
    path3_symbol_count: usize,
    payload_len: usize,
    original_sha256: [u8; 32],
    payload_sha256: [u8; 32],
}

fn checked_charge_sum(archive_bytes: u64, charges: ChargeSchedule) -> Result<u64, CodecError> {
    archive_bytes
        .checked_add(charges.decoder_bytes)
        .and_then(|value| value.checked_add(charges.external_catalog_bytes))
        .and_then(|value| value.checked_add(charges.external_codebook_bytes))
        .and_then(|value| value.checked_add(charges.external_model_bytes))
        .and_then(|value| value.checked_add(charges.external_learned_state_bytes))
        .ok_or(CodecError::LengthOverflow("total charged bytes"))
}

/// Encodes one explicitly tagged forced mode. PipelineMode::P123 is the
/// composed language-map -> Path-1 -> Path-2 CRT -> Path-3 stream.
pub fn encode_p123(input: &[u8], config: &P123Config) -> Result<P123Encoded, CodecError> {
    crt_moduli(config.floor_bits)?;
    if matches!(
        config.pipeline_mode,
        PipelineMode::Path2Only | PipelineMode::Path3Only
    ) && config.p1_mode != P1Mode::Auto
    {
        return Err(CodecError::InvalidP1Mode(config.p1_mode as u8));
    }
    let language = LanguageMap::from_floor_seed(&config.floor_seed);
    let mapped = language.encode(input);

    let (payload, path1_len, floor_symbol_count, path3_symbol_count) =
        match config.pipeline_mode {
            PipelineMode::Path1Only => {
                let tokens = encode_path1(&mapped, config.p1_mode)?;
                let stream = serialize_path1(&tokens);
                let length = stream.len();
                (stream, length, 0, 0)
            }
            PipelineMode::Path2Only => {
                let symbols = pack_bytes_to_symbols(&mapped, config.floor_bits)?;
                let residues = encode_path2_crt(&symbols, config.floor_bits)?;
                let count = symbols.len();
                (serialize_crt(&residues), 0, count, 0)
            }
            PipelineMode::Path3Only => {
                let symbols = pack_bytes_to_symbols(&mapped, config.floor_bits)?;
                let count = symbols.len();
                let payload = encode_path3_symbols(
                    &symbols,
                    config.floor_bits,
                    &config.floor_seed,
                    config.lane,
                )?;
                (payload, 0, count, count)
            }
            PipelineMode::P123 => {
                let tokens = encode_path1(&mapped, config.p1_mode)?;
                let path1 = serialize_path1(&tokens);
                let symbols = pack_bytes_to_symbols(&path1, config.floor_bits)?;
                let residues = encode_path2_crt(&symbols, config.floor_bits)?;
                let flattened = flatten_residues(&residues);
                let payload = encode_path3_symbols(
                    &flattened,
                    config.floor_bits,
                    &config.floor_seed,
                    config.lane,
                )?;
                (payload, path1.len(), symbols.len(), flattened.len())
            }
        };

    let original_sha256 = sha256(input);
    let payload_sha256 = sha256(&payload);
    let mut header = Vec::with_capacity(P123_HEADER_LEN);
    header.extend_from_slice(P123_MAGIC);
    header.extend_from_slice(&P123_VERSION.to_le_bytes());
    header.push(config.pipeline_mode as u8);
    header.push(config.floor_bits);
    header.push(config.lane as u8);
    header.push(config.p1_mode as u8);
    header.extend_from_slice(&[0_u8; 2]);
    header.extend_from_slice(&config.floor_seed);
    header.extend_from_slice(&(input.len() as u64).to_le_bytes());
    header.extend_from_slice(&(path1_len as u64).to_le_bytes());
    header.extend_from_slice(&(floor_symbol_count as u64).to_le_bytes());
    header.extend_from_slice(&(path3_symbol_count as u64).to_le_bytes());
    header.extend_from_slice(&(payload.len() as u64).to_le_bytes());
    header.extend_from_slice(&original_sha256);
    header.extend_from_slice(&payload_sha256);
    debug_assert_eq!(header.len(), P123_HEADER_PREFIX_LEN);
    let header_sha256 = sha256(&header);
    header.extend_from_slice(&header_sha256);
    debug_assert_eq!(header.len(), P123_HEADER_LEN);

    let mut archive = header;
    archive.extend_from_slice(&payload);
    let archive_bytes = archive.len() as u64;
    let total_charged_bytes = checked_charge_sum(archive_bytes, config.charges)?;
    let accounting = AccountingMetadata {
        archive_bytes,
        decoder_bytes: config.charges.decoder_bytes,
        external_catalog_bytes: config.charges.external_catalog_bytes,
        external_codebook_bytes: config.charges.external_codebook_bytes,
        external_model_bytes: config.charges.external_model_bytes,
        external_learned_state_bytes: config.charges.external_learned_state_bytes,
        floor_seed_bytes_in_archive: 32,
        regenerated_language_map_bytes: 256,
        regenerated_online_mixer_bytes: PATH3_WEIGHT_BYTES as u64,
        operator_slots: PATH3_EXPERTS as u16,
        online_weight_budget_bytes: PATH3_WEIGHT_BYTES as u64,
        total_charged_bytes,
    };
    Ok(P123Encoded { archive, accounting })
}

fn parse_header(archive: &[u8]) -> Result<ParsedHeader, CodecError> {
    if archive.len() < P123_HEADER_LEN {
        return Err(CodecError::Truncated("P123 header"));
    }
    let expected_header_hash: [u8; 32] = archive[P123_HEADER_PREFIX_LEN..P123_HEADER_LEN]
        .try_into()
        .expect("fixed checked slice");
    if sha256(&archive[..P123_HEADER_PREFIX_LEN]) != expected_header_hash {
        return Err(CodecError::PayloadDigestMismatch);
    }
    let mut cursor = 0_usize;
    let magic = read_exact(archive, &mut cursor, 8, "P123 magic")?;
    if magic != P123_MAGIC {
        return Err(CodecError::ArithmeticState("P123 magic mismatch"));
    }
    let version = read_u16(archive, &mut cursor, "P123 version")?;
    if version != P123_VERSION {
        return Err(CodecError::UnsupportedVersion(version));
    }
    let pipeline_mode = PipelineMode::from_u8(
        *read_exact(archive, &mut cursor, 1, "pipeline mode")?
            .first()
            .unwrap(),
    )?;
    let floor_bits = *read_exact(archive, &mut cursor, 1, "floor bits")?
        .first()
        .unwrap();
    crt_moduli(floor_bits)?;
    let lane = DirectionLane::from_u8(
        *read_exact(archive, &mut cursor, 1, "direction lane")?
            .first()
            .unwrap(),
    )?;
    let p1_mode = P1Mode::from_u8(
        *read_exact(archive, &mut cursor, 1, "Path-1 mode")?
            .first()
            .unwrap(),
    )?;
    if read_exact(archive, &mut cursor, 2, "reserved header bytes")? != [0, 0] {
        return Err(CodecError::ArithmeticState("non-zero reserved header bytes"));
    }
    let floor_seed: [u8; 32] = read_exact(archive, &mut cursor, 32, "floor seed")?
        .try_into()
        .expect("fixed checked slice");
    let original_len = usize_from_u64(read_u64(archive, &mut cursor, "original length")?, "original length")?;
    let path1_len = usize_from_u64(read_u64(archive, &mut cursor, "Path-1 length")?, "Path-1 length")?;
    let floor_symbol_count = usize_from_u64(
        read_u64(archive, &mut cursor, "floor symbol count")?,
        "floor symbol count",
    )?;
    let path3_symbol_count = usize_from_u64(
        read_u64(archive, &mut cursor, "Path-3 symbol count")?,
        "Path-3 symbol count",
    )?;
    let payload_len = usize_from_u64(read_u64(archive, &mut cursor, "payload length")?, "payload length")?;
    let original_sha256: [u8; 32] = read_exact(archive, &mut cursor, 32, "original SHA-256")?
        .try_into()
        .expect("fixed checked slice");
    let payload_sha256: [u8; 32] = read_exact(archive, &mut cursor, 32, "payload SHA-256")?
        .try_into()
        .expect("fixed checked slice");
    if cursor != P123_HEADER_PREFIX_LEN {
        return Err(CodecError::ArithmeticState("header grammar drift"));
    }
    let actual_archive_len = P123_HEADER_LEN
        .checked_add(payload_len)
        .ok_or(CodecError::LengthOverflow("archive length"))?;
    if archive.len() != actual_archive_len {
        return Err(CodecError::LengthMismatch {
            what: "P123 archive",
            expected: actual_archive_len,
            actual: archive.len(),
        });
    }
    Ok(ParsedHeader {
        pipeline_mode,
        floor_bits,
        lane,
        p1_mode,
        floor_seed,
        original_len,
        path1_len,
        floor_symbol_count,
        path3_symbol_count,
        payload_len,
        original_sha256,
        payload_sha256,
    })
}

/// Decodes according to the authenticated pipeline-mode tag. There is no
/// fallback from a failed forced mode into a different path.
pub fn decode_p123(archive: &[u8]) -> Result<Vec<u8>, CodecError> {
    let header = parse_header(archive)?;
    let payload = &archive[P123_HEADER_LEN..];
    debug_assert_eq!(payload.len(), header.payload_len);
    if sha256(payload) != header.payload_sha256 {
        return Err(CodecError::PayloadDigestMismatch);
    }
    let language = LanguageMap::from_floor_seed(&header.floor_seed);
    let mapped = match header.pipeline_mode {
        PipelineMode::Path1Only => {
            if header.path1_len != payload.len()
                || header.floor_symbol_count != 0
                || header.path3_symbol_count != 0
            {
                return Err(CodecError::ArithmeticState("Path1-only header invariants"));
            }
            let tokens = deserialize_path1(payload, header.original_len)?;
            validate_path1_mode(&tokens, header.p1_mode)?;
            decode_path1(&tokens, header.original_len)?
        }
        PipelineMode::Path2Only => {
            if header.path1_len != 0
                || header.path3_symbol_count != 0
                || header.p1_mode != P1Mode::Auto
            {
                return Err(CodecError::ArithmeticState("Path2-only header invariants"));
            }
            let residues = deserialize_crt(payload, header.floor_symbol_count)?;
            let symbols = decode_path2_crt(&residues, header.floor_bits)?;
            unpack_symbols_to_bytes(&symbols, header.floor_bits, header.original_len)?
        }
        PipelineMode::Path3Only => {
            if header.path1_len != 0
                || header.path3_symbol_count != header.floor_symbol_count
                || header.p1_mode != P1Mode::Auto
            {
                return Err(CodecError::ArithmeticState("Path3-only header invariants"));
            }
            let symbols = decode_path3_symbols(
                payload,
                header.path3_symbol_count,
                header.floor_bits,
                &header.floor_seed,
                header.lane,
            )?;
            unpack_symbols_to_bytes(&symbols, header.floor_bits, header.original_len)?
        }
        PipelineMode::P123 => {
            let expected_path3 = header
                .floor_symbol_count
                .checked_mul(2)
                .ok_or(CodecError::LengthOverflow("P123 residue symbols"))?;
            if header.path3_symbol_count != expected_path3 {
                return Err(CodecError::ArithmeticState("P123 header residue-count invariant"));
            }
            let residue_symbols = decode_path3_symbols(
                payload,
                header.path3_symbol_count,
                header.floor_bits,
                &header.floor_seed,
                header.lane,
            )?;
            let residues = pair_residues(&residue_symbols)?;
            let symbols = decode_path2_crt(&residues, header.floor_bits)?;
            let path1 = unpack_symbols_to_bytes(&symbols, header.floor_bits, header.path1_len)?;
            let tokens = deserialize_path1(&path1, header.original_len)?;
            validate_path1_mode(&tokens, header.p1_mode)?;
            decode_path1(&tokens, header.original_len)?
        }
    };
    let original = language.decode(&mapped);
    if original.len() != header.original_len {
        return Err(CodecError::LengthMismatch {
            what: "restored original",
            expected: header.original_len,
            actual: original.len(),
        });
    }
    if sha256(&original) != header.original_sha256 {
        return Err(CodecError::OriginalDigestMismatch);
    }
    Ok(original)
}

#[cfg(test)]
mod path123_tests {
    use super::*;
    use std::collections::HashSet;

    fn seed(salt: u8) -> [u8; 32] {
        std::array::from_fn(|index| {
            salt.wrapping_add(index as u8)
                .rotate_left((index % 8) as u32)
                ^ 0xa5
        })
    }

    fn payload(length: usize, salt: u64) -> Vec<u8> {
        let mut state = 0x9e37_79b9_7f4a_7c15_u64 ^ salt ^ length as u64;
        (0..length)
            .map(|index| {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                (state as u8).wrapping_add(index as u8)
            })
            .collect()
    }

    fn config(
        bits: u8,
        pipeline_mode: PipelineMode,
        lane: DirectionLane,
        p1_mode: P1Mode,
    ) -> P123Config {
        P123Config {
            floor_bits: bits,
            floor_seed: seed(bits),
            lane,
            p1_mode,
            pipeline_mode,
            charges: ChargeSchedule::default(),
        }
    }

    #[test]
    fn std_only_sha256_matches_nist_vectors() {
        assert_eq!(
            sha256(b""),
            [
                0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14,
                0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
                0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c,
                0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55,
            ]
        );
        assert_eq!(
            sha256(b"abc"),
            [
                0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea,
                0x41, 0x41, 0x40, 0xde, 0x5d, 0xae, 0x22, 0x23,
                0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c,
                0xb4, 0x10, 0xff, 0x61, 0xf2, 0x00, 0x15, 0xad,
            ]
        );
    }

    #[test]
    fn language_map_is_seed_only_deterministic_bijective_and_reversible() {
        let first = LanguageMap::from_floor_seed(&seed(1));
        let same = LanguageMap::from_floor_seed(&seed(1));
        let other = LanguageMap::from_floor_seed(&seed(2));
        assert_eq!(first, same);
        assert_ne!(first.forward_table(), other.forward_table());
        let unique = first.forward_table().iter().copied().collect::<HashSet<_>>();
        assert_eq!(unique.len(), 256);
        let input = (0_u8..=255).collect::<Vec<_>>();
        assert_eq!(first.decode(&first.encode(&input)), input);
    }

    #[test]
    fn path1_forced_literal_and_auto_roundtrip_property() {
        for length in 0..=257 {
            let input = payload(length, 0x5031);
            for mode in [P1Mode::LiteralOnly, P1Mode::Auto] {
                let tokens = encode_path1(&input, mode).unwrap();
                if mode == P1Mode::LiteralOnly {
                    assert!(tokens.iter().all(|token| matches!(token, Path1Token::Literal(_))));
                }
                assert_eq!(decode_path1(&tokens, input.len()).unwrap(), input);
                let wire = serialize_path1(&tokens);
                let parsed = deserialize_path1(&wire, input.len()).unwrap();
                assert_eq!(parsed, tokens);
            }
        }
        let repeated = b"abcabcabcabcabcabcabcabc";
        let tokens = encode_path1(repeated, P1Mode::RequireMatch).unwrap();
        assert!(tokens.iter().any(|token| matches!(token, Path1Token::Match { .. })));
        assert_eq!(decode_path1(&tokens, repeated.len()).unwrap(), repeated);
        assert_eq!(
            encode_path1(b"xy", P1Mode::RequireMatch),
            Err(CodecError::RequiredMatchMissing)
        );
    }

    #[test]
    fn path1_rejects_forward_zero_short_overrun_and_trailing_references() {
        for token in [
            Path1Token::Match { distance: 0, length: 3 },
            Path1Token::Match { distance: 1, length: 2 },
            Path1Token::Match { distance: 2, length: 3 },
        ] {
            assert!(decode_path1(&[token], 3).is_err());
        }
        assert!(decode_path1(
            &[Path1Token::Literal(b'a'), Path1Token::Match { distance: 1, length: 5 }],
            4
        )
        .is_err());
        let mut valid = serialize_path1(&[Path1Token::Literal(7)]);
        valid.extend_from_slice(&[0, 8]);
        assert_eq!(
            deserialize_path1(&valid, 1),
            Err(CodecError::TrailingBytes("Path-1 stream"))
        );
    }

    #[test]
    fn path2_exact_moduli_exhaustive_roundtrip_and_adversarial_rejection() {
        let expected = [
            (6, CrtModuli { first: 7, second: 11 }),
            (8, CrtModuli { first: 17, second: 19 }),
            (10, CrtModuli { first: 31, second: 37 }),
            (12, CrtModuli { first: 61, second: 71 }),
        ];
        for (bits, exact) in expected {
            assert_eq!(crt_moduli(bits).unwrap(), exact);
            let limit = 1_u16 << bits;
            let symbols = (0..limit).collect::<Vec<_>>();
            let residues = encode_path2_crt(&symbols, bits).unwrap();
            assert_eq!(decode_path2_crt(&residues, bits).unwrap(), symbols);
            assert!(matches!(
                decode_path2_crt(
                    &[CrtResidue { first: exact.first, second: 0 }],
                    bits
                ),
                Err(CodecError::InvalidResidue { .. })
            ));
            let forbidden = limit;
            assert_eq!(
                decode_path2_crt(
                    &[CrtResidue {
                        first: forbidden % exact.first,
                        second: forbidden % exact.second,
                    }],
                    bits
                ),
                Err(CodecError::CrtOutsideFloor { value: forbidden, bits })
            );
        }
    }

    #[test]
    fn floor_bit_packing_is_exact_and_rejects_nonzero_padding() {
        for bits in [6_u8, 8, 10, 12] {
            for length in 0..=129 {
                let input = payload(length, 0x5041434b ^ bits as u64);
                let symbols = pack_bytes_to_symbols(&input, bits).unwrap();
                assert_eq!(
                    unpack_symbols_to_bytes(&symbols, bits, input.len()).unwrap(),
                    input
                );
                if length > 0 && (length * 8) % bits as usize != 0 {
                    let mut poisoned = symbols.clone();
                    *poisoned.last_mut().unwrap() |= 1;
                    assert_eq!(
                        unpack_symbols_to_bytes(&poisoned, bits, input.len()),
                        Err(CodecError::NonZeroPadding)
                    );
                }
            }
        }
    }

    #[test]
    fn path3_forced_lanes_roundtrip_floor_native_symbols_including_values_above_255() {
        for bits in [6_u8, 8, 10, 12] {
            let mask = (1_u16 << bits) - 1;
            let mut symbols = (0..96)
                .map(|index| ((index * 173 + index * index * 7) as u16) & mask)
                .collect::<Vec<_>>();
            if bits >= 10 {
                symbols.extend_from_slice(&[256, 511, 700 & mask, mask]);
                assert!(symbols.iter().any(|symbol| *symbol > 255));
            }
            for lane in [
                DirectionLane::Unique,
                DirectionLane::DuplicateSharedState,
                DirectionLane::ShuffleDeterministicPriorHistory,
            ] {
                let compressed = encode_path3_symbols(&symbols, bits, &seed(bits), lane).unwrap();
                let restored =
                    decode_path3_symbols(&compressed, symbols.len(), bits, &seed(bits), lane).unwrap();
                assert_eq!(restored, symbols, "bits={bits} lane={lane:?}");
                let trace = trace_path3_symbols(&symbols, bits, &seed(bits), lane).unwrap();
                assert_eq!(trace.len(), symbols.len() * bits as usize);
                assert!(trace.iter().all(|row| row.operator_evaluations == 40));
            }
        }
    }

    #[test]
    fn null_residual_z_and_qr_are_exhaustively_exact_and_reject_noncanonical_forms() {
        for bits in [6_u8, 8, 10, 12] {
            let limit = 1_u16 << bits;
            let mask = limit - 1;
            for symbol in 0..limit {
                let consensus = symbol.rotate_left((bits / 2) as u32) & mask;
                let residual = split_null_residual(symbol, consensus, bits).unwrap();
                assert_eq!(
                    residual.z,
                    residual.q * residual.radix + residual.r
                );
                assert_eq!(
                    restore_null_residual(consensus, residual, bits).unwrap(),
                    symbol
                );
            }
            let radix = 1_u16 << (bits / 2);
            assert!(restore_null_residual(
                0,
                NullResidual { z: 0, q: radix, r: 0, radix },
                bits,
            )
            .is_err());
            assert!(restore_null_residual(
                0,
                NullResidual { z: 1, q: 0, r: 0, radix },
                bits,
            )
            .is_err());
        }
    }

    #[test]
    fn high_floor_symbols_are_not_silently_truncated_to_byte_views() {
        let high = [0x300_u16, 0x201, 0x3ff, 0x155, 0x2aa];
        let low = high.map(|symbol| symbol & 0xff);
        let high_trace =
            trace_path3_symbols(&high, 10, &seed(10), DirectionLane::Unique).unwrap();
        let low_trace =
            trace_path3_symbols(&low, 10, &seed(10), DirectionLane::Unique).unwrap();
        assert_ne!(high_trace, low_trace);
        assert_eq!(
            decode_path3_symbols(
                &encode_path3_symbols(&high, 10, &seed(10), DirectionLane::Unique).unwrap(),
                high.len(),
                10,
                &seed(10),
                DirectionLane::Unique,
            )
            .unwrap(),
            high
        );
    }

    #[test]
    fn suffix_poison_cannot_change_any_prefix_probability_or_expert_trace() {
        let prefix = [0x301_u16, 0x155, 0x2ab, 0x3ff, 0x100, 0x002];
        let mut left = prefix.to_vec();
        left.extend_from_slice(&[1, 2, 3, 4, 5]);
        let mut right = prefix.to_vec();
        right.extend_from_slice(&[1023, 900, 800, 700, 600, 500]);
        for lane in [
            DirectionLane::Unique,
            DirectionLane::DuplicateSharedState,
            DirectionLane::ShuffleDeterministicPriorHistory,
        ] {
            let left_trace = trace_path3_symbols(&left, 10, &seed(33), lane).unwrap();
            let right_trace = trace_path3_symbols(&right, 10, &seed(33), lane).unwrap();
            assert_eq!(
                &left_trace[..prefix.len() * 10],
                &right_trace[..prefix.len() * 10],
                "suffix leaked into causal prefix for {lane:?}"
            );
        }
    }

    #[test]
    fn unique_duplicate_shuffle_controls_have_fixed_budget_and_explicit_semantics() {
        let lanes = [
            DirectionLane::Unique,
            DirectionLane::DuplicateSharedState,
            DirectionLane::ShuffleDeterministicPriorHistory,
        ];
        assert_eq!(direction_lane_label(lanes[0]), "UNIQUE");
        assert_eq!(direction_lane_label(lanes[1]), "DUPLICATE_SHARED_STATE");
        assert_eq!(
            direction_lane_label(lanes[2]),
            "SHUFFLE_DETERMINISTIC_PRIOR_HISTORY"
        );
        for lane in lanes {
            let metadata = direction_control_metadata(lane);
            assert_eq!(metadata.operator_slots, 40);
            assert_eq!(metadata.mixer_weight_budget_bytes, PATH3_WEIGHT_BYTES as u64);
        }
        assert_eq!(
            direction_control_metadata(DirectionLane::DuplicateSharedState)
                .predictor_state_count,
            1
        );
        let duplicate = direction_plan(DirectionLane::DuplicateSharedState, &seed(4));
        assert!(duplicate.iter().all(|id| *id == 0));
        let unique = direction_plan(DirectionLane::Unique, &seed(4));
        let mut shuffled =
            direction_plan(DirectionLane::ShuffleDeterministicPriorHistory, &seed(4));
        shuffled.sort_unstable();
        assert_eq!(shuffled, unique);
    }

    #[test]
    fn forced_archive_modes_take_distinct_authenticated_decode_paths_and_roundtrip() {
        let input = b"forced-mode property abcabcabcabc -- retained data";
        let modes = [
            PipelineMode::Path1Only,
            PipelineMode::Path2Only,
            PipelineMode::Path3Only,
            PipelineMode::P123,
        ];
        let mut archives = Vec::new();
        for mode in modes {
            let encoded = encode_p123(
                input,
                &config(
                    10,
                    mode,
                    DirectionLane::Unique,
                    if matches!(mode, PipelineMode::Path1Only | PipelineMode::P123) {
                        P1Mode::RequireMatch
                    } else {
                        P1Mode::Auto
                    },
                ),
            )
            .unwrap();
            assert_eq!(encoded.archive[10], mode as u8);
            assert_eq!(decode_p123(&encoded.archive).unwrap(), input);
            archives.push(encoded.archive);
        }
        assert_eq!(archives.iter().collect::<HashSet<_>>().len(), 4);
        for archive in archives {
            let mut changed_tag = archive.clone();
            changed_tag[10] = if changed_tag[10] == 4 { 1 } else { changed_tag[10] + 1 };
            assert!(decode_p123(&changed_tag).is_err());
        }
    }

    fn reseal_header_after_test_mutation(archive: &mut [u8]) {
        let digest = sha256(&archive[..P123_HEADER_PREFIX_LEN]);
        archive[P123_HEADER_PREFIX_LEN..P123_HEADER_LEN].copy_from_slice(&digest);
    }

    #[test]
    fn authenticated_path1_modes_are_semantically_enforced_and_irrelevant_tags_are_canonical() {
        let repeated = b"abcabcabcabcabcabcabcabc";
        for pipeline_mode in [PipelineMode::Path1Only, PipelineMode::P123] {
            let auto = encode_p123(
                repeated,
                &config(
                    8,
                    pipeline_mode,
                    DirectionLane::Unique,
                    P1Mode::Auto,
                ),
            )
            .unwrap();
            let mut false_literal_claim = auto.archive;
            false_literal_claim[13] = P1Mode::LiteralOnly as u8;
            reseal_header_after_test_mutation(&mut false_literal_claim);
            assert!(matches!(
                decode_p123(&false_literal_claim),
                Err(CodecError::ArithmeticState(
                    "authenticated LiteralOnly stream contains a match token"
                ))
            ));

            let literal = encode_p123(
                b"xy",
                &config(
                    8,
                    pipeline_mode,
                    DirectionLane::Unique,
                    P1Mode::LiteralOnly,
                ),
            )
            .unwrap();
            let mut false_match_claim = literal.archive;
            false_match_claim[13] = P1Mode::RequireMatch as u8;
            reseal_header_after_test_mutation(&mut false_match_claim);
            assert_eq!(
                decode_p123(&false_match_claim),
                Err(CodecError::RequiredMatchMissing)
            );
        }

        for pipeline_mode in [PipelineMode::Path2Only, PipelineMode::Path3Only] {
            let mut noncanonical = config(
                8,
                pipeline_mode,
                DirectionLane::Unique,
                P1Mode::LiteralOnly,
            );
            assert_eq!(
                encode_p123(b"irrelevant mode must be Auto", &noncanonical),
                Err(CodecError::InvalidP1Mode(P1Mode::LiteralOnly as u8))
            );
            noncanonical.p1_mode = P1Mode::Auto;
            let valid = encode_p123(b"canonical forced mode", &noncanonical).unwrap();
            let mut forged = valid.archive;
            forged[13] = P1Mode::LiteralOnly as u8;
            reseal_header_after_test_mutation(&mut forged);
            assert!(decode_p123(&forged).is_err());
        }
    }

    #[test]
    fn composed_p123_roundtrips_all_floor_widths_and_control_lanes() {
        let inputs = [
            Vec::new(),
            b"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_vec(),
            b"abcabcabcabcabcabc--whole-P123".to_vec(),
            payload(71, 0x50313233),
        ];
        for bits in [6_u8, 8, 10, 12] {
            for lane in [
                DirectionLane::Unique,
                DirectionLane::DuplicateSharedState,
                DirectionLane::ShuffleDeterministicPriorHistory,
            ] {
                for input in &inputs {
                    let encoded = encode_p123(
                        input,
                        &config(bits, PipelineMode::P123, lane, P1Mode::Auto),
                    )
                    .unwrap();
                    assert_eq!(
                        decode_p123(&encoded.archive).unwrap(),
                        *input,
                        "bits={bits} lane={lane:?} len={}",
                        input.len()
                    );
                }
            }
        }
    }

    #[test]
    fn p123_is_deterministic_and_rejects_header_payload_truncation_and_extension_corruption() {
        let input = b"deterministic corruption target target target";
        let cfg = config(
            12,
            PipelineMode::P123,
            DirectionLane::ShuffleDeterministicPriorHistory,
            P1Mode::Auto,
        );
        let first = encode_p123(input, &cfg).unwrap().archive;
        let second = encode_p123(input, &cfg).unwrap().archive;
        assert_eq!(first, second);

        let mut header_flip = first.clone();
        header_flip[11] ^= 2;
        assert!(decode_p123(&header_flip).is_err());

        let mut payload_flip = first.clone();
        let last = payload_flip.len() - 1;
        payload_flip[last] ^= 0x80;
        assert_eq!(decode_p123(&payload_flip), Err(CodecError::PayloadDigestMismatch));

        let mut truncated = first.clone();
        truncated.pop();
        assert!(decode_p123(&truncated).is_err());

        let mut extended = first.clone();
        extended.push(0);
        assert!(decode_p123(&extended).is_err());
    }

    #[test]
    fn accounting_charges_every_external_category_and_exposes_regenerated_state() {
        let cfg = P123Config {
            floor_bits: 8,
            floor_seed: seed(77),
            lane: DirectionLane::Unique,
            p1_mode: P1Mode::Auto,
            pipeline_mode: PipelineMode::P123,
            charges: ChargeSchedule {
                decoder_bytes: 1000,
                external_catalog_bytes: 200,
                external_codebook_bytes: 30,
                external_model_bytes: 400,
                external_learned_state_bytes: 50,
            },
        };
        let encoded = encode_p123(b"account every byte every byte", &cfg).unwrap();
        let accounting = encoded.accounting;
        assert_eq!(accounting.archive_bytes, encoded.archive.len() as u64);
        assert_eq!(
            accounting.total_charged_bytes,
            encoded.archive.len() as u64 + 1000 + 200 + 30 + 400 + 50
        );
        assert_eq!(accounting.floor_seed_bytes_in_archive, 32);
        assert_eq!(accounting.regenerated_language_map_bytes, 256);
        assert_eq!(accounting.regenerated_online_mixer_bytes, 80);
        assert_eq!(accounting.online_weight_budget_bytes, 80);
        assert_eq!(accounting.operator_slots, 40);
    }

    #[test]
    fn every_pipeline_mode_handles_empty_input() {
        for mode in [
            PipelineMode::Path1Only,
            PipelineMode::Path2Only,
            PipelineMode::Path3Only,
            PipelineMode::P123,
        ] {
            let encoded = encode_p123(
                &[],
                &config(6, mode, DirectionLane::Unique, P1Mode::Auto),
            )
            .unwrap();
            assert_eq!(decode_p123(&encoded.archive).unwrap(), Vec::<u8>::new());
        }
    }
}
