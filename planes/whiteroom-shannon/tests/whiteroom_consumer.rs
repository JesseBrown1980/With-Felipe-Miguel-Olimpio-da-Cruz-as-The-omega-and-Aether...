//! tests/fixtures/whiteroom-consumer.hbp: the white-room consumer
//! (pipeline/whiteroom-consumer-index.mjs:27-215): envelope membership, cube addresses over the
//! stableStringify pre-image, digestion envelopes, the poll reply's message list and `_tick`.

mod common;

use common::{rows, token};
use whiteroom_shannon::jsvalue::{JsNumber, JsValue};
use whiteroom_shannon::sha::sha256hex;
use whiteroom_shannon::whiteroom_consumer::{
    build_digestion_envelope, derive_cube_address, inbox_messages, is_whiteroom_envelope,
    stable_stringify, tick, ConsumerState,
};

fn cube_text(c: [u32; 3]) -> String {
    format!("{},{},{}", c[0], c[1], c[2])
}

#[test]
fn membership_matches_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom-consumer.hbp")
        .iter()
        .filter(|r| r.kind == "ISWR")
    {
        let want = row.raw("result") == "1";
        assert_eq!(
            is_whiteroom_envelope(&row.value("env")),
            want,
            "{}",
            row.line
        );
        n += 1;
    }
    assert_eq!(n, 400);
}

#[test]
fn cube_addresses_match_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom-consumer.hbp")
        .iter()
        .filter(|r| r.kind == "CUBE")
    {
        let payload = row.value("payload");
        let pre = stable_stringify(&payload);
        assert_eq!(sha256hex(&pre), row.raw("preimage_sha256"), "{}", row.line);
        assert_eq!(
            pre.len().to_string(),
            row.raw("preimage_len"),
            "{}",
            row.line
        );
        let c = derive_cube_address(&payload);
        assert_eq!(c.pattern_sha, row.raw("preimage_sha256"));
        assert_eq!(cube_text(c.cube_address), row.raw("cube"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 300);
}

#[test]
fn digestion_envelopes_match_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom-consumer.hbp")
        .iter()
        .filter(|r| r.kind == "BUILD")
    {
        let d = build_digestion_envelope(&row.value("env"), "2026-10-17T12:00:00.000Z");
        assert_eq!(d.proof, row.raw("proof"), "{}", row.line);
        assert_eq!(d.cube.pattern_sha, row.raw("pattern_sha"));
        assert_eq!(cube_text(d.cube.cube_address), row.raw("cube"));
        assert_eq!(
            token(&d.source_envelope_id),
            row.raw("source_id"),
            "{}",
            row.line
        );
        assert_eq!(
            token(&d.source_verb),
            row.raw("source_verb"),
            "{}",
            row.line
        );
        assert!(!is_whiteroom_envelope(&d.to_js_value()));
        n += 1;
    }
    assert_eq!(n, 200);
}

#[test]
fn poll_message_lists_match_the_referee() {
    let mut n = 0;
    for row in rows("whiteroom-consumer.hbp")
        .iter()
        .filter(|r| r.kind == "POLL")
    {
        assert_eq!(
            token(&inbox_messages(&row.value("data"))),
            row.raw("messages")
        );
        n += 1;
    }
    assert_eq!(n, 6);
}

fn state_of(v: JsValue) -> ConsumerState {
    let JsValue::Array(parts) = v else {
        panic!("state token")
    };
    let JsValue::Array(ids) = parts[1].clone() else {
        panic!("processed_ids")
    };
    let JsValue::Number(count) = &parts[2] else {
        panic!("digested_count")
    };
    ConsumerState {
        last_ts: parts[0].clone(),
        processed_ids: ids,
        digested_count: count.text().parse().expect("count"),
    }
}

fn state_token(s: &ConsumerState) -> String {
    let count = JsNumber::int(s.digested_count as i64).expect("count");
    token(&JsValue::Array(vec![
        s.last_ts.clone(),
        JsValue::Array(s.processed_ids.clone()),
        JsValue::Number(count),
    ]))
}

#[test]
fn ticks_match_the_referee() {
    let mut counts = [0; 2];
    for row in rows("whiteroom-consumer.hbp")
        .iter()
        .filter(|r| r.kind == "TICK")
    {
        let mut state = state_of(row.value("before"));
        let sends: Vec<bool> = row
            .raw("sends")
            .bytes()
            .filter(|&b| b != b'-')
            .map(|b| b == b'1')
            .collect();
        let mut sent = sends.into_iter();
        let mut builds = 0;
        let got = tick(
            &mut state,
            &row.value("messages"),
            &mut |_| sent.next().expect("one answer per send"),
            &mut || {
                builds += 1;
                format!("2026-10-17T01:00:{:02}.000Z", builds - 1)
            },
        );
        match row.raw("result") {
            "refused" => {
                assert!(got.is_err(), "{}", row.line);
                counts[1] += 1;
            }
            want => {
                let out = got.unwrap_or_else(|e| panic!("{}: {e:?}", row.line));
                assert_eq!(out.digested.to_string(), want, "{}", row.line);
                assert_eq!(out.save_state, out.digested > 0);
                counts[0] += 1;
            }
        }
        assert_eq!(state_token(&state), row.raw("after"), "{}", row.line);
    }
    assert_eq!(counts, [356, 5]);
}
