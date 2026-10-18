//! `capacity` and `portsForIndex` (bigpickle port-address-emitter.mjs:28-54).

use aether_loop::district_fabric::hilbert_xy;

/// Largest `bits` this port takes: `hilbert_xy` receives the in-block index `d < 2^(2*bits)` as an
/// `i64`, so `2*bits` stays at or below 62.
pub const MAX_BITS: u32 = 31;

/// The RangeError `BigInt(2 ** bits)` throws when `2 ** bits` is `Infinity`, i.e. `bits >= 1024`
/// (port-address-emitter.mjs:30).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CapacityRangeError;

/// `(BigInt(2 ** bits) ** BigInt(levels)).toString()` (port-address-emitter.mjs:28-31): `side^levels`
/// with `side = 2^bits`, as a decimal string.
pub fn capacity(levels: u32, bits: u32) -> Result<String, CapacityRangeError> {
    if bits >= 1024 {
        return Err(CapacityRangeError);
    }
    Ok(pow2_decimal(u64::from(bits) * u64::from(levels)))
}

/// Decimal digits of `2^exp`, as `BigInt.prototype.toString()` renders it.
fn pow2_decimal(exp: u64) -> String {
    const BASE: u64 = 1_000_000_000;
    let mut limbs: Vec<u64> = vec![1];
    let mut left = exp;
    while left > 0 {
        let k = left.min(32);
        let mut carry = 0u64;
        for limb in limbs.iter_mut() {
            let v = (*limb << k) + carry;
            *limb = v % BASE;
            carry = v / BASE;
        }
        while carry > 0 {
            limbs.push(carry % BASE);
            carry /= BASE;
        }
        left -= k;
    }
    let mut out = limbs.last().map(u64::to_string).unwrap_or_default();
    for limb in limbs.iter().rev().skip(1) {
        out.push_str(&format!("{limb:09}"));
    }
    out
}

/// `portsForIndex(index, { levels, bits })` (port-address-emitter.mjs:33-54): pairs of ports traced
/// along a 2D Hilbert curve of side `2^bits`, then an odd leftover level as a radix-`2^bits` digit.
/// Upstream (:35): "Bijective over [0, side^levels): distinct index => distinct ports => NO bump."
///
/// # Panics
/// When `bits > MAX_BITS`.
pub fn ports_for_index(index: u64, levels: u32, bits: u32) -> Vec<u32> {
    assert!(
        bits <= MAX_BITS,
        "bits {bits} > {MAX_BITS}: hilbert_xy takes the in-block index as i64"
    );
    let levels = usize::try_from(levels).expect("u32 fits usize");
    let side: u64 = 1 << bits; // :39
    let block: u64 = side * side; // :40
    let mut ports: Vec<u32> = Vec::new(); // :41
    let mut rem = index; // :42
    while ports.len() + 2 <= levels {
        // :43
        let d = rem % block; // :44
        rem /= block; // :45
        let xy = hilbert_xy(
            i64::try_from(side).expect("side <= 2^31"),
            i64::try_from(d).expect("d < 2^62"),
        ); // :46
        ports.push(u32::try_from(xy.x).expect("x < side"));
        ports.push(u32::try_from(xy.y).expect("y < side")); // :47
    }
    while ports.len() < levels {
        // :49
        ports.push(u32::try_from(rem % side).expect("digit < side")); // :50
        rem /= side; // :51
    }
    ports // :53 `ports.slice(0, levels)` keeps all `levels` entries
}
