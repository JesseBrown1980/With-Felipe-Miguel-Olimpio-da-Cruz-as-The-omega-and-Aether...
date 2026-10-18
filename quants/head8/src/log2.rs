//! `Math.log2` as V8 computes it: `base::ieee754::log2`, FreeBSD/fdlibm `e_log2.c` with
//! `k_log1p`, in V8 12.4.254.21 and 13.6 `src/base/ieee754.cc` (lines 1939-2050 in 12.4).
//!
//! Every statement below is the C statement it ports, in the same order, with each `+ - * /`
//! rounded once through [`Number`].

use crate::number::Number;

const TWO54: Number = Number::from_bits(0x4350_0000_0000_0000);
const IVLN2HI: Number = Number::from_bits(0x3FF7_1547_6520_0000);
const IVLN2LO: Number = Number::from_bits(0x3DE7_05FC_2EEF_A200);
const LG1: Number = Number::from_bits(0x3FE5_5555_5555_5593);
const LG2: Number = Number::from_bits(0x3FD9_9999_9997_FA04);
const LG3: Number = Number::from_bits(0x3FD2_4924_9422_9359);
const LG4: Number = Number::from_bits(0x3FCC_71C5_1D8E_78AF);
const LG5: Number = Number::from_bits(0x3FC7_4664_96CB_03DE);
const LG6: Number = Number::from_bits(0x3FC3_9A09_D078_C69F);
const LG7: Number = Number::from_bits(0x3FC2_F112_DF3E_5244);
const HALF: Number = Number::from_bits(0x3FE0_0000_0000_0000);
const TWO: Number = Number::from_bits(0x4000_0000_0000_0000);

/// The named constants, for checking against the decimal literals of the C source.
pub const CONSTANTS: [(&str, Number); 10] = [
    ("two54", TWO54),
    ("ivln2hi", IVLN2HI),
    ("ivln2lo", IVLN2LO),
    ("Lg1", LG1),
    ("Lg2", LG2),
    ("Lg3", LG3),
    ("Lg4", LG4),
    ("Lg5", LG5),
    ("Lg6", LG6),
    ("Lg7", LG7),
];

/// `k_log1p(f)`: `log(1 + f) - f` for `1 + f` in about `[sqrt(2)/2, sqrt(2)]`.
fn k_log1p(f: Number) -> Number {
    let s = f / (TWO + f);
    let z = s * s;
    let w = z * z;
    let t1 = w * (LG2 + w * (LG4 + w * LG6));
    let t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
    let r = t2 + t1;
    let hfsq = HALF * f * f;
    s * (hfsq + r)
}

/// JavaScript `Math.log2(x)`.
pub fn log2(x: Number) -> Number {
    let mut x = x;
    let mut hx = x.high_word();
    let lx = x.low_word();
    let mut k: i32 = 0;
    if hx < 0x0010_0000 {
        if (hx & 0x7FFF_FFFF) as u32 | lx == 0 {
            return Number::NEG_INFINITY;
        }
        if hx < 0 {
            return Number::NAN;
        }
        k -= 54;
        x = x * TWO54;
        hx = x.high_word();
    }
    if hx >= 0x7FF0_0000 {
        return x + x;
    }
    if hx == 0x3FF0_0000 && lx == 0 {
        return Number::ZERO;
    }
    k += (hx >> 20) - 1023;
    hx &= 0x000F_FFFF;
    let i = (hx + 0x95F64) & 0x10_0000;
    x = x.with_high_word((hx | (i ^ 0x3FF0_0000)) as u32);
    k += i >> 20;
    let y = Number::from_i64(i64::from(k));
    let f = x - Number::ONE;
    let hfsq = HALF * f * f;
    let r = k_log1p(f);
    let mut hi = f - hfsq;
    hi = hi.with_low_word(0);
    let lo = (f - hi) - hfsq + r;
    let mut val_hi = hi * IVLN2HI;
    let mut val_lo = (lo + hi) * IVLN2LO + lo * IVLN2HI;
    let w = y + val_hi;
    val_lo = val_lo + ((y - w) + val_hi);
    val_hi = w;
    val_lo + val_hi
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_powers_of_two_and_specials() {
        for k in -1074i64..1024 {
            let x = if k >= -1022 {
                Number::from_bits(((k + 1023) as u64) << 52)
            } else {
                Number::from_bits(1u64 << (k + 1074))
            };
            assert_eq!(log2(x), Number::from_i64(k), "2^{k}");
        }
        assert_eq!(log2(Number::ZERO), Number::NEG_INFINITY);
        assert_eq!(log2(-Number::ZERO), Number::NEG_INFINITY);
        assert!(log2(-Number::ONE).is_nan());
        assert!(log2(Number::NAN).is_nan());
        assert_eq!(log2(Number::INFINITY), Number::INFINITY);
        assert!(log2(Number::NEG_INFINITY).is_nan());
    }
}
