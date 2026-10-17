//! Shared parity fixtures: the same literals live in `referee/hbp_referee.py` and in the cold-lane
//! upstream-JS measurement recorded in `tests/expected/upstream-js.hbp`.

use std::collections::BTreeMap;

use hbp::hbp::{write_hbp, Envelope, Value};
use hbp::relay::{build_row, Fields, GENESIS};

fn s(x: &str) -> Value {
    Value::Str(x.to_string())
}

fn obj(pairs: &[(&str, Value)]) -> BTreeMap<String, Value> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect()
}

/// (destination name, envelope) for every trinity fixture.
pub fn trinity_fixtures() -> Vec<(&'static str, Envelope)> {
    let mut out = Vec::new();

    // fix1: string payload + 2-of-47 tuple + out-of-order metadata keys.
    let mut e = Envelope::new();
    e.tuple_tag = Some(vec!["alpha".to_string(), "beta".to_string()]);
    e.payload = Some(s("hello world"));
    e.metadata = Some(obj(&[("z", s("last")), ("a", s("first"))]));
    out.push(("fix1", e));

    // fix2: object payload + array metadata value (canonical_stringify).
    let mut e = Envelope::new();
    e.r#type = "event".to_string();
    e.payload = Some(Value::Obj(obj(&[
        ("a", Value::Int(1)),
        ("b", Value::Int(2)),
    ])));
    e.metadata = Some(obj(&[(
        "k",
        Value::Arr(vec![s("x"), Value::Int(3), Value::Bool(true), Value::Null]),
    )]));
    out.push(("fix2", e));

    // fix3: object payload whose string needs JSON escaping.
    let mut e = Envelope::new();
    e.payload = Some(Value::Obj(obj(&[("msg", s("a\"b\nc\tD"))])));
    out.push(("fix3", e));

    // sortkeys: U+FF61 vs U+1F600 keys; JS sort() orders by UTF-16 code units.
    let mut e = Envelope::new();
    e.payload = Some(Value::Obj(obj(&[
        ("\u{FF61}", Value::Int(1)),
        ("\u{1F600}", Value::Int(2)),
    ])));
    e.metadata = Some(obj(&[("\u{FF61}", s("a")), ("\u{1F600}", s("b"))]));
    out.push(("sortkeys", e));

    // nullpayload: `payload != null` is false for null, so no [payload] block.
    let mut e = Envelope::new();
    e.payload = Some(Value::Null);
    e.metadata = Some(obj(&[("k", s("v"))]));
    out.push(("nullpayload", e));

    // base: the packet the verify variants start from.
    let mut e = Envelope::new();
    e.tuple_tag = Some(vec!["a".to_string()]);
    e.payload = Some(s("hello"));
    e.metadata = Some(obj(&[("k", s("v"))]));
    out.push(("base", e));

    // Destination names that contain the .hbi field names.
    let mut e = Envelope::new();
    e.payload = Some(s("p"));
    out.push(("x-bytes=v", e.clone()));
    out.push(("x-sha256=q", e));

    out
}

/// Writes every trinity fixture into `dir`; returns (name, sha256) per fixture.
pub fn emit_trinity(dir: &str) -> Vec<(String, String)> {
    std::fs::create_dir_all(dir).unwrap();
    trinity_fixtures()
        .into_iter()
        .map(|(name, env)| {
            let r = write_hbp(&format!("{dir}/{name}"), &env).unwrap();
            (name.to_string(), r.sha)
        })
        .collect()
}

/// One edit to one sidecar of a variant.
enum Edit {
    None,
    Prefix(Vec<u8>),
    Append(Vec<u8>),
    Replace(Vec<u8>),
    ReplaceFirst(Vec<u8>, Vec<u8>),
    Remove,
}

fn arabic_indic(n: usize) -> String {
    n.to_string()
        .chars()
        .map(|d| char::from_u32(0x0660 + d.to_digit(10).unwrap()).unwrap())
        .collect()
}

/// (variant dir, packet name, sidecar extension, edit) — one row per sidecar class measured.
fn variant_table(
    base_bytes: usize,
    base_sha: &str,
) -> Vec<(&'static str, &'static str, &'static str, Edit)> {
    let bom = b"\xef\xbb\xbf".to_vec();
    vec![
        ("v00_clean", "base", "hbp", Edit::None),
        (
            "v01_hex_odd_nibble",
            "base",
            "hex",
            Edit::Append(b"0".to_vec()),
        ),
        (
            "v02_hex_trailing_zz",
            "base",
            "hex",
            Edit::Append(b"zz\n".to_vec()),
        ),
        (
            "v03_sha_invalid_utf8",
            "base",
            "sha256",
            Edit::Prefix(vec![0xff]),
        ),
        ("v04_sha_bom", "base", "sha256", Edit::Prefix(bom.clone())),
        (
            "v05_sha_nel_sep",
            "base",
            "sha256",
            Edit::ReplaceFirst(b"  ".to_vec(), "\u{85}".as_bytes().to_vec()),
        ),
        (
            "v06_hbi_upper_suffix",
            "base",
            "hbi",
            Edit::ReplaceFirst(b"\ntype=".to_vec(), b"ABC\ntype=".to_vec()),
        ),
        (
            "v07_hbi_garbage_binary",
            "base",
            "hbi",
            Edit::Replace(vec![0xff, 0xfe]),
        ),
        (
            "v08_hex_garbage_binary",
            "base",
            "hex",
            Edit::Replace(vec![0xff]),
        ),
        (
            "v09_sha_astral_declared",
            "base",
            "sha256",
            Edit::ReplaceFirst(
                base_sha.as_bytes().to_vec(),
                "\u{1F600}".repeat(20).into_bytes(),
            ),
        ),
        (
            "v10_hbi_decoy_line",
            "base",
            "hbi",
            Edit::Prefix(b"xsha256=zz\n".to_vec()),
        ),
        ("v11_hex_bom", "base", "hex", Edit::Prefix(bom)),
        ("v12_sha_empty", "base", "sha256", Edit::Replace(Vec::new())),
        (
            "v13_hbi_arabic_digits",
            "base",
            "hbi",
            Edit::ReplaceFirst(
                format!("bytes={base_bytes}").into_bytes(),
                format!("bytes={}", arabic_indic(base_bytes)).into_bytes(),
            ),
        ),
        ("v14_name_bytes", "x-bytes=v", "hbp", Edit::None),
        ("v15_name_sha", "x-sha256=q", "hbp", Edit::None),
        (
            "v16_hex_low_byte",
            "base",
            "hex",
            Edit::ReplaceFirst(b"2".to_vec(), "\u{132}".as_bytes().to_vec()),
        ),
        ("v17_hex_absent", "base", "hex", Edit::Remove),
    ]
}

fn apply(data: Vec<u8>, edit: &Edit) -> Option<Vec<u8>> {
    Some(match edit {
        Edit::None => data,
        Edit::Prefix(p) => [p.as_slice(), &data].concat(),
        Edit::Append(a) => [data.as_slice(), a].concat(),
        Edit::Replace(r) => r.clone(),
        Edit::ReplaceFirst(from, to) => {
            let at = data
                .windows(from.len())
                .position(|w| w == from.as_slice())
                .expect("variant edit anchor present");
            [&data[..at], to.as_slice(), &data[at + from.len()..]].concat()
        }
        Edit::Remove => return None,
    })
}

/// Builds every verify variant under `out` from the trinity fixtures already written to
/// `trinity_dir`; returns the `.hbp` path of each variant, labelled `<variant>/<name>.hbp`.
pub fn build_variants(trinity_dir: &str, out: &str) -> Vec<(String, String)> {
    let base = std::fs::read(format!("{trinity_dir}/base.hbp")).unwrap();
    let base_sha = hbp::sha256_hex(&base);
    let mut paths = Vec::new();
    for (dir, name, ext, edit) in variant_table(base.len(), &base_sha) {
        let vdir = format!("{out}/{dir}");
        std::fs::create_dir_all(&vdir).unwrap();
        for e in ["hbp", "hbi", "sha256", "hex"] {
            let data = std::fs::read(format!("{trinity_dir}/{name}.{e}")).unwrap();
            let data = if e == ext {
                apply(data, &edit)
            } else {
                Some(data)
            };
            if let Some(data) = data {
                std::fs::write(format!("{vdir}/{name}.{e}"), data).unwrap();
            }
        }
        paths.push((format!("{dir}/{name}.hbp"), format!("{vdir}/{name}.hbp")));
    }
    paths
}

/// The two RELAY fixture rows.
pub fn relay_fixture_rows() -> Vec<String> {
    let ts = "2026-06-21T00:00:00Z";
    let mk = |verb: &str, seq: &str, pid: &str, psha: &str, len: &str| -> Fields {
        [
            ("v", "1"),
            ("from", "acer"),
            ("to", "liris"),
            ("verb", verb),
            ("seq", seq),
            ("ts", ts),
            ("pid", pid),
            ("payload_sha256", psha),
            ("hbi_off", "0"),
            ("len", len),
            ("antecedent", GENESIS),
        ]
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
    };
    let r1 = mk("NOTE", "1", "BH.RELAY.acer.1", &"aa".repeat(32), "0");
    let r2 = mk("STATUS", "2", "BH.RELAY.acer.2", &"bb".repeat(32), "11");
    vec![build_row(&r1).unwrap(), build_row(&r2).unwrap()]
}
