//! Replays tools/referee.py's fixture through the Rust port and asserts byte-for-byte agreement.
//! The fixture is an independent integer mirror over synthetic inputs only; every mask token in it is
//! read from data/example-mask-glyphs.txt. No real identifier appears here.

mod common;

use common::{rows, Row};
use gnn_trio::bpi_codec::encode_frame;
use gnn_trio::quant_bus::authority_quant;
use gnn_trio::{
    magnitude_from_decimal, mine_reverse_gain, vector_from_envelope, Envelope, MaskSet,
};

#[test]
fn reverse_gain_matches_referee() {
    let mask = MaskSet::synthetic();
    let rvgn: Vec<&Row> = rows_of("RVGN");
    assert_eq!(rvgn.len(), 10);
    for r in rvgn {
        let glyph = r.get("glyph");
        let is_mask = r.get("mask") == "1";
        // The Rust mask set and the referee's reading of the same data file agree on membership.
        assert_eq!(mask.contains(glyph), is_mask, "membership for {glyph}");
        let magnitude = magnitude_from_decimal(r.u64("units"), r.u32("digits"));
        let scored = mine_reverse_gain(glyph, magnitude, &mask);
        assert_eq!(scored.mask_flipped, is_mask, "mask_flipped for {glyph}");
        assert_eq!(scored.sign.as_i8(), r.i8("sign"), "sign for {glyph}");
        assert_eq!(scored.score.to_bits(), r.bits("score"), "score for {glyph}");
    }
}

#[test]
fn vector_from_envelope_matches_referee() {
    let vec_rows: Vec<&Row> = rows_of("VEC");
    assert_eq!(vec_rows.len(), 3);
    for r in vec_rows {
        let env = Envelope {
            room_id: Some(r.i64("room_id")),
            port_outer: Some(r.i64("port_outer")),
            port_inner: Some(r.i64("port_inner")),
            elapsed_ms: Some(r.i64("elapsed_ms")),
            stdout_len: Some(r.i64("stdout_len")),
            ok: Some(r.i64("ok")),
            ts_ms: Some(r.i64("ts_ms")),
            job_seq: Some(r.i64("job_seq")),
            ..Envelope::default()
        };
        let v = vector_from_envelope(&env);
        for (i, slot) in v.iter().enumerate() {
            assert_eq!(slot.to_bits(), r.bits(&format!("b{i}")), "{} b{i}", r.raw);
        }
    }
}

#[test]
fn authority_quant_matches_referee() {
    let auth_rows: Vec<&Row> = rows_of("AUTH");
    assert_eq!(auth_rows.len(), 5);
    for r in auth_rows {
        let on_field = r.get("on");
        let on: Vec<&str> = if on_field.is_empty() {
            Vec::new()
        } else {
            on_field.split(',').collect()
        };
        assert_eq!(authority_quant(&on), r.get("mask"), "{}", r.raw);
    }
}

#[test]
fn encode_frame_matches_referee() {
    let frame_rows: Vec<&Row> = rows_of("FRAME");
    assert_eq!(frame_rows.len(), 4);
    for r in frame_rows {
        let tag = r.text("tag");
        let n = r.u64("n") as usize;
        let fields: Vec<String> = (0..n).map(|i| r.text(&format!("f{i}"))).collect();
        let refs: Vec<&str> = fields.iter().map(String::as_str).collect();
        let got = encode_frame(&tag, &refs).expect("encode");
        assert_eq!(got, r.text("want"), "{}", r.raw);
    }
}

fn rows_of(kind: &str) -> Vec<&'static Row> {
    // The fixture is small; leak it so the per-test row slices can borrow for the test's lifetime.
    let all: &'static [Row] = Box::leak(rows("gnn-trio-referee.hbp").into_boxed_slice());
    all.iter().filter(|r| r.kind == kind).collect()
}
