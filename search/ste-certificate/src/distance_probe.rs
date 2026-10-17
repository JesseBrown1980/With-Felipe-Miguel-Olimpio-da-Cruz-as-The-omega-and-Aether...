//! `distance-probe.mjs`: positions `POS-0 .. POS-(N-1)` registered by SHA-256, linearized two
//! ways, and their pairwise distances counted (`:7-31`).

use alloc::collections::BTreeSet;
use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

use sha2::{Digest, Sha256};

use crate::sidon::ANCHOR_PRIMES;

/// `SECTORS` (`:7`).
pub const SECTORS: u64 = 113;
/// `WIDTH` (`:7`).
pub const WIDTH: u64 = 1024;
/// The `N` values of the loop at `:31`.
pub const NS: [usize; 3] = [64, 128, 256];

/// The object `reg(name)` returns (`:8-9`), each field reduced from
/// `s = u32(sha256(String(name).toUpperCase()))`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Reg {
    /// `s % SECTORS`.
    pub sector: u64,
    /// `s % 3`.
    pub lane: u64,
    /// `s % WIDTH`.
    pub glyph: u64,
}

/// `reg(name)` (`:5-6`, `:8-9`): `parseInt` of the first 8 hex digits of the SHA-256 of the
/// UTF-8 upper-cased name is the big-endian value of the digest's first four bytes.
///
/// Upper-casing is `str::to_uppercase`, which in Rust 1.81 follows Unicode 15.1.0. A Unicode
/// 16.0 engine (Node v22.22.0, ICU 77.1) also upper-cases U+019B, U+0264, U+1C8A, U+A7CD, U+A7DB
/// and U+10D70..=U+10D85, so a name holding one of those 27 code points hashes differently there.
/// The script's names `POS-<i>` (`:21`) are ASCII.
pub fn reg(name: &str) -> Reg {
    let h = Sha256::digest(name.to_uppercase().as_bytes());
    let s = u64::from(u32::from_be_bytes([h[0], h[1], h[2], h[3]]));
    Reg {
        sector: s % SECTORS,
        lane: s % 3,
        glyph: s % WIDTH,
    }
}

/// `bhIndexLinear(r)` (`:10`).
pub fn bh_index_linear(r: &Reg) -> u64 {
    r.sector * (WIDTH * 3) + r.lane * WIDTH + r.glyph
}

/// `CUBES = PRIMES.map(p => p ** 3)` (`:12-13`).
pub fn cubes() -> [u64; 11] {
    ANCHOR_PRIMES.map(|p| p.pow(3))
}

/// `bhIndexSidon(r)` (`:14-19`): `sector*c[0] + lane*c[3] + glyph*c[6]`.
pub fn bh_index_sidon(r: &Reg) -> u64 {
    let c = cubes();
    r.sector * c[0] + r.lane * c[3] + r.glyph * c[6]
}

/// The values `probe` prints (`:20-29`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Probe {
    /// `label`, padded as the script passes it (`'LINEAR '`, `'SIDON  '`).
    pub label: &'static str,
    /// `N`.
    pub n: usize,
    /// `new Set(idx).size`.
    pub uniq_idx: usize,
    /// `total`.
    pub total: u64,
    /// `dists.size`.
    pub distinct: usize,
    /// `collide`.
    pub collide: u64,
}

/// `probe(fn, label, N)` (`:20-30`).
pub fn probe(f: fn(&Reg) -> u64, label: &'static str, n: usize) -> Probe {
    let idx: Vec<u64> = (0..n).map(|i| f(&reg(&format!("POS-{i}")))).collect();
    let mut dists = BTreeSet::new();
    let (mut collide, mut total) = (0u64, 0u64);
    for (i, &a) in idx.iter().enumerate() {
        for &b in &idx[i + 1..] {
            // Math.abs(idx[i] - idx[j]) on integers below 2^53.
            let d = a.abs_diff(b);
            total += 1;
            if !dists.insert(d) {
                collide += 1;
            }
        }
    }
    let uniq_idx = idx.iter().collect::<BTreeSet<_>>().len();
    Probe {
        label,
        n,
        uniq_idx,
        total,
        distinct: dists.len(),
        collide,
    }
}

/// The loop at `:31`: `LINEAR` then `SIDON` for each `N`.
pub fn probes() -> Vec<Probe> {
    let mut out = Vec::new();
    for n in NS {
        out.push(probe(bh_index_linear, "LINEAR ", n));
        out.push(probe(bh_index_sidon, "SIDON  ", n));
    }
    out
}

/// The `console.log` line of `:29`.
pub fn render(p: &Probe) -> String {
    format!(
        "{} N={} uniq_index={}/{} pairwise_distances total={} distinct={} collisions={}",
        p.label, p.n, p.uniq_idx, p.n, p.total, p.distinct, p.collide
    )
}

/// The script's `console.log` lines, in order.
pub fn stdout_lines() -> Vec<String> {
    probes().iter().map(render).collect()
}
