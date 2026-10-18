//! tests/fixtures/fabric-thinker.hbp: `pidQueryToGraph`, `descriptorInfer`, `realInfer` and
//! `realInferEnsemble` (bigpickle-rebuild src/fabric-thinker-gnn.mjs:31-184,
//! src/fabric-thinker.mjs:75-105) with the servers' replies given in each row.

mod common;

use common::{dbl_hex, hex_bits, rows, unescape, Row};
use l0_edge::jsnum::Dbl;
use whiteroom_shannon::fabric_thinker::{
    descriptor_infer, pid_query_to_graph, real_infer, real_infer_ensemble,
    real_infer_ensemble_with, GnnReply, InferError, RealInfer, RealInferOpts, ReplyScores, Voter,
    REAL_PATH,
};
use whiteroom_shannon::jsnum_ext::q24_to_dbl;
use whiteroom_shannon::l0_request::score_q24;
use whiteroom_shannon::sha::hex;

const TS: &str = "2026-10-17T00:00:00.000Z";

fn reply(token: &str) -> GnnReply {
    if let Some(message) = token.strip_prefix("unreachable:") {
        return GnnReply::Unreachable(unescape(message));
    }
    let rest = token.strip_prefix("answered:").expect("reply token");
    let (ok, scores) = rest.split_once(':').expect("ok:scores");
    let scores = if let Some(bits) = scores.strip_prefix("number:") {
        ReplyScores::Number(dbl_hex(bits))
    } else if let Some(list) = scores.strip_prefix("array:") {
        ReplyScores::Array(
            list.split(',')
                .filter(|s| !s.is_empty())
                .map(dbl_hex)
                .collect(),
        )
    } else {
        assert_eq!(scores, "other");
        ReplyScores::Other
    };
    GnnReply::Answered {
        ok: ok == "1",
        scores,
    }
}

fn opts(row: &Row) -> RealInferOpts {
    RealInferOpts {
        ts_iso: TS.to_string(),
        fallback: row.raw("fallback") == "1",
    }
}

#[test]
fn graphs_match_the_referee() {
    let mut n = 0;
    for row in rows("fabric-thinker.hbp")
        .iter()
        .filter(|r| r.kind == "GRAPH")
    {
        let g = pid_query_to_graph(&row.string("pid"), &row.string("query"));
        let nodes: Vec<u8> = g.nodes.concat();
        assert_eq!(hex(&nodes), row.raw("nodes"), "{}", row.line);
        assert_eq!(hex(&g.edge_features), row.raw("edge"));
        assert_eq!(g.pid_hash_sha8, row.raw("pid_sha8"));
        assert_eq!(g.query_hash_sha8, row.raw("query_sha8"));
        assert_eq!(g.edge_hash_sha8, row.raw("edge_sha8"));
        n += 1;
    }
    assert_eq!(n, 300);
}

#[test]
fn descriptors_match_the_referee() {
    let mut n = 0;
    for row in rows("fabric-thinker.hbp")
        .iter()
        .filter(|r| r.kind == "DESC")
    {
        let got = descriptor_infer(&row.string("pid"), &row.string("query"), TS);
        match row.opt("error") {
            Some(_) => assert_eq!(got, Err(InferError::PidNotNonEmptyString), "{}", row.line),
            None => {
                let d = got.expect("descriptor");
                assert_eq!(
                    hex_bits(d.confidence),
                    row.raw("confidence"),
                    "{}",
                    row.line
                );
                assert_eq!(d.cp.to_string(), row.raw("cp"));
                assert_eq!(d.bh_3d_idx.to_string(), row.raw("bh3d"));
                assert_eq!(d.verdict_glyph, row.raw("glyph"));
                assert_eq!(d.query_sha8, row.raw("query_sha8"));
                assert_eq!(d.path.as_str(), row.raw("path"));
                assert_eq!(d.ts_iso, TS);
            }
        }
        n += 1;
    }
    assert_eq!(n, 300);
}

#[test]
fn real_infer_matches_the_referee() {
    let mut counts = [0; 3];
    for row in rows("fabric-thinker.hbp")
        .iter()
        .filter(|r| r.kind == "REAL")
    {
        let reply = reply(row.raw("reply"));
        let got = real_infer(
            &row.string("pid"),
            &row.string("query"),
            Voter::Reply(&reply),
            &opts(row),
        );
        match row.raw("result") {
            "real" => {
                let Ok(RealInfer::Real(r)) = got else {
                    panic!("{}: {got:?}", row.line)
                };
                let score = r.gnn_score.map_or("-".to_string(), hex_bits);
                assert_eq!(score, row.raw("gnn_score"), "{}", row.line);
                let cp = r.cp.map_or("NaN".to_string(), |c| c.to_string());
                assert_eq!(cp, row.raw("cp"), "{}", row.line);
                assert_eq!(r.bh_3d_idx.to_string(), row.raw("bh3d"));
                assert_eq!(r.verdict_glyph, row.raw("glyph"));
                assert_eq!(r.query_sha8, row.raw("query_sha8"));
                assert_eq!(r.graph_sig, row.raw("graph_sig"));
                counts[0] += 1;
            }
            "fallback" => {
                let Ok(RealInfer::Fallback(f)) = got else {
                    panic!("{}: {got:?}", row.line)
                };
                let err = f
                    .gnn_error
                    .as_deref()
                    .map_or("-".to_string(), common::escape);
                assert_eq!(err, row.raw("gnn_error"), "{}", row.line);
                assert_eq!(hex_bits(f.stub.confidence), row.raw("confidence"));
                assert_eq!(f.stub.cp.to_string(), row.raw("cp"));
                assert_eq!(f.stub.path.as_str(), row.raw("path"));
                counts[1] += 1;
            }
            _ => {
                let want = match row.raw("error") {
                    "PidNotNonEmptyString" => InferError::PidNotNonEmptyString,
                    e => InferError::Unreachable(unescape(
                        e.strip_prefix("Unreachable:").expect("error"),
                    )),
                };
                assert_eq!(got, Err(want), "{}", row.line);
                counts[2] += 1;
            }
        }
    }
    assert_eq!(counts, [209, 48, 43]);
}

#[test]
fn ensemble_matches_the_referee() {
    let mut n = 0;
    for row in rows("fabric-thinker.hbp")
        .iter()
        .filter(|r| r.kind == "ENS")
    {
        let (l0, l4) = (reply(row.raw("l0")), reply(row.raw("l4")));
        let e = real_infer_ensemble_with(
            &row.string("pid"),
            &row.string("query"),
            Voter::Reply(&l0),
            Voter::Reply(&l4),
            &opts(row),
        );
        assert_eq!(hex_bits(e.l0_score), row.raw("l0_score"), "{}", row.line);
        assert_eq!(hex_bits(e.l4_score), row.raw("l4_score"), "{}", row.line);
        assert_eq!(
            hex_bits(e.ensemble_score),
            row.raw("ensemble"),
            "{}",
            row.line
        );
        assert_eq!(e.gnn_real, row.raw("gnn_real") == "1", "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 300);
}

#[test]
fn the_in_process_l0_voter_answers_ok_with_one_score() {
    // The :4792 reply is {scores: [score], ok: true} (inference_server.py:25); here the score is the
    // Q24 L0 forward of the two sha nodes, and the real path's fields follow from it.
    let opts = RealInferOpts {
        ts_iso: TS.to_string(),
        fallback: true,
    };
    for (pid, query) in [("AGT-1", "status"), ("BH.WR.x.0", ""), ("p", "q|r")] {
        let q = score_q24(&pid_query_to_graph(pid, query).nodes);
        let Ok(RealInfer::Real(r)) = real_infer(pid, query, Voter::L0InProcess, &opts) else {
            panic!("L0 in process answers ok")
        };
        let score = q24_to_dbl(q);
        assert_eq!(r.gnn_score, Some(score));
        let cp = (score * Dbl::from_u64(1024)).js_round().clamp(2, 1023) as u32;
        assert_eq!(r.cp, Some(cp));
        assert_eq!(REAL_PATH, "FALLBACK");
        // L4 unreachable: the ensemble is (l0 + 0) / 2 and still real through L0.
        let e = real_infer_ensemble(pid, query, &GnnReply::Unreachable("x".into()), &opts);
        assert_eq!(e.l0_score, score);
        assert_eq!(e.l4_score, Dbl::ZERO);
        assert_eq!(e.ensemble_score, score / Dbl::from_u64(2));
        assert!(e.gnn_real);
    }
}
