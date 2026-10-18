//! tests/fixtures/jsvalue.hbp: the ECMA-262 operations the upstream lines apply (truthiness,
//! `v <= 1`, `Number(v) || 0`, `String(v)`, `a > b`, `JSON.stringify(s)`, `String(x)` texts and
//! which decimal texts are `String(x)`), as tools/referee.py writes them out independently of the port.

mod common;

use common::{escape, rows};
use whiteroom_shannon::jsvalue::{
    js_greater, le_one, number_or_zero, quote_json_string, JsNumber, JsValue,
};

#[test]
fn values_match_the_referee() {
    let mut n = 0;
    for row in rows("jsvalue.hbp").iter().filter(|r| r.kind == "VALUE") {
        let v = row.value("v");
        assert_eq!(v.truthy(), row.raw("truthy") == "1", "{}", row.line);
        assert_eq!(le_one(&v), row.raw("le_one") == "1", "{}", row.line);
        match row.raw("number_or_zero") {
            "refused" => assert!(number_or_zero(&v).is_err(), "{}", row.line),
            want => assert_eq!(
                number_or_zero(&v),
                Ok(want.parse().expect("int")),
                "{}",
                row.line
            ),
        }
        assert_eq!(escape(&v.to_js_string()), row.raw("string"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 405);
}

#[test]
fn greater_matches_the_referee() {
    let mut n = 0;
    for row in rows("jsvalue.hbp").iter().filter(|r| r.kind == "GREATER") {
        let got = js_greater(&row.value("a"), &row.value("b"));
        match row.raw("result") {
            "refused" => assert!(got.is_err(), "{}", row.line),
            want => assert_eq!(got, Ok(want == "1"), "{}", row.line),
        }
        n += 1;
    }
    assert_eq!(n, 404);
}

#[test]
fn json_string_quoting_matches_the_referee() {
    let mut n = 0;
    for row in rows("jsvalue.hbp").iter().filter(|r| r.kind == "QUOTE") {
        let JsValue::String(s) = row.value("s") else {
            panic!("{}", row.line)
        };
        assert_eq!(
            escape(&quote_json_string(&s)),
            row.raw("quoted"),
            "{}",
            row.line
        );
        n += 1;
    }
    assert_eq!(n, 200);
}

#[test]
fn every_number_text_the_referee_writes_is_accepted() {
    let mut n = 0;
    for row in rows("jsvalue.hbp").iter().filter(|r| r.kind == "NUMTEXT") {
        let text = row.raw("text");
        let number = JsNumber::from_text(text).unwrap_or_else(|| panic!("{}", row.line));
        assert_eq!(number.text(), text);
        n += 1;
    }
    assert_eq!(n, 323);
}

#[test]
fn only_the_string_of_its_value_is_accepted_as_number_text() {
    let mut n = 0;
    for row in rows("jsvalue.hbp").iter().filter(|r| r.kind == "FROMTEXT") {
        let text = row.text("text");
        let number = JsNumber::from_text(&text);
        assert_eq!(
            number.is_some(),
            row.raw("canonical") == "1",
            "{}",
            row.line
        );
        if let Some(number) = number {
            assert_eq!(number.text(), text);
        }
        n += 1;
    }
    assert_eq!(n, 553);
}
