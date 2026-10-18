//! D1 run (NCM intake, 2026-10-18): balanced ternary is the exact-integer case of NCM-style
//! coarse-to-fine residual quantization.
//!
//! For every n in 1..=13 and every integer x with |x| <= H = (3^n - 1)/2:
//!   level by level, coarsest first, pick the codebook entry nearest the current residual
//!   (argmin of |r - c|, lowest index on a tie, like torch.argmin), subtract it, go finer.
//! Level k uses the codebook {-3^k, 0, +3^k}. The claim: the residual ends at exactly 0, no tie
//! ever occurs, and the chosen indices are exactly the trits the canonical tribit kernel gives.
//!
//! Controls that must FAIL, so the instrument can say no:
//!   - out of range (H < |x| <= 3^n - 1): residual must be nonzero for every x;
//!   - uncentred digits {0, 3^k, 2*3^k} over [0, 3^n - 1];
//!   - centred codebook over the uncentred range [0, 3^n - 1] (count is not range);
//!   - a deliberately corrupted code must be rejected by the tribit cross-check.
//!
//! Integer only: clippy denies float arithmetic for the whole crate, tribit module included.
//! Output: HBP rows (json=0) and the sha256 of the n=13 code stream.
#![deny(clippy::float_arithmetic, clippy::cast_precision_loss)]

use sha2::{Digest, Sha256};
use std::time::Instant;

// The canonical ternary kernel, reused via #[path] (never copied).
#[path = "C:/asolaria-acer/asolaria-os/kernel/core/src/tribit/mod.rs"]
#[allow(dead_code)]
mod tribit;
use tribit::{TritWord, Zero};

const KMAX: usize = 13;

const fn pow3(k: usize) -> i64 {
    let mut a: i64 = 1;
    let mut i = 0;
    while i < k {
        a *= 3;
        i += 1;
    }
    a
}

/// One NCM level step, integer form: argmin over the codebook of |r - c|.
/// Returns the chosen index and whether the minimum was tied.
fn nearest(r: i64, book: &[i64; 3]) -> (usize, bool) {
    let mut best = 0usize;
    let mut bd = (r - book[0]).abs();
    let mut tie = false;
    for (i, &c) in book.iter().enumerate().skip(1) {
        let d = (r - c).abs();
        match d.cmp(&bd) {
            std::cmp::Ordering::Less => {
                bd = d;
                best = i;
                tie = false;
            }
            std::cmp::Ordering::Equal => tie = true,
            std::cmp::Ordering::Greater => {}
        }
    }
    (best, tie)
}

struct Rq {
    codes: [u8; KMAX],
    residual: i64,
    ties: u32,
}

/// Coarse-to-fine residual quantization of x over n levels.
/// centred: codebook {-s, 0, s}; uncentred: {0, s, 2s}. Index i is the trit digit (0, 1, 2).
fn rq(x: i64, n: usize, centred: bool) -> Rq {
    let mut r = x;
    let mut codes = [0u8; KMAX];
    let mut ties = 0u32;
    for (lvl, code) in codes.iter_mut().enumerate().take(n) {
        let s = pow3(n - 1 - lvl);
        let book = if centred { [-s, 0, s] } else { [0, s, 2 * s] };
        let (i, tie) = nearest(r, &book);
        ties += u32::from(tie);
        *code = u8::try_from(i).expect("codebook index is below 3");
        r -= book[i];
    }
    Rq {
        codes,
        residual: r,
        ties,
    }
}

/// Three independent agreements with the tribit kernel:
/// (1) tribit's unpack of the offset value x+H yields the same trits;
/// (2) tribit's pack of the greedy codes returns x+H;
/// (3) the signed directions of the codes re-sum to x, with no offset involved.
fn tribit_agrees(x: i64, h: i64, n: usize, codes: &[u8; KMAX]) -> bool {
    let off = match u128::try_from(x + h) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let mut out = [Zero::Nil; KMAX];
    TritWord(off).unpack(&mut out[..n]);
    let unpack_ok = out[..n]
        .iter()
        .zip(codes[..n].iter())
        .all(|(z, &c)| z.digit() == c);

    let mut zs = [Zero::Nil; KMAX];
    for (z, &c) in zs.iter_mut().zip(codes.iter()).take(n) {
        *z = Zero::from_digit(c);
    }
    let pack_ok = TritWord::pack(&zs[..n]).0 == off;

    let mut v: i64 = 0;
    for z in zs[..n].iter() {
        v = v * 3 + i64::from(z.direction());
    }
    unpack_ok && pack_ok && v == x
}

fn main() {
    println!(
        "D1RUN|claim=balanced_ternary_is_exact_integer_residual_quantization|levels=coarse_to_fine|choice=argmin_abs_lowest_index_on_tie|kernel=tribit/mod.rs_via_path|float_arith=denied_by_clippy|json=0"
    );
    let mut all_pass = true;
    let mut values_tested: i64 = 0;
    let mut hasher = Sha256::new();
    let mut ns_per_value_k13: u128 = 0;

    for n in 1..=KMAX {
        let states = pow3(n);
        let h = (states - 1) / 2;

        let t0 = Instant::now();
        let mut exact: i64 = 0;
        let mut ties: u64 = 0;
        for x in -h..=h {
            let q = rq(x, n, true);
            ties += u64::from(q.ties);
            if q.residual == 0 && tribit_agrees(x, h, n, &q.codes) {
                exact += 1;
            }
            if n == KMAX {
                hasher.update(&q.codes[..n]);
            }
        }
        if n == KMAX {
            let el = t0.elapsed().as_nanos();
            ns_per_value_k13 = el / u128::try_from(states).expect("positive");
        }

        let mut oor_nonzero: i64 = 0;
        for x in (h + 1)..states {
            oor_nonzero += i64::from(rq(x, n, true).residual != 0);
            oor_nonzero += i64::from(rq(-x, n, true).residual != 0);
        }
        let mut uncentred_exact: i64 = 0;
        let mut count_not_range_exact: i64 = 0;
        for x in 0..states {
            uncentred_exact += i64::from(rq(x, n, false).residual == 0);
            count_not_range_exact += i64::from(rq(x, n, true).residual == 0);
        }

        let pass = exact == states
            && ties == 0
            && oor_nonzero == 2 * h
            && count_not_range_exact == h + 1;
        all_pass &= pass;
        values_tested += states + 2 * h + 2 * states;
        println!(
            "D1LEVEL|K={n}|states={states}|span=-{h}..{h}|in_range_exact={exact}/{states}|ties={ties}|out_of_range_nonzero={oor_nonzero}/{}|uncentred_digits_exact={uncentred_exact}/{states}|centred_book_on_uncentred_range_exact={count_not_range_exact}/{states}|pass={}|json=0",
            2 * h,
            u8::from(pass)
        );
    }

    // The instrument must be able to say no: corrupt one code and require rejection.
    let n = KMAX;
    let h = (pow3(n) - 1) / 2;
    let mut rejected = 0u32;
    let probes: [i64; 5] = [-h, -12_345, 0, 271_828, h];
    for &x in probes.iter() {
        let mut q = rq(x, n, true);
        q.codes[5] = (q.codes[5] + 1) % 3;
        rejected += u32::from(!tribit_agrees(x, h, n, &q.codes));
    }
    // The tie detector must be able to say yes: an EVEN step makes r = s/2 reachable.
    let tie_probes: [(i64, [i64; 3]); 3] = [(1, [-2, 0, 2]), (-1, [-2, 0, 2]), (3, [0, 2, 4])];
    let ties_seen = tie_probes
        .iter()
        .filter(|(r, book)| nearest(*r, book).1)
        .count();
    let tie_ok = ties_seen == 3;
    println!("D1TIEPROBE|even_step_probes=3|ties_detected={ties_seen}|pass={}|json=0", u8::from(tie_ok));
    all_pass &= tie_ok;
    let instrument_ok = rejected == 5;
    all_pass &= instrument_ok;
    println!("D1INSTRUMENT|corrupted_code_probes=5|rejected={rejected}|pass={}|json=0", u8::from(instrument_ok));

    let digest = hasher.finalize();
    println!(
        "D1RESULT|all_levels_pass={}|values_tested={values_tested}|K13_in_range=1594323|K13_code_stream_bytes={}|K13_code_stream_sha256={digest:x}|K13_ns_per_value={ns_per_value_k13}|float_used=0|tag=MEASURED|json=0",
        u8::from(all_pass),
        1_594_323 * KMAX
    );
}
