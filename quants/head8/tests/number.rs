//! `Number` and `log2` against the vectors tools/referee.py writes from Python's binary64
//! arithmetic and its statement-by-statement mirror of V8's `Math.log2`.

use l0_edge::jsnum::Dbl;
use quant_head8::log2::{log2, CONSTANTS};
use quant_head8::Number;

const VECTORS: &str = include_str!("fixtures/number-vectors.hbp");
const QUANT8: &str = include_str!("fixtures/quant8-expected.hbp");

fn hex(field: &str) -> Number {
    Number::from_bits(u64::from_str_radix(field, 16).expect("hex bits"))
}

/// The bit pattern, or `nan` for every NaN (as the referee prints them).
fn shown(x: Number) -> String {
    if x.is_nan() {
        "nan".to_string()
    } else {
        format!("{:016x}", x.to_bits())
    }
}

/// The result of `op` as the referee prints it.
fn apply(op: &str, a: Number, b: Number) -> String {
    match op {
        "add" => shown(a + b),
        "sub" => shown(a - b),
        "mul" => shown(a * b),
        "div" => shown(a / b),
        "lt" => u8::from(a.lt(b)).to_string(),
        "eq" => u8::from(a.js_eq(b)).to_string(),
        "round" => shown(a.js_round()),
        "int32" => a.to_int32().to_string(),
        "log2" => shown(log2(a)),
        _ => panic!("unknown op {op}"),
    }
}

#[test]
fn matches_the_referee_vectors() {
    let mut cases = 0;
    for line in VECTORS.lines().filter(|l| !l.starts_with('#')) {
        let (mut op, mut a, mut b, mut want) = ("", "", "", "");
        for field in line.split('|').skip(1) {
            let (key, value) = field.split_once('=').expect("key=value");
            match key {
                "op" => op = value,
                "a" => a = value,
                "b" => b = value,
                "want" => want = value,
                _ => panic!("unknown key {key}"),
            }
        }
        assert_eq!(apply(op, hex(a), hex(b)), want, "{line}");
        cases += 1;
    }
    assert_eq!(cases, 18_176);
}

#[test]
fn log2_constants_equal_the_decimal_literals() {
    for (name, value) in CONSTANTS {
        let row = format!("CONST|name={name}|bits={:016x}", value.to_bits());
        assert!(QUANT8.lines().any(|l| l == row), "{row}");
    }
}

#[test]
fn agrees_with_l0_edge_jsnum_on_its_domain() {
    // l0_edge::jsnum::Dbl covers non-negative normal values with + * / and Math.round.
    let mut state = 0x2545_F491_4F6C_DD1Du64;
    let mut next = |bound: u64| {
        state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (state >> 11) % bound
    };
    for _ in 0..20_000 {
        let (an, ad) = (next(1 << 40), next(1 << 20) + 1);
        let (bn, bd) = (next(1 << 30) + 1, next(1 << 30) + 1);
        let (da, db) = (Dbl::from_ratio(an, ad), Dbl::from_ratio(bn, bd));
        let (na, nb) = (Number::from_ratio(an, ad), Number::from_ratio(bn, bd));
        assert_eq!(na.to_bits(), da.to_bits());
        assert_eq!((na + nb).to_bits(), (da + db).to_bits());
        assert_eq!((na * nb).to_bits(), (da * db).to_bits());
        assert_eq!((na / nb).to_bits(), (da / db).to_bits());
        assert_eq!(na.js_round(), Number::from_u64(da.js_round()));
    }
}
