//! `sidon-probe.mjs`: single-tower Erdős–Turán distance counts (`:16-19`) and the layout with
//! towers spaced by `(span + 1) * BIG` and points `anchor + sidon * BIG` (`:24-33`).

use alloc::collections::BTreeSet;
use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

use crate::sidon::{erdos_turan, filtered_primes};

/// The primes of the single-tower loop (`:16`).
pub const SINGLE_TOWER_PRIMES: [u64; 5] = [13, 17, 23, 31, 131];
/// `BIG` (`:29`).
pub const BIG: u64 = 1_000_003;

/// The result object of `allDistinctDistances` (`:8-14`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Distances {
    /// `tot`.
    pub tot: u64,
    /// `seen.size`.
    pub distinct: u64,
    /// `coll`.
    pub coll: u64,
}

/// `allDistinctDistances(arr)` (`:8-14`), `d = Math.abs(arr[i] - arr[j])`.
pub fn all_distinct_distances(arr: &[u64]) -> Distances {
    let mut seen = BTreeSet::new();
    let (mut coll, mut tot) = (0u64, 0u64);
    for (i, &a) in arr.iter().enumerate() {
        for &b in &arr[i + 1..] {
            let d = a.abs_diff(b);
            tot += 1;
            if !seen.insert(d) {
                coll += 1;
            }
        }
    }
    Distances {
        tot,
        distinct: seen.len() as u64,
        coll,
    }
}

/// One element of `towers` (`:27`, with `anchor` set at `:31`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProbeTower {
    /// `p`.
    pub p: u64,
    /// `s = erdosTuran(p)`.
    pub s: Vec<u64>,
    /// `span = Math.max(...s)`.
    pub span: u64,
    /// `t.anchor = acc`.
    pub anchor: u64,
}

/// The towers and the concatenated points `all` (`:24-31`).
pub fn layout() -> (Vec<ProbeTower>, Vec<u64>) {
    let mut towers: Vec<ProbeTower> = filtered_primes()
        .into_iter()
        .map(|p| {
            let s = erdos_turan(p);
            let span = s
                .iter()
                .copied()
                .max()
                .expect("erdosTuran(p) has p >= 2 elements");
            ProbeTower {
                p,
                s,
                span,
                anchor: 0,
            }
        })
        .collect();
    let mut acc = 0u64;
    let mut all = Vec::new();
    for t in &mut towers {
        t.anchor = acc;
        acc += (t.span + 1) * BIG;
        for &x in &t.s {
            all.push(t.anchor + x * BIG);
        }
    }
    (towers, all)
}

/// The script's `console.log` lines (`:18`, `:33`), in order.
pub fn stdout_lines() -> Vec<String> {
    let mut out = Vec::new();
    for p in SINGLE_TOWER_PRIMES {
        let r = all_distinct_distances(&erdos_turan(p));
        out.push(format!(
            "SIDON-TOWER p={p} points={p} pairs={} distinct_dist={} collisions={}",
            r.tot, r.distinct, r.coll
        ));
    }
    let (_, all) = layout();
    let rr = all_distinct_distances(&all);
    out.push(format!(
        "CROSS-TOWER total_points={} pairs={} distinct_dist={} collisions={}",
        all.len(),
        rr.tot,
        rr.distinct,
        rr.coll
    ));
    out
}
