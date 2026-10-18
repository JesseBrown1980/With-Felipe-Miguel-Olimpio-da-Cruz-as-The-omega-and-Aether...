//! The hybrid multi-GNN harness of asolaria-behcs-256@818cc23 `src/gnn/hybrid-harness.js:7-58`:
//! a shard plan over N agents, the per-agent mean of five scorers (LCR), a per-shard SHA-256 over
//! `${id}:${lcr.toFixed(6)}` and a composite SHA-256 over the shard digests. Scores are binary64
//! (`l0_edge::jsnum::Dbl`, non-negative finite values below 2^53, the domain of
//! `quant_cubes::whiteroom::to_fixed6`); the default scorer is `sha256(String(id))[0] / 255`.
//! Upstream's scorers are `(agent_id) => Promise<score in [0,1]>` (:19); nothing on disk imports
//! this harness (WIRING-MAP component table), so the five scorers are caller inputs.

use crate::jsnum_ext::ceil;
use crate::sha::{sha256, Sha256Stream};
use l0_edge::jsnum::Dbl;
use quant_cubes::whiteroom::to_fixed6;

/// The harness's default `shard_size` (:7, :45).
pub const DEFAULT_SHARD_SIZE: u64 = 1_000_000;

/// One shard `{ id, start, end }` (:13).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Shard {
    /// `shard-${i}`.
    pub id: String,
    /// First agent id.
    pub start: u64,
    /// One past the last agent id.
    pub end: u64,
}

/// `shardPlan(N, shard_size)` (:7-16).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShardPlan {
    /// `K = Math.ceil(N / shard_size)`.
    pub k: u64,
    /// `shard_size`.
    pub shard_size: u64,
    /// The K shards.
    pub shards: Vec<Shard>,
}

/// Inputs outside the harness's integer domain.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HarnessError {
    /// `shard_size` 0 makes `K` Infinity and the plan loop unbounded upstream.
    ZeroShardSize,
    /// `N` or `shard_size` at or above 2^53, where JavaScript integers are no longer exact.
    TooLarge,
}

/// `shardPlan(N, shard_size)` (:7-16).
pub fn shard_plan(n: u64, shard_size: u64) -> Result<ShardPlan, HarnessError> {
    if shard_size == 0 {
        return Err(HarnessError::ZeroShardSize);
    }
    if n >= 1 << 53 || shard_size >= 1 << 53 {
        return Err(HarnessError::TooLarge);
    }
    let k = ceil(Dbl::from_ratio(n, shard_size));
    let shards = (0..k)
        .map(|i| {
            let start = i * shard_size;
            Shard {
                id: format!("shard-{i}"),
                start,
                end: n.min(start + shard_size),
            }
        })
        .collect();
    Ok(ShardPlan {
        k,
        shard_size,
        shards,
    })
}

/// `default_scorer(id)` (:20-23): `sha256(String(id))[0] / 255`.
pub fn default_scorer(id: u64) -> Dbl {
    Dbl::from_ratio(u64::from(sha256(id.to_string().as_bytes())[0]), 255)
}

/// A scorer `(agent_id) => score` (:19), awaited; its scores must lie in `0..2^53`.
pub type AgentScorer<'a> = Box<dyn FnMut(u64) -> Dbl + 'a>;

/// The `scorers` argument (:18): an absent scorer is the default scorer (:24-28).
#[derive(Default)]
pub struct Scorers<'a> {
    /// `scorers.omni`.
    pub omni: Option<AgentScorer<'a>>,
    /// `scorers.reverse`.
    pub reverse: Option<AgentScorer<'a>>,
    /// `scorers.gsl`.
    pub gsl: Option<AgentScorer<'a>>,
    /// `scorers.contrastive`.
    pub contrastive: Option<AgentScorer<'a>>,
    /// `scorers.prototype`.
    pub prototype: Option<AgentScorer<'a>>,
}

fn call(scorer: &mut Option<AgentScorer<'_>>, id: u64) -> Dbl {
    match scorer {
        Some(f) => f(id),
        None => default_scorer(id),
    }
}

/// `runShard(shard, scorers)` result (:37-42).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShardResult {
    /// `shard_id`.
    pub shard_id: String,
    /// `agents`.
    pub agents: u64,
    /// `mean_LCR = count ? sumLCR / count : 0`.
    pub mean_lcr: Dbl,
    /// `shard_sha256`.
    pub shard_sha256: String,
}

/// `runShard(shard, scorers)` (:18-43). The five scorers are called in the order of the
/// `Promise.all` array (:32) for each id.
pub fn run_shard(shard: &Shard, scorers: &mut Scorers<'_>) -> ShardResult {
    let mut sum_lcr = Dbl::ZERO;
    let mut count = 0u64;
    let mut shard_hash = Sha256Stream::new();
    for id in shard.start..shard.end {
        let o = call(&mut scorers.omni, id);
        let r = call(&mut scorers.reverse, id);
        let g = call(&mut scorers.gsl, id);
        let c = call(&mut scorers.contrastive, id);
        let p = call(&mut scorers.prototype, id);
        let lcr = (o + r + g + c + p) / Dbl::from_u64(5);
        sum_lcr = sum_lcr + lcr;
        count += 1;
        shard_hash.update(&format!("{id}:{}", to_fixed6(lcr)));
    }
    ShardResult {
        shard_id: shard.id.clone(),
        agents: count,
        mean_lcr: if count > 0 {
            sum_lcr / Dbl::from_u64(count)
        } else {
            Dbl::ZERO
        },
        shard_sha256: shard_hash.hex_digest(),
    }
}

/// `runFanout({ N, shard_size, scorers, max_shards_run })` result (:52-57).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Fanout {
    /// `N`.
    pub n: u64,
    /// `shard_count_planned = K`.
    pub shard_count_planned: u64,
    /// `shard_count_executed`.
    pub shard_count_executed: u64,
    /// The mean over executed shards of their `mean_LCR`.
    pub mean_lcr: Dbl,
    /// SHA-256 over the executed shards' `shard_sha256` hex strings, in order.
    pub composite_sha256: String,
    /// The executed shards.
    pub shards: Vec<ShardResult>,
}

/// `runFanout({ N, shard_size, scorers, max_shards_run })` (:45-58); `max_shards_run` 0 or
/// absent runs every shard (`max_shards_run ? ... : plan.shards`).
pub fn run_fanout(
    n: u64,
    shard_size: u64,
    scorers: &mut Scorers<'_>,
    max_shards_run: Option<u64>,
) -> Result<Fanout, HarnessError> {
    let plan = shard_plan(n, shard_size)?;
    let to_run = match max_shards_run {
        Some(max) if max > 0 => &plan.shards[..plan.shards.len().min(max as usize)],
        _ => &plan.shards[..],
    };
    let results: Vec<ShardResult> = to_run.iter().map(|s| run_shard(s, scorers)).collect();
    let mut composite = Sha256Stream::new();
    for r in &results {
        composite.update(&r.shard_sha256);
    }
    let sum = results.iter().fold(Dbl::ZERO, |a, b| a + b.mean_lcr);
    Ok(Fanout {
        n,
        shard_count_planned: plan.k,
        shard_count_executed: results.len() as u64,
        mean_lcr: sum / Dbl::from_u64(results.len().max(1) as u64),
        composite_sha256: composite.hex_digest(),
        shards: results,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plan_covers_every_agent_once() {
        let plan = shard_plan(10, 3).expect("valid");
        assert_eq!(plan.k, 4);
        let ranges: Vec<(u64, u64)> = plan.shards.iter().map(|s| (s.start, s.end)).collect();
        assert_eq!(ranges, vec![(0, 3), (3, 6), (6, 9), (9, 10)]);
        assert_eq!(shard_plan(0, 5).expect("valid").k, 0);
        assert_eq!(shard_plan(1, 0), Err(HarnessError::ZeroShardSize));
    }

    #[test]
    fn empty_fanout_has_zero_mean_and_hash_of_nothing() {
        let f = run_fanout(0, 5, &mut Scorers::default(), None).expect("valid");
        assert_eq!(f.mean_lcr, Dbl::ZERO);
        assert_eq!(
            f.composite_sha256,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }
}
