//! `sidon-cross-fix.mjs`: the STE embedding of the anchor towers and its distance multiset.
//!
//! Tower `t` (prime `p_t`) holds the Erdős–Turán set scaled by `W_t = p_t^3` (`:11-12`); its
//! points sit at `anchor_t + sidon * W_t`, with `anchor_0 = 0` and
//! `anchor_{t+1} = anchor_t + maxIntra_t + GUARD * W_t`, `GUARD = 2^40` (`:13-18`).

use alloc::collections::BTreeSet;
use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

use crate::sidon::{erdos_turan, filtered_primes};

/// `GUARD = 1n << 40n` (`:13`).
pub const GUARD: u128 = 1 << 40;

/// The result object of `distMultiset` (`:4-8`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DistMultiset {
    /// `tot`: pairs visited.
    pub tot: u64,
    /// `distinct`: `seen.size`.
    pub distinct: u64,
    /// `coll`: distances already in `seen` when visited.
    pub coll: u64,
    /// `minD`: `null` (`None`) until the first pair.
    pub min_d: Option<u128>,
    /// `maxD`: starts at `0n`.
    pub max_d: u128,
}

/// `distMultiset(arr)` (`:4-8`): every pair `i < j` in index order, `d = |arr[i] - arr[j]|`.
pub fn dist_multiset(arr: &[u128]) -> DistMultiset {
    let mut seen = BTreeSet::new();
    let (mut coll, mut tot) = (0u64, 0u64);
    let mut min_d: Option<u128> = None;
    let mut max_d = 0u128;
    for (i, &a) in arr.iter().enumerate() {
        for &b in &arr[i + 1..] {
            // babs(arr[i] - arr[j]) (:3, :6); every point is non-negative.
            let d = a.abs_diff(b);
            tot += 1;
            if min_d.map_or(true, |m| d < m) {
                min_d = Some(d);
            }
            if d > max_d {
                max_d = d;
            }
            if !seen.insert(d) {
                coll += 1;
            }
        }
    }
    DistMultiset {
        tot,
        distinct: seen.len() as u64,
        coll,
        min_d,
        max_d,
    }
}

/// One element of `towers` (`:11-12`, with `anchor` set at `:15`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Tower {
    /// `p`.
    pub p: u64,
    /// `W = BigInt(p) ** 3n`.
    pub w: u128,
    /// `scaled = S.map(x => x * W)`, `S = erdosTuran(p).map(BigInt)`.
    pub scaled: Vec<u128>,
    /// `maxIntra = scaled[scaled.length - 1] - scaled[0]`.
    pub max_intra: u128,
    /// `tw.anchor = acc`.
    pub anchor: u128,
}

/// The towers and the concatenated points `all` (`:10-18`).
pub fn embed() -> (Vec<Tower>, Vec<u128>) {
    let mut towers: Vec<Tower> = filtered_primes()
        .into_iter()
        .map(|p| {
            let w = u128::from(p).pow(3);
            let scaled: Vec<u128> = erdos_turan(p).iter().map(|&x| u128::from(x) * w).collect();
            // erdosTuran is increasing in k, so the last scaled value is the largest.
            let max_intra = scaled[scaled.len() - 1] - scaled[0];
            Tower {
                p,
                w,
                scaled,
                max_intra,
                anchor: 0,
            }
        })
        .collect();
    let mut acc = 0u128;
    let mut all = Vec::new();
    for tw in &mut towers {
        tw.anchor = acc;
        for &x in &tw.scaled {
            all.push(acc + x);
        }
        acc = acc + tw.max_intra + GUARD * tw.w;
    }
    (towers, all)
}

/// What the script measures: the full multiset (`:19`) and the per-tower intra check (`:23`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Certificate {
    /// `towers.length`.
    pub towers: usize,
    /// `all.length`.
    pub points: usize,
    /// `distMultiset(all)`.
    pub all: DistMultiset,
    /// `(p, coll)` for every tower whose `distMultiset(tw.scaled).coll !== 0`, in tower order.
    pub intra_fail: Vec<(u64, u64)>,
}

/// Runs `sidon-cross-fix.mjs:10-23`.
pub fn certificate() -> Certificate {
    let (towers, all) = embed();
    let r = dist_multiset(&all);
    let intra_fail = towers
        .iter()
        .filter_map(|tw| {
            let rr = dist_multiset(&tw.scaled);
            (rr.coll != 0).then_some((tw.p, rr.coll))
        })
        .collect();
    Certificate {
        towers: towers.len(),
        points: all.len(),
        all: r,
        intra_fail,
    }
}

fn js_bigint_or_null(v: Option<u128>) -> String {
    match v {
        Some(v) => format!("{v}"),
        None => String::from("null"),
    }
}

/// The `console.log` lines of `:20-24`; line 24 follows the loop of line 23 unconditionally.
pub fn stdout_lines(c: &Certificate) -> Vec<String> {
    let mut out = Vec::new();
    out.push(format!(
        "CROSS-FIX towers={} points={} pairs={} distinct_dist={} collisions={}",
        c.towers, c.points, c.all.tot, c.all.distinct, c.all.coll
    ));
    out.push(format!(
        "min_dist={} max_dist={}",
        js_bigint_or_null(c.all.min_d),
        c.all.max_d
    ));
    for (p, coll) in &c.intra_fail {
        out.push(format!("INTRA FAIL p={p} coll={coll}"));
    }
    out.push(String::from("INTRA all towers zero-collision: OK"));
    out
}
