use std::collections::BTreeMap;

use hbp::hbp::{serialize_envelope, write_hbp, Envelope, Value};
use hbp::reader::{detect_format, parse_pipe_row, verify_hbp, PipeRow, VerifyResult};
use hbp::relay::{
    build_row, class_of, clean, parse_row, row_hash_ok, row_prefix, sha16, sig_preimage, Fields,
    GENESIS,
};
use hbp::sha256_hex;

mod common;

fn tmp(sub: &str) -> String {
    let d = std::env::temp_dir().join(format!("hbp-test-{sub}"));
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d.to_string_lossy().into_owned()
}

fn string_payload_env() -> Envelope {
    let mut e = Envelope::new();
    e.tuple_tag = Some(vec!["alpha".to_string(), "beta".to_string()]);
    e.payload = Some(Value::Str("hello world".to_string()));
    let mut m = BTreeMap::new();
    m.insert("z".to_string(), Value::Str("last".to_string()));
    m.insert("a".to_string(), Value::Str("first".to_string()));
    e.metadata = Some(m);
    e
}

#[test]
fn serialize_shape_matches_spec() {
    let body = serialize_envelope(&string_payload_env());
    let lines: Vec<&str> = body.split('\n').collect();
    assert_eq!(lines[0], "!HBP-v0 message");
    assert_eq!(lines[1], "type=message");
    assert_eq!(lines[2], "[tuple]");
    assert_eq!(lines[3], "D1=alpha");
    assert_eq!(lines[4], "D2=beta");
    assert_eq!(lines[5], "D3="); // padded to TUPLE_DIMS
                                 // 2 header + 1 [tuple] + 47 D-lines + 1 [payload] + 1 payload + 1 [metadata] + 2 md + end
    let md_idx = lines.iter().position(|l| *l == "[metadata]").unwrap();
    assert_eq!(lines[md_idx + 1], "a=first"); // keys sorted
    assert_eq!(lines[md_idx + 2], "z=last");
    assert_eq!(*lines.last().unwrap(), "!HBP-v0 end");
}

#[test]
fn canonical_stringify_object_payload() {
    let mut e = Envelope::new();
    e.r#type = "event".to_string();
    let mut o = BTreeMap::new();
    o.insert("b".to_string(), Value::Int(2));
    o.insert("a".to_string(), Value::Int(1));
    e.payload = Some(Value::Obj(o));
    let body = serialize_envelope(&e);
    assert!(body.contains("\n[payload]\n{\"a\":1,\"b\":2}\n"));
}

#[test]
fn json_escape_in_object_string() {
    let mut e = Envelope::new();
    let mut o = BTreeMap::new();
    o.insert("msg".to_string(), Value::Str("a\"b\nc\tD".to_string()));
    e.payload = Some(Value::Obj(o));
    let body = serialize_envelope(&e);
    assert!(body.contains(r#"{"msg":"a\"b\nc\tD"}"#));
}

#[test]
fn write_then_verify_ok_and_sidecar_names() {
    let dir = tmp("verify");
    let dest = format!("{dir}/pkt");
    let r = write_hbp(&dest, &string_payload_env()).unwrap();
    assert!(r.hbp.ends_with(".hbp"));
    assert!(r.hbi.ends_with(".hbi"));
    assert!(r.sha256.ends_with(".sha256"));
    assert!(r.hex.ends_with(".hex"));
    // .sha256 line is "<64hex>  pkt.hbp\n"
    let sha_line = std::fs::read_to_string(&r.sha256).unwrap();
    assert_eq!(sha_line, format!("{}  pkt.hbp\n", r.sha));
    let v = verify_hbp(&r.hbp);
    assert_eq!(v.sha_ok, Some(true));
    assert_eq!(v.hex_ok, Some(true));
    assert_eq!(v.hbi_ok, Some(true));
    assert!(v.ok, "errors: {:?}", v.errors);
}

#[test]
fn verify_detects_tamper() {
    let dir = tmp("tamper");
    let dest = format!("{dir}/pkt");
    let r = write_hbp(&dest, &string_payload_env()).unwrap();
    let mut bytes = std::fs::read(&r.hbp).unwrap();
    bytes[0] ^= 0xff;
    std::fs::write(&r.hbp, &bytes).unwrap();
    let v = verify_hbp(&r.hbp);
    assert!(!v.ok);
    assert!(v.errors.iter().any(|e| e.starts_with("sha mismatch")));
}

#[test]
fn verify_missing_hbp() {
    let v = verify_hbp("/no/such/path/x.hbp");
    assert_eq!(v.errors, vec!["hbp missing".to_string()]);
}

#[test]
fn detect_and_parse_pipe() {
    assert_eq!(detect_format("!HBP-v0 message\n"), "hbp-v0-envelope");
    assert_eq!(detect_format("HBPv1|room=a|k=v\n"), "hbpv1-pipe");
    let row = parse_pipe_row("GNN-EDGE|src=a|dst=b|bare");
    assert_eq!(row.tag, "GNN-EDGE");
    assert_eq!(row.fields[0], ("src".to_string(), "a".to_string()));
    assert_eq!(row.fields[2], ("_3".to_string(), "bare".to_string()));
}

// ── relay envelope (the 23-test suite's envelope-level assertions) ───────────
fn relay_fields() -> Fields {
    [
        ("v", "1"),
        ("from", "acer"),
        ("to", "liris"),
        ("verb", "NOTE"),
        ("seq", "1"),
        ("ts", "2026-06-21T00:00:00Z"),
        ("pid", "BH.RELAY.acer.1"),
        ("payload_sha256", "aa"),
        ("hbi_off", "0"),
        ("len", "0"),
        ("antecedent", GENESIS),
    ]
    .iter()
    .map(|(k, v)| (k.to_string(), v.to_string()))
    .collect()
}

#[test]
fn relay_build_parse_roundtrip() {
    let row = build_row(&relay_fields()).unwrap();
    assert!(row.starts_with("RELAY|v=1|from=acer|"));
    assert!(row.contains("|row_hash="));
    let p = parse_row(&row).unwrap();
    assert!(row_hash_ok(&p));
    assert_eq!(p.fields.get("verb").unwrap(), "NOTE");
}

#[test]
fn relay_tamper_breaks_row_hash() {
    let row = build_row(&relay_fields()).unwrap();
    let tampered = row.replacen("verb=NOTE", "verb=EXEC", 1);
    let p = parse_row(&tampered).unwrap();
    assert!(!row_hash_ok(&p)); // t2: READ->EXEC without recomputing row_hash is caught
}

#[test]
fn relay_field_injection_rejected() {
    assert!(clean("verb", "NOTE|row_hash=x|injected").is_err()); // t4a
    let mut f = relay_fields();
    f.insert("antecedent".to_string(), format!("{GENESIS}\nRELAY|fake"));
    assert!(build_row(&f).is_err()); // t4b newline in field
}

#[test]
fn relay_parse_rejects_non_relay_and_bad_order() {
    assert!(parse_row("NOPE|v=1").is_err());
    let good = build_row(&relay_fields()).unwrap();
    let swapped = good.replacen("RELAY|v=1|from=acer", "RELAY|from=acer|v=1", 1);
    assert!(parse_row(&swapped).is_err());
}

#[test]
fn relay_verb_classes() {
    assert_eq!(class_of("NOTE"), "READ");
    assert_eq!(class_of("EXEC"), "ACTION");
    assert_eq!(class_of("HOLD"), "CONTROL");
    assert_eq!(class_of("ZZZ"), "ACTION"); // unknown -> ACTION (fail-closed)
}

#[test]
fn sha16_matches_known_empty() {
    // sha256("") = e3b0c442..., first 16 hex chars
    assert_eq!(sha16(""), "e3b0c44298fc1c14");
}

// ── upstream-JS rows (tests/expected/upstream-js.hbp, measured on the cold lane) ──

const UPSTREAM_JS: &str = include_str!("expected/upstream-js.hbp");

fn rows(tag: &str) -> Vec<PipeRow> {
    UPSTREAM_JS
        .lines()
        .filter(|l| !l.is_empty())
        .map(parse_pipe_row)
        .filter(|r| r.tag == tag)
        .collect()
}

fn field<'a>(row: &'a PipeRow, k: &str) -> &'a str {
    row.fields
        .iter()
        .find(|(fk, _)| fk == k)
        .map(|(_, v)| v.as_str())
        .unwrap_or_else(|| panic!("row {row:?} has no field {k}"))
}

fn hex(b: &[u8]) -> String {
    let mut out = String::with_capacity(b.len() * 2);
    for x in b {
        out.push_str(&format!("{x:02x}"));
    }
    out
}

fn unhex_str(h: &str) -> String {
    let b: Vec<u8> = (0..h.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&h[i..i + 2], 16).unwrap())
        .collect();
    String::from_utf8(b).unwrap()
}

fn tri(o: Option<bool>) -> &'static str {
    match o {
        None => "null",
        Some(true) => "true",
        Some(false) => "false",
    }
}

/// The JS row for one verifyHBP result. `ok` is unset on the hbp-missing early return
/// (hbp-reader.mjs:120), which JS prints as `undefined`; the Rust field is `false` there.
fn verdict(v: &VerifyResult) -> String {
    let ok = if v.errors == ["hbp missing"] {
        "undefined"
    } else if v.ok {
        "true"
    } else {
        "false"
    };
    let errors: Vec<String> = v.errors.iter().map(|e| hex(e.as_bytes())).collect();
    format!(
        "sha_ok={}|hex_ok={}|hbi_ok={}|ok={ok}|errors_hex={}",
        tri(v.sha_ok),
        tri(v.hex_ok),
        tri(v.hbi_ok),
        errors.join(",")
    )
}

fn js_verdict(row: &PipeRow) -> String {
    ["sha_ok", "hex_ok", "hbi_ok", "ok", "errors_hex"]
        .iter()
        .map(|k| format!("{k}={}", field(row, k)))
        .collect::<Vec<_>>()
        .join("|")
}

#[test]
fn emit_matches_upstream_js() {
    let dir = tmp("emit-js");
    let emitted = common::emit_trinity(&dir);
    let expected = rows("EMIT");
    assert_eq!(expected.len(), emitted.len());
    for (name, sha) in &emitted {
        let row = expected.iter().find(|r| field(r, "name") == name).unwrap();
        assert_eq!(field(row, "hbp"), sha, "{name}.hbp");
        let body = std::fs::read(format!("{dir}/{name}.hbp")).unwrap();
        assert_eq!(field(row, "hbp_bytes"), body.len().to_string(), "{name}");
        for ext in ["hbi", "sha256", "hex"] {
            let data = std::fs::read(format!("{dir}/{name}.{ext}")).unwrap();
            assert_eq!(field(row, ext), sha256_hex(&data), "{name}.{ext}");
        }
    }
}

#[test]
fn verify_matches_upstream_js() {
    let dir = tmp("verify-js");
    common::emit_trinity(&format!("{dir}/trinity"));
    let variants = common::build_variants(&format!("{dir}/trinity"), &format!("{dir}/variants"));
    let expected = rows("VERIFY");
    assert_eq!(expected.len(), variants.len() + 1);
    for (label, path) in &variants {
        let row = expected.iter().find(|r| field(r, "case") == label).unwrap();
        assert_eq!(verdict(&verify_hbp(path)), js_verdict(row), "{label}");
    }
    let row = expected
        .iter()
        .find(|r| field(r, "case") == "missing")
        .unwrap();
    let missing = verify_hbp(&format!("{dir}/absent/none.hbp"));
    assert_eq!(verdict(&missing), js_verdict(row));
    assert!(!missing.ok);
}

#[test]
fn detect_matches_upstream_js() {
    let expected = rows("DETECT");
    assert_eq!(expected.len(), 15);
    for row in &expected {
        let text = unhex_str(field(row, "text_hex"));
        assert_eq!(detect_format(&text), field(row, "format"), "{text:?}");
    }
}

#[test]
fn pipe_matches_upstream_js() {
    let expected = rows("PIPE");
    assert_eq!(expected.len(), 12);
    for row in &expected {
        let line = unhex_str(field(row, "line_hex"));
        let p = parse_pipe_row(&line);
        assert_eq!(hex(p.tag.as_bytes()), field(row, "tag_hex"), "{line:?}");
        let fields: Vec<String> = p
            .fields
            .iter()
            .map(|(k, v)| format!("{}:{}", hex(k.as_bytes()), hex(v.as_bytes())))
            .collect();
        assert_eq!(fields.join(","), field(row, "fields_hex"), "{line:?}");
    }
}

#[test]
fn relay_prefix_and_rows_match_upstream_js() {
    let by_case = |c: &str| {
        let r = rows("PREFIX");
        unhex_str(field(
            r.iter().find(|r| field(r, "case") == c).unwrap(),
            "prefix_hex",
        ))
    };
    assert_eq!(row_prefix(&Fields::new()).unwrap(), by_case("empty"));
    let mut f = relay_fields();
    f.insert("from".to_string(), "a".to_string());
    f.insert("to".to_string(), "b".to_string());
    f.insert("ts".to_string(), "t".to_string());
    f.insert("pid".to_string(), "p".to_string());
    assert_eq!(row_prefix(&f).unwrap(), by_case("no-token-sig"));
    assert_eq!(sig_preimage(&Fields::new()), by_case("sig-preimage-empty"));
    let expected: Vec<String> = rows("RELAYROW")
        .iter()
        .map(|r| unhex_str(field(r, "row_hex")))
        .collect();
    assert_eq!(common::relay_fixture_rows(), expected);
}
