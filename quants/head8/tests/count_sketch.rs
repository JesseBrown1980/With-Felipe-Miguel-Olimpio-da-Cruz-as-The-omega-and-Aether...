//! `count_sketch` against line 55 taken literally: every `+=` rounded through `Number`, with no
//! integer accumulation. The inputs move the integer buckets through every transition: finer
//! units, sums reaching 2^53 units, values above 2^53 units, subnormals, zeros, NaN and the
//! infinities.

use quant_head8::{count_sketch, jl_hash, Number, D};

fn literal(msg: &[Number]) -> [Number; D] {
    let mut proj = [Number::ZERO; D];
    for (i, &x) in msg.iter().enumerate() {
        let h = jl_hash(i as u64);
        let j = h as usize & (D - 1);
        proj[j] = proj[j] + if h & 0x8000_0000 != 0 { -x } else { x };
    }
    proj
}

struct Lcg(u64);

impl Lcg {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        self.0 >> 11
    }

    fn below(&mut self, bound: u64) -> u64 {
        self.next() % bound
    }
}

fn pow2(e: i32) -> Number {
    if e >= -1022 {
        Number::from_bits(((e + 1023) as u64) << 52)
    } else {
        Number::from_bits(1u64 << (e + 1074))
    }
}

/// A value of `kind`: dyadic with a chosen unit, integer-sized, subnormal, special or arbitrary.
fn value(rng: &mut Lcg, kind: u64) -> Number {
    let sign = rng.below(2) << 63;
    let x = match kind {
        0 => {
            // k / 2^31 as fill() makes, the benchmark's data.
            let k = rng.below(1 << 32) as i64 - (1 << 31);
            Number::from_i64(k) / pow2(31)
        }
        1 => {
            // A short mantissa at a unit between 2^-60 and 2^-20.
            let k = rng.below(1 << 20) as i64 + 1;
            Number::from_i64(k) * pow2(-(20 + rng.below(41) as i32))
        }
        2 => Number::from_u64(rng.below(1 << 52) + (1 << 51)) * pow2(rng.below(12) as i32),
        3 => Number::from_bits(rng.below(1 << 52) + 1),
        4 => [
            Number::ZERO,
            -Number::ZERO,
            Number::NAN,
            Number::INFINITY,
            Number::from_bits(0x7FEF_FFFF_FFFF_FFFF),
        ][rng.below(5) as usize],
        _ => Number::from_bits(rng.next() << 11 | rng.below(1 << 11)),
    };
    Number::from_bits(x.to_bits() ^ sign)
}

fn check(msg: &[Number], label: &str) {
    let (fast, slow) = (count_sketch(msg.iter().copied()), literal(msg));
    for j in 0..D {
        let (a, b) = (fast[j], slow[j]);
        assert!(
            a == b || (a.is_nan() && b.is_nan()),
            "{label} bucket {j}: {:016x} vs {:016x}",
            a.to_bits(),
            b.to_bits()
        );
    }
}

#[test]
fn integer_buckets_equal_rounded_additions() {
    let mut rng = Lcg(0x9E37_79B9_7F4A_7C15);
    // Mostly one kind with rare others, so the integer buckets live for a while first.
    for case in 0..600 {
        let main = case % 4;
        let len = 1 + rng.below(6000) as usize;
        let msg: Vec<Number> = (0..len)
            .map(|_| {
                let kind = if rng.below(500) == 0 {
                    rng.below(6)
                } else {
                    main
                };
                value(&mut rng, kind)
            })
            .collect();
        check(&msg, &format!("case {case}"));
    }
}

#[test]
fn sums_crossing_2_pow_53_units() {
    // Units of 2^-1: every bucket reaches 2^53 units (2^52) and keeps going.
    let big = Number::from_u64((1 << 52) - 1) / Number::from_u64(2);
    let msg: Vec<Number> = (0..5000)
        .map(|i| if i % 3 == 0 { -big } else { big })
        .collect();
    check(&msg, "crossing");
    // Fine units first, then one coarse value that no longer fits.
    let mut msg: Vec<Number> = (0..3000).map(|i| pow2(-1000 - (i % 70))).collect();
    msg.push(Number::ONE);
    msg.extend((0..3000).map(|i| pow2(-1074 + (i % 20))));
    check(&msg, "fine then coarse");
}

#[test]
fn long_benchmark_message_past_the_rounded_hash() {
    // 3,500,000 elements: the hash product is rounded from i = 3,393,264 on.
    let msg = quant_head8::fill(3_500_000, 4242);
    check(&msg, "fill 3.5M");
}
