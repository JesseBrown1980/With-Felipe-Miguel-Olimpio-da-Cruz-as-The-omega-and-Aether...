//! players/rime_27fischers.py, "THE 27": 27 primes `p = 1 (mod 27)` above 1,000,000
//! (`find_27_primes`, lines 54-59), one Fischer per prime. One point `X` (the SHA-256 of
//! `b"omnisphere"` modulo `M = prod(primes)`, line 69) is split into its 27 residues (line 70);
//! node `i` reads its residue's exponent modulo 27 on the 27-tower (`dlog_mod_27`, lines 34-45)
//! as a glyph in `0..27` and three balanced-ternary digits, and colours it from the 3^3 cube
//! (`cube27`, lines 51-52). The 27 residues are recombined by CRT (lines 46-50, 84).
//!
//! The script carries the digits `bal` and the cube coordinates as Python ints in `{-1, 0, 1}`
//! (lines 39-44, 52); here they are the owner's trit `Zero` (`kernel/tribit`, through `ternary`):
//! `bal` is written by `ternary::balanced::low_trits`, the cube is `ternary::cube::cell`.

use crate::bignum::Big;
use crate::cluster::bsgs;
use crate::pyfmt::{py_bool, tuple, Stdout};
use crate::sphere::{inv_mod, is_prime, pow_mod, primitive_root};
use sha2::{Digest, Sha256};
use ternary::balanced::low_trits;
use ternary::cube::{cell, Cell};
use ternary::Zero;

/// `dlog_mod_27(g, h, p)` (lines 34-45): the exponent of `h` modulo 27 (`x`), and its three
/// balanced-ternary digits as trits, least significant first.
pub fn dlog_mod_27(g: u64, h: u64, p: u64) -> (u64, [Zero; 3]) {
    let n = p - 1;
    let (q, e) = (3u64, 3u32);
    let gamma = pow_mod(g, n / q, p);
    let ginv = pow_mod(g, p - 2, p);
    let mut x = 0u64;
    for j in 0..e {
        let hh = (u128::from(h) * u128::from(pow_mod(ginv, x, p)) % u128::from(p)) as u64;
        let hj = pow_mod(hh, n / q.pow(j + 1), p);
        let d = bsgs(gamma, hj, p, q).expect("bsgs found the digit");
        x += d * q.pow(j);
    }
    // lines 39-44
    let mut bal = [Zero::Nil; 3];
    low_trits(i64::try_from(x).expect("x < 27"), &mut bal);
    (x, bal)
}

/// `crt(rs, ms)` (lines 46-50) on Python integers: `sum(r * Mi * pow(Mi, -1, m)) % M`.
pub fn crt(rs: &[u64], ms: &[u64]) -> Big {
    let big_m = Big::product(ms);
    let mut x = Big::zero();
    for (&r, &m) in rs.iter().zip(ms) {
        let (mi, rem) = big_m.divmod_u64(m);
        assert_eq!(rem, 0, "M // m is exact");
        let inv = inv_mod(mi.rem_u64(m), m).expect("pairwise coprime moduli");
        x = x.add(&mi.mul_u64(r).mul_u64(inv));
    }
    x.rem(&big_m)
}

/// `cube27()` (lines 51-52): `(L[i//9], L[(i//3)%3], L[i%3])` for `L = [-1, 0, 1]`, cell `i`
/// being `ternary::cube::cell(i)`.
pub fn cube27() -> [Cell; 27] {
    core::array::from_fn(|i| cell(u8::try_from(i).expect("i < 27")))
}

/// `find_27_primes(mod=27, lo=1_000_000)` (lines 54-59).
pub fn find_27_primes(modulus: u64, lo: u64) -> Vec<u64> {
    let mut ps = Vec::with_capacity(27);
    let mut c = lo - (lo % modulus) + 1;
    while ps.len() < 27 {
        if c > lo && is_prime(c) && (c - 1) % modulus == 0 {
            ps.push(c);
        }
        c += modulus;
    }
    ps
}

/// One node of the table `main()` computes (lines 75-82).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Node {
    /// `primes[i]`.
    pub prime: u64,
    /// `gs[i]`.
    pub g: u64,
    /// `r`: the residue `X % prime`, with 0 replaced by 1 (line 77).
    pub r: u64,
    /// `glyph`.
    pub glyph: u64,
    /// `bal`, least significant first.
    pub bal: [Zero; 3],
    /// `colors[glyph % 27]`.
    pub color: Cell,
}

/// What `main()` computes before printing.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct The27 {
    /// The 27 nodes.
    pub nodes: Vec<Node>,
    /// `M = prod(primes)`.
    pub m: Big,
    /// `X`.
    pub x: Big,
    /// `back = crt(res, primes)`.
    pub back: Big,
}

/// The computation of `main()` (lines 62-84).
pub fn the_27() -> The27 {
    let primes = find_27_primes(27, 1_000_000);
    let colors = cube27();
    let gs: Vec<u64> = primes
        .iter()
        .map(|&p| primitive_root(p).expect("p is prime"))
        .collect();
    let m = Big::product(&primes);
    let x = Big::from_be_bytes(&Sha256::digest(b"omnisphere")).rem(&m);
    let res: Vec<u64> = primes.iter().map(|&p| x.rem_u64(p)).collect();
    let nodes = (0..27)
        .map(|i| {
            let p = primes[i];
            let r = res[i] % p;
            let r = if r != 0 { r } else { 1 };
            let (glyph, bal) = dlog_mod_27(gs[i], pow_mod(gs[i], r % (p - 1), p), p);
            Node {
                prime: p,
                g: gs[i],
                r,
                glyph,
                bal,
                color: colors[(glyph % 27) as usize],
            }
        })
        .collect();
    let back = crt(&res, &primes);
    The27 { nodes, m, x, back }
}

/// `sym = {-1: '-', 0: '0', 1: '+'}` (line 63).
fn sym(t: Zero) -> char {
    match t.direction() {
        -1 => '-',
        0 => '0',
        _ => '+',
    }
}

/// What `main()` prints (lines 61-97).
pub fn main_stdout() -> String {
    let t = the_27();
    let colors = cube27();
    let mut out = Stdout::new();
    out.print(
        "=== THE 27 \u{2014} 27 rime spheres / MCPs / Bobby Fischers, circling the free 0 ===",
    );
    out.print("27 coprime spheres, each p = 1 (mod 27); each an MCP node with one Bobby Fischer\n");
    out.print(format!(
        "omnisphere modulus = product of 27 primes ~ 10^{}",
        t.m.to_decimal().len() - 1
    ));
    out.print("one composed point X -> 27 coordinates (one per MCP), each played in trinary:\n");
    out.print(format!(
        "  {:>4} {:>8} {:>11} {:>5} {:>10}",
        "node", "prime", "color(rgb)", "glyph", "trime -+0"
    ));
    for (i, node) in t.nodes.iter().enumerate() {
        if i < 9 || i == 13 || i == 26 {
            out.print(format!(
                "  {:>4} {:>8} {:>11} {:>5}   {}{}{}",
                i,
                node.prime,
                tuple(&node.color.map(Zero::direction)),
                node.glyph,
                sym(node.bal[2]),
                sym(node.bal[1]),
                sym(node.bal[0])
            ));
        }
    }
    out.print("   ... (27 nodes total)");
    out.print(format!(
        "\n  CRT recompose X from its 27 coordinates: byte-exact = {}",
        py_bool(t.back == t.x)
    ));
    let center_glyph = colors
        .iter()
        .position(|c| *c == [Zero::Nil; 3])
        .expect("(0,0,0) is in the cube");
    out.print(format!(
        "  the free 0 center: color (0,0,0) = glyph {center_glyph}; g^0 = 1 on every sphere (Law 0)"
    ));
    // Line 92: ctr = (a+b+c)//3, rem = (a+b+c) - 3*ctr, c_rev = 3*ctr + rem - a - b.
    let (a, b, c) = (t.nodes[0].glyph, t.nodes[1].glyph, t.nodes[2].glyph);
    let ctr = (a + b + c) / 3;
    let rem = (a + b + c) - 3 * ctr;
    let c_rev = 3 * ctr + rem - a - b;
    out.print(format!(
        "  2/3 rule (nodes 0,1 + center -> node 2): {a}+{b}+center{ctr} -> third {c_rev} (true {c}) exact={}",
        py_bool(c_rev == c)
    ));
    out.print("");
    out.print("  HONEST: 27 parallel ADDRESSING nodes over generated spheres (rate 1.0). Each");
    out.print("  Bobby Fischer plays its frozen sphere in trinary; the free 0 is shared; the 2/3");
    out.print("  closure reveals the third. This is the addressing fabric, not compression.");
    out.into_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn primes_and_cube() {
        let ps = find_27_primes(27, 1_000_000);
        assert_eq!(ps.len(), 27);
        assert_eq!(ps[0], 1_000_081);
        assert_eq!(ps[26], 1_005_913);
        assert!(ps.iter().all(|&p| is_prime(p) && (p - 1) % 27 == 0));
        let cube = cube27();
        assert_eq!(cube[13], [Zero::Nil; 3]);
        assert_eq!(cube[16].map(Zero::direction), [0, 1, 0]);
        // `cube27()` as the script writes it (lines 51-52), and `colors.index` (line 88).
        let l = [-1i8, 0, 1];
        for (i, c) in cube.iter().enumerate() {
            assert_eq!(c.map(Zero::direction), [l[i / 9], l[(i / 3) % 3], l[i % 3]]);
            assert_eq!(usize::from(ternary::cube::index(*c)), i);
        }
    }

    #[test]
    fn the_glyph_is_the_exponent_mod_27() {
        let p = 1_000_081u64;
        let g = primitive_root(p).unwrap();
        for k in [0u64, 1, 2, 26, 27, 77_777, 994_185, 1_000_079] {
            let (glyph, bal) = dlog_mod_27(g, pow_mod(g, k, p), p);
            assert_eq!(glyph, k % 27);
            let v = ternary::balanced::recon(&bal).expect("three trits");
            assert_eq!(v.rem_euclid(27) as u64, glyph);
        }
    }

    #[test]
    fn crt_recomposes_the_point() {
        let t = the_27();
        assert_eq!(t.back, t.x);
        assert_eq!(t.m.to_decimal().len(), 163);
    }
}
