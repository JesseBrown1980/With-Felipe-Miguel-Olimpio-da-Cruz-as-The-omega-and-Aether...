//! Fixed vectors for the cosign-chain port. Expected texts and hashes were printed by running the
//! vendored upstream lines 31-32, 55-74 and Python `json.dumps` (referee/referee.py); the seeded
//! comparisons are in referee/REFEREE.hbp.

use asolaria_hyperbehcs_daemons::cosign_chain::{
    append_row, chain_head, sha16, Head, ANCHOR, GENESIS_HASH,
};
use asolaria_hyperbehcs_daemons::iso_time::now_iso_at;
use asolaria_hyperbehcs_daemons::pyjson::{dumps_sorted, row_preimage, Obj, Value};

fn obj(pairs: Vec<(&str, Value)>) -> Obj {
    Obj::from_pairs(pairs.into_iter().map(|(k, v)| (String::from(k), v)))
}

fn s(x: &str) -> Value {
    Value::str(x)
}

fn keys(o: &Obj) -> Vec<&str> {
    o.fields().iter().map(|(k, _)| k.as_str()).collect()
}

#[test]
fn preimage_escapes_and_code_point_key_order() {
    let row = obj(vec![
        ("b", s("q\"\\\n\t\u{1}\u{7f}\u{e1}\u{2028}\u{1f600}")),
        (
            "a",
            Value::List(vec![Value::Int(1), Value::Int(-2), s("x")]),
        ),
        ("row_hash", s("zz")),
        (
            "c",
            Value::Obj(obj(vec![
                ("y", Value::Int(1)),
                ("x", Value::Obj(Obj::new())),
            ])),
        ),
        ("\u{ff61}", Value::Int(0)),
        ("\u{1f600}", Value::Int(0)),
    ]);
    let want = "{\"a\": [1, -2, \"x\"], \"b\": \"q\\\"\\\\\\n\\t\\u0001\u{7f}\u{e1}\u{2028}\u{1f600}\", \"c\": {\"x\": {}, \"y\": 1}, \"\u{ff61}\": 0, \"\u{1f600}\": 0}";
    assert_eq!(row_preimage(&row), want);
    assert_eq!(sha16(want), "f36417392f93d9ab");
    assert_eq!(
        dumps_sorted(&Value::List(vec![])),
        "[]",
        "empty list as json.dumps"
    );
}

#[test]
fn two_appends_from_an_empty_chain() {
    let head = Head::genesis();
    let a = append_row(
        &head,
        &obj(vec![("event", s("X"))]),
        &now_iso_at(1_782_345_600),
    )
    .unwrap();
    assert_eq!((a.seq, a.row_hash.as_str()), (1, "81474cf7750fad48"));
    assert_eq!(a.prev_hash, s(GENESIS_HASH));
    assert_eq!(
        keys(&a.row),
        [
            "event",
            "seq",
            "antecedents",
            "ts",
            "appended_by_daemon",
            "row_hash"
        ]
    );
    assert_eq!(a.row.get("appended_by_daemon"), Some(&s(ANCHOR)));
    assert_eq!(a.row.get("ts"), Some(&s("2026-06-25T00:00:00.000Z")));

    let head = chain_head([&a.row]);
    let payload = obj(vec![
        ("event", s("Y")),
        ("antecedents", Value::List(vec![s("k")])),
        ("seq", Value::Int(7)),
        ("row_hash", s("old")),
    ]);
    let b = append_row(&head, &payload, &now_iso_at(1_782_345_601)).unwrap();
    assert_eq!((b.seq, b.row_hash.as_str()), (2, "1260ca7343751d81"));
    assert_eq!(
        keys(&b.row),
        [
            "event",
            "antecedents",
            "seq",
            "row_hash",
            "ts",
            "appended_by_daemon"
        ]
    );
    assert_eq!(
        b.row.get("antecedents"),
        Some(&Value::List(vec![s("81474cf7750fad48"), s("k")]))
    );
}

#[test]
fn federation_fixture_payloads_through_upstream_append() {
    // federation-1024 servers/cosign-serve/fixtures/daemon-row-hash.ndjson, rows without seq and
    // row_hash. Row 1 gives the stored 101b6e1b41a4038f. Row 2 ("value": "olá") gives
    // 8037232646d39d34 under line 70; the fixture stores ff433399335fe8ad for it.
    let r1 = obj(vec![
        ("event", s("FIXTURE-A")),
        ("antecedents", Value::List(vec![s(GENESIS_HASH)])),
        ("ts", s("2026-06-25T00:00:00.000Z")),
        ("appended_by_daemon", s(ANCHOR)),
        (
            "nested",
            Value::Obj(obj(vec![("b", Value::Int(2)), ("a", Value::Int(1))])),
        ),
    ]);
    let a = append_row(&Head::genesis(), &r1, "unused").unwrap();
    assert_eq!(a.row_hash, "101b6e1b41a4038f");
    let r2 = obj(vec![
        ("event", s("FIXTURE-B")),
        ("antecedents", Value::List(vec![s("101b6e1b41a4038f")])),
        ("ts", s("2026-06-25T00:00:01.000Z")),
        ("appended_by_daemon", s(ANCHOR)),
        ("value", s("ol\u{e1}")),
    ]);
    let b = append_row(&chain_head([&a.row]), &r2, "unused").unwrap();
    assert_eq!((b.seq, b.row_hash.as_str()), (2, "8037232646d39d34"));
}

#[test]
fn max_scan_head_and_antecedent_membership() {
    let row = |seq: i128, h: &str| obj(vec![("seq", Value::Int(seq)), ("row_hash", s(h))]);
    let rows = [row(3, "b1"), row(1, "b2"), row(3, "b3"), row(2, "b4")];
    let head = chain_head(rows.iter());
    assert_eq!((head.seq, head.hash), (3, s("b1")));

    let mut h = Head::genesis();
    h.fold(Some(-5), Some(&s("neg")));
    h.fold(None, Some(&s("no-seq")));
    assert_eq!(h, Head::genesis());
    h.fold(Some(4), None);
    assert_eq!((h.seq, h.hash.clone()), (4, s(GENESIS_HASH)));

    // Python list membership compares dicts by content, in any key order.
    let prev = Value::Obj(obj(vec![("a", Value::Int(1)), ("b", Value::Int(2))]));
    let same = Value::Obj(obj(vec![("b", Value::Int(2)), ("a", Value::Int(1))]));
    let head = Head { seq: 9, hash: prev };
    let p = obj(vec![("antecedents", Value::List(vec![same.clone()]))]);
    let a = append_row(&head, &p, "t").unwrap();
    assert_eq!(a.row.get("antecedents"), Some(&Value::List(vec![same])));
    let p = obj(vec![("antecedents", s("not-a-list"))]);
    assert_eq!(
        append_row(&head, &p, "t").unwrap().row.get("antecedents"),
        Some(&s("not-a-list"))
    );
    // An int head and its decimal text are different values to Python `in`: 7 is prepended.
    let head = Head {
        seq: 9,
        hash: Value::Int(7),
    };
    let p = obj(vec![("antecedents", Value::List(vec![s("7")]))]);
    assert_eq!(
        append_row(&head, &p, "t").unwrap().row.get("antecedents"),
        Some(&Value::List(vec![Value::Int(7), s("7")]))
    );
}

#[test]
fn next_seq_at_the_i128_boundary() {
    // Upstream line 59 gives head + 1 for any Python int; i128 holds it up to 2^127 - 1.
    let p = obj(vec![("e", Value::Int(1))]);
    let head = Head {
        seq: i128::MAX - 1,
        hash: s("aa"),
    };
    let a = append_row(&head, &p, "t").unwrap();
    assert_eq!(a.seq, i128::MAX);
    let head = Head {
        seq: i128::MAX,
        hash: s("aa"),
    };
    assert_eq!(append_row(&head, &p, "t"), None);
}

#[test]
fn iso_text_of_line_31() {
    assert_eq!(now_iso_at(0), "1970-01-01T00:00:00.000Z");
    assert_eq!(now_iso_at(951_782_400), "2000-02-29T00:00:00.000Z");
    assert_eq!(now_iso_at(253_402_300_799), "9999-12-31T23:59:59.000Z");
}
