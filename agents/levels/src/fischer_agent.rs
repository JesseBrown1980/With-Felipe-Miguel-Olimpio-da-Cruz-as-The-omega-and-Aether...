//! `fischer_agent()` (players/rime_agents.py:30-62), Law 23: one sphere point `x = g^77777` in
//! `(Z/pZ)*`, p = 1,000,081, read at the three levels of rime_agents.py:6-8.
//!
//! - level 3 (lines 36-38): the coset of the order-3 subgroup, the `t` in `0..3` with
//!   `x^(n/3) == w3^t`, `w3 = g^(n/3)`.
//! - level 27 (lines 39-52): `k mod 27` as three base-3 digits, each read after dividing out the
//!   digits already found (`x * g^(-k27)` raised to `n/3^(i+1)`), then rewritten as three
//!   balanced-ternary digits `{-1, 0, +1}` (Python ints, lines 46-51), carried here as the owner's
//!   trit `Zero` (`kernel/tribit`, through `ternary`) and written by `ternary::balanced::low_trits`.
//! - level rime (lines 53-56): the code sets `k = 77777`, the exponent used to build `x` at line
//!   35, and asserts `pow(g, k, p) == x`. The comment at lines 53-54 reads "the full discrete log
//!   (all towers, CRT) — brute here is fine at demo scale; the cluster version is
//!   rime_fischer_cluster.py"; the tower-by-tower solve is ported in [`crate::rime_fischer`] and
//!   [`crate::cluster`].

use crate::pyfmt::{py_bool, rule74};
use crate::sphere::{is_prime, pow_mod, pow_mod_neg, primitive_root};
use ternary::balanced::low_trits;
use ternary::Zero;

/// `p` (line 33).
pub const P: u64 = 1_000_081;
/// The exponent of the sphere point (line 35).
pub const POINT_EXP: u64 = 77_777;

/// What `fischer_agent()` computes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FischerAgent {
    /// `p`.
    pub p: u64,
    /// `g = primitive_root(p)`.
    pub g: u64,
    /// `x = pow(g, 77777, p)`.
    pub x: u64,
    /// Level 3: `l3`, which third of the sphere.
    pub l3: u64,
    /// Level 27: `k27 = k mod 27` from the cascaded base-3 digits.
    pub k27: u64,
    /// Level 27: the balanced-ternary digits `trimes`, least significant first, as trits.
    pub trimes: [Zero; 3],
    /// Level 27: `sig`, the digits written with `-`, `0`, `+`.
    pub sig: String,
    /// Level rime: `k`.
    pub k: u64,
    /// Level rime: `pow(g, k, p) == x`.
    pub invert_exact: bool,
}

/// The `next(t for t in range(3) if a == pow(w3, t, p))` of lines 38 and 44.
fn third(a: u64, w3: u64, p: u64) -> u64 {
    (0..3u64)
        .find(|&t| a == pow_mod(w3, t, p))
        .expect("StopIteration: a cube root of unity matches")
}

/// `fischer_agent()` without its prints.
pub fn fischer_agent() -> FischerAgent {
    let p = P;
    assert!(is_prime(p) && (p - 1) % 27 == 0);
    let g = primitive_root(p).expect("p is prime");
    let n = p - 1;
    let x = pow_mod(g, POINT_EXP, p);
    // level 3 (lines 37-38)
    let w3 = pow_mod(g, n / 3, p);
    let l3 = third(pow_mod(x, n / 3, p), w3, p);
    // level 27 (lines 40-45); line 40 computes w27 = pow(g, n // 27, p), which the lines below
    // do not read.
    let mut k27 = 0u64;
    for i in 0..3u32 {
        let shifted = pow_mod_neg(g, k27, p).expect("g is invertible mod p");
        let base = (u128::from(x) * u128::from(shifted) % u128::from(p)) as u64;
        let e = pow_mod(base, n / 3u64.pow(i + 1), p);
        let d = third(e, w3, p);
        k27 += d * 3u64.pow(i);
    }
    // balanced ternary (lines 46-51): for r == 2 the script writes -1 and sets kk = kk // 3 + 1,
    // which is (kk + 1) // 3, the carry `low_trits` applies.
    let mut trimes = [Zero::Nil; 3];
    low_trits(i64::try_from(k27).expect("k27 < 27"), &mut trimes);
    // line 52: {-1: '-', 0: '0', 1: '+'}[t]
    let sig: String = trimes
        .iter()
        .map(|t| match t.direction() {
            -1 => '-',
            0 => '0',
            _ => '+',
        })
        .collect();
    // level rime (lines 55-56)
    let k = POINT_EXP;
    assert!(pow_mod(g, k, p) == x);
    FischerAgent {
        p,
        g,
        x,
        l3,
        k27,
        trimes,
        sig,
        k,
        invert_exact: pow_mod(g, k, p) == x,
    }
}

/// The lines `fischer_agent()` prints (lines 31-32, 57-61).
pub fn fischer_agent_lines(a: &FischerAgent) -> Vec<String> {
    vec![
        rule74(),
        "AGENT 1 \u{2014} FISCHER (Law 23): -,0,+ at every level".to_string(),
        format!("  sphere (Z/{}Z)*  g={}  point=g^77777", a.p, a.g),
        format!("  level 3    : third #{}", a.l3),
        format!(
            "  level 27   : k mod 27 = {}  trime digits [{}]  (cascaded, -,0,+)",
            a.k27, a.sig
        ),
        format!(
            "  level rime : full k = {}  byte-exact invert = {}",
            a.k,
            py_bool(a.invert_exact)
        ),
        "  GATE: cost is sqrt-scaled per prime tower; one large tower is the wall (Law 14)."
            .to_string(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_three_levels() {
        let a = fischer_agent();
        assert_eq!((a.p, a.g), (1_000_081, 7));
        assert_eq!(a.l3, 2);
        assert_eq!(a.k27, 17);
        assert_eq!(a.k27, POINT_EXP % 27);
        assert_eq!(a.trimes, [Zero::Neg, Zero::Nil, Zero::Neg]);
        assert_eq!(a.trimes.map(Zero::direction), [-1, 0, -1]);
        assert_eq!(a.sig, "-0-");
        assert!(a.invert_exact);
        // The level-3 third is the exponent mod 3 (x^(n/3) = w3^(k mod 3)).
        assert_eq!(a.l3, POINT_EXP % 3);
    }
}
