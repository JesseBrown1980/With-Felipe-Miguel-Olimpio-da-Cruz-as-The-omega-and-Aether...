//! `Sf64` against `l0_edge::jsnum::Dbl` on the operations both implement, and the JavaScript
//! rounding rules the HRM pulls use.

use hrm_mtp::sf64::Sf64;
use l0_edge::jsnum::Dbl;

fn grid() -> Vec<(u64, u64)> {
    let mut out = Vec::new();
    for num in [
        0u64,
        1,
        2,
        3,
        7,
        10,
        99,
        355,
        1023,
        4096,
        65_537,
        1 << 40,
        (1 << 53) - 1,
    ] {
        for den in [1u64, 2, 3, 7, 10, 113, 1000, 4096, 999_983, 1 << 32] {
            out.push((num, den));
        }
    }
    out
}

#[test]
fn ratio_add_mul_div_agree_with_dbl() {
    let values: Vec<(Sf64, Dbl)> = grid()
        .into_iter()
        .map(|(n, d)| (Sf64::from_ratio(n, d), Dbl::from_ratio(n, d)))
        .collect();
    for &(s, d) in &values {
        assert_eq!(s.to_bits(), d.to_bits());
    }
    for (i, &(sa, da)) in values.iter().enumerate().step_by(3) {
        for &(sb, db) in values.iter().skip(i % 7).step_by(5) {
            assert_eq!((sa + sb).to_bits(), (da + db).to_bits());
            assert_eq!((sa * sb).to_bits(), (da * db).to_bits());
            if !db.is_zero() {
                assert_eq!((sa / sb).to_bits(), (da / db).to_bits());
            }
        }
    }
}

#[test]
fn subtraction_and_signs() {
    let a = Sf64::from_ratio(1, 10);
    let b = Sf64::from_ratio(3, 10);
    // JS: 0.1 - 0.3 === -0.19999999999999998
    assert_eq!((a - b).to_bits(), 0xbfc9_9999_9999_9999);
    // JS: 0.3 - 0.1 === 0.19999999999999998
    assert_eq!((b - a).to_bits(), 0x3fc9_9999_9999_9999);
    assert!((a - a).is_zero() && !(a - a).is_sign_negative());
    assert_eq!(Sf64::from_i64(-7) * Sf64::from_i64(3), Sf64::from_i64(-21));
    assert_eq!(
        (-(Sf64::ONE - Sf64::from_i64(1 << 52))).to_bits(),
        Sf64::from_i64((1 << 52) - 1).to_bits()
    );
}

#[test]
fn js_round_ties_toward_positive_infinity() {
    let half = |n: i64| Sf64::from_i64(n) / Sf64::TWO;
    assert_eq!(half(5).js_round(), 3); // Math.round(2.5) === 3
    assert_eq!(half(-5).js_round(), -2); // Math.round(-2.5) === -2
    assert_eq!(half(-1).js_round(), 0); // Math.round(-0.5) === -0
    assert_eq!(half(1).js_round(), 1); // Math.round(0.5) === 1
    assert_eq!(Sf64::from_bits(0x3fdf_ffff_ffff_ffff).js_round(), 0); // 0.49999999999999994
    assert_eq!(Sf64::from_i64(-3).js_round(), -3);
    assert_eq!((-Sf64::from_ratio(7, 3)).ceil(), -2);
    assert_eq!(Sf64::from_ratio(7, 3).ceil(), 3);
    assert_eq!(Sf64::from_i64(9841).ceil(), 9841);
}

#[test]
fn word_access_round_trips() {
    let x = Sf64::from_ratio(1000, 7);
    let y = x.with_high_word(x.high_word());
    assert_eq!(x, y);
    assert_eq!(
        (u64::from(x.high_word() as u32) << 32) | u64::from(x.low_word()),
        x.to_bits()
    );
}
