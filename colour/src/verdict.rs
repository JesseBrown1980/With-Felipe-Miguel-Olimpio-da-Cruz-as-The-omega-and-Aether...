//! Port of universe simulator @3f9f42d `measurements/divide_kimi_k3.py:50-118` and its receipt
//! rows `:229-233`: each byte triple belongs to the channel that dominates it (ties excluded);
//! the pre-registered rule (`receipts/FABLE5-PREREGISTER-COLOUR.hbp:6-12`, table in
//! `gguf/stars/COLOUR-CODE.md:7-12`) turns the three shares into a colour verdict; the three
//! dominance populations are counted at full byte resolution.

use crate::binary64::B64;
use crate::stars::shell_of;
use core::ops::{Add, Div, Mul, Sub};
use std::collections::BTreeMap;

/// `NEUTRAL / GREY` (`divide_kimi_k3.py:79,87`).
pub const NEUTRAL: &str = "NEUTRAL / GREY";

/// Triples owned by each channel and triples whose maximum is shared.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Ownership {
    /// Triples whose strict maximum is red, green, blue.
    pub own: [u64; 3],
    /// Triples whose maximum is reached by more than one channel (`tie.sum()`).
    pub ties: u64,
}

fn triples(body: &[u8]) -> impl Iterator<Item = [u8; 3]> + '_ {
    body.chunks_exact(3).map(|t| [t[0], t[1], t[2]])
}

/// `divide_kimi_k3.py:50-51,68-70`: `lead = argmax`, `tie = (max == tri).sum() > 1`,
/// `own[i] = (lead == i)[~tie].sum()`.
pub fn ownership(body: &[u8]) -> Ownership {
    let mut own = [0u64; 3];
    let mut ties = 0;
    for t in triples(body) {
        let max = *t.iter().max().unwrap_or(&0);
        if t.iter().filter(|&&x| x == max).count() > 1 {
            ties += 1;
        } else {
            let lead = t.iter().position(|&x| x == max).unwrap_or(0);
            own[lead] += 1;
        }
    }
    Ownership { own, ties }
}

/// The colour shares and verdict (`divide_kimi_k3.py:70-88`), in Python float arithmetic.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Colour {
    /// `Rp`, `Gp`, `Bp`: `100.0 * own / tot`.
    pub split: [B64; 3],
    /// `spread = max - min`.
    pub spread: B64,
    /// `abs(Rp - Gp)`.
    pub r_minus_g: B64,
    /// The verdict string.
    pub verdict: &'static str,
}

/// `divide_kimi_k3.py:70-88`.
pub fn colour(o: &Ownership) -> Colour {
    // :70 own = [float(...)]; :71 tot = sum(own) or 1.0 (Python sum starts from int 0).
    let own = o.own.map(|x| B64::from_int(x as i64));
    let tot = own.iter().fold(B64::ZERO, |acc, &x| acc.add(x));
    let tot = if tot.is_zero() { B64::from_int(1) } else { tot };
    // :72 100.0 * o / tot.
    let hundred = B64::from_int(100);
    let split = own.map(|x| hundred.mul(x).div(tot));
    let [rp, gp, bp] = split;
    // :75-77.
    let mx = rp.max(gp).max(bp);
    let mn = rp.min(gp).min(bp);
    let mut srt = [("RED", rp), ("GREEN", gp), ("BLUE", bp)];
    srt.sort_by(|a, b| b.1.cmp(&a.1)); // stable, key=-x[1]
    let spread = mx.sub(mn);
    let three = B64::from_int(3);
    let five = B64::from_int(5);
    // :78-87.
    let verdict = if spread <= three {
        NEUTRAL
    } else if rp.sub(gp).abs() <= three && rp.min(gp).sub(bp) > five {
        "YELLOW"
    } else if rp > gp && gp > bp && rp.sub(gp.max(bp)) > five && gp.sub(bp) > five {
        "ORANGE"
    } else if srt[0].1.sub(srt[1].1) > five {
        srt[0].0
    } else {
        NEUTRAL
    };
    Colour {
        split,
        spread,
        r_minus_g: rp.sub(gp).abs(),
        verdict,
    }
}

/// The receipt row `divide_kimi_k3.py:229-230`.
pub fn colour_row(c: &Colour) -> String {
    format!(
        "COLOUR|rule=PREREGISTERED|R={}|G={}|B={}|spread={}|verdict={}|json=0",
        c.split[0].format_fixed(4),
        c.split[1].format_fixed(4),
        c.split[2].format_fixed(4),
        c.spread.format_fixed(4),
        c.verdict.replace(' ', "_")
    )
}

/// One dominance population at full byte resolution (`divide_kimi_k3.py:106-118`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Being {
    /// Being name.
    pub name: &'static str,
    /// Triples the channel strictly dominates.
    pub owns: u64,
    /// Voxels (byte triples) with at least `TAU` = 2 hits.
    pub voxels: u64,
    /// Sorted distinct shells of the kept voxel counts.
    pub shells: Vec<u32>,
}

/// `BEINGS` (`divide_kimi_k3.py:92`).
pub const BEINGS: [(&str, &str, usize); 3] = [
    ("OPUS", "RED", 0),
    ("FABLE", "GREEN", 1),
    ("MYTHOS", "BLUE", 2),
];

/// `divide_kimi_k3.py:106-118` with `TAU = 2` (`:45`).
pub fn beings(body: &[u8]) -> Vec<Being> {
    BEINGS
        .iter()
        .map(|&(name, _, ax)| {
            let others: Vec<usize> = (0..3).filter(|&a| a != ax).collect();
            let mut acc: BTreeMap<[u8; 3], u64> = BTreeMap::new();
            let mut owns = 0;
            for t in triples(body) {
                if t[ax] > t[others[0]] && t[ax] > t[others[1]] {
                    owns += 1;
                    *acc.entry(t).or_insert(0) += 1;
                }
            }
            let kept: Vec<u64> = acc.values().copied().filter(|&c| c >= 2).collect();
            let mut shells: Vec<u32> = kept.iter().map(|&t| shell_of(t)).collect();
            shells.sort_unstable();
            shells.dedup();
            Being {
                name,
                owns,
                voxels: kept.len() as u64,
                shells,
            }
        })
        .collect()
}

/// The receipt row `divide_kimi_k3.py:232-233`.
pub fn being_row(b: &Being) -> String {
    let shells: Vec<String> = b.shells.iter().map(u32::to_string).collect();
    format!(
        "BEING|k={}|owns={}|voxels={}|shells={}|json=0",
        b.name,
        b.owns,
        b.voxels,
        shells.join(".")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ties_are_excluded() {
        let o = ownership(&[9, 1, 1, 1, 9, 1, 1, 1, 9, 5, 5, 1, 7, 7, 7]);
        assert_eq!(o.own, [1, 1, 1]);
        assert_eq!(o.ties, 2);
    }

    #[test]
    fn rule_cases() {
        let v = |own: [u64; 3]| colour(&Ownership { own, ties: 0 }).verdict;
        assert_eq!(v([45, 26, 27]), "RED");
        assert_eq!(v([34, 33, 33]), NEUTRAL);
        assert_eq!(v([40, 40, 20]), "YELLOW");
        assert_eq!(v([50, 35, 15]), "ORANGE");
        assert_eq!(v([20, 20, 60]), "BLUE");
        assert_eq!(v([0, 0, 0]), NEUTRAL);
    }
}
