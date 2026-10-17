//! The scripts' JavaScript Number expressions, re-derived with `l0_edge::jsnum::Dbl` (binary64
//! `+` and `*` in evaluation order), give the same doubles as this crate's integers. `%`, `-`,
//! `Math.abs` and `Math.max` act on integers below 2^53 here, where binary64 results are exact.

use l0_edge::jsnum::Dbl;
use ste_certificate::sidon::{erdos_turan, filtered_primes, ANCHOR_PRIMES};
use ste_certificate::{distance_probe, sidon_probe};

const JS_SAFE: u64 = 1 << 53;

fn d(n: u64) -> Dbl {
    assert!(n < JS_SAFE, "{n} is not below 2^53");
    Dbl::from_u64(n)
}

fn same(js: Dbl, ours: u64) {
    assert!(ours < JS_SAFE, "{ours} is not below 2^53");
    assert_eq!(js.to_bits(), Dbl::from_u64(ours).to_bits(), "{ours}");
}

#[test]
fn erdos_turan_numbers() {
    // sidon-cross-fix.mjs:2 / sidon-probe.mjs:7: 2*p*k + ((k*k) % p).
    let mut primes = filtered_primes();
    primes.extend(sidon_probe::SINGLE_TOWER_PRIMES);
    for p in primes {
        for (k, &a) in (0..p).zip(&erdos_turan(p)) {
            same(d(k) * d(k), k * k);
            same(d(2) * d(p) * d(k) + d((k * k) % p), a);
        }
    }
}

#[test]
fn distance_probe_numbers() {
    // distance-probe.mjs:13 p ** 3; :10 and :18 the two linearizers.
    let c = distance_probe::cubes();
    for (p, cube) in ANCHOR_PRIMES.iter().zip(c) {
        same(d(*p) * d(*p) * d(*p), cube);
    }
    let width = distance_probe::WIDTH;
    for i in 0..256 {
        let r = distance_probe::reg(&format!("POS-{i}"));
        same(
            d(r.sector) * (d(width) * d(3)) + d(r.lane) * d(width) + d(r.glyph),
            distance_probe::bh_index_linear(&r),
        );
        same(
            d(r.sector) * d(c[0]) + d(r.lane) * d(c[3]) + d(r.glyph) * d(c[6]),
            distance_probe::bh_index_sidon(&r),
        );
    }
}

#[test]
fn sidon_probe_numbers() {
    // sidon-probe.mjs:31: acc += (t.span + 1) * BIG; all.push(t.anchor + x * BIG).
    let (towers, all) = sidon_probe::layout();
    let big = sidon_probe::BIG;
    let mut acc = Dbl::ZERO;
    let mut i = 0;
    for t in &towers {
        same(acc, t.anchor);
        acc = acc + (d(t.span) + d(1)) * d(big);
        for &x in &t.s {
            same(d(t.anchor) + d(x) * d(big), all[i]);
            i += 1;
        }
    }
    assert_eq!(i, all.len());
}
