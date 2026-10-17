//! `hilbert.mjs` (Layer 1): n-dimensional Hilbert decode and encode, 2-D by the iterative
//! algorithm and n >= 3 by Skilling's transpose.
//!
//! Ported domain: `dimensions * bits <= 31`, where every JavaScript int32 shift, `|`, `^` and `&`
//! in hilbert.mjs acts on values below 2^31, a decode index below 2^53 and encode coordinates in
//! the int32 range `-2^31..2^31`; outside it the port returns [`JsError::Domain`].

use crate::JsError;

/// Largest `dimensions * bits` in the ported domain.
pub const MAX_TOTAL_BITS: u32 = 31;

fn validate(dimensions: i64, bits: i64) -> Result<(u32, u32), JsError> {
    if dimensions < 2 {
        return Err(JsError::Range(
            "hilbert: dimensions must be integer >= 2".to_string(),
        ));
    }
    if bits < 1 {
        return Err(JsError::Range(
            "hilbert: bits must be integer >= 1".to_string(),
        ));
    }
    if dimensions.saturating_mul(bits) > i64::from(MAX_TOTAL_BITS) {
        return Err(JsError::Domain(format!(
            "hilbert: dimensions * bits = {} exceeds the ported 31",
            dimensions.saturating_mul(bits)
        )));
    }
    Ok((dimensions as u32, bits as u32))
}

/// `rotate2D` (hilbert.mjs:29-38).
fn rotate_2d(n: i64, x: i64, y: i64, rx: i32, ry: i32) -> (i64, i64) {
    if ry == 0 {
        let (mut x, mut y) = (x, y);
        if rx == 1 {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        return (y, x);
    }
    (x, y)
}

/// `encode2D` (hilbert.mjs:40-49).
fn encode_2d(x: i64, y: i64, side_len: i32) -> i64 {
    let (mut x, mut y) = (x, y);
    let mut d = 0i64;
    let mut s = side_len >> 1;
    while s > 0 {
        let rx = i32::from((x as i32 & s) > 0);
        let ry = i32::from((y as i32 & s) > 0);
        d += i64::from(s) * i64::from(s) * i64::from((3 * rx) ^ ry);
        (x, y) = rotate_2d(i64::from(s), x, y, rx, ry);
        s >>= 1;
    }
    d
}

/// `decode2D` (hilbert.mjs:51-64); `t` starts as `ToInt32(d)` through the first `>>`.
fn decode_2d(d: u64, side_len: i32) -> Vec<i64> {
    let (mut x, mut y) = (0i64, 0i64);
    let mut t = d as u32 as i32;
    let mut s = 1i32;
    while s < side_len {
        let rx = 1 & (t >> 1);
        let ry = 1 & (t ^ rx);
        (x, y) = rotate_2d(i64::from(s), x, y, rx, ry);
        x += i64::from(s) * i64::from(rx);
        y += i64::from(s) * i64::from(ry);
        t >>= 2;
        s <<= 1;
    }
    vec![x, y]
}

/// `indexToTransposeND` (hilbert.mjs:68-80).
fn index_to_transpose(h: u64, n: u32, b: u32) -> Vec<i32> {
    let mut x = vec![0i32; n as usize];
    let total_bits = b * n;
    for d in 0..b {
        for j in 0..n {
            let from_lsb = total_bits - 1 - (d * n + j);
            let bit = ((h >> from_lsb) & 1) as i32;
            x[j as usize] |= bit << (b - 1 - d);
        }
    }
    x
}

/// `transposeToIndexND` (hilbert.mjs:82-91).
fn transpose_to_index(x: &[i32], n: u32, b: u32) -> i32 {
    let mut h = 0i32;
    for d in 0..b {
        for j in 0..n {
            let bit = (x[j as usize] >> (b - 1 - d)) & 1;
            h = (h << 1) | bit;
        }
    }
    h
}

/// `transposeToAxesND` (hilbert.mjs:93-110).
fn transpose_to_axes(x: &mut [i32], n: u32, b: u32) {
    let n = n as usize;
    for i in (1..n).rev() {
        x[i] ^= x[i - 1];
    }
    let big_n = 2i32 << (b - 1);
    let mut q = 2i32;
    while q != big_n {
        let p = q - 1;
        for i in (0..n).rev() {
            if x[i] & q != 0 {
                x[0] ^= p;
            } else {
                let t = (x[0] ^ x[i]) & p;
                x[0] ^= t;
                x[i] ^= t;
            }
        }
        q <<= 1;
    }
}

/// `axesToTransposeND` (hilbert.mjs:112-127).
fn axes_to_transpose(x: &mut [i32], n: u32, b: u32) {
    let n = n as usize;
    let m = 1i32 << (b - 1);
    let mut q = m;
    while q > 1 {
        let p = q - 1;
        for i in 0..n {
            if x[i] & q != 0 {
                x[0] ^= p;
            } else {
                let t = (x[0] ^ x[i]) & p;
                x[0] ^= t;
                x[i] ^= t;
            }
        }
        q >>= 1;
    }
    for i in 1..n {
        x[i] ^= x[i - 1];
    }
}

/// `hilbertDecode(index, { dimensions, bits })` (hilbert.mjs:131-142) for `0 <= index < 2^53`.
pub fn hilbert_decode(index: i64, dimensions: i64, bits: i64) -> Result<Vec<i64>, JsError> {
    let (n, b) = validate(dimensions, bits)?;
    if index < 0 {
        return Err(JsError::Range(format!(
            "hilbert: index must be non-negative integer (got {index})"
        )));
    }
    if index >= 1 << 53 {
        return Err(JsError::Domain(format!(
            "hilbert: index {index} not below the ported 2^53"
        )));
    }
    if n == 2 {
        return Ok(decode_2d(index as u64, 1i32 << b));
    }
    let mut x = index_to_transpose(index as u64, n, b);
    transpose_to_axes(&mut x, n, b);
    Ok(x.into_iter().map(i64::from).collect())
}

/// `hilbertEncode(coord, { dimensions, bits })` (hilbert.mjs:144-155) for coordinates in the int32
/// range `-2^31..2^31`. Upstream applies no range check: every `&`, `^` and `>>` takes `ToInt32`
/// of its operands, which `as i32` reproduces, and the 2-D `n - 1 - x` steps stay below 2^32 in
/// magnitude, exact in binary64.
pub fn hilbert_encode(coord: &[i64], dimensions: i64, bits: i64) -> Result<i64, JsError> {
    let (n, b) = validate(dimensions, bits)?;
    if coord.len() != n as usize {
        return Err(JsError::Type(format!(
            "hilbert: coord must be array of length {n}"
        )));
    }
    if let Some(c) = coord
        .iter()
        .find(|&&c| !(i64::from(i32::MIN)..=i64::from(i32::MAX)).contains(&c))
    {
        return Err(JsError::Domain(format!(
            "hilbert: coordinate {c} outside the ported int32 range"
        )));
    }
    if n == 2 {
        return Ok(encode_2d(coord[0], coord[1], 1i32 << b));
    }
    let mut x: Vec<i32> = coord.iter().map(|&c| c as i32).collect();
    axes_to_transpose(&mut x, n, b);
    Ok(i64::from(transpose_to_index(&x, n, b)))
}
