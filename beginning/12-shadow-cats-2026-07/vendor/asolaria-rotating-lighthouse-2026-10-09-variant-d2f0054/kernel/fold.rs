//! ONE fold, in ONE place. Included by every kernel via `#[path]`, next to the canonical
//! `tribit` module (which it reads `P` and `K` from — it never re-declares them).
//!
//! Two lanes-producers with two DIFFERENT jobs. They were conflated before 2026-10-09:
//!
//! * `sketch_lanes` — the original rolling-base-131 fold, kept BYTE-IDENTICAL so every cube
//!   sealed with it still reproduces. It is a LOSSY LINEAR SKETCH, not an identity:
//!     - it is periodic: ord(131) mod P = 100,008 and 27 | 100,008, so positions `p` and
//!       `p + 100,008` share weight AND lane (`SKETCH_PERIOD`);
//!     - it is linear over Z/PZ, so collisions are constructible far below that period:
//!       deltas (+183, +241, −252) at positions 0, 27, 54 cancel in lane 0, giving two
//!       distinct 55-byte corpora with identical sketches (see the tests).
//!
//!   Its use is LOCALITY (a one-byte edit moves one lane by a known amount). Never cite it as
//!   identity, never read `roundtrip=EXACT` over it as a fact about the data.
//! * `identity_lanes` — 27 lanes derived from SHA-256 of the length-prefixed corpus. Distinct
//!   corpora collide only if SHA-256 does (still non-injective by pigeonhole — P^27 ≈ 2^538
//!   — but no collision is constructible). It carries no locality and no spectral meaning.
//!
//! A sketch is not a hash. Integer only; `float_used=0`.
#![allow(dead_code)] // shared module: not every kernel uses every item

use super::tribit::{K, P};

/// Rolling base of the sketch.
pub const SKETCH_BASE: u64 = 131;
/// Multiplicative order of 131 mod P (measured: 100,008 = (P−1)/10); 27 divides it.
pub const SKETCH_PERIOD: usize = 100_008;
/// Domain tag for the identity lanes.
const ID_TAG: &[u8] = b"ASOLARIA-FOLD-IDENTITY-V2|";

/// LOSSY LINEAR SKETCH. Byte-identical to every pre-2026-10-09 `fold_lanes`.
pub fn sketch_lanes(corpus: &[u8]) -> [u64; K] {
    sketch_lanes_with(corpus, SKETCH_BASE, 0)
}

/// The same lossy linear sketch with an explicit base and lane shift (lane = (pos+shift) % K,
/// weight = base^pos, roll starts at 1 — never at a station-dependent gain, which only scales
/// the identical sum; see the 2026-10-09 lighthouse fault).
pub fn sketch_lanes_with(corpus: &[u8], base: u64, shift: usize) -> [u64; K] {
    let m = P as u128;
    let mut lanes = [0u64; K];
    let mut roll: u128 = 1;
    for (pos, &b) in corpus.iter().enumerate() {
        let j = (pos + shift) % K;
        lanes[j] = ((lanes[j] as u128 + ((b as u128) + 1) * roll) % m) as u64;
        roll = roll * base as u128 % m;
    }
    lanes
}

/// Is `x` a scalar multiple (mod P) of `y` cyclically shifted by `shift` lanes?
/// i.e. ∃c: x[(j+shift)%K] == c·y[j] for all j. Returns the multiplier if so.
/// A "different" beam that passes this test is one reading at another gain.
pub fn proportional_shifted(x: &[u64; K], y: &[u64; K], shift: usize) -> Option<u64> {
    let m = P as u128;
    // Edge cases: both all-zero is trivially proportional (gain 1); exactly one all-zero is
    // not; a gain of 0 is never reported (it would make every x "proportional" to nothing).
    let y_zero = y.iter().all(|&v| v == 0);
    let x_zero = x.iter().all(|&v| v == 0);
    if y_zero || x_zero {
        return if y_zero && x_zero { Some(1) } else { None };
    }
    let j0 = (0..K).find(|&j| y[j] != 0)?;
    let c = (x[(j0 + shift) % K] as u128 * super::tribit::inv(y[j0]) as u128 % m) as u64;
    if c == 0 {
        return None;
    }
    (0..K)
        .all(|j| x[(j + shift) % K] as u128 == c as u128 * y[j] as u128 % m)
        .then_some(c)
}

/// IDENTITY lanes. `h = sha(TAG | len_be64 | corpus)`, lane j = first 8 bytes of
/// `sha(h | j)` reduced mod P. The reduction bias is below P / 2^64 ≈ 5.4e−14 per lane.
/// The hash is passed in so this module never vendors a second SHA-256 copy.
pub fn identity_lanes(corpus: &[u8], sha: fn(&[u8]) -> [u8; 32]) -> [u64; K] {
    let mut pre = Vec::with_capacity(ID_TAG.len() + 8 + corpus.len());
    pre.extend_from_slice(ID_TAG);
    pre.extend_from_slice(&(corpus.len() as u64).to_be_bytes());
    pre.extend_from_slice(corpus);
    let h = sha(&pre);
    let mut lanes = [0u64; K];
    let mut buf = [0u8; 33];
    buf[..32].copy_from_slice(&h);
    for (j, lane) in lanes.iter_mut().enumerate() {
        buf[32] = j as u8;
        let d = sha(&buf);
        let mut w = [0u8; 8];
        w.copy_from_slice(&d[..8]);
        *lane = u64::from_be_bytes(w) % P;
    }
    lanes
}

/// The constructed short collision for the sketch, as (position, delta) pairs. Exposed so
/// kernels can stamp a live falsifier row instead of quoting it.
pub const SKETCH_COLLISION_55: [(usize, i16); 3] = [(0, 183), (27, 241), (54, -252)];

/// Build the two 55-byte corpora of the constructed collision.
pub fn sketch_collision_pair() -> (Vec<u8>, Vec<u8>) {
    let mut a = vec![b'A'; 55];
    a[0] = 0;
    a[27] = 0;
    a[54] = 255;
    let mut b = a.clone();
    for &(pos, d) in SKETCH_COLLISION_55.iter() {
        b[pos] = (a[pos] as i16 + d) as u8;
    }
    (a, b)
}

/// True iff 131^SKETCH_PERIOD == 1 mod P and no proper divisor works (order check).
pub fn sketch_period_holds() -> bool {
    let pw = |e: u64| super::tribit::pow(SKETCH_BASE, e);
    if pw(SKETCH_PERIOD as u64) != 1 || SKETCH_PERIOD % K != 0 {
        return false;
    }
    // prime factors of 100,008 = 2^3 · 3^3 · 463
    [2u64, 3, 463]
        .iter()
        .all(|q| pw(SKETCH_PERIOD as u64 / q) != 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sha_stub(d: &[u8]) -> [u8; 32] {
        // deterministic non-cryptographic stand-in: only used to show identity_lanes is
        // sensitive to the corpus; integer only.
        let mut out = [0u8; 32];
        let mut acc: u64 = 1469598103934665603;
        for (i, &b) in d.iter().enumerate() {
            acc = (acc ^ b as u64).wrapping_mul(1099511628211) ^ (i as u64);
            out[i % 32] ^= (acc >> 24) as u8;
        }
        for (i, o) in out.iter_mut().enumerate() {
            *o ^= (acc >> (i % 8 * 8)) as u8;
        }
        out
    }

    #[test]
    fn collision_55_sketch_equal_identity_differs() {
        let (a, b) = sketch_collision_pair();
        assert_eq!(a.len(), 55);
        assert_ne!(a, b);
        assert_eq!(sketch_lanes(&a), sketch_lanes(&b));
        assert_ne!(identity_lanes(&a, sha_stub), identity_lanes(&b, sha_stub));
    }

    #[test]
    fn period_swap_keeps_sketch() {
        let n = SKETCH_PERIOD + 1; // 100,009 bytes
        let mut a = vec![b'x'; n];
        a[0] = b'a';
        a[SKETCH_PERIOD] = b'b';
        let mut b = a.clone();
        b.swap(0, SKETCH_PERIOD);
        assert_ne!(a, b);
        assert_eq!(sketch_lanes(&a), sketch_lanes(&b));
    }

    #[test]
    fn period_is_exact_order() {
        assert!(sketch_period_holds());
    }

    #[test]
    fn two_delta_collision_same_lane() {
        // +239 at pos 0 and -178 at pos 54 (same lane, 54 % 27 == 0): 239 == 178 * 131^54 mod P.
        let mut a = vec![b'A'; 55];
        a[0] = 0;
        a[54] = 255;
        let mut b = a.clone();
        b[0] = (a[0] as i16 + 239) as u8;
        b[54] = (a[54] as i16 - 178) as u8;
        assert_ne!(a, b);
        assert_eq!(sketch_lanes(&a), sketch_lanes(&b));
    }

    #[test]
    fn proportional_edge_cases() {
        let zero = [0u64; K];
        let mut y = [0u64; K];
        y[3] = 5;
        y[7] = 11;
        // both all-zero -> Some(1)
        assert_eq!(proportional_shifted(&zero, &zero, 0), Some(1));
        assert_eq!(proportional_shifted(&zero, &zero, 5), Some(1));
        // exactly one all-zero -> None, never Some(0)
        assert_eq!(proportional_shifted(&zero, &y, 0), None);
        assert_eq!(proportional_shifted(&y, &zero, 0), None);
        // a real multiple: x = 3*y
        let mut x = [0u64; K];
        for j in 0..K {
            x[j] = y[j] * 3 % P;
        }
        assert_eq!(proportional_shifted(&x, &y, 0), Some(3));
        // shifted: x[(j+2)%K] == 3*y[j]
        let mut xs = [0u64; K];
        for j in 0..K {
            xs[(j + 2) % K] = y[j] * 3 % P;
        }
        assert_eq!(proportional_shifted(&xs, &y, 2), Some(3));
        // not proportional
        let mut bad = x;
        bad[0] = 1;
        assert_eq!(proportional_shifted(&bad, &y, 0), None);
    }

    #[test]
    fn sketch_lanes_is_with_131_zero() {
        let c: Vec<u8> = (0..500u32).map(|i| (i * 7 + 3) as u8).collect();
        assert_eq!(sketch_lanes(&c), sketch_lanes_with(&c, 131, 0));
    }
}
