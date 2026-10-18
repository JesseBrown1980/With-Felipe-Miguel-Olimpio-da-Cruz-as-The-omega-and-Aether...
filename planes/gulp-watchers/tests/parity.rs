//! Replays each tools/referee.py fixture through the Rust port and asserts byte-for-byte agreement.

mod common;

use common::rows;
use gulp_watchers::{cadence, construction_routing, cosign, gc, gulp, route, shannon_lens, tier3};

#[test]
fn cadence_matches_referee() {
    let all = rows("cadence.hbp");
    assert_eq!(all.iter().filter(|r| r.kind == "CAD").count(), 720);
    assert_eq!(all.iter().filter(|r| r.kind == "CADC").count(), 720);
    for r in all {
        let verdict = match r.get("verdict") {
            "promote" => cadence::Verdict::Promote,
            "demote" => cadence::Verdict::Demote,
            "halt" => cadence::Verdict::Halt,
            "neutral" => cadence::Verdict::Neutral,
            "unknown" => cadence::Verdict::Unknown,
            other => panic!("verdict {other}"),
        };
        let intent = match r.get("intent") {
            "leak" => cadence::Intent::Leak,
            "mask" => cadence::Intent::Mask,
            "none" => cadence::Intent::None,
            other => panic!("intent {other}"),
        };
        let mut adj = match r.kind.as_str() {
            "CAD" => cadence::CadenceAdjuster::default(),
            "CADC" => cadence::CadenceAdjuster::new(
                r.i128("min_ms"),
                r.i128("max_ms"),
                10_000,
                r.i128("decay_pm"),
            ),
            other => panic!("row {other}"),
        };
        adj.set_state(r.i128("in_score"), r.i128("in_ms"));
        let out = adj.on_outcome(verdict, intent, r.get("is_reply") == "1");
        assert_eq!(out.score_pm, r.i128("out_score"), "{}", r.raw);
        assert_eq!(out.next_interval_ms, r.i128("out_ms"), "{}", r.raw);
        assert_eq!(out.damped, r.get("damped") == "1", "{}", r.raw);
    }
}

#[test]
fn gc_matches_referee() {
    let all = rows("gc.hbp");
    let mut i = 0;
    let mut summary_rows = 0;
    while i < all.len() {
        let r = &all[i];
        assert_eq!(r.kind, "GC");
        let cfg = gc::GcConfig {
            max_bytes: r.u64("maxBytes"),
            max_lines: r.u64("maxLines"),
            sanity_bytes: r.u64("sanity"),
        };
        let basename = r.text("basename");
        let d = gc::decide(&basename, r.u64("size"), r.u64("lines"), &cfg);
        assert_eq!(d.rotated, r.get("rotated") == "1", "{}", r.raw);
        let reason_tag = d.reason.map(|x| x.tag().to_string());
        assert_eq!(reason_tag.as_deref(), r.opt("reason"), "{}", r.raw);
        assert_eq!(d.error, r.opt_text("err"), "{}", r.raw);
        assert_eq!(d.summary_sentence, r.opt_text("sentence"), "{}", r.raw);

        let archive_name = gc::archive_file_name(&basename, &r.text("iso"));
        assert_eq!(archive_name, r.text("archive_name"), "{}", r.raw);
        let root = r.text("root");
        let source = format!("{root}/{basename}");
        let archive = format!("{root}/archive/{archive_name}");
        let row = gc::rotated_row(&r.text("ts"), &source, &archive, &d);
        i += 1;
        match row {
            None => assert!(!d.rotated, "{}", r.raw),
            Some(row) => {
                let golden = &all[i];
                assert_eq!(golden.kind, "EVT-GC-ROTATED");
                assert_eq!(row.render(), golden.raw);
                summary_rows += 1;
                i += 1;
            }
        }
    }
    assert_eq!(summary_rows, 6);
}

#[test]
fn gulp_matches_referee() {
    let all = rows("gulp.hbp");
    let cfg = all.iter().find(|r| r.kind == "CFG").expect("CFG");
    let since = cfg.i128("sinceMs") as i64;
    let emit = cfg.get("emit") == "1";

    let records: Vec<gulp::RawRecord> = all
        .iter()
        .filter(|r| r.kind == "REC")
        .map(|r| gulp::RawRecord {
            event: r.opt_text("event"),
            kind: r.opt_text("kind"),
            glyph: r.opt_text("glyph"),
            glyph_id: r.opt_text("glyph_id"),
            ts_ms: r.opt("ts").map(|v| v.parse().expect("ts")),
        })
        .collect();

    let res = gulp::run_gulp(&records, since, emit);

    let scanned_row = all.iter().find(|r| r.kind == "SCANNED").expect("SCANNED");
    assert_eq!(res.scanned, scanned_row.u64("scanned"));
    assert_eq!(res.skipped, scanned_row.u64("skipped"));

    let ev: Vec<_> = all.iter().filter(|r| r.kind == "EV").collect();
    assert_eq!(res.event_patterns.len(), ev.len());
    for (i, (k, c)) in res.event_patterns.iter().enumerate() {
        assert_eq!(*k, ev[i].text("key"), "{}", ev[i].raw);
        assert_eq!(*c, ev[i].u64("count"), "{}", ev[i].raw);
    }

    let gl: Vec<_> = all.iter().filter(|r| r.kind == "GL").collect();
    assert_eq!(res.glyph_patterns.len(), gl.len());
    for (i, (k, c)) in res.glyph_patterns.iter().enumerate() {
        assert_eq!(*k, gl[i].text("key"), "{}", gl[i].raw);
        assert_eq!(*c, gl[i].u64("count"), "{}", gl[i].raw);
    }

    let sums: Vec<_> = all.iter().filter(|r| r.kind == "SUM").collect();
    assert_eq!(res.summary_sentences.len(), sums.len());
    for (i, s) in res.summary_sentences.iter().enumerate() {
        assert_eq!(*s, sums[i].text("sentence"), "{}", sums[i].raw);
    }
}

#[test]
fn construction_matches_referee() {
    let mut w = construction_routing::Watcher::new();
    for r in rows("construction.hbp") {
        match r.kind.as_str() {
            "EDGE" => w.record_routing_edge(&r.text("from"), &r.text("to")),
            "PAT" => w.record_pattern_hit(&[&r.text("kw")], &r.text("cid")),
            "PRED" => {
                let cur = r.opt_text("cur");
                let p = w.predict(&r.text("msg"), cur.as_deref());
                match p {
                    None => {
                        assert_eq!(r.opt("pick"), None, "{}", r.raw);
                    }
                    Some(p) => {
                        assert_eq!(Some(p.construction_id.as_str()), r.opt("pick"), "{}", r.raw);
                        let src = match p.source {
                            construction_routing::Source::RoutingGraph => "routing",
                            construction_routing::Source::PatternMemory => "pattern",
                        };
                        assert_eq!(src, r.get("source"), "{}", r.raw);
                        assert_eq!(p.confidence_num, r.u64("conf_num"), "{}", r.raw);
                        assert_eq!(p.confidence_den, r.u64("conf_den"), "{}", r.raw);
                    }
                }
            }
            other => panic!("row {other}"),
        }
    }
}

fn verdict_tag(v: shannon_lens::Verdict) -> &'static str {
    match v {
        shannon_lens::Verdict::Proceed => "proceed",
        shannon_lens::Verdict::ProceedWithConditions => "pwc",
        shannon_lens::Verdict::NeedsChange => "needs",
        shannon_lens::Verdict::Halt => "halt",
        shannon_lens::Verdict::Refused => "refused",
    }
}

#[test]
fn shannon_matches_referee() {
    let all = rows("shannon.hbp");
    let mut i = 0;
    while i < all.len() {
        let c = &all[i];
        assert_eq!(c.kind, "CAND");
        let cand = shannon_lens::Candidate {
            json_text: c.text("json"),
            blast_radius: c.opt_text("blast"),
            leverage: c.opt_text("lev"),
            time_to_running: c.opt_text("ttr"),
            depends_on_len: c.opt_usize("dep"),
        };
        let deny_on = c.get("deny") == "1";
        let deny = |t: &str| -> Vec<String> {
            if deny_on && t.contains("deny-sentinel") {
                vec!["HD-TEST".to_string()]
            } else {
                vec![]
            }
        };

        i += 1;
        for dim in shannon_lens::DIMS {
            let lens = shannon_lens::lens_verdict(dim, &cand, &deny);
            let row = &all[i];
            assert_eq!(row.kind, "LENS");
            assert_eq!(dim.id(), row.get("dim"), "{}", row.raw);
            assert_eq!(verdict_tag(lens.verdict), row.get("verdict"), "{}", row.raw);
            assert_eq!(lens.reason, row.text("reason"), "{}", row.raw);
            assert_eq!(lens.score, row.i128("score") as i64, "{}", row.raw);
            i += 1;
        }

        let v = shannon_lens::vote(&cand, &deny);
        let vr = &all[i];
        assert_eq!(vr.kind, "VOTE");
        assert_eq!(v.total_score, vr.i128("total") as i64, "{}", vr.raw);
        assert_eq!(v.max_score, vr.i128("max") as i64, "{}", vr.raw);
        assert_eq!(verdict_tag(v.consensus), vr.get("consensus"), "{}", vr.raw);
        assert_eq!(v.totals.proceed, vr.u64("proceed"), "{}", vr.raw);
        assert_eq!(
            v.totals.proceed_with_conditions,
            vr.u64("pwc"),
            "{}",
            vr.raw
        );
        assert_eq!(v.totals.needs_change, vr.u64("needs"), "{}", vr.raw);
        assert_eq!(v.totals.halt, vr.u64("halt"), "{}", vr.raw);
        assert_eq!(v.totals.refused, vr.u64("refused"), "{}", vr.raw);
        i += 1;
    }
}

#[test]
fn cosign_matches_referee() {
    let all = rows("cosign.hbp");
    let mut i = 0;
    while i < all.len() {
        let nin = &all[i];
        assert_eq!(nin.kind, "NIN");
        let receipt = cosign::Receipt {
            seq: nin.text("seq"),
            row_hash: nin.text("row"),
            antecedent_prev: nin.text("prev"),
        };
        let channel = nin.text("channel");
        let event = nin.opt_text("event");
        let vantage = nin.opt_text("vantage");
        let subs = nin.u64("subs");
        let uroute = match nin.get("uroute") {
            "-1" => None,
            "0" => Some(false),
            "1" => Some(true),
            other => panic!("uroute {other}"),
        };

        let golden = &all[i + 1];
        assert_eq!(golden.kind, "DURABLE-NOTIFY");
        let line =
            cosign::notify_row(&receipt, &channel, event.as_deref(), vantage.as_deref()).render();
        assert_eq!(line, golden.raw);

        let dec = &all[i + 2];
        assert_eq!(dec.kind, "NDEC");
        assert_eq!(
            cosign::durability_gap_status(subs),
            dec.get("gap"),
            "{}",
            dec.raw
        );
        assert_eq!(
            cosign::universal_route_default(uroute),
            dec.get("uroute") == "1",
            "{}",
            dec.raw
        );
        assert_eq!(
            cosign::validate_channel(&channel).is_ok(),
            dec.get("channel_ok") == "1",
            "{}",
            dec.raw
        );
        i += 3;
    }
}

#[test]
fn route_matches_referee() {
    let all = rows("route.hbp");
    let mut i = 0;
    while i < all.len() {
        let e = &all[i];
        assert_eq!(e.kind, "REMIT");
        let edge = e.opt_text("edge");
        let src = e.opt_text("src");
        let auth = e.opt_text("auth");
        let img = e.opt_text("img");
        let bpid = e.opt_text("bpid");
        let resolved = route::resolve_classes(
            edge.as_deref(),
            src.as_deref(),
            auth.as_deref(),
            img.as_deref(),
            bpid.as_deref(),
        );

        match resolved {
            Err(reason) => {
                let rerr = &all[i + 1];
                assert_eq!(rerr.kind, "RERR");
                assert_eq!(reason.0, rerr.text("msg"), "{}", rerr.raw);
                i += 2;
            }
            Ok(classes) => {
                let ch = e.opt_text("channel");
                let subnet = e.opt_text("subnet");
                let ts = e.text("ts");
                let passed = e.text("passed");
                let event = e.opt_text("event");
                let vantage = e.opt_text("vantage");
                let gfrom = e.opt_text("gfrom");
                let gto = e.opt_text("gto");
                let gverb = e.opt_text("gverb");
                let gweight = e.opt("gweight").map(|v| v.parse::<i64>().expect("weight"));

                let emit = route::Emit {
                    ts: &ts,
                    passed_at: &passed,
                    subnet_h: subnet.as_deref(),
                    channel: ch.as_deref(),
                    event: event.as_deref(),
                    vantage: vantage.as_deref(),
                    backend_row_pid: bpid.as_deref(),
                    gnn_from: gfrom.as_deref(),
                    gnn_to: gto.as_deref(),
                    gnn_verb: gverb.as_deref(),
                    gnn_weight: gweight,
                };
                let c = route::Cosign {
                    seq: None,
                    row_hash: None,
                    antecedent_prev: None,
                };

                let hw = &all[i + 1];
                assert_eq!(hw.kind, "HOOKWALL-OBSERVATION");
                assert_eq!(route::hookwall_row(&emit, &c, &classes).render(), hw.raw);

                let gn = &all[i + 2];
                assert_eq!(gn.kind, "GNN-LIVE-EDGE");
                assert_eq!(route::gnn_edge_row(&emit, &c, &classes).render(), gn.raw);
                i += 3;
            }
        }
    }
}

#[test]
fn tier3_matches_referee() {
    let mut kinds = [0usize; 5];
    for r in rows("tier3.hbp") {
        match r.kind.as_str() {
            "PROMO" => {
                let files = r.u64("files") as usize;
                let keep = r.u64("keep") as usize;
                assert_eq!(
                    tier3::promote_count(files) as u64,
                    r.u64("promote"),
                    "{}",
                    r.raw
                );
                assert_eq!(
                    tier3::drain_count(files, keep) as u64,
                    r.u64("drain"),
                    "{}",
                    r.raw
                );
                kinds[0] += 1;
            }
            "LINES" => {
                let raw = r.text("raw");
                let got = tier3::scanned_lines(&raw);
                assert_eq!(got.len() as u64, r.u64("scanned"), "{}", r.raw);
                assert_eq!(
                    got.first().map(|l| l.to_string()),
                    r.opt_text("first"),
                    "{}",
                    r.raw
                );
                assert_eq!(
                    got.last().map(|l| l.to_string()),
                    r.opt_text("last"),
                    "{}",
                    r.raw
                );
                kinds[1] += 1;
            }
            "LGEN" => {
                let n = r.u64("n") as usize;
                let blanks = r.u64("blanks") as usize;
                let mut raw = String::new();
                for i in 0..n {
                    raw.push_str(&format!("L{i}\n"));
                    if i < blanks {
                        raw.push('\n');
                    }
                }
                let got = tier3::scanned_lines(&raw);
                assert_eq!(got.len() as u64, r.u64("scanned"), "{}", r.raw);
                assert!(got.len() <= tier3::MAX_LINES_PER_FILE);
                assert_eq!(got[0], r.text("first"), "{}", r.raw);
                assert_eq!(got[got.len() - 1], r.text("last"), "{}", r.raw);
                kinds[2] += 1;
            }
            "NOISE" => {
                let noise = tier3::is_noise(&r.text("verb"), r.get("shadow") == "1");
                assert_eq!(noise, r.get("noise") == "1", "{}", r.raw);
                kinds[3] += 1;
            }
            "TALLY" => {
                let outcomes: Vec<tier3::Outcome> = r
                    .opt("outcomes")
                    .map(|s| {
                        s.split(',')
                            .map(|o| match o {
                                "actual" => tier3::Outcome::Actual,
                                "candidate" => tier3::Outcome::Candidate,
                                "stage" => tier3::Outcome::Stage,
                                _ => tier3::Outcome::Halt,
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                let c = tier3::tally(&outcomes);
                assert_eq!(c.actual, r.u64("actual"), "{}", r.raw);
                assert_eq!(c.candidate, r.u64("candidate"), "{}", r.raw);
                assert_eq!(c.stage, r.u64("stage"), "{}", r.raw);
                assert_eq!(c.halt, r.u64("halt"), "{}", r.raw);
                kinds[4] += 1;
            }
            other => panic!("row {other}"),
        }
    }
    assert_eq!(kinds, [28, 6, 5, 30, 3]);
}
