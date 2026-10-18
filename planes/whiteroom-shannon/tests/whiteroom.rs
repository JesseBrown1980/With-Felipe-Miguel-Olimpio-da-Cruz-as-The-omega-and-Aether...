//! tests/fixtures/whiteroom.hbp: the request bytes and the mean of `L0GnnScorer`
//! (liris-whiteroom-engine.mjs:110-128), and sealed rows of the quants/cubes engine fed L0-grid
//! scores under the L0 scorer's name (:143-149, :167).

mod common;

use common::{dbl_hex, hex_bits, rows, unescape};
use l0_edge::jsnum::Dbl;
use quant_cubes::whiteroom::{
    genius_threshold, BhPidEmitter, MemoryStore, Scorer, Verdict, WhiteRoomEngine,
};
use std::collections::HashMap;
use whiteroom_shannon::jsnum_ext::q24_to_dbl;
use whiteroom_shannon::sha::hex;
use whiteroom_shannon::whiteroom::{mean_of_scores, L0GnnScorer, SmokeScorer};

#[test]
fn l0_request_bytes_match_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom.hbp").iter().filter(|r| r.kind == "L0REQ") {
        let req = L0GnnScorer::request(&row.string("pid"), &row.string("mark"));
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&req.nodes[0]);
        bytes.extend_from_slice(&req.nodes[1]);
        bytes.extend_from_slice(&req.edge_features);
        assert_eq!(hex(&bytes), row.raw("bytes"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 212);
}

#[test]
fn mean_of_scores_matches_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom.hbp").iter().filter(|r| r.kind == "MEAN") {
        let scores: Vec<Dbl> = row
            .raw("scores")
            .split(',')
            .filter(|s| !s.is_empty())
            .map(dbl_hex)
            .collect();
        assert_eq!(
            hex_bits(mean_of_scores(&scores)),
            row.raw("bits"),
            "{}",
            row.line
        );
        n += 1;
    }
    assert_eq!(n, 6);
}

/// Scores given per PID, under the L0 scorer's name: the referee's Q24-grid scores.
struct GivenScores(HashMap<String, Dbl>);

impl Scorer for GivenScores {
    fn name(&self) -> &str {
        L0GnnScorer::NAME
    }

    fn score(&self, pid: &str, _mark: &str, _coord64: Option<&str>) -> Dbl {
        self.0[pid]
    }
}

#[test]
fn the_cubes_engine_seals_l0_grid_scores_as_the_referee() {
    let seal_rows: Vec<_> = rows("whiteroom.hbp")
        .into_iter()
        .filter(|r| r.kind == "SEAL")
        .collect();
    assert_eq!(seal_rows.len(), 47);
    let scores = seal_rows
        .iter()
        .map(|r| (r.string("pid"), dbl_hex(r.raw("score"))))
        .collect();
    let mut engine = WhiteRoomEngine::new(
        MemoryStore::new(),
        GivenScores(scores),
        BhPidEmitter::new("t"),
        None,
        genius_threshold(),
        1,
    );
    let marks: Vec<String> = seal_rows.iter().map(|r| r.string("mark")).collect();
    let recs = engine
        .spin(marks.iter().map(String::as_str))
        .expect("memory store");
    for (rec, row) in recs.iter().zip(&seal_rows) {
        let rec = rec.borrow();
        assert_eq!(rec.pid, row.string("pid"));
        assert_eq!(rec.port3, row.raw("port3"));
        assert_eq!(rec.cp.to_string(), row.raw("cp"));
        assert_eq!(rec.verdict.map(Verdict::as_str), Some(row.raw("verdict")));
        assert_eq!(
            rec.sealed.as_deref(),
            Some(unescape(row.raw("sealed")).as_str())
        );
    }
}

#[test]
fn the_genius_boundary_on_the_q24_grid_is_12079596() {
    // 0.72 * 2^24 = 12079595.52 (the double 0.72 scaled exactly), so q / 2^24 >= 0.72 iff q >= 12079596.
    assert!(q24_to_dbl(12_079_596) >= genius_threshold());
    assert!(q24_to_dbl(12_079_595) < genius_threshold());
}

#[test]
fn the_l0_smoke_run_seals_in_process_scores() {
    // liris-whiteroom-engine.mjs:185-199 with `--l0`: the default emitter, store and threshold, and
    // the L0 scorer (:191). Every row's score is the in-process L0 forward of its request graph.
    let mut engine = WhiteRoomEngine::new(
        MemoryStore::new(),
        SmokeScorer::from_use_l0(true),
        BhPidEmitter::default(),
        None,
        genius_threshold(),
        1,
    );
    let marks: Vec<String> = (0..12)
        .map(|i| format!("bigpickle:room:{i}:work"))
        .collect();
    let recs = engine
        .spin(marks.iter().map(String::as_str))
        .expect("memory store");
    assert_eq!(recs.len(), 12);
    for (i, rec) in recs.iter().enumerate() {
        let rec = rec.borrow();
        let q = L0GnnScorer::scores_q24(&rec.pid, &marks[i]);
        assert_eq!(rec.score, Some(q24_to_dbl(q[0])));
        let genius = q[0] >= 12_079_596;
        assert_eq!(rec.verdict == Some(Verdict::Genius), genius);
        let sealed = rec.sealed.as_deref().expect("sealed");
        assert!(sealed.starts_with(&format!("WHITEROOM|pid=BH.WR.liris-whiteroom.{i}|")));
        assert!(sealed.contains("|store=memory|scorer=L0-gnn-:4792|json=0|row_hash="));
    }
    let m = engine.metrics;
    assert_eq!((m.ticks, m.genius + m.mistake), (12, 12));
    let st = engine.store.stats();
    assert_eq!((st.live as u64, st.compacted as u64), (m.genius, m.mistake));
}
