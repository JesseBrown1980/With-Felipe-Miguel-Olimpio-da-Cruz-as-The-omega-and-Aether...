//! The white-room `L0GnnScorer` of asolaria-whiteroom-engine@896518a `liris-whiteroom-engine.mjs`
//! (:110-128) and the smoke run's scorer choice (:191), as scorers of the white-room engine that
//! `quants/cubes` ports (`quant_cubes::whiteroom`, Q-WHITEROOM-GULP-MINT).
//!
//! `quant_cubes::whiteroom` already holds the rest of the file: `DeterministicScorer` (:85-98),
//! `GENIUS_THRESHOLD` / `geniusScore` (:105-108), the verdict `score >= geniusThreshold` (:167)
//! and the sealed HBP row with its row-hash chain (:143-161). They are used from there, not
//! repeated here. Upstream POSTs the request graph to the L0 server on port 4792 (:121-124);
//! here [`crate::l0_request`] runs the same graph through the L0 EdgeLevelGNN in process.

use crate::jsnum_ext::q24_to_dbl;
use crate::l0_request::score_q24;
use crate::sha::sha256;
use l0_edge::jsnum::Dbl;
use quant_cubes::whiteroom::{DeterministicScorer, Scorer};

/// The graph `L0GnnScorer.score` posts (:113-119), as the SHA-256 bytes of `pid + "|" + mark`:
/// feature `k` of node `i` is `bytes[6i + k] / 255`, edge feature `j` is `bytes[12 + j] / 255`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct L0Request {
    /// Node feature bytes, `[b0..b5]` and `[b6..b11]`.
    pub nodes: [[u8; 6]; 2],
    /// Edge feature bytes `[b12, b13, b14]` (checked by inference_server.py:23, not used by its model).
    pub edge_features: [u8; 3],
}

/// `L0GnnScorer` (:110-128) with the :4792 POST replaced by the in-process L0 forward.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct L0GnnScorer;

impl L0GnnScorer {
    /// `this.name` (:111), which the sealed row records as `scorer=`.
    pub const NAME: &'static str = "L0-gnn-:4792";

    /// The request graph for `(pid, mark)` (:113-119).
    pub fn request(pid: &str, mark: &str) -> L0Request {
        let h = sha256(format!("{pid}|{mark}").as_bytes());
        let mut nodes = [[0u8; 6]; 2];
        nodes[0].copy_from_slice(&h[0..6]);
        nodes[1].copy_from_slice(&h[6..12]);
        L0Request {
            nodes,
            edge_features: [h[12], h[13], h[14]],
        }
    }

    /// The reply's `scores` list for `(pid, mark)`, Q24: one score for the graph's one edge
    /// (inference_server.py:24-25 returns one score per edge).
    pub fn scores_q24(pid: &str, mark: &str) -> Vec<i64> {
        vec![score_q24(&Self::request(pid, mark).nodes)]
    }

    /// `score(pid, mark)` (:112-127): the mean of the reply's scores, 0 for an empty list.
    pub fn score_of(pid: &str, mark: &str) -> Dbl {
        let scores: Vec<Dbl> = Self::scores_q24(pid, mark)
            .into_iter()
            .map(q24_to_dbl)
            .collect();
        mean_of_scores(&scores)
    }
}

impl Scorer for L0GnnScorer {
    fn name(&self) -> &str {
        Self::NAME
    }

    /// `score(pid, mark)`; the engine's third argument (`coord64`, :166) is not read (:112).
    fn score(&self, pid: &str, mark: &str, _coord64: Option<&str>) -> Dbl {
        Self::score_of(pid, mark)
    }
}

/// `s.length ? s.reduce((a, c) => a + c, 0) / s.length : 0` (:126), in binary64.
pub fn mean_of_scores(scores: &[Dbl]) -> Dbl {
    if scores.is_empty() {
        return Dbl::ZERO;
    }
    let sum = scores.iter().fold(Dbl::ZERO, |a, &c| a + c);
    sum / Dbl::from_u64(scores.len() as u64)
}

/// The smoke run's scorer (:191): `useL0 ? new L0GnnScorer() : new DeterministicScorer()`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SmokeScorer {
    /// `new L0GnnScorer()`.
    L0(L0GnnScorer),
    /// `new DeterministicScorer()` (`quant_cubes::whiteroom`).
    Deterministic(DeterministicScorer),
}

impl SmokeScorer {
    /// `useL0 ? new L0GnnScorer() : new DeterministicScorer()` (:191), where upstream sets
    /// `useL0 = process.argv.includes("--l0")` (:188).
    pub fn from_use_l0(use_l0: bool) -> Self {
        if use_l0 {
            SmokeScorer::L0(L0GnnScorer)
        } else {
            SmokeScorer::Deterministic(DeterministicScorer::default())
        }
    }
}

impl Scorer for SmokeScorer {
    fn name(&self) -> &str {
        match self {
            SmokeScorer::L0(s) => s.name(),
            SmokeScorer::Deterministic(s) => s.name(),
        }
    }

    fn score(&self, pid: &str, mark: &str, coord64: Option<&str>) -> Dbl {
        match self {
            SmokeScorer::L0(s) => s.score(pid, mark, coord64),
            SmokeScorer::Deterministic(s) => s.score(pid, mark, coord64),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scorer_choice_follows_the_smoke_run() {
        assert_eq!(SmokeScorer::from_use_l0(true).name(), "L0-gnn-:4792");
        assert_eq!(SmokeScorer::from_use_l0(false).name(), "deterministic-sha");
    }

    #[test]
    fn the_mean_of_one_score_is_that_score() {
        let s = L0GnnScorer::score_of("BH.WR.liris-whiteroom.0", "bigpickle:room:0:work");
        let q = L0GnnScorer::scores_q24("BH.WR.liris-whiteroom.0", "bigpickle:room:0:work");
        assert_eq!(q.len(), 1);
        assert_eq!(s, q24_to_dbl(q[0]));
        assert_eq!(mean_of_scores(&[]), Dbl::ZERO);
    }

    #[test]
    fn the_l0_score_ignores_coord64() {
        let a = L0GnnScorer.score("p", "m", None);
        let b = L0GnnScorer.score("p", "m", Some("ff"));
        assert_eq!(a, b);
    }
}
