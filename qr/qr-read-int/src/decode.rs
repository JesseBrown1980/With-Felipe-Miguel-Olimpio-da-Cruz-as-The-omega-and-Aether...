//! `decode(matrix)` (index.html:921-941) with `decodeMatrix` and its helpers
//! (index.html:639-920): version and format information, the function-pattern mask,
//! unmasking, codeword order, block interleaving and per-block Reed-Solomon. All integer.

use crate::bit_matrix::BitMatrix;
use crate::decode_data::{self, Decoded};
use crate::reed_solomon;
use crate::tables::{FORMAT_INFO_TABLE, VERSIONS};
use crate::Thrown;

/// `formatInfo` (index.html:653-684): the error correction level as the page numbers it
/// (0 = L, 1 = M, 2 = Q, 3 = H, the index into `errorCorrectionLevels`) and the data mask.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FormatInfo {
    pub error_correction_level: u8,
    pub data_mask: u8,
}

/// One `errorCorrectionLevels` entry (index.html:8407-9712): EC codewords per block and the
/// `(numBlocks, dataCodewordsPerBlock)` groups.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EcBlocks {
    pub ec_codewords_per_block: u32,
    pub ec_blocks: &'static [(u32, u32)],
}

/// One `VERSIONS` entry (index.html:8407-9712).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Version {
    pub info_bits: Option<u32>,
    pub version_number: u32,
    pub alignment_pattern_centers: &'static [u32],
    pub error_correction_levels: [EcBlocks; 4],
}

/// `numBitsDiffering(x, y)` (index.html:639-647); jsQR's `null` info bits XOR as 0.
fn num_bits_differing(x: u32, y: u32) -> u32 {
    (x ^ y).count_ones()
}

/// `pushBit(bit, byte)` (index.html:648-650).
fn push_bit(bit: bool, byte: u32) -> u32 {
    (byte << 1) | u32::from(bit)
}

/// `DATA_MASKS[mask]({x, y})` (index.html:686-695).
fn data_mask(mask: u8, x: i64, y: i64) -> bool {
    match mask {
        0 => (y + x) % 2 == 0,
        1 => y % 2 == 0,
        2 => x % 3 == 0,
        3 => (y + x) % 3 == 0,
        4 => (y / 2 + x / 3) % 2 == 0,
        5 => (x * y) % 2 + (x * y) % 3 == 0,
        6 => ((y * x) % 2 + (y * x) % 3) % 2 == 0,
        _ => ((y + x) % 2 + (y * x) % 3) % 2 == 0,
    }
}

/// `buildFunctionPatternMask(version)` (index.html:696-719).
fn build_function_pattern_mask(version: &Version) -> BitMatrix {
    let dimension = 17 + 4 * i64::from(version.version_number);
    let size = usize::try_from(dimension).unwrap_or(0);
    let mut m = BitMatrix::create_empty(size, size);
    m.set_region(0, 0, 9, 9, true);
    m.set_region(dimension - 8, 0, 8, 9, true);
    m.set_region(0, dimension - 8, 9, 8, true);
    for &x in version.alignment_pattern_centers {
        for &y in version.alignment_pattern_centers {
            let (x, y) = (i64::from(x), i64::from(y));
            // The three finder corners: (6, 6), (6, d - 7), (d - 7, 6).
            let finder_corner =
                (x == 6 && (y == 6 || y == dimension - 7)) || (x == dimension - 7 && y == 6);
            if !finder_corner {
                m.set_region(x - 2, y - 2, 5, 5, true);
            }
        }
    }
    m.set_region(6, 9, 1, dimension - 17, true);
    m.set_region(9, 6, dimension - 17, 1, true);
    if version.version_number > 6 {
        m.set_region(dimension - 11, 0, 3, 6, true);
        m.set_region(0, dimension - 11, 6, 3, true);
    }
    m
}

/// `readCodewords(matrix, version, formatInfo)` (index.html:720-755): column pairs from the
/// right, zig-zag, skipping column 6, function modules masked out, data unmasked.
fn read_codewords(matrix: &BitMatrix, version: &Version, format: FormatInfo) -> Vec<u8> {
    let dimension = i64::try_from(matrix.height).unwrap_or(0);
    let function_mask = build_function_pattern_mask(version);
    let mut codewords = Vec::new();
    let mut current = 0u32;
    let mut bits_read = 0;
    let mut reading_up = true;
    let mut column = dimension - 1;
    while column > 0 {
        if column == 6 {
            column -= 1;
        }
        for i in 0..dimension {
            let y = if reading_up { dimension - 1 - i } else { i };
            for offset in 0..2 {
                let x = column - offset;
                if !function_mask.get(x, y) {
                    bits_read += 1;
                    let mut bit = matrix.get(x, y);
                    if data_mask(format.data_mask, x, y) {
                        bit = !bit;
                    }
                    current = push_bit(bit, current);
                    if bits_read == 8 {
                        codewords.push(u8::try_from(current & 0xff).unwrap_or(0));
                        bits_read = 0;
                        current = 0;
                    }
                }
            }
        }
        reading_up = !reading_up;
        column -= 2;
    }
    codewords
}

/// `readVersion(matrix)` (index.html:756-797).
fn read_version(matrix: &BitMatrix) -> Option<&'static Version> {
    let dimension = i64::try_from(matrix.height).ok()?;
    let provisional = (dimension - 17).div_euclid(4);
    if provisional <= 6 {
        return usize::try_from(provisional - 1)
            .ok()
            .and_then(|i| VERSIONS.get(i));
    }
    let mut top_right = 0u32;
    for y in (0..=5).rev() {
        for x in (dimension - 11..=dimension - 9).rev() {
            top_right = push_bit(matrix.get(x, y), top_right);
        }
    }
    let mut bottom_left = 0u32;
    for x in (0..=5).rev() {
        for y in (dimension - 11..=dimension - 9).rev() {
            bottom_left = push_bit(matrix.get(x, y), bottom_left);
        }
    }
    let mut best_difference = u32::MAX;
    let mut best = None;
    for version in &VERSIONS {
        if version.info_bits == Some(top_right) || version.info_bits == Some(bottom_left) {
            return Some(version);
        }
        let bits = version.info_bits.unwrap_or(0);
        let d = num_bits_differing(top_right, bits);
        if d < best_difference {
            best = Some(version);
            best_difference = d;
        }
        let d = num_bits_differing(bottom_left, bits);
        if d < best_difference {
            best = Some(version);
            best_difference = d;
        }
    }
    if best_difference <= 3 {
        best
    } else {
        None
    }
}

/// `readFormatInformation(matrix)` (index.html:798-843).
fn read_format_information(matrix: &BitMatrix) -> Option<FormatInfo> {
    let mut top_left = 0u32;
    for x in 0..=8 {
        if x != 6 {
            top_left = push_bit(matrix.get(x, 8), top_left);
        }
    }
    for y in (0..=7).rev() {
        if y != 6 {
            top_left = push_bit(matrix.get(8, y), top_left);
        }
    }
    let dimension = i64::try_from(matrix.height).ok()?;
    let mut other = 0u32;
    for y in (dimension - 7..=dimension - 1).rev() {
        other = push_bit(matrix.get(8, y), other);
    }
    for x in dimension - 8..dimension {
        other = push_bit(matrix.get(x, 8), other);
    }
    let mut best_difference = u32::MAX;
    let mut best = None;
    for &(bits, info) in &FORMAT_INFO_TABLE {
        if bits == top_left || bits == other {
            return Some(info);
        }
        let d = num_bits_differing(top_left, bits);
        if d < best_difference {
            best = Some(info);
            best_difference = d;
        }
        if top_left != other {
            let d = num_bits_differing(other, bits);
            if d < best_difference {
                best = Some(info);
                best_difference = d;
            }
        }
    }
    if best_difference <= 3 {
        best
    } else {
        None
    }
}

struct DataBlock {
    num_data_codewords: usize,
    codewords: Vec<u8>,
}

/// `getDataBlocks(codewords, version, ecLevel)` (index.html:844-885): de-interleave.
fn get_data_blocks(codewords: &[u8], version: &Version, ec_level: u8) -> Option<Vec<DataBlock>> {
    let ec_info = version.error_correction_levels[usize::from(ec_level)];
    let ec_per_block = usize::try_from(ec_info.ec_codewords_per_block).ok()?;
    let mut blocks = Vec::new();
    let mut total = 0usize;
    for &(num_blocks, data_per_block) in ec_info.ec_blocks {
        let data_per_block = usize::try_from(data_per_block).ok()?;
        for _ in 0..num_blocks {
            blocks.push(DataBlock {
                num_data_codewords: data_per_block,
                codewords: Vec::new(),
            });
            total += data_per_block + ec_per_block;
        }
    }
    if codewords.len() < total {
        return None;
    }
    let mut stream = codewords[..total].iter().copied();
    let short_block_size = usize::try_from(ec_info.ec_blocks[0].1).ok()?;
    for _ in 0..short_block_size {
        for block in blocks.iter_mut() {
            block.codewords.extend(stream.next());
        }
    }
    if ec_info.ec_blocks.len() > 1 {
        let small = usize::try_from(ec_info.ec_blocks[0].0).ok()?;
        let large = usize::try_from(ec_info.ec_blocks[1].0).ok()?;
        for i in 0..large {
            blocks[small + i].codewords.extend(stream.next());
        }
    }
    let mut rest = stream.peekable();
    while rest.peek().is_some() {
        for block in blocks.iter_mut() {
            block.codewords.extend(rest.next());
        }
    }
    Some(blocks)
}

/// `decodeMatrix(matrix)` (index.html:886-920). `Err` is an exception thrown outside the
/// `try` around `decodeData` (index.html:914-919).
fn decode_matrix(matrix: &BitMatrix) -> Result<Option<Decoded>, Thrown> {
    let Some(version) = read_version(matrix) else {
        return Ok(None);
    };
    let Some(format) = read_format_information(matrix) else {
        return Ok(None);
    };
    let codewords = read_codewords(matrix, version, format);
    let Some(blocks) = get_data_blocks(&codewords, version, format.error_correction_level) else {
        return Ok(None);
    };
    let mut result_bytes = Vec::new();
    for block in &blocks {
        let ec = block.codewords.len() - block.num_data_codewords;
        let Some(corrected) = reed_solomon::decode(&block.codewords, ec)? else {
            return Ok(None);
        };
        result_bytes.extend_from_slice(&corrected[..block.num_data_codewords]);
    }
    Ok(decode_data::decode(&result_bytes, version.version_number))
}

/// `decode(matrix)` (index.html:921-941): the matrix as read, then mirrored across the
/// top-left to bottom-right diagonal. Returns the result and whether the mirror was needed.
pub fn decode(matrix: &mut BitMatrix) -> Result<Option<(Decoded, bool)>, Thrown> {
    if let Some(result) = decode_matrix(matrix)? {
        return Ok(Some((result, false)));
    }
    let w = i64::try_from(matrix.width).unwrap_or(0);
    let h = i64::try_from(matrix.height).unwrap_or(0);
    for x in 0..w {
        for y in x + 1..h {
            if matrix.get(x, y) != matrix.get(y, x) {
                let a = matrix.get(x, y);
                matrix.set(x, y, !a);
                let b = matrix.get(y, x);
                matrix.set(y, x, !b);
            }
        }
    }
    Ok(decode_matrix(matrix)?.map(|r| (r, true)))
}
