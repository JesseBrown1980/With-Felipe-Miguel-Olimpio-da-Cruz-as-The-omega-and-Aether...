#![forbid(unsafe_code)]

use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

type AppResult<T> = Result<T, String>;

const MAGIC: &[u8; 8] = b"OFCV0\0\r\n";
const VERSION: u16 = 1;
const HEADER_LEN: usize = 224;
const FLOORS: [u16; 4] = [64, 256, 1024, 4096];
const MAX_DIRECTIONS: usize = 64;
const COUNT_LIMIT: u32 = 16_383;

const FLAG_STRICT_CAUSAL: u32 = 1 << 0;
const FLAG_OMEGA_TRANSMITTED: u32 = 1 << 1;
const FLAG_OMEGA_COMMITMENT_ONLY: u32 = 1 << 2;
const FLAG_MODEL_REGENERATED: u32 = 1 << 3;
const FLAG_XOR_RESIDUAL: u32 = 1 << 4;
const FLAG_ARITHMETIC_CODED: u32 = 1 << 5;
const FLAG_STATE_PERSISTENT: u32 = 1 << 6;
const FLAG_RESET_CONTROL: u32 = 1 << 7;
const COMMON_FLAGS: u32 = FLAG_STRICT_CAUSAL
    | FLAG_OMEGA_TRANSMITTED
    | FLAG_OMEGA_COMMITMENT_ONLY
    | FLAG_MODEL_REGENERATED
    | FLAG_XOR_RESIDUAL
    | FLAG_ARITHMETIC_CODED;
const RESET_INTERVAL: usize = 256;

const PROVIDER_GENERIC_CAUSAL_LAG_V0: u8 = 1;
const PROVIDER_DESCRIPTOR: &[u8] =
    b"GENERIC_CAUSAL_LAG_V0|fixed_code=1|rnq=NOT_IMPLEMENTED|family_8_12_pi=NOT_IMPLEMENTED";
const OMEGA_DOMAIN: &[u8] = b"ASOLARIA-OMEGA-CHILD-COMMITMENT-V0\0";

#[cfg(test)]
const OFFSET_FLOOR: usize = 12;
#[cfg(test)]
const OFFSET_INPUT_SHA: usize = 42;
#[cfg(test)]
const OFFSET_CHILD_OMEGA: usize = 74;
#[cfg(test)]
const OFFSET_PROVIDER_COMMITMENT: usize = 138;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Lane {
    Baseline,
    Unique,
    DuplicateSharedState,
    ShuffleDeterministicPriorHistory,
    Reset,
    BookkeepingPermutation,
}

impl Lane {
    fn parse(value: &str) -> AppResult<Self> {
        match value {
            "baseline" => Ok(Self::Baseline),
            "unique" => Ok(Self::Unique),
            "duplicate" | "duplicate_shared_state" => Ok(Self::DuplicateSharedState),
            "shuffle" | "shuffle_deterministic_prior_history" => {
                Ok(Self::ShuffleDeterministicPriorHistory)
            }
            "reset" => Ok(Self::Reset),
            "permutation" | "bookkeeping_permutation" => Ok(Self::BookkeepingPermutation),
            _ => Err(format!("unknown lane: {value}")),
        }
    }

    fn code(self) -> u8 {
        match self {
            Self::Baseline => 0,
            Self::Unique => 1,
            Self::DuplicateSharedState => 2,
            Self::ShuffleDeterministicPriorHistory => 3,
            Self::Reset => 4,
            Self::BookkeepingPermutation => 5,
        }
    }

    fn from_code(value: u8) -> AppResult<Self> {
        match value {
            0 => Ok(Self::Baseline),
            1 => Ok(Self::Unique),
            2 => Ok(Self::DuplicateSharedState),
            3 => Ok(Self::ShuffleDeterministicPriorHistory),
            4 => Ok(Self::Reset),
            5 => Ok(Self::BookkeepingPermutation),
            _ => Err(format!("unknown lane code: {value}")),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Baseline => "BASELINE_GENERIC_ONE_DIRECTION",
            Self::Unique => "UNIQUE",
            Self::DuplicateSharedState => "DUPLICATE_SHARED_STATE",
            Self::ShuffleDeterministicPriorHistory => "SHUFFLE_DETERMINISTIC_PRIOR_HISTORY",
            Self::Reset => "RESET",
            Self::BookkeepingPermutation => "BOOKKEEPING_PERMUTATION",
        }
    }

    fn flags(self) -> u32 {
        COMMON_FLAGS
            | if self == Self::Reset {
                FLAG_RESET_CONTROL
            } else {
                FLAG_STATE_PERSISTENT
            }
    }

    fn state_mode(self) -> &'static str {
        if self == Self::Reset {
            "RESET_EVERY_256_SYMBOLS"
        } else {
            "PERSISTENT_WITHIN_STAGE"
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
struct Charges {
    decoder: u64,
    codebooks: u64,
    catalogs: u64,
    learned_state: u64,
    external_model: u64,
}

impl Charges {
    fn total(self) -> AppResult<u64> {
        [
            self.decoder,
            self.codebooks,
            self.catalogs,
            self.learned_state,
            self.external_model,
        ]
        .into_iter()
        .try_fold(0u64, |sum, value| {
            sum.checked_add(value)
                .ok_or_else(|| "external charge total overflow".to_string())
        })
    }
}

#[derive(Clone, Debug)]
struct StageConfig {
    floor: u16,
    lane: Lane,
    requested_directions: usize,
}

#[derive(Clone, Debug)]
struct StageHeader {
    floor: u16,
    lane: Lane,
    provider_id: u8,
    requested_directions: usize,
    pass_checkpoint: u32,
    flags: u32,
    input_len: usize,
    payload_len: usize,
    input_sha: [u8; 32],
    child_omega: [u8; 32],
    payload_sha: [u8; 32],
    provider_commitment: [u8; 32],
    charges: Charges,
    external_total: u64,
}

#[derive(Clone, Debug)]
struct StageReport {
    archive_bytes: usize,
    header: StageHeader,
}

#[derive(Clone, Debug)]
struct NestedReport {
    source_len: usize,
    source_sha: [u8; 32],
    archive_len: usize,
    archive_sha: [u8; 32],
    root_omega: [u8; 32],
    external_charges: u64,
    charged_size: u64,
    stages_outer_to_inner: Vec<StageReport>,
}

trait DirectionProvider {
    fn id(&self) -> u8;
    fn descriptor(&self) -> &'static [u8];
    fn direction_plan(
        &self,
        lane: Lane,
        requested: usize,
        omega_seed: &[u8; 32],
        floor: u16,
    ) -> AppResult<Vec<usize>>;
    fn predict(&self, history: &[u8], plan: &[usize], omega_seed: &[u8; 32]) -> u8;
}

struct GenericCausalLagProvider;

impl GenericCausalLagProvider {
    fn direction_value(&self, history: &[u8], direction_id: usize, omega_seed: &[u8; 32]) -> u8 {
        let lag = lag_for(direction_id);
        if history.len() >= lag {
            history[history.len() - lag]
        } else {
            omega_seed[direction_id % omega_seed.len()]
                ^ (direction_id as u8).wrapping_mul(0x3d)
                ^ (lag as u8).wrapping_mul(0x17)
        }
    }
}

impl DirectionProvider for GenericCausalLagProvider {
    fn id(&self) -> u8 {
        PROVIDER_GENERIC_CAUSAL_LAG_V0
    }

    fn descriptor(&self) -> &'static [u8] {
        PROVIDER_DESCRIPTOR
    }

    fn direction_plan(
        &self,
        lane: Lane,
        requested: usize,
        omega_seed: &[u8; 32],
        floor: u16,
    ) -> AppResult<Vec<usize>> {
        if requested == 0 || requested > MAX_DIRECTIONS {
            return Err(format!(
                "direction count must be in 1..={MAX_DIRECTIONS}, got {requested}"
            ));
        }
        let mut plan = match lane {
            Lane::Baseline => vec![0],
            Lane::DuplicateSharedState => vec![0; requested],
            Lane::Unique | Lane::Reset | Lane::BookkeepingPermutation => (0..requested).collect(),
            Lane::ShuffleDeterministicPriorHistory => {
                let pool_size = (requested * 2).min(MAX_DIRECTIONS).max(requested);
                (0..pool_size).collect()
            }
        };
        if matches!(
            lane,
            Lane::ShuffleDeterministicPriorHistory | Lane::BookkeepingPermutation
        ) && plan.len() > 1
        {
            let mut state = u64::from_le_bytes(omega_seed[..8].try_into().unwrap())
                ^ (floor as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15);
            for index in (1..plan.len()).rev() {
                state ^= state >> 12;
                state ^= state << 25;
                state ^= state >> 27;
                state = state.wrapping_mul(0x2545_f491_4f6c_dd1d);
                let other = (state as usize) % (index + 1);
                plan.swap(index, other);
            }
        }
        if lane == Lane::ShuffleDeterministicPriorHistory {
            plan.truncate(requested);
        }
        Ok(plan)
    }

    fn predict(&self, history: &[u8], plan: &[usize], omega_seed: &[u8; 32]) -> u8 {
        let mut output = 0u8;
        let tie_break = self.direction_value(history, 0, omega_seed);
        for bit in 0..8 {
            let mask = 1u8 << bit;
            let ones = plan
                .iter()
                .filter(|&&direction| {
                    self.direction_value(history, direction, omega_seed) & mask != 0
                })
                .count();
            if ones * 2 > plan.len() || (ones * 2 == plan.len() && tie_break & mask != 0) {
                output |= mask;
            }
        }
        output
    }
}

static GENERIC_PROVIDER: GenericCausalLagProvider = GenericCausalLagProvider;

fn provider_for_id(id: u8) -> AppResult<&'static dyn DirectionProvider> {
    match id {
        PROVIDER_GENERIC_CAUSAL_LAG_V0 => Ok(&GENERIC_PROVIDER),
        _ => Err(format!("unsupported direction provider id: {id}")),
    }
}

fn is_prime(value: usize) -> bool {
    if value < 2 {
        return false;
    }
    if value == 2 {
        return true;
    }
    if value % 2 == 0 {
        return false;
    }
    let mut divisor = 3usize;
    while divisor.saturating_mul(divisor) <= value {
        if value % divisor == 0 {
            return false;
        }
        divisor += 2;
    }
    true
}

fn lag_for(direction_id: usize) -> usize {
    if direction_id == 0 {
        return 1;
    }
    let mut found = 0usize;
    let mut candidate = 2usize;
    loop {
        if is_prime(candidate) {
            found += 1;
            if found == direction_id {
                return candidate;
            }
        }
        candidate += 1;
    }
}

#[derive(Clone, Copy)]
struct Cell {
    zero: u16,
    one: u16,
}

impl Cell {
    fn new() -> Self {
        Self { zero: 1, one: 1 }
    }

    fn probability_one(self) -> u32 {
        let total = self.zero as u32 + self.one as u32;
        (((self.one as u64 * 65_536) / total as u64) as u32).clamp(1, 65_535)
    }

    fn update(&mut self, bit: u8) {
        if bit == 0 {
            self.zero = self.zero.saturating_add(1);
        } else {
            self.one = self.one.saturating_add(1);
        }
        if self.zero as u32 + self.one as u32 > COUNT_LIMIT {
            self.zero = ((self.zero as u32 + 1) / 2).max(1) as u16;
            self.one = ((self.one as u32 + 1) / 2).max(1) as u16;
        }
    }
}

struct CausalBitModel {
    cells: Vec<Cell>,
}

impl CausalBitModel {
    fn new(floor: u16) -> AppResult<Self> {
        if !FLOORS.contains(&floor) {
            return Err(format!("unsupported floor: {floor}"));
        }
        Ok(Self {
            cells: vec![Cell::new(); floor as usize],
        })
    }

    fn index(
        &self,
        history: &[u8],
        predicted: u8,
        residual_prefix: u8,
        bit_pos: u8,
        omega_seed: &[u8; 32],
    ) -> usize {
        let mut value = u64::from_le_bytes(omega_seed[8..16].try_into().unwrap())
            ^ (predicted as u64) << 41
            ^ (residual_prefix as u64) << 17
            ^ bit_pos as u64;
        for (offset, &byte) in history.iter().rev().take(4).enumerate() {
            value ^= (byte as u64) << (offset * 8);
            value = mix64(value ^ (offset as u64).wrapping_mul(0x9e37_79b9));
        }
        (mix64(value) as usize) & (self.cells.len() - 1)
    }

    fn probability_one(&self, index: usize) -> u32 {
        self.cells[index].probability_one()
    }

    fn update(&mut self, index: usize, bit: u8) {
        self.cells[index].update(bit);
    }
}

fn mix64(mut value: u64) -> u64 {
    value ^= value >> 30;
    value = value.wrapping_mul(0xbf58_476d_1ce4_e5b9);
    value ^= value >> 27;
    value = value.wrapping_mul(0x94d0_49bb_1331_11eb);
    value ^ (value >> 31)
}

struct BitWriter {
    bytes: Vec<u8>,
    current: u8,
    used: u8,
}

impl BitWriter {
    fn new() -> Self {
        Self {
            bytes: Vec::new(),
            current: 0,
            used: 0,
        }
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

struct BitReader<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> BitReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    fn read(&mut self) -> u8 {
        let byte_index = self.position / 8;
        let bit_index = self.position % 8;
        self.position += 1;
        if byte_index >= self.bytes.len() {
            0
        } else {
            (self.bytes[byte_index] >> (7 - bit_index)) & 1
        }
    }
}

struct ArithmeticEncoder {
    low: u32,
    high: u32,
    pending: u32,
    bits: BitWriter,
}

impl ArithmeticEncoder {
    fn new() -> Self {
        Self {
            low: 0,
            high: u32::MAX,
            pending: 0,
            bits: BitWriter::new(),
        }
    }

    fn emit(&mut self, bit: u8) {
        self.bits.write(bit);
        let inverse = bit ^ 1;
        for _ in 0..self.pending {
            self.bits.write(inverse);
        }
        self.pending = 0;
    }

    fn encode(&mut self, bit: u8, probability_one: u32) {
        let probability_zero = 65_536u64 - probability_one as u64;
        let range = self.high as u64 - self.low as u64 + 1;
        let zero_width = ((range * probability_zero) >> 16).clamp(1, range - 1);
        let split = self.low as u64 + zero_width - 1;
        if bit == 0 {
            self.high = split as u32;
        } else {
            self.low = (split + 1) as u32;
        }
        loop {
            if self.high < 0x8000_0000 {
                self.emit(0);
            } else if self.low >= 0x8000_0000 {
                self.emit(1);
                self.low -= 0x8000_0000;
                self.high -= 0x8000_0000;
            } else if self.low >= 0x4000_0000 && self.high < 0xc000_0000 {
                self.pending += 1;
                self.low -= 0x4000_0000;
                self.high -= 0x4000_0000;
            } else {
                break;
            }
            self.low <<= 1;
            self.high = (self.high << 1) | 1;
        }
    }

    fn finish(mut self) -> Vec<u8> {
        self.pending += 1;
        if self.low < 0x4000_0000 {
            self.emit(0);
        } else {
            self.emit(1);
        }
        self.bits.finish()
    }
}

struct ArithmeticDecoder<'a> {
    low: u32,
    high: u32,
    code: u32,
    bits: BitReader<'a>,
}

impl<'a> ArithmeticDecoder<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        let mut bits = BitReader::new(bytes);
        let mut code = 0u32;
        for _ in 0..32 {
            code = (code << 1) | bits.read() as u32;
        }
        Self {
            low: 0,
            high: u32::MAX,
            code,
            bits,
        }
    }

    fn decode(&mut self, probability_one: u32) -> u8 {
        let probability_zero = 65_536u64 - probability_one as u64;
        let range = self.high as u64 - self.low as u64 + 1;
        let zero_width = ((range * probability_zero) >> 16).clamp(1, range - 1);
        let split = self.low as u64 + zero_width - 1;
        let bit;
        if self.code as u64 <= split {
            bit = 0;
            self.high = split as u32;
        } else {
            bit = 1;
            self.low = (split + 1) as u32;
        }
        loop {
            if self.high < 0x8000_0000 {
            } else if self.low >= 0x8000_0000 {
                self.low -= 0x8000_0000;
                self.high -= 0x8000_0000;
                self.code -= 0x8000_0000;
            } else if self.low >= 0x4000_0000 && self.high < 0xc000_0000 {
                self.low -= 0x4000_0000;
                self.high -= 0x4000_0000;
                self.code -= 0x4000_0000;
            } else {
                break;
            }
            self.low <<= 1;
            self.high = (self.high << 1) | 1;
            self.code = (self.code << 1) | self.bits.read() as u32;
        }
        bit
    }
}

fn encode_payload(
    input: &[u8],
    config: &StageConfig,
    omega_seed: &[u8; 32],
    provider: &dyn DirectionProvider,
) -> AppResult<Vec<u8>> {
    if input.is_empty() {
        return Ok(Vec::new());
    }
    let plan = provider.direction_plan(
        config.lane,
        config.requested_directions,
        omega_seed,
        config.floor,
    )?;
    let mut model = CausalBitModel::new(config.floor)?;
    let mut history = Vec::with_capacity(input.len());
    let mut coder = ArithmeticEncoder::new();
    for (byte_index, &byte) in input.iter().enumerate() {
        if config.lane == Lane::Reset && byte_index != 0 && byte_index % RESET_INTERVAL == 0 {
            model = CausalBitModel::new(config.floor)?;
            history.clear();
        }
        let predicted = provider.predict(&history, &plan, omega_seed);
        let residual = byte ^ predicted;
        let mut prefix = 0u8;
        for bit_pos in 0..8u8 {
            let bit = (residual >> (7 - bit_pos)) & 1;
            let index = model.index(&history, predicted, prefix, bit_pos, omega_seed);
            let probability = model.probability_one(index);
            coder.encode(bit, probability);
            model.update(index, bit);
            prefix = (prefix << 1) | bit;
        }
        history.push(byte);
    }
    Ok(coder.finish())
}

fn decode_payload(
    payload: &[u8],
    input_len: usize,
    config: &StageConfig,
    omega_seed: &[u8; 32],
    provider: &dyn DirectionProvider,
) -> AppResult<Vec<u8>> {
    if input_len == 0 {
        if !payload.is_empty() {
            return Err("nonempty payload for empty child".into());
        }
        return Ok(Vec::new());
    }
    if payload.is_empty() {
        return Err("empty arithmetic payload for nonempty child".into());
    }
    let plan = provider.direction_plan(
        config.lane,
        config.requested_directions,
        omega_seed,
        config.floor,
    )?;
    let mut model = CausalBitModel::new(config.floor)?;
    let mut output = Vec::new();
    output
        .try_reserve_exact(input_len)
        .map_err(|_| "unable to reserve decoded child buffer".to_string())?;
    let mut history = Vec::new();
    history
        .try_reserve_exact(input_len.min(RESET_INTERVAL))
        .map_err(|_| "unable to reserve causal history buffer".to_string())?;
    let mut coder = ArithmeticDecoder::new(payload);
    for byte_index in 0..input_len {
        if config.lane == Lane::Reset && byte_index != 0 && byte_index % RESET_INTERVAL == 0 {
            model = CausalBitModel::new(config.floor)?;
            history.clear();
        }
        let predicted = provider.predict(&history, &plan, omega_seed);
        let mut residual = 0u8;
        let mut prefix = 0u8;
        for bit_pos in 0..8u8 {
            let index = model.index(&history, predicted, prefix, bit_pos, omega_seed);
            let probability = model.probability_one(index);
            let bit = coder.decode(probability);
            model.update(index, bit);
            residual = (residual << 1) | bit;
            prefix = residual;
        }
        let byte = residual ^ predicted;
        output.push(byte);
        history.push(byte);
    }
    Ok(output)
}

fn omega_commitment(bytes: &[u8]) -> [u8; 32] {
    let byte_sha = sha256(bytes);
    let mut material = Vec::with_capacity(OMEGA_DOMAIN.len() + 8 + 32);
    material.extend_from_slice(OMEGA_DOMAIN);
    material.extend_from_slice(&(bytes.len() as u64).to_le_bytes());
    material.extend_from_slice(&byte_sha);
    sha256(&material)
}

fn encode_stage(
    input: &[u8],
    floor: u16,
    lane: Lane,
    requested_directions: usize,
    charges: Charges,
) -> AppResult<Vec<u8>> {
    if !FLOORS.contains(&floor) {
        return Err(format!("unsupported floor: {floor}"));
    }
    let provider = &GENERIC_PROVIDER;
    let child_omega = omega_commitment(input);
    let config = StageConfig {
        floor,
        lane,
        requested_directions,
    };
    let payload = encode_payload(input, &config, &child_omega, provider)?;
    let external_total = charges.total()?;
    let header = StageHeader {
        floor,
        lane,
        provider_id: provider.id(),
        requested_directions,
        pass_checkpoint: 1,
        flags: lane.flags(),
        input_len: input.len(),
        payload_len: payload.len(),
        input_sha: sha256(input),
        child_omega,
        payload_sha: sha256(&payload),
        provider_commitment: sha256(provider.descriptor()),
        charges,
        external_total,
    };
    let mut archive = serialize_header(&header)?;
    archive.extend_from_slice(&payload);
    Ok(archive)
}

fn decode_stage(archive: &[u8]) -> AppResult<(Vec<u8>, StageHeader)> {
    let header = parse_header(archive)?;
    let provider = provider_for_id(header.provider_id)?;
    if sha256(provider.descriptor()) != header.provider_commitment {
        return Err("direction provider commitment mismatch".into());
    }
    let config = StageConfig {
        floor: header.floor,
        lane: header.lane,
        requested_directions: header.requested_directions,
    };
    let payload = &archive[HEADER_LEN..];
    let input = decode_payload(
        payload,
        header.input_len,
        &config,
        &header.child_omega,
        provider,
    )?;
    if sha256(&input) != header.input_sha {
        return Err("restored child SHA-256 mismatch".into());
    }
    if omega_commitment(&input) != header.child_omega {
        return Err("restored child Omega commitment mismatch".into());
    }
    Ok((input, header))
}

fn encode_nested(
    input: &[u8],
    lane: Lane,
    requested_directions: usize,
    outer_charges: Charges,
) -> AppResult<Vec<u8>> {
    let mut child = input.to_vec();
    for &floor in &FLOORS {
        let charges = if floor == *FLOORS.last().unwrap() {
            outer_charges
        } else {
            Charges::default()
        };
        child = encode_stage(&child, floor, lane, requested_directions, charges)?;
    }
    Ok(child)
}

fn decode_nested(archive: &[u8]) -> AppResult<(Vec<u8>, NestedReport)> {
    let archive_sha = sha256(archive);
    let root_omega = omega_commitment(archive);
    let mut current = archive.to_vec();
    let mut stage_reports = Vec::with_capacity(FLOORS.len());
    let mut external_charges = 0u64;
    for (position, &expected_floor) in FLOORS.iter().rev().enumerate() {
        let current_len = current.len();
        let preflight = parse_header(&current)?;
        if preflight.floor != expected_floor {
            return Err(format!(
                "floor order mismatch: expected {expected_floor}, found {}",
                preflight.floor
            ));
        }
        let (child, header) = decode_stage(&current)?;
        external_charges = external_charges
            .checked_add(header.external_total)
            .ok_or_else(|| "nested external charge overflow".to_string())?;
        stage_reports.push(StageReport {
            archive_bytes: current_len,
            header,
        });
        if position + 1 < FLOORS.len() {
            let inner = parse_header(&child)?;
            let next_expected = FLOORS[FLOORS.len() - 2 - position];
            if inner.floor != next_expected {
                return Err(format!(
                    "inner floor boundary mismatch: expected {next_expected}, found {}",
                    inner.floor
                ));
            }
        }
        current = child;
    }
    let charged_size = (archive.len() as u64)
        .checked_add(external_charges)
        .ok_or_else(|| "charged size overflow".to_string())?;
    let report = NestedReport {
        source_len: current.len(),
        source_sha: sha256(&current),
        archive_len: archive.len(),
        archive_sha,
        root_omega,
        external_charges,
        charged_size,
        stages_outer_to_inner: stage_reports,
    };
    Ok((current, report))
}

fn serialize_header(header: &StageHeader) -> AppResult<Vec<u8>> {
    if header.requested_directions == 0 || header.requested_directions > MAX_DIRECTIONS {
        return Err("invalid direction count in header".into());
    }
    let mut output = Vec::with_capacity(HEADER_LEN);
    output.extend_from_slice(MAGIC);
    put_u16(&mut output, VERSION);
    put_u16(&mut output, HEADER_LEN as u16);
    put_u16(&mut output, header.floor);
    output.push(header.lane.code());
    output.push(header.provider_id);
    put_u16(&mut output, header.requested_directions as u16);
    put_u32(&mut output, header.pass_checkpoint);
    put_u32(&mut output, header.flags);
    put_u64(&mut output, header.input_len as u64);
    put_u64(&mut output, header.payload_len as u64);
    output.extend_from_slice(&header.input_sha);
    output.extend_from_slice(&header.child_omega);
    output.extend_from_slice(&header.payload_sha);
    output.extend_from_slice(&header.provider_commitment);
    put_u64(&mut output, header.charges.decoder);
    put_u64(&mut output, header.charges.codebooks);
    put_u64(&mut output, header.charges.catalogs);
    put_u64(&mut output, header.charges.learned_state);
    put_u64(&mut output, header.charges.external_model);
    put_u64(&mut output, header.external_total);
    if output.len() > HEADER_LEN {
        return Err("internal header layout overflow".into());
    }
    output.resize(HEADER_LEN, 0);
    Ok(output)
}

fn parse_header(archive: &[u8]) -> AppResult<StageHeader> {
    if archive.len() < HEADER_LEN {
        return Err("truncated stage archive".into());
    }
    let mut cursor = 0usize;
    if take(archive, &mut cursor, MAGIC.len())? != MAGIC {
        return Err("stage magic mismatch".into());
    }
    let version = get_u16(archive, &mut cursor)?;
    if version != VERSION {
        return Err(format!("unsupported stage version: {version}"));
    }
    let header_len = get_u16(archive, &mut cursor)? as usize;
    if header_len != HEADER_LEN {
        return Err(format!("header length mismatch: {header_len}"));
    }
    let floor = get_u16(archive, &mut cursor)?;
    if !FLOORS.contains(&floor) {
        return Err(format!("unsupported floor in archive: {floor}"));
    }
    let lane = Lane::from_code(take(archive, &mut cursor, 1)?[0])?;
    let provider_id = take(archive, &mut cursor, 1)?[0];
    let requested_directions = get_u16(archive, &mut cursor)? as usize;
    if requested_directions == 0 || requested_directions > MAX_DIRECTIONS {
        return Err("invalid archived direction count".into());
    }
    let pass_checkpoint = get_u32(archive, &mut cursor)?;
    if pass_checkpoint != 1 {
        return Err(
            "v0 supports one causal online pass only; archived pass metadata is invalid".into(),
        );
    }
    let flags = get_u32(archive, &mut cursor)?;
    if flags != lane.flags() {
        return Err(format!("stage flags mismatch: {flags:#x}"));
    }
    let input_len = usize_from_u64(get_u64(archive, &mut cursor)?, "input length")?;
    let payload_len = usize_from_u64(get_u64(archive, &mut cursor)?, "payload length")?;
    let input_sha = take_hash(archive, &mut cursor)?;
    let child_omega = take_hash(archive, &mut cursor)?;
    let payload_sha = take_hash(archive, &mut cursor)?;
    let provider_commitment = take_hash(archive, &mut cursor)?;
    let charges = Charges {
        decoder: get_u64(archive, &mut cursor)?,
        codebooks: get_u64(archive, &mut cursor)?,
        catalogs: get_u64(archive, &mut cursor)?,
        learned_state: get_u64(archive, &mut cursor)?,
        external_model: get_u64(archive, &mut cursor)?,
    };
    let external_total = get_u64(archive, &mut cursor)?;
    if charges.total()? != external_total {
        return Err("external charge accounting mismatch".into());
    }
    if archive[cursor..HEADER_LEN].iter().any(|&byte| byte != 0) {
        return Err("nonzero reserved header bytes".into());
    }
    let expected_len = HEADER_LEN
        .checked_add(payload_len)
        .ok_or_else(|| "stage archive length overflow".to_string())?;
    if archive.len() != expected_len {
        return Err(format!(
            "stage archive length mismatch: expected {expected_len}, found {}",
            archive.len()
        ));
    }
    let payload = &archive[HEADER_LEN..];
    if sha256(payload) != payload_sha {
        return Err("arithmetic payload SHA-256 mismatch".into());
    }
    Ok(StageHeader {
        floor,
        lane,
        provider_id,
        requested_directions,
        pass_checkpoint,
        flags,
        input_len,
        payload_len,
        input_sha,
        child_omega,
        payload_sha,
        provider_commitment,
        charges,
        external_total,
    })
}

fn put_u16(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn put_u32(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn put_u64(output: &mut Vec<u8>, value: u64) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn take<'a>(bytes: &'a [u8], cursor: &mut usize, count: usize) -> AppResult<&'a [u8]> {
    let end = cursor
        .checked_add(count)
        .ok_or_else(|| "archive offset overflow".to_string())?;
    if end > bytes.len() {
        return Err("truncated archive field".into());
    }
    let result = &bytes[*cursor..end];
    *cursor = end;
    Ok(result)
}

fn get_u16(bytes: &[u8], cursor: &mut usize) -> AppResult<u16> {
    Ok(u16::from_le_bytes(
        take(bytes, cursor, 2)?.try_into().unwrap(),
    ))
}

fn get_u32(bytes: &[u8], cursor: &mut usize) -> AppResult<u32> {
    Ok(u32::from_le_bytes(
        take(bytes, cursor, 4)?.try_into().unwrap(),
    ))
}

fn get_u64(bytes: &[u8], cursor: &mut usize) -> AppResult<u64> {
    Ok(u64::from_le_bytes(
        take(bytes, cursor, 8)?.try_into().unwrap(),
    ))
}

fn take_hash(bytes: &[u8], cursor: &mut usize) -> AppResult<[u8; 32]> {
    Ok(take(bytes, cursor, 32)?.try_into().unwrap())
}

fn usize_from_u64(value: u64, label: &str) -> AppResult<usize> {
    usize::try_from(value).map_err(|_| format!("{label} does not fit this platform"))
}

#[cfg(test)]
#[derive(Clone, Debug, PartialEq, Eq)]
struct TraceEvent {
    byte_index: usize,
    predicted: u8,
    bit_pos: u8,
    context_index: usize,
    probability_one: u32,
    prior_history_sha: [u8; 32],
}

#[cfg(test)]
fn causal_trace(
    input: &[u8],
    bytes_to_trace: usize,
    config: &StageConfig,
    transmitted_seed: &[u8; 32],
    provider: &dyn DirectionProvider,
) -> AppResult<Vec<TraceEvent>> {
    if bytes_to_trace > input.len() {
        return Err("trace length exceeds input".into());
    }
    let plan = provider.direction_plan(
        config.lane,
        config.requested_directions,
        transmitted_seed,
        config.floor,
    )?;
    let mut model = CausalBitModel::new(config.floor)?;
    let mut history = Vec::with_capacity(bytes_to_trace);
    let mut trace = Vec::with_capacity(bytes_to_trace * 8);
    for (byte_index, &byte) in input.iter().take(bytes_to_trace).enumerate() {
        if config.lane == Lane::Reset && byte_index != 0 && byte_index % RESET_INTERVAL == 0 {
            model = CausalBitModel::new(config.floor)?;
            history.clear();
        }
        let predicted = provider.predict(&history, &plan, transmitted_seed);
        let residual = byte ^ predicted;
        let prior_history_sha = sha256(&history);
        let mut prefix = 0u8;
        for bit_pos in 0..8u8 {
            let bit = (residual >> (7 - bit_pos)) & 1;
            let context_index = model.index(&history, predicted, prefix, bit_pos, transmitted_seed);
            let probability_one = model.probability_one(context_index);
            trace.push(TraceEvent {
                byte_index,
                predicted,
                bit_pos,
                context_index,
                probability_one,
                prior_history_sha,
            });
            model.update(context_index, bit);
            prefix = (prefix << 1) | bit;
        }
        history.push(byte);
    }
    Ok(trace)
}

fn provider_name(id: u8) -> &'static str {
    match id {
        PROVIDER_GENERIC_CAUSAL_LAG_V0 => "GENERIC_CAUSAL_LAG_V0",
        _ => "UNKNOWN",
    }
}

fn print_report(report: &NestedReport) {
    for (depth, stage) in report.stages_outer_to_inner.iter().enumerate() {
        let header = &stage.header;
        println!(
            "OMEGAFLOOR|schema=OMEGA-FLOOR-CODEC-V0|depth={}|floor={}|lane={}|state_mode={}|provider={}|rnq=NOT_IMPLEMENTED|family_8_12_pi=NOT_IMPLEMENTED|directions={}|pass_checkpoint={}|strict_causal=1|omega_role=TRANSMITTED_CHARGED_COMMITMENT_SEED_ONLY|child_bytes={}|payload_bytes={}|stage_archive_bytes={}|child_sha256={}|child_omega={}|payload_sha256={}|decoder_bytes={}|codebook_bytes={}|catalog_bytes={}|learned_state_bytes={}|external_model_bytes={}|external_total={}|json=0",
            depth,
            header.floor,
            header.lane.label(),
            header.lane.state_mode(),
            provider_name(header.provider_id),
            header.requested_directions,
            header.pass_checkpoint,
            header.input_len,
            header.payload_len,
            stage.archive_bytes,
            hex(&header.input_sha),
            hex(&header.child_omega),
            hex(&header.payload_sha),
            header.charges.decoder,
            header.charges.codebooks,
            header.charges.catalogs,
            header.charges.learned_state,
            header.charges.external_model,
            header.external_total,
        );
    }
    println!(
        "OMEGAFLOORSUMMARY|schema=OMEGA-FLOOR-CODEC-V0|floors=64,256,1024,4096|reverse=4096,1024,256,64|source_bytes={}|archive_bytes={}|external_charges={}|charged_size={}|source_sha256={}|archive_sha256={}|root_omega={}|exact_restore=PASS|generic_directional_status=MEASURED_POSITIVE|generic_hutter_score=PENDING_DECODER_AND_STATE_CHARGE|integrated_omega_per_layer=BUILD_IN_PROGRESS|hutter_competitiveness=UNMEASURED|physical_cosmological_interpretation=UNVERIFIED|json=0",
        report.source_len,
        report.archive_len,
        report.external_charges,
        report.charged_size,
        hex(&report.source_sha),
        hex(&report.archive_sha),
        hex(&report.root_omega),
    );
}

fn runtime_self_test() -> AppResult<()> {
    let input: Vec<u8> = (0..8192)
        .map(|index| {
            ((index * 17) as u8)
                ^ ((index / 7) as u8).rotate_left((index % 8) as u32)
                ^ b"OMEGA-FLOOR-V0"[index % 14]
        })
        .collect();
    let archive = encode_nested(
        &input,
        Lane::Unique,
        8,
        Charges {
            decoder: 1234,
            codebooks: 0,
            catalogs: 0,
            learned_state: 0,
            external_model: 0,
        },
    )?;
    let (restored, report) = decode_nested(&archive)?;
    if restored != input {
        return Err("runtime self-test exact restoration failed".into());
    }
    if report.stages_outer_to_inner.len() != 4 || report.external_charges != 1234 {
        return Err("runtime self-test nesting/accounting failed".into());
    }
    let mut tampered = archive.clone();
    *tampered.last_mut().unwrap() ^= 1;
    if decode_nested(&tampered).is_ok() {
        return Err("runtime self-test accepted payload tamper".into());
    }
    println!(
        "SELFTEST|schema=OMEGA-FLOOR-CODEC-V0|tests=roundtrip,nesting,accounting,payload_tamper|result=PASS|source_sha256={}|archive_sha256={}|json=0",
        hex(&sha256(&input)),
        hex(&sha256(&archive)),
    );
    Ok(())
}

fn io_error(error: io::Error) -> String {
    error.to_string()
}

fn write_atomic(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let mut temporary = path.as_os_str().to_os_string();
    temporary.push(".tmp-ofcv0");
    let temp_path = PathBuf::from(temporary);
    fs::write(&temp_path, bytes).map_err(io_error)?;
    if path.exists() {
        fs::remove_file(path).map_err(io_error)?;
    }
    fs::rename(&temp_path, path).map_err(io_error)
}

fn write_sha_sidecar(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "output path lacks UTF-8 file name".to_string())?;
    let sidecar = path.with_file_name(format!("{name}.sha256"));
    let line = format!("{}  {}\n", hex(&sha256(bytes)), name);
    write_atomic(&sidecar, line.as_bytes())
}

fn executable_size() -> AppResult<u64> {
    let path = env::current_exe().map_err(io_error)?;
    Ok(fs::metadata(path).map_err(io_error)?.len())
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        output.push(DIGITS[(byte >> 4) as usize] as char);
        output.push(DIGITS[(byte & 15) as usize] as char);
    }
    output
}

fn sha256(input: &[u8]) -> [u8; 32] {
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut state = [
        0x6a09e667u32,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
    ];
    let bit_len = (input.len() as u64).wrapping_mul(8);
    let mut padded = input.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());
    for chunk in padded.chunks_exact(64) {
        let mut words = [0u32; 64];
        for index in 0..16 {
            words[index] = u32::from_be_bytes(chunk[index * 4..index * 4 + 4].try_into().unwrap());
        }
        for index in 16..64 {
            let s0 = words[index - 15].rotate_right(7)
                ^ words[index - 15].rotate_right(18)
                ^ (words[index - 15] >> 3);
            let s1 = words[index - 2].rotate_right(17)
                ^ words[index - 2].rotate_right(19)
                ^ (words[index - 2] >> 10);
            words[index] = words[index - 16]
                .wrapping_add(s0)
                .wrapping_add(words[index - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h) = (
            state[0], state[1], state[2], state[3], state[4], state[5], state[6], state[7],
        );
        for index in 0..64 {
            let sigma1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let temporary1 = h
                .wrapping_add(sigma1)
                .wrapping_add(choose)
                .wrapping_add(K[index])
                .wrapping_add(words[index]);
            let sigma0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temporary2 = sigma0.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temporary1);
            d = c;
            c = b;
            b = a;
            a = temporary1.wrapping_add(temporary2);
        }
        let values = [a, b, c, d, e, f, g, h];
        for index in 0..8 {
            state[index] = state[index].wrapping_add(values[index]);
        }
    }
    let mut output = [0u8; 32];
    for (index, value) in state.iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&value.to_be_bytes());
    }
    output
}

fn usage() -> &'static str {
    "usage:\n  codec self-test\n  codec pack <input> <archive> [baseline|unique|duplicate|shuffle|reset|permutation] [directions] [decoder_charge]\n  codec unpack <archive> <output>\n  codec inspect <archive>\n  codec sha256 <file>"
}

fn parse_usize(value: &str, label: &str) -> AppResult<usize> {
    value
        .parse::<usize>()
        .map_err(|_| format!("invalid {label}: {value}"))
}

fn parse_u64(value: &str, label: &str) -> AppResult<u64> {
    value
        .parse::<u64>()
        .map_err(|_| format!("invalid {label}: {value}"))
}

fn real_main() -> AppResult<()> {
    let arguments: Vec<String> = env::args().collect();
    let command = arguments
        .get(1)
        .map(String::as_str)
        .ok_or_else(|| usage().to_string())?;
    match command {
        "self-test" => {
            if arguments.len() != 2 {
                return Err(usage().into());
            }
            runtime_self_test()
        }
        "pack" => {
            if !(4..=7).contains(&arguments.len()) {
                return Err(usage().into());
            }
            let input_path = Path::new(&arguments[2]);
            let archive_path = Path::new(&arguments[3]);
            let lane = arguments
                .get(4)
                .map(|value| Lane::parse(value))
                .transpose()?
                .unwrap_or(Lane::Unique);
            let directions = arguments
                .get(5)
                .map(|value| parse_usize(value, "direction count"))
                .transpose()?
                .unwrap_or(8);
            let decoder_charge = arguments
                .get(6)
                .map(|value| parse_u64(value, "decoder charge"))
                .transpose()?
                .unwrap_or(executable_size()?);
            let input = fs::read(input_path).map_err(io_error)?;
            let archive = encode_nested(
                &input,
                lane,
                directions,
                Charges {
                    decoder: decoder_charge,
                    ..Charges::default()
                },
            )?;
            let (restored, report) = decode_nested(&archive)?;
            if restored != input {
                return Err("pre-write nested replay mismatch".into());
            }
            write_atomic(archive_path, &archive)?;
            write_sha_sidecar(archive_path, &archive)?;
            print_report(&report);
            Ok(())
        }
        "unpack" => {
            if arguments.len() != 4 {
                return Err(usage().into());
            }
            let archive = fs::read(&arguments[2]).map_err(io_error)?;
            let (output, report) = decode_nested(&archive)?;
            write_atomic(Path::new(&arguments[3]), &output)?;
            print_report(&report);
            Ok(())
        }
        "inspect" => {
            if arguments.len() != 3 {
                return Err(usage().into());
            }
            let archive = fs::read(&arguments[2]).map_err(io_error)?;
            let (_, report) = decode_nested(&archive)?;
            print_report(&report);
            Ok(())
        }
        "sha256" => {
            if arguments.len() != 3 {
                return Err(usage().into());
            }
            let bytes = fs::read(&arguments[2]).map_err(io_error)?;
            println!("{}", hex(&sha256(&bytes)));
            Ok(())
        }
        _ => Err(usage().into()),
    }
}

fn main() {
    if let Err(error) = real_main() {
        eprintln!(
            "ERROR|schema=OMEGA-FLOOR-CODEC-V0|message={}|json=0",
            error.replace('|', "/").replace('\n', " ")
        );
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(size: usize) -> Vec<u8> {
        (0..size)
            .map(|index| {
                ((index * 31) as u8)
                    ^ ((index / 11) as u8).rotate_left((index % 8) as u32)
                    ^ b"causal-omega-v0"[index % 15]
            })
            .collect()
    }

    fn assert_rejected(archive: &[u8], expected_fragment: Option<&str>) {
        let error = decode_nested(archive).expect_err("tampered archive was accepted");
        if let Some(fragment) = expected_fragment {
            assert!(
                error.contains(fragment),
                "expected error containing {fragment:?}, got {error:?}"
            );
        }
    }

    #[test]
    fn sha256_known_vectors() {
        assert_eq!(
            hex(&sha256(b"")),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            hex(&sha256(b"abc")),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn every_stage_roundtrips() {
        let input = sample(4097);
        for &floor in &FLOORS {
            let archive = encode_stage(&input, floor, Lane::Unique, 8, Charges::default()).unwrap();
            let (restored, header) = decode_stage(&archive).unwrap();
            assert_eq!(restored, input);
            assert_eq!(header.floor, floor);
            assert_eq!(header.child_omega, omega_commitment(&input));
        }
    }

    #[test]
    fn nested_roundtrip_patterns_and_empty() {
        let cases = vec![
            Vec::new(),
            vec![0],
            vec![0; 8192],
            (0..8192).map(|index| (index & 255) as u8).collect(),
            sample(16_385),
        ];
        for input in cases {
            let archive = encode_nested(&input, Lane::Unique, 8, Charges::default()).unwrap();
            let (restored, report) = decode_nested(&archive).unwrap();
            assert_eq!(restored, input);
            assert_eq!(report.stages_outer_to_inner.len(), 4);
            assert_eq!(
                report
                    .stages_outer_to_inner
                    .iter()
                    .map(|stage| stage.header.floor)
                    .collect::<Vec<_>>(),
                vec![4096, 1024, 256, 64]
            );
        }
    }

    #[test]
    fn all_control_lanes_roundtrip() {
        let input = sample(5000);
        for lane in [
            Lane::Baseline,
            Lane::Unique,
            Lane::DuplicateSharedState,
            Lane::ShuffleDeterministicPriorHistory,
            Lane::Reset,
            Lane::BookkeepingPermutation,
        ] {
            let archive = encode_nested(&input, lane, 8, Charges::default()).unwrap();
            let (restored, report) = decode_nested(&archive).unwrap();
            assert_eq!(restored, input);
            assert!(report
                .stages_outer_to_inner
                .iter()
                .all(|stage| stage.header.lane == lane));
        }
    }

    #[test]
    fn duplicate_is_shared_capacity_and_permutation_is_bookkeeping_only() {
        let input = sample(7000);
        let baseline = encode_stage(&input, 1024, Lane::Baseline, 1, Charges::default()).unwrap();
        let duplicate = encode_stage(
            &input,
            1024,
            Lane::DuplicateSharedState,
            20,
            Charges::default(),
        )
        .unwrap();
        assert_eq!(&baseline[HEADER_LEN..], &duplicate[HEADER_LEN..]);

        let unique = encode_stage(&input, 1024, Lane::Unique, 12, Charges::default()).unwrap();
        let permutation = encode_stage(
            &input,
            1024,
            Lane::BookkeepingPermutation,
            12,
            Charges::default(),
        )
        .unwrap();
        assert_eq!(&unique[HEADER_LEN..], &permutation[HEADER_LEN..]);
        assert_ne!(unique, permutation);

        let shuffled = encode_stage(
            &input,
            1024,
            Lane::ShuffleDeterministicPriorHistory,
            12,
            Charges::default(),
        )
        .unwrap();
        assert_ne!(
            &unique[HEADER_LEN..],
            &shuffled[HEADER_LEN..],
            "required shuffle lane collapsed into bookkeeping permutation"
        );
    }

    #[test]
    fn causal_prefix_is_invariant_when_transmitted_state_is_held_fixed() {
        let prefix = sample(1024);
        let mut left = prefix.clone();
        left.extend_from_slice(&vec![0x11; 300]);
        let mut right = prefix.clone();
        right.extend_from_slice(&vec![0xee; 300]);
        let fixed_transmitted_seed = sha256(b"fixed transmitted and charged seed");
        for lane in [
            Lane::Unique,
            Lane::DuplicateSharedState,
            Lane::ShuffleDeterministicPriorHistory,
            Lane::Reset,
            Lane::BookkeepingPermutation,
        ] {
            let config = StageConfig {
                floor: 1024,
                lane,
                requested_directions: 12,
            };
            let left_trace = causal_trace(
                &left,
                prefix.len(),
                &config,
                &fixed_transmitted_seed,
                &GENERIC_PROVIDER,
            )
            .unwrap();
            let right_trace = causal_trace(
                &right,
                prefix.len(),
                &config,
                &fixed_transmitted_seed,
                &GENERIC_PROVIDER,
            )
            .unwrap();
            assert_eq!(
                left_trace, right_trace,
                "causal trace diverged for {lane:?}"
            );
        }
    }

    #[test]
    fn payload_tamper_is_rejected_before_decode() {
        let input = sample(4096);
        let mut archive = encode_nested(&input, Lane::Unique, 8, Charges::default()).unwrap();
        *archive.last_mut().unwrap() ^= 0x80;
        assert_rejected(&archive, Some("payload SHA-256"));
    }

    #[test]
    fn header_commitments_and_provider_are_hard_gates() {
        let input = sample(4096);
        let archive = encode_nested(&input, Lane::Unique, 8, Charges::default()).unwrap();

        let mut input_sha_tamper = archive.clone();
        input_sha_tamper[OFFSET_INPUT_SHA] ^= 1;
        assert_rejected(&input_sha_tamper, Some("restored child SHA-256"));

        let mut omega_tamper = archive.clone();
        omega_tamper[OFFSET_CHILD_OMEGA] ^= 1;
        assert_rejected(&omega_tamper, None);

        let mut provider_tamper = archive.clone();
        provider_tamper[OFFSET_PROVIDER_COMMITMENT] ^= 1;
        assert_rejected(&provider_tamper, Some("provider commitment"));
    }

    #[test]
    fn truncation_and_floor_order_tamper_are_rejected() {
        let input = sample(4096);
        let archive = encode_nested(&input, Lane::Unique, 8, Charges::default()).unwrap();
        assert_rejected(&archive[..archive.len() - 1], Some("length mismatch"));

        let mut wrong_floor = archive.clone();
        wrong_floor[OFFSET_FLOOR..OFFSET_FLOOR + 2].copy_from_slice(&1024u16.to_le_bytes());
        assert_rejected(&wrong_floor, Some("floor order mismatch"));
    }

    #[test]
    fn charged_size_counts_shared_external_artifacts_once() {
        let input = sample(2048);
        let charges = Charges {
            decoder: 10,
            codebooks: 20,
            catalogs: 30,
            learned_state: 40,
            external_model: 50,
        };
        let archive = encode_nested(&input, Lane::Unique, 8, charges).unwrap();
        let (_, report) = decode_nested(&archive).unwrap();
        assert_eq!(report.external_charges, 150);
        assert_eq!(report.charged_size, archive.len() as u64 + 150);
        assert_eq!(
            report
                .stages_outer_to_inner
                .iter()
                .filter(|stage| stage.header.external_total != 0)
                .count(),
            1
        );
        assert_eq!(report.stages_outer_to_inner[0].header.floor, 4096);
    }

    #[test]
    fn deterministic_archive_and_omega() {
        let input = sample(6000);
        let charges = Charges {
            decoder: 777,
            ..Charges::default()
        };
        let first = encode_nested(&input, Lane::Unique, 20, charges).unwrap();
        let second = encode_nested(&input, Lane::Unique, 20, charges).unwrap();
        assert_eq!(first, second);
        assert_eq!(omega_commitment(&first), omega_commitment(&second));
    }
}
