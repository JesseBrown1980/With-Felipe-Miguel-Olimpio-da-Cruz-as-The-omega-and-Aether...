//! tests/fixtures/hybrid-harness.hbp: `shardPlan`, `default_scorer`, `runShard` and `runFanout`
//! (asolaria-behcs-256 src/gnn/hybrid-harness.js:7-58) over four scorer sets.

mod common;

use common::{dbl_hex, hex_bits, rows};
use l0_edge::jsnum::Dbl;
use whiteroom_shannon::hybrid_harness::{
    default_scorer, run_fanout, shard_plan, AgentScorer, HarnessError, Scorers,
};

fn constant<'a>(x: Dbl) -> Option<AgentScorer<'a>> {
    Some(Box::new(move |_| x))
}

fn scorer_set(name: &str, l4_region: Dbl) -> Scorers<'static> {
    let d = Dbl::decimal;
    match name {
        "default" => Scorers::default(),
        "constants" => Scorers {
            omni: constant(d(1, 1)),
            reverse: constant(d(2, 1)),
            gsl: constant(d(3, 1)),
            contrastive: constant(d(7, 1)),
            prototype: constant(d(9, 1)),
        },
        "ratios" => Scorers {
            omni: Some(Box::new(|i| Dbl::from_ratio(i % 7, 7))),
            gsl: Some(Box::new(|i| Dbl::from_ratio(i % 1000, 1000))),
            prototype: Some(Box::new(|i| Dbl::from_ratio(1, i + 3))),
            ..Scorers::default()
        },
        "l4_constant" => Scorers {
            gsl: constant(l4_region),
            ..Scorers::default()
        },
        other => panic!("unknown scorer set {other}"),
    }
}

#[test]
fn plans_match_the_referee() {
    let mut n = 0;
    for row in rows("hybrid-harness.hbp")
        .iter()
        .filter(|r| r.kind == "PLAN")
    {
        let plan = shard_plan(row.int("n"), row.int("shard_size")).expect("valid");
        assert_eq!(plan.k.to_string(), row.raw("k"), "{}", row.line);
        let shards: Vec<String> = plan
            .shards
            .iter()
            .map(|s| format!("{}-{}", s.start, s.end))
            .collect();
        let shards = if shards.is_empty() {
            "-".to_string()
        } else {
            shards.join(",")
        };
        assert_eq!(shards, row.raw("shards"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 8);
    assert_eq!(shard_plan(1, 0), Err(HarnessError::ZeroShardSize));
    assert_eq!(shard_plan(1 << 53, 1), Err(HarnessError::TooLarge));
}

#[test]
fn default_scores_match_the_referee() {
    let mut n = 0;
    for row in rows("hybrid-harness.hbp")
        .iter()
        .filter(|r| r.kind == "DEFAULT")
    {
        assert_eq!(
            hex_bits(default_scorer(row.int("id"))),
            row.raw("bits"),
            "{}",
            row.line
        );
        n += 1;
    }
    assert_eq!(n, 300);
}

#[test]
fn fanouts_match_the_referee() {
    let all = rows("hybrid-harness.hbp");
    let l4_region = all
        .iter()
        .find(|r| r.kind == "CONST" && r.raw("name") == "l4_region")
        .map(|r| dbl_hex(r.raw("bits")))
        .expect("l4_region row");
    let mut n = 0;
    for row in all.iter().filter(|r| r.kind == "FANOUT") {
        let mut scorers = scorer_set(row.raw("scorers"), l4_region);
        let max = match row.raw("max") {
            "-" => None,
            m => Some(m.parse().expect("max")),
        };
        let f = run_fanout(row.int("n"), row.int("shard_size"), &mut scorers, max).expect("valid");
        assert_eq!(
            f.shard_count_planned.to_string(),
            row.raw("planned"),
            "{}",
            row.line
        );
        assert_eq!(f.shard_count_executed.to_string(), row.raw("executed"));
        assert_eq!(hex_bits(f.mean_lcr), row.raw("mean"), "{}", row.line);
        assert_eq!(f.composite_sha256, row.raw("composite"), "{}", row.line);
        let shards: Vec<String> = f
            .shards
            .iter()
            .map(|s| {
                format!(
                    "{}:{}:{}:{}",
                    s.shard_id,
                    s.agents,
                    hex_bits(s.mean_lcr),
                    s.shard_sha256
                )
            })
            .collect();
        let shards = if shards.is_empty() {
            "-".to_string()
        } else {
            shards.join(";")
        };
        assert_eq!(shards, row.raw("shards"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 32);
}
