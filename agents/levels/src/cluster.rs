//! players/rime_fischer_cluster.py: the rime Fischer with one worker per prime-power tower
//! (`per_rime_worker`, lines 47-58), combined by CRT at the coordinator (line 93). For `q = 3`
//! the worker also writes `x mod 27` as balanced-ternary digits (`to_balanced_base3`, lines
//! 38-45). Upstream runs the workers in a `multiprocessing.Pool` with one process per tower
//! (lines 91-92); here each runs on its own scoped thread, and the results are read back in
//! tower order as `pool.map` returns them. The balanced digits, Python ints in `{-1, 0, 1}`
//! upstream, are the owner's trit `Zero` (`kernel/tribit`, through `ternary`), written by
//! `ternary::balanced::low_trits`.

use crate::pyfmt::{grouped, list, py_bool, tuple, Stdout};
use crate::rime_fischer::{crt, factor_pe, seed_target};
use crate::sphere::{is_prime, isqrt, pow_mod, primitive_root};
use std::collections::HashMap;
use ternary::balanced::low_trits;
use ternary::Zero;

/// `p` of `main()` (line 79).
pub const P: u64 = 1_000_081;

fn mul_mod(a: u64, b: u64, p: u64) -> u64 {
    (u128::from(a) * u128::from(b) % u128::from(p)) as u64
}

/// `bsgs(g, h, p, order)` (lines 26-36; rime_27fischers.py:26-33 is the same computation): the
/// baby-step table keeps the last `j` per value (`table[e] = j`), the giant step is
/// `pow(pow(g, order - 1, p), m, p)`, and `m + 1` giant steps are tried; the result is
/// `(i*m + j) % order`. Line 30 also computes `pow(g, (order - m) % order, p)` into `factor`,
/// which the function does not read.
pub fn bsgs(g: u64, h: u64, p: u64, order: u64) -> Option<u64> {
    let m = isqrt(order) + 1;
    let mut table: HashMap<u64, u64> = HashMap::new();
    let mut e = 1u64;
    for j in 0..m {
        table.insert(e, j);
        e = mul_mod(e, g, p);
    }
    let gm = pow_mod(pow_mod(g, order - 1, p), m, p);
    let mut e = h;
    for i in 0..=m {
        if let Some(&j) = table.get(&e) {
            return Some((i * m + j) % order);
        }
        e = mul_mod(e, gm, p);
    }
    None
}

/// `to_balanced_base3(x, e)` (lines 38-45): the `e` balanced-ternary digits of `x` as trits, least
/// significant first. `low_trits` takes an `i64`, so `x` must be at most `i64::MAX` (panics above,
/// for any `e`). `per_rime_worker` passes `x < 3^e`; in `play` the `e` is the exponent of 3 in
/// `p - 1` (`factor_pe`), so for a prime `p` below 2^64, `e <= 39` and `x < 3^39 < 2^63`.
pub fn to_balanced_base3(x: u64, e: u32) -> Vec<Zero> {
    let mut d = vec![Zero::Nil; e as usize];
    low_trits(i64::try_from(x).expect("x <= i64::MAX"), &mut d);
    d
}

/// The dict `per_rime_worker` returns (line 58).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Worker {
    /// `q`.
    pub q: u64,
    /// `e`.
    pub e: u32,
    /// `q**e`.
    pub qe: u64,
    /// `x`, the exponent modulo `q^e`.
    pub x: u64,
    /// `moves`: `isqrt(q) + 1` per digit.
    pub moves: u64,
    /// The base-`q` digits, least significant first.
    pub digits: Vec<u64>,
    /// `to_balanced_base3(x, e)` when `q == 3`, else `None`.
    pub trime_digits: Option<Vec<Zero>>,
}

/// `per_rime_worker((g, h, p, q, e))` (lines 47-58): one Fischer for the tower `q^e`.
pub fn per_rime_worker(g: u64, h: u64, p: u64, q: u64, e: u32) -> Worker {
    let n = p - 1;
    let gamma = pow_mod(g, n / q, p);
    let ginv = pow_mod(g, p - 2, p);
    let (mut x, mut moves, mut digits) = (0u64, 0u64, Vec::new());
    for j in 0..e {
        let hh = mul_mod(h, pow_mod(ginv, x, p), p);
        let hj = pow_mod(hh, n / q.pow(j + 1), p);
        let dj = bsgs(gamma, hj, p, q).expect("bsgs found the digit");
        moves += isqrt(q) + 1;
        digits.push(dj);
        x += dj * q.pow(j);
    }
    let trime_digits = (q == 3).then(|| to_balanced_base3(x, e));
    Worker {
        q,
        e,
        qe: q.pow(e),
        x,
        moves,
        digits,
        trime_digits,
    }
}

/// The cluster: one worker per tower of `p - 1`, each on its own thread, results in tower order
/// (lines 90-92); then the coordinator's CRT fan-in (line 93).
pub fn play(g: u64, h: u64, p: u64) -> (u64, Vec<Worker>) {
    let towers = factor_pe(p - 1);
    let results: Vec<Worker> = std::thread::scope(|s| {
        let handles: Vec<_> = towers
            .iter()
            .map(|&(q, e)| s.spawn(move || per_rime_worker(g, h, p, q, e)))
            .collect();
        handles
            .into_iter()
            .map(|h| h.join().expect("worker"))
            .collect()
    });
    let rs: Vec<u64> = results.iter().map(|r| r.x).collect();
    let ms: Vec<u64> = results.iter().map(|r| r.qe).collect();
    (crt(&rs, &ms), results)
}

/// What `main()` prints (lines 78-106).
pub fn main_stdout() -> String {
    let mut out = Stdout::new();
    let p = P;
    assert!(is_prime(p) && (p - 1) % 27 == 0);
    let g = primitive_root(p).expect("p is prime");
    let n = p - 1;
    let towers = factor_pe(n);
    let towers_repr: Vec<String> = towers
        .iter()
        .map(|&(q, e)| tuple(&[q, u64::from(e)]))
        .collect();
    out.print("=== RIME BOBBY FISCHER \u{2014} CLUSTERED & TRINARY (one node per rime) ===");
    out.print(format!(
        "sphere (Z/{p}Z)*  g={g}   order {} = rime-towers [{}]",
        grouped(u128::from(n)),
        towers_repr.join(", ")
    ));
    out.print(format!(
        "cluster: {} independent nodes (one Bobby Fischer per rime), CRT fan-in\n",
        towers.len()
    ));
    let mut ok = true;
    for seed in 0..3u64 {
        let k_true = seed_target(seed, n);
        let h = pow_mod(g, k_true, p);
        let (k_played, results) = play(g, h, p);
        let reached = pow_mod(g, k_played, p) == h;
        ok &= reached;
        let tri = results
            .iter()
            .find(|r| r.q == 3)
            .expect("the 27-tower node");
        out.print(format!(
            "target g^{k_true:<7} -> nodes solve in parallel -> CRT k={k_played:<7} reached={}",
            py_bool(reached)
        ));
        let trime: Vec<i8> = tri
            .trime_digits
            .as_deref()
            .expect("q == 3")
            .iter()
            .map(|t| t.direction())
            .collect();
        out.print(format!(
            "   TRINARY node (rime 27): base-3 digits {} = trime digits {}  ({} moves)",
            list(&tri.digits),
            list(&trime),
            tri.moves
        ));
        for r in results.iter().filter(|r| r.q != 3) {
            out.print(format!(
                "   node rime {:>4}: x={} ({} moves)",
                r.qe, r.x, r.moves
            ));
        }
        out.print("");
    }
    out.print(format!(
        "every target reached, work split across independent nodes, CRT-combined: {}",
        py_bool(ok)
    ));
    out.print("TRIME TIME: the 27-node recovers the discrete log as three balanced-ternary");
    out.print(
        "digits {-1,0,+1}, each found by cascading away the known ones \u{2014} the trilateral solve.",
    );
    out.print("GATE: parallel ADDRESSING of a smooth sphere. A large prime tower is one");
    out.print("indivisible hard node; clusters cannot break the discrete-log wall (Law 14).");
    out.into_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balanced_digits() {
        use Zero::{Neg, Nil, Pos};
        assert_eq!(to_balanced_base3(18, 3), vec![Nil, Nil, Neg]);
        assert_eq!(to_balanced_base3(12, 3), vec![Nil, Pos, Pos]);
        assert_eq!(to_balanced_base3(7 + 2 * 9, 3), vec![Pos, Neg, Nil]);
        for x in 0..27u64 {
            let d = to_balanced_base3(x, 3);
            let v = ternary::balanced::recon(&d).expect("three trits");
            assert_eq!(v.rem_euclid(27) as u64, x);
        }
    }

    #[test]
    fn workers_recover_each_exponent() {
        let p = 1_009u64;
        let g = primitive_root(p).unwrap();
        for k in (0..p - 1).step_by(7) {
            let (played, results) = play(g, pow_mod(g, k, p), p);
            assert_eq!(played, k);
            assert_eq!(results.len(), 3);
        }
    }
}
