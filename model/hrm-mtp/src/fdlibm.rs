//! JavaScript `Math.log`: V8's port of fdlibm `__ieee754_log` (V8 12.4.254.21, the engine of
//! Node 22, `src/base/ieee754.cc:1638-1717`), line for line on [`Sf64`].

use crate::sf64::Sf64;

const LN2_HI: Sf64 = Sf64::from_bits(0x3fe6_2e42_fee0_0000);
const LN2_LO: Sf64 = Sf64::from_bits(0x3dea_39ef_3579_3c76);
const LG1: Sf64 = Sf64::from_bits(0x3fe5_5555_5555_5593);
const LG2: Sf64 = Sf64::from_bits(0x3fd9_9999_9997_fa04);
const LG3: Sf64 = Sf64::from_bits(0x3fd2_4924_9422_9359);
const LG4: Sf64 = Sf64::from_bits(0x3fcc_71c5_1d8e_78af);
const LG5: Sf64 = Sf64::from_bits(0x3fc7_4664_96cb_03de);
const LG6: Sf64 = Sf64::from_bits(0x3fc3_9a09_d078_c69f);
const LG7: Sf64 = Sf64::from_bits(0x3fc2_f112_df3e_5244);
/// The literal `0.33333333333333333` (ieee754.cc:1687).
const THIRD: Sf64 = Sf64::from_bits(0x3fd5_5555_5555_5555);

/// `Math.log(x)` for a positive normal `x` (the domain every caller here uses: integers >= 1).
pub fn log(x: Sf64) -> Sf64 {
    let mut x = x;
    let mut hx = x.high_word();
    assert!(
        hx >= 0x0010_0000 && !x.is_sign_negative(),
        "log is ported for positive normal arguments"
    );
    assert!(hx < 0x7ff0_0000, "log is ported for finite arguments");
    let mut k: i32 = 0;
    k += (hx >> 20) - 1023;
    hx &= 0x000f_ffff;
    let i = (hx + 0x95f64) & 0x10_0000;
    x = x.with_high_word(hx | (i ^ 0x3ff0_0000));
    k += i >> 20;
    let f = x - Sf64::ONE;
    if (0x000f_ffff & (2 + hx)) < 3 {
        if f.is_zero() {
            if k == 0 {
                return Sf64::ZERO;
            }
            let dk = Sf64::from_i64(i64::from(k));
            return dk * LN2_HI + dk * LN2_LO;
        }
        let r = f * f * (Sf64::HALF - THIRD * f);
        if k == 0 {
            return f - r;
        }
        let dk = Sf64::from_i64(i64::from(k));
        return dk * LN2_HI - ((r - dk * LN2_LO) - f);
    }
    let s = f / (Sf64::TWO + f);
    let dk = Sf64::from_i64(i64::from(k));
    let z = s * s;
    let mut i = hx - 0x6147a;
    let w = z * z;
    let j = 0x6b851 - hx;
    let t1 = w * (LG2 + w * (LG4 + w * LG6));
    let t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
    i |= j;
    let r = t2 + t1;
    if i > 0 {
        let hfsq = Sf64::HALF * f * f;
        if k == 0 {
            return f - (hfsq - s * (hfsq + r));
        }
        return dk * LN2_HI - ((hfsq - (s * (hfsq + r) + dk * LN2_LO)) - f);
    }
    if k == 0 {
        return f - s * (f - r);
    }
    dk * LN2_HI - ((s * (f - r) - dk * LN2_LO) - f)
}

/// `Math.log(n)` for a positive integer `n` below 2^53.
pub fn log_int(n: u64) -> Sf64 {
    assert!(n >= 1, "log_int takes a positive integer");
    log(Sf64::from_i64(
        i64::try_from(n).expect("integer below 2^53"),
    ))
}
