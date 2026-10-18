//! players/rime_fischer.py: the rime Fischer, Pohlig-Hellman over `(Z/pZ)*`. The order `p - 1`
//! is split into prime-power towers `q^e` (`factor_pe`, lines 47-56); one Fischer per tower reads
//! the exponent digit by digit in base `q`, dividing out the digits already found and solving
//! each digit by baby-step giant-step (`per_rime_fischer`, lines 58-66); the per-tower residues
//! are combined by CRT (`rime_fischer`, lines 68-73).

use crate::pyfmt::{grouped, list, py_bool, Stdout};
use crate::sphere::{inv_mod, is_prime, isqrt, pow_mod, primitive_root};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// `p` of `main()` (line 76).
pub const P: u64 = 1_000_081;

/// `factor_pp(n)` (lines 20-29): the prime-power towers `q^e` of `n`, ascending in `q`.
pub fn factor_pp(n: u64) -> Vec<u64> {
    factor_pe(n).iter().map(|&(q, e)| q.pow(e)).collect()
}

/// `factor_pe(n)` (lines 47-56; rime_fischer_cluster.py:67-76 is the same function): `(q, e)` per
/// prime `q` dividing `n`, ascending in `q`.
pub fn factor_pe(mut n: u64) -> Vec<(u64, u32)> {
    let mut out = Vec::new();
    let mut d = 2u64;
    while d * d <= n {
        if n % d == 0 {
            let mut e = 0u32;
            while n % d == 0 {
                n /= d;
                e += 1;
            }
            out.push((d, e));
        }
        d += 1;
    }
    if n > 1 {
        out.push((n, 1));
    }
    out
}

fn mul_mod(a: u64, b: u64, p: u64) -> u64 {
    (u128::from(a) * u128::from(b) % u128::from(p)) as u64
}

/// `bsgs(g, h, p, n)` (lines 31-38): the `x` in `[0, n)` with `g^x = h (mod p)`, from a baby-step
/// table that keeps the first `j` per value (`setdefault`) and giant steps by
/// `pow(pow(g, m, p), p - 2, p)`; `None` where upstream returns `None`.
pub fn bsgs(g: u64, h: u64, p: u64, n: u64) -> Option<u64> {
    let m = isqrt(n) + 1;
    let mut table: HashMap<u64, u64> = HashMap::new();
    let mut e = 1u64;
    for j in 0..m {
        table.entry(e).or_insert(j);
        e = mul_mod(e, g, p);
    }
    let gm = pow_mod(pow_mod(g, m, p), p - 2, p);
    let mut gamma = h;
    for i in 0..m {
        if let Some(&j) = table.get(&gamma) {
            return Some(i * m + j);
        }
        gamma = mul_mod(gamma, gm, p);
    }
    None
}

/// `crt(rs, ms)` (lines 40-45; rime_fischer_cluster.py:60-65 is the same function):
/// `sum(r * Mi * pow(Mi, -1, m)) % M` with `M = prod(ms)`, `Mi = M // m`. The `u64` result holds
/// every `M` below 2^64, as for the towers of `p - 1` upstream passes (lines 68-73); for a larger
/// `M`, where upstream returns a wider Python integer, this panics.
pub fn crt(rs: &[u64], ms: &[u64]) -> u64 {
    let big_m = ms
        .iter()
        .try_fold(1u64, |acc, &m| acc.checked_mul(m))
        .expect("prod(ms) below 2^64");
    let big_m = u128::from(big_m);
    let mut x = 0u128;
    for (&r, &m) in rs.iter().zip(ms) {
        let mi = big_m / u128::from(m);
        let inv = inv_mod((mi % u128::from(m)) as u64, m).expect("pairwise coprime moduli");
        x = (x + u128::from(r) % big_m * (mi * u128::from(inv) % big_m)) % big_m;
    }
    x as u64
}

/// One tower's result: `x mod q^e`, `q^e`, and the search cost `moves`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Tower {
    /// `x`, the exponent modulo `q^e`.
    pub x: u64,
    /// `q^e`.
    pub qe: u64,
    /// `moves`: `isqrt(q) + 1` per digit.
    pub moves: u64,
}

/// `per_rime_fischer(g, h, p, q, e)` (lines 58-66).
pub fn per_rime_fischer(g: u64, h: u64, p: u64, q: u64, e: u32) -> Tower {
    let n = p - 1;
    let gamma = pow_mod(g, n / q, p);
    let ginv = pow_mod(g, p - 2, p);
    let (mut x, mut moves) = (0u64, 0u64);
    for j in 0..e {
        let hh = mul_mod(h, pow_mod(ginv, x, p), p);
        let hj = pow_mod(hh, n / q.pow(j + 1), p);
        let dj = bsgs(gamma, hj, p, q).expect("bsgs found the digit");
        moves += isqrt(q) + 1;
        x += dj * q.pow(j);
    }
    Tower {
        x,
        qe: q.pow(e),
        moves,
    }
}

/// `rime_fischer(g, h, p)` (lines 68-73): the CRT of the towers, and `(q^e, moves)` per tower.
pub fn rime_fischer(g: u64, h: u64, p: u64) -> (u64, Vec<(u64, u64)>) {
    let (mut rs, mut ms, mut per) = (Vec::new(), Vec::new(), Vec::new());
    for (q, e) in factor_pe(p - 1) {
        let t = per_rime_fischer(g, h, p, q, e);
        rs.push(t.x);
        ms.push(t.qe);
        per.push((q.pow(e), t.moves));
    }
    (crt(&rs, &ms), per)
}

/// `int(hashlib.sha256(str(seed).encode()).hexdigest(), 16) % n` (line 86; rime_fischer_cluster.py:88).
pub fn seed_target(seed: u64, n: u64) -> u64 {
    let digest = Sha256::digest(seed.to_string().as_bytes());
    digest
        .iter()
        .fold(0u128, |r, &b| (r * 256 + u128::from(b)) % u128::from(n)) as u64
}

/// What `main()` prints (lines 75-98).
pub fn main_stdout() -> String {
    let mut out = Stdout::new();
    let p = P;
    assert!(is_prime(p) && (p - 1) % 27 == 0);
    let g = primitive_root(p).expect("p is prime");
    let towers = factor_pp(p - 1);
    out.print(format!(
        "=== RIME FISCHER \u{2014} play the sphere (Z/{p}Z)*, g={g} ==="
    ));
    out.print(format!(
        "  sphere order {} = nested rime-towers {}  (smooth -> playable)",
        grouped(u128::from(p - 1)),
        list(&towers)
    ));
    out.print("");
    let mut ok = true;
    let mut per = Vec::new();
    for seed in 0..5u64 {
        let k_true = seed_target(seed, p - 1);
        let h = pow_mod(g, k_true, p);
        let (k_played, per_seed) = rime_fischer(g, h, p);
        per = per_seed;
        let reached = pow_mod(g, k_played, p) == h;
        ok &= reached;
        out.print(format!(
            "  target g^{k_true:>6} -> played k={k_played:>6}  reached={}",
            py_bool(reached)
        ));
    }
    out.print(format!(
        "\n  every target reached from the null center, rime-dimensionally: {}",
        py_bool(ok)
    ));
    out.print("  one Bobby Fischer per rime, cascading digit-differences (base q), then CRT:");
    for (qe, moves) in per {
        out.print(format!(
            "    rime {qe:>4}: ~{moves} cascade-moves  (vs {qe} brute) \u{2014} the difference cascade"
        ));
    }
    out.print("");
    out.print("  GATE: this works because the order is SMOOTH (small prime towers).");
    out.print("  A sphere with a large prime factor is UNPLAYABLE \u{2014} the discrete-log wall.");
    out.into_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn towers_of_the_sphere() {
        assert_eq!(factor_pe(1_000_080), vec![(2, 4), (3, 3), (5, 1), (463, 1)]);
        assert_eq!(factor_pp(1_000_080), vec![16, 27, 5, 463]);
        assert_eq!(factor_pe(1), vec![]);
        assert_eq!(factor_pe(97), vec![(97, 1)]);
    }

    #[test]
    fn every_exponent_of_a_small_sphere_is_recovered() {
        let p = 1_009u64; // p - 1 = 2^4 * 3^2 * 7
        let g = primitive_root(p).unwrap();
        for k in 0..p - 1 {
            let (played, _) = rime_fischer(g, pow_mod(g, k, p), p);
            assert_eq!(played, k);
        }
    }

    #[test]
    fn crt_recomposes() {
        let ms = [16u64, 27, 5, 463];
        for v in [0u64, 1, 77_777, 1_000_079, 994_185] {
            let rs: Vec<u64> = ms.iter().map(|m| v % m).collect();
            assert_eq!(crt(&rs, &ms), v);
        }
        // Residues at or above their modulus: Python `crt([2**64 - 1, 30], [16, 27])` is 111.
        assert_eq!(crt(&[u64::MAX, 30], &[16, 27]), 111);
    }

    #[test]
    #[should_panic(expected = "prod(ms) below 2^64")]
    fn crt_refuses_a_modulus_product_of_2_pow_64_or_more() {
        crt(&[0, 0, 0], &[83_700_109, 83_700_541, 83_700_649]);
    }
}
