//! Port of the asolaria-score.mjs signals, composite and reverse-gain gate, in e4 units (1/10000).

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Neg, Sub};
use l0_edge::jsnum::Dbl;
use sha2::{Digest, Sha256};

const SHANNON_BINS: u8 = 12;

/// `+shannonSignal(content).score` (asolaria-score.mjs:86-95) in binary64 as JavaScript computes it,
/// `Math.log2` being V8 12.4.254.21 src/base/ieee754.cc:1951-2050 (`k_log1p`, `log2`).
pub fn shannon_e4(content: &str) -> u32 {
    let mut bins = [0u64; SHANNON_BINS as usize];
    for byte in content.bytes() {
        bins[usize::from(byte % SHANNON_BINS)] += 1;
    }
    let total = Binary64::from_u64(bins.iter().sum::<u64>().max(1));
    let mut sum = Binary64::ZERO;
    for &count in bins.iter().filter(|&&count| count > 0) {
        let p = Binary64::from_u64(count) / total;
        sum = sum + p * log2(p);
    }
    let efficiency = -sum / log2(Binary64::from_u64(u64::from(SHANNON_BINS)));
    efficiency.to_fixed_e4()
}

/// `+shaBaseline(pid, content).toFixed(4)` (asolaria-score.mjs:25, 98-101, 145).
pub fn sha_baseline_e4(pid: &str, content: &str) -> u32 {
    let digest = Sha256::new()
        .chain_update(pid)
        .chain_update("|")
        .chain_update(content)
        .finalize();
    let leading_hex4 = u32::from(u16::from_be_bytes([digest[0], digest[1]]));
    (leading_hex4 % 1000) * 10
}

/// The `signals` asolaria-score.mjs weighs (lines 116-145), each `+x.toFixed(4)` in e4 units.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Signals {
    /// L0 EdgeLevelGNN `scores[0]` (line 122); `None` when :4792 gives no score.
    pub l0: Option<u32>,
    /// L4 GSLGNN (line 128).
    pub l4: Option<u32>,
    /// Fabric G1 edge mining (line 134).
    pub g1: Option<u32>,
    /// Fabric G2 forward genius (line 135).
    pub g2: Option<u32>,
    /// Fabric G3 reverse gain (line 136).
    pub g3: Option<u32>,
    /// OmniShannon entropy (line 141), always present.
    pub shannon: u32,
    /// sha baseline (line 145), always present.
    pub baseline: u32,
}

/// `+composite.toFixed(4)` (asolaria-score.mjs:154-163): the weighted mean of the present signals in
/// WEIGHTS order, evaluated in JavaScript number arithmetic.
pub fn composite_e4(signals: &Signals) -> u32 {
    let weighted = [
        (signals.l0, 30),
        (signals.l4, 15),
        (signals.g1, 10),
        (signals.g2, 10),
        (signals.g3, 10),
        (Some(signals.shannon), 15),
        (Some(signals.baseline), 10),
    ];
    let mut composite = Dbl::ZERO;
    let mut total_weight = Dbl::ZERO;
    for (signal, weight_e2) in weighted {
        if let Some(signal) = signal {
            let weight = Dbl::decimal(weight_e2, 2);
            composite = composite + Dbl::decimal(u64::from(signal), 4) * weight;
            total_weight = total_weight + weight;
        }
    }
    if !total_weight.is_zero() {
        composite = composite / total_weight;
    }
    u32::try_from(composite.to_fixed_units(4)).unwrap_or(u32::MAX)
}

/// `reverseGain(score)` (asolaria-score.mjs:104-108) without its `mark` string.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReverseGain {
    /// `+(1 - score).toFixed(4)` in e4 units.
    pub reverse_risk_e4: u32,
    /// `score >= 0.72 && reverseRisk <= 0.28`.
    pub promoted: bool,
}

/// `reverseGain(+(composite_e4 / 10000))`; on 0..=10000 the reverse risk is `10000 - composite_e4`
/// (tools/score_referee.py checks every value).
pub fn reverse_gain(composite_e4: u32) -> ReverseGain {
    let reverse_risk_e4 = 10_000u32.saturating_sub(composite_e4);
    let promoted = Dbl::decimal(u64::from(composite_e4), 4) >= Dbl::decimal(72, 2)
        && Dbl::decimal(u64::from(reverse_risk_e4), 4) <= Dbl::decimal(28, 2);
    ReverseGain {
        reverse_risk_e4,
        promoted,
    }
}

/// Spawn-gate forward score (quantized 0..1000): `floor(composite_e4 / 10)`.
pub fn forward_score_q(composite_e4: u32) -> u32 {
    composite_e4 / 10
}

/// Spawn-gate reverse risk (quantized 0..1000): `ceil(reverse_risk_e4 / 10)`.
pub fn reverse_risk_q(reverse_risk_e4: u32) -> u32 {
    reverse_risk_e4.div_ceil(10)
}

const SIGN_BIT: u64 = 1 << 63;
const FRACTION_BITS: u32 = 52;
const SIGNIFICAND_BITS: i32 = 53;
const MIN_EXPONENT: i32 = -1074;
const EXPONENT_FIELD: u64 = 0x7FF;
const ALIGN_BITS: i32 = 74;
const LG: [Binary64; 7] = [
    Binary64(0x3FE5_5555_5555_5593),
    Binary64(0x3FD9_9999_9997_FA04),
    Binary64(0x3FD2_4924_9422_9359),
    Binary64(0x3FCC_71C5_1D8E_78AF),
    Binary64(0x3FC7_4664_96CB_03DE),
    Binary64(0x3FC3_9A09_D078_C69F),
    Binary64(0x3FC2_F112_DF3E_5244),
];
const TWO54: Binary64 = Binary64(0x4350_0000_0000_0000);
const IVLN2HI: Binary64 = Binary64(0x3FF7_1547_6520_0000);
const IVLN2LO: Binary64 = Binary64(0x3DE7_05FC_2EEF_A200);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Binary64(u64);

impl Binary64 {
    const ZERO: Binary64 = Binary64(0);
    const HALF: Binary64 = Binary64(0x3FE0_0000_0000_0000);
    const ONE: Binary64 = Binary64(0x3FF0_0000_0000_0000);
    const TWO: Binary64 = Binary64(0x4000_0000_0000_0000);

    fn from_u64(n: u64) -> Binary64 {
        round_pack(false, u128::from(n), 0, false)
    }

    fn from_i32(n: i32) -> Binary64 {
        round_pack(n < 0, u128::from(n.unsigned_abs()), 0, false)
    }

    fn high_word(self) -> i32 {
        (self.0 >> 32) as u32 as i32
    }

    fn low_word(self) -> u32 {
        self.0 as u32
    }

    fn with_high_word(self, high: i32) -> Binary64 {
        Binary64((self.0 & 0xFFFF_FFFF) | (u64::from(high as u32) << 32))
    }

    fn with_low_word(self, low: u32) -> Binary64 {
        Binary64((self.0 & !0xFFFF_FFFF) | u64::from(low))
    }

    fn parts(self) -> (bool, u64, i32) {
        let biased = ((self.0 >> FRACTION_BITS) & EXPONENT_FIELD) as i32;
        let fraction = self.0 & ((1 << FRACTION_BITS) - 1);
        let (significand, exponent) = if biased == 0 {
            (fraction, MIN_EXPONENT)
        } else {
            (fraction | 1 << FRACTION_BITS, biased + MIN_EXPONENT - 1)
        };
        (self.0 & SIGN_BIT != 0, significand, exponent)
    }

    fn to_fixed_e4(self) -> u32 {
        let (negative, significand, exponent) = self.parts();
        if negative || significand == 0 || exponent < -100 {
            return 0;
        }
        if exponent >= 0 {
            return u32::MAX;
        }
        let shift = exponent.unsigned_abs();
        let units = (u128::from(significand) * 20_000 + (1 << shift)) >> (shift + 1);
        u32::try_from(units).unwrap_or(u32::MAX)
    }
}

fn round_pack(negative: bool, magnitude: u128, exponent: i32, sticky: bool) -> Binary64 {
    let sign = if negative { SIGN_BIT } else { 0 };
    if magnitude == 0 {
        return Binary64(sign);
    }
    let width = 128 - magnitude.leading_zeros() as i32;
    let right = (width - SIGNIFICAND_BITS).max(MIN_EXPONENT - exponent);
    let (mut significand, mut exponent) = if right > 0 {
        (
            shift_round(magnitude, right.unsigned_abs(), sticky),
            exponent + right,
        )
    } else {
        let left = (SIGNIFICAND_BITS - width).min(exponent - MIN_EXPONENT);
        (magnitude << left, exponent - left)
    };
    if significand >> SIGNIFICAND_BITS != 0 {
        significand >>= 1;
        exponent += 1;
    }
    if significand >> FRACTION_BITS == 0 {
        return Binary64(sign | significand as u64);
    }
    let biased = exponent - MIN_EXPONENT + 1;
    if biased >= EXPONENT_FIELD as i32 {
        return Binary64(sign | EXPONENT_FIELD << FRACTION_BITS);
    }
    let fraction = significand as u64 & ((1 << FRACTION_BITS) - 1);
    Binary64(sign | (biased as u64) << FRACTION_BITS | fraction)
}

fn shift_round(magnitude: u128, shift: u32, sticky: bool) -> u128 {
    if shift > 128 {
        return 0;
    }
    let (kept, dropped) = if shift == 128 {
        (0, magnitude)
    } else {
        (magnitude >> shift, magnitude & ((1 << shift) - 1))
    };
    let half = 1u128 << (shift - 1);
    let round_up = dropped > half || (dropped == half && (sticky || kept & 1 == 1));
    kept + u128::from(round_up)
}

impl Neg for Binary64 {
    type Output = Binary64;

    fn neg(self) -> Binary64 {
        Binary64(self.0 ^ SIGN_BIT)
    }
}

impl Add for Binary64 {
    type Output = Binary64;

    fn add(self, other: Binary64) -> Binary64 {
        let (a, b) = (self.parts(), other.parts());
        match (a.1, b.1) {
            (0, 0) => return Binary64(if a.0 && b.0 { SIGN_BIT } else { 0 }),
            (0, _) => return other,
            (_, 0) => return self,
            _ => {}
        }
        let (large, small) = if a.2 >= b.2 { (a, b) } else { (b, a) };
        let gap = large.2 - small.2;
        let (large_m, small_m, exponent, sticky) = if gap <= ALIGN_BITS {
            (
                u128::from(large.1) << gap,
                u128::from(small.1),
                small.2,
                false,
            )
        } else {
            let drop = (gap - ALIGN_BITS).unsigned_abs();
            let kept = if drop >= 64 { 0 } else { small.1 >> drop };
            let lost = drop >= 64 || kept << drop != small.1;
            (
                u128::from(large.1) << ALIGN_BITS,
                u128::from(kept),
                large.2 - ALIGN_BITS,
                lost,
            )
        };
        if large.0 == small.0 {
            return round_pack(large.0, large_m + small_m, exponent, sticky);
        }
        match large_m.cmp(&small_m) {
            Ordering::Greater => round_pack(
                large.0,
                large_m - small_m - u128::from(sticky),
                exponent,
                sticky,
            ),
            Ordering::Less => round_pack(small.0, small_m - large_m, exponent, false),
            Ordering::Equal => Binary64::ZERO,
        }
    }
}

impl Sub for Binary64 {
    type Output = Binary64;

    fn sub(self, other: Binary64) -> Binary64 {
        self + -other
    }
}

impl Mul for Binary64 {
    type Output = Binary64;

    fn mul(self, other: Binary64) -> Binary64 {
        let (a, b) = (self.parts(), other.parts());
        round_pack(
            a.0 != b.0,
            u128::from(a.1) * u128::from(b.1),
            a.2 + b.2,
            false,
        )
    }
}

impl Div for Binary64 {
    type Output = Binary64;

    fn div(self, other: Binary64) -> Binary64 {
        let (a, b) = (self.parts(), other.parts());
        let negative = a.0 != b.0;
        if a.1 == 0 || b.1 == 0 {
            let magnitude = if a.1 == 0 {
                0
            } else {
                EXPONENT_FIELD << FRACTION_BITS
            };
            return Binary64(if negative { SIGN_BIT } else { 0 } | magnitude);
        }
        let normalize = a.1.leading_zeros() - (64 - SIGNIFICAND_BITS.unsigned_abs());
        let numerator = u128::from(a.1 << normalize) << ALIGN_BITS;
        let denominator = u128::from(b.1);
        let exponent = a.2 - normalize as i32 - ALIGN_BITS - b.2;
        let sticky = numerator % denominator != 0;
        round_pack(negative, numerator / denominator, exponent, sticky)
    }
}

fn k_log1p(f: Binary64) -> Binary64 {
    let s = f / (Binary64::TWO + f);
    let z = s * s;
    let w = z * z;
    let t1 = w * (LG[1] + w * (LG[3] + w * LG[5]));
    let t2 = z * (LG[0] + w * (LG[2] + w * (LG[4] + w * LG[6])));
    let r = t2 + t1;
    let hfsq = Binary64::HALF * f * f;
    s * (hfsq + r)
}

fn log2(x: Binary64) -> Binary64 {
    let mut x = x;
    let (mut hx, lx) = (x.high_word(), x.low_word());
    let mut k = 0;
    if hx < 0x0010_0000 {
        k -= 54;
        x = x * TWO54;
        hx = x.high_word();
    }
    if hx == 0x3FF0_0000 && lx == 0 {
        return Binary64::ZERO;
    }
    k += (hx >> 20) - 1023;
    hx &= 0x000F_FFFF;
    let i = (hx + 0x95F64) & 0x10_0000;
    x = x.with_high_word(hx | (i ^ 0x3FF0_0000));
    k += i >> 20;
    let y = Binary64::from_i32(k);
    let f = x - Binary64::ONE;
    let hfsq = Binary64::HALF * f * f;
    let r = k_log1p(f);
    let hi = (f - hfsq).with_low_word(0);
    let lo = (f - hi) - hfsq + r;
    let val_hi = hi * IVLN2HI;
    let mut val_lo = (lo + hi) * IVLN2LO + lo * IVLN2HI;
    let w = y + val_hi;
    val_lo = val_lo + ((y - w) + val_hi);
    val_lo + w
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXPECTED: &str = include_str!("../tests/fixtures/expected-score.hbp");

    fn bits(row: &str, key: &str) -> u64 {
        row.split('|')
            .find_map(|field| field.strip_prefix(key)?.strip_prefix('='))
            .map(|hex| u64::from_str_radix(hex, 16).expect("hex"))
            .unwrap_or_else(|| panic!("{key} in {row}"))
    }

    #[test]
    fn log2_equals_the_referee_mirror_of_v8_bit_for_bit() {
        let mut rows = 0;
        for row in EXPECTED.lines().filter(|line| line.starts_with("LOG2|")) {
            let got = log2(Binary64(bits(row, "x")));
            assert_eq!(got, Binary64(bits(row, "want")), "{row}");
            rows += 1;
        }
        assert!(rows >= 4000, "{rows} LOG2 rows");
        assert_eq!(
            log2(Binary64::from_u64(12)),
            Binary64(0x400C_AE00_D1CF_DEB4)
        );
    }

    #[test]
    fn arithmetic_rounds_to_nearest_even() {
        let third = Binary64::ONE / Binary64::from_u64(3);
        assert_eq!(third, Binary64(0x3FD5_5555_5555_5555));
        assert_eq!(
            Binary64::from_u64(1 << 53) + Binary64::ONE,
            Binary64::from_u64(1 << 53)
        );
        assert_eq!(
            Binary64::from_u64((1 << 53) + 2) + Binary64::ONE,
            Binary64::from_u64((1 << 53) + 4)
        );
        assert_eq!(Binary64::ONE - Binary64::ONE, Binary64::ZERO);
        assert_eq!(-Binary64::ZERO + -Binary64::ZERO, -Binary64::ZERO);
        assert_eq!(
            Binary64::from_i32(-3) * third,
            Binary64(0xBFF0_0000_0000_0000)
        );
        let tiny = Binary64(1);
        assert_eq!(Binary64::ONE + tiny, Binary64::ONE);
        assert_eq!(Binary64::ONE - tiny, Binary64::ONE);
        assert_eq!(
            Binary64::ONE - Binary64(0x3CA0_0000_0000_0000),
            Binary64(0x3FEF_FFFF_FFFF_FFFF)
        );
        assert_eq!(tiny * Binary64::HALF, Binary64::ZERO);
        assert_eq!(Binary64(3) * Binary64::HALF, Binary64(2));
        assert_eq!(
            Binary64(0x0010_0000_0000_0000) / Binary64::TWO,
            Binary64(0x0008_0000_0000_0000)
        );
    }
}
