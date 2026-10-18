//! The three pure functions of ACER `tools/behcs/gnn-dispatch-bridge.mjs` (sha256 `21e06399…`,
//! vendored at `acer/Asolaria/tools/behcs/`): `stablePredictionId` (:206-209),
//! `resolvePredictionPid` (:211-221) and `classifyTier` (:223-233), and the row emitter of
//! `docs/handoffs/p4-sidecar-lanes-2026-10-18/bridge_golden.mjs` (sha256 `876d9af9…`), on
//! JavaScript values. Nothing here posts to the bus, fires, or reads a file.

mod json;
mod number;

pub use json::{
    js_string, or, parse, stringify, to_utf8_lossy, truthy, JsError, JsString, Json, ParseError,
    MAX_DEPTH,
};

use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;
use core::fmt::Write;

use sha2::{Digest, Sha256};

use crate::identity::{sha16, sha256hex};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tier {
    T1 = 0,
    T2 = 1,
    T3 = 2,
}

impl Tier {
    pub fn as_str(self) -> &'static str {
        match self {
            Tier::T1 => "T1",
            Tier::T2 => "T2",
            Tier::T3 => "T3",
        }
    }
}

const T3_WORDS: [&str; 6] = ["push", "force", "sovereignty", "kernel", "wipe", "destruct"];
const T2_WORDS: [&str; 7] = [
    "peer",
    "bilateral",
    "sign",
    "migrate",
    "daemon",
    "dispatch",
    "propose",
];
const T1_WORDS: [&str; 11] = [
    "audit",
    "read",
    "log",
    "scan",
    "hygien",
    "verify",
    "check",
    "loaded",
    "ack",
    "observation",
    "report",
];

fn starts_with_ascii(units: &[u16], at: usize, word: &str) -> bool {
    units
        .get(at..at + word.len())
        .is_some_and(|w| w.iter().copied().eq(word.bytes().map(u16::from)))
}

fn contains(units: &[u16], word: &str) -> bool {
    (0..units.len()).any(|at| starts_with_ascii(units, at, word))
}

/// `/reset.*hard/.test(text)`: `.` is any code unit but `\n`, `\r`, U+2028 and U+2029.
fn reset_then_hard(text: &[u16]) -> bool {
    let mut armed_from: Option<usize> = None;
    for at in 0..text.len() {
        if matches!(text[at], 0x0a | 0x0d | 0x2028 | 0x2029) {
            armed_from = None;
            continue;
        }
        if armed_from.is_some_and(|from| at >= from) && starts_with_ascii(text, at, "hard") {
            return true;
        }
        if armed_from.is_none() && starts_with_ascii(text, at, "reset") {
            armed_from = Some(at + 5);
        }
    }
    false
}

/// `String.prototype.toLowerCase`: the full lowercase mapping of each scalar value; a lone
/// surrogate stays. The context rule for final sigma is not applied; it only chooses between two
/// non-ASCII letters, so it cannot change a match against the ASCII patterns above.
fn to_lower(units: &[u16]) -> JsString {
    let mut out = Vec::with_capacity(units.len());
    for r in char::decode_utf16(units.iter().copied()) {
        match r {
            Ok(c) => {
                for l in c.to_lowercase() {
                    out.extend_from_slice(l.encode_utf16(&mut [0; 2]));
                }
            }
            Err(e) => out.push(e.unpaired_surrogate()),
        }
    }
    out
}

/// `(a || b || "").toLowerCase()`, which throws on a truthy non-string.
fn lowered(v: Option<&Json>) -> Result<JsString, JsError> {
    match v {
        _ if !truthy(v) => Ok(Vec::new()),
        Some(Json::String(s)) => Ok(to_lower(s)),
        _ => Err(JsError::NotAString),
    }
}

/// `stablePredictionId(pred)` (bridge :206-209): `String(pred.id)` when `pred.id` is truthy, else
/// the first 16 hex of sha256(`JSON.stringify(pred || {})`) (`sha(input, 16)`, :48-50).
pub fn stable_prediction_id(pred: &Json) -> Result<JsString, JsError> {
    if let Some(id) = pred.get("id").filter(|id| truthy(Some(id))) {
        return js_string(id);
    }
    let text = if truthy(Some(pred)) {
        stringify(pred)
    } else {
        String::from("{}")
    };
    Ok(sha16(&text).encode_utf16().collect())
}

/// `resolvePredictionPid(pred, predId)` (bridge :211-221): the first of `predicted_target`,
/// `supervisor_pid`, `target_pid`, `pid` that is a string starting with `BH.`, else
/// `BH.GNN.PRED.` + `predId` with each run of `[^A-Za-z0-9]` as `_`, uppercased.
pub fn resolve_prediction_pid(pred: &Json, pred_id: &[u16]) -> JsString {
    for key in ["predicted_target", "supervisor_pid", "target_pid", "pid"] {
        if let Some(Json::String(s)) = pred.get(key) {
            if starts_with_ascii(s, 0, "BH.") {
                return s.clone();
            }
        }
    }
    let mut out: JsString = "BH.GNN.PRED.".encode_utf16().collect();
    let mut in_run = false;
    for &u in pred_id {
        match u8::try_from(u) {
            Ok(c) if c.is_ascii_alphanumeric() => {
                out.push(u16::from(c.to_ascii_uppercase()));
                in_run = false;
            }
            _ => {
                if !in_run {
                    out.push(u16::from(b'_'));
                }
                in_run = true;
            }
        }
    }
    out
}

/// `classifyTier(pred)` (bridge :223-233). `Err` where node throws a TypeError: a truthy verb or
/// target that is not a string has no `toLowerCase`.
pub fn classify_tier(pred: &Json) -> Result<Tier, JsError> {
    let mut text = lowered(or(pred.get("predicted_verb"), pred.get("verb")))?;
    let target = lowered(or(pred.get("predicted_target"), pred.get("target")))?;
    text.push(u16::from(b' '));
    text.extend(target);
    if T3_WORDS.iter().any(|w| contains(&text, w)) || reset_then_hard(&text) {
        return Ok(Tier::T3);
    }
    if let Some(Json::String(hint)) = pred.get("tier_hint") {
        for tier in [Tier::T1, Tier::T2, Tier::T3] {
            if hint.iter().copied().eq(tier.as_str().encode_utf16()) {
                return Ok(tier);
            }
        }
    }
    if T2_WORDS.iter().any(|w| contains(&text, w)) {
        return Ok(Tier::T2);
    }
    if T1_WORDS.iter().any(|w| contains(&text, w)) {
        return Ok(Tier::T1);
    }
    Ok(Tier::T2)
}

/// The header's `bridge=` value in `bridge_golden.mjs` (a literal there).
pub const GOLDEN_BRIDGE_LABEL: &str = "tools/behcs/gnn-dispatch-bridge.mjs";
/// The predictions path `bridge_golden.mjs` reads on ACER; the header carries it with `|` as `_`.
pub const GOLDEN_PREDICTIONS_LABEL: &str =
    "C:/Users/acer/Asolaria/data/behcs/gnn-predictions.ndjson";

/// An emitted golden file and its counts.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GoldenRows {
    /// Header, one row per parsed prediction, footer; each line ends in `\n`.
    pub text: String,
    /// Non-blank lines (`rows=` of the header, unparseable ones included).
    pub rows: usize,
    pub unparseable: usize,
    /// Rows per tier, `[T1, T2, T3]`.
    pub tiers: [usize; 3],
}

/// Where node would stop with no file written, or where this port refuses a line node parses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EmitError {
    Row { i: usize, error: JsError },
    TooDeep { i: usize },
}

/// JavaScript `String.prototype.trim` removes exactly these.
fn js_trimmed(c: char) -> bool {
    matches!(
        c,
        '\u{9}'..='\u{d}'
            | ' '
            | '\u{a0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200a}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202f}'
            | '\u{205f}'
            | '\u{3000}'
            | '\u{feff}'
    )
}

/// `clean(v)` of `bridge_golden.mjs` on a string: `|`, `\r`, `\n`, `\t` to `_`, then the first
/// 160 UTF-16 units (a split pair leaves a lone surrogate, written as U+FFFD).
fn clean(units: &[u16]) -> String {
    let mut s: JsString = units.iter().take(160).copied().collect();
    for u in &mut s {
        if matches!(*u, 0x7c | 0x0d | 0x0a | 0x09) {
            *u = u16::from(b'_');
        }
    }
    to_utf8_lossy(&s)
}

/// `clean(v)` on any value: `String(v ?? "")` first.
fn clean_value(v: Option<&Json>) -> Result<String, JsError> {
    match v {
        None | Some(Json::Null) => Ok(String::new()),
        Some(v) => js_string(v).map(|s| clean(&s)),
    }
}

fn sha256_bytes(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(64);
    for b in Sha256::digest(bytes) {
        let _ = write!(out, "{b:02x}");
    }
    out
}

/// The file `bridge_golden.mjs` writes, from the bridge's bytes and the predictions ledger's raw
/// bytes, with the header's two path labels as arguments (`GOLDEN_*_LABEL` reproduce the golden).
pub fn golden_rows(
    bridge: &[u8],
    predictions: &[u8],
    bridge_label: &str,
    predictions_label: &str,
) -> Result<GoldenRows, EmitError> {
    let text = String::from_utf8_lossy(predictions);
    let mut lines: Vec<String> = Vec::new();
    let (mut rows, mut unparseable, mut tiers) = (0, 0, [0; 3]);
    for line in text.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        if line.chars().all(js_trimmed) {
            continue;
        }
        let i = rows;
        rows += 1;
        let p = match parse(line) {
            Ok(p) if truthy(Some(&p)) => p,
            Ok(_) | Err(ParseError::Syntax) => {
                unparseable += 1;
                continue;
            }
            Err(ParseError::TooDeep) => return Err(EmitError::TooDeep { i }),
        };
        let at_row = |error| EmitError::Row { i, error };
        let id = stable_prediction_id(&p).map_err(at_row)?;
        let tier = classify_tier(&p).map_err(at_row)?;
        let pid = resolve_prediction_pid(&p, &id);
        tiers[tier as usize] += 1;
        let verb = clean_value(or(p.get("predicted_verb"), p.get("verb"))).map_err(at_row)?;
        let target = clean_value(or(p.get("predicted_target"), p.get("target"))).map_err(at_row)?;
        lines.push(format!(
            "BRIDGEGOLD|i={i}|pred_id={}|tier={}|prediction_pid={}|verb={verb}|target={target}|json=0",
            clean(&id),
            tier.as_str(),
            clean(&pid)
        ));
    }
    lines.insert(
        0,
        format!(
            "BRIDGEGOLDHDR|bridge={bridge_label}|bridge_sha256={}|predictions={}|pred_sha256={}|rows={rows}|unparseable={unparseable}|T1={}|T2={}|T3={}|fns=stablePredictionId+classifyTier+resolvePredictionPid|bus_posts=0|fire=0|json=0",
            sha256_bytes(bridge),
            predictions_label.replace('|', "_"),
            sha256_bytes(predictions),
            tiers[0],
            tiers[1],
            tiers[2]
        ),
    );
    let footer = format!(
        "BRIDGEGOLDFTR|rows_sha256={}|parity_rule=host8_port_must_emit_identical_pred_id+tier+prediction_pid_per_row_before_node_retire|json=0",
        sha256hex(&lines.join("\n"))
    );
    lines.push(footer);
    let mut text = lines.join("\n");
    text.push('\n');
    Ok(GoldenRows {
        text,
        rows,
        unparseable,
        tiers,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn js(text: &str) -> JsString {
        text.encode_utf16().collect()
    }

    fn id_of(text: &str) -> Result<String, JsError> {
        stable_prediction_id(&parse(text).expect("parses")).map(|id| to_utf8_lossy(&id))
    }

    fn tier_of(text: &str) -> Result<Tier, JsError> {
        classify_tier(&parse(text).expect("parses"))
    }

    // Expected values in these tests are the real bridge's (node 22.22.0, bridge sha256 21e06399…).

    #[test]
    fn stable_prediction_id_takes_a_truthy_id_through_string() {
        assert_eq!(id_of(r#"{"id":"abc"}"#).unwrap(), "abc");
        assert_eq!(id_of(r#"{"id":42}"#).unwrap(), "42");
        assert_eq!(id_of(r#"{"id":1e21}"#).unwrap(), "1e+21");
        assert_eq!(id_of(r#"{"id":-1e-7}"#).unwrap(), "-1e-7");
        assert_eq!(id_of(r#"{"id":true}"#).unwrap(), "true");
        assert_eq!(id_of(r#"{"id":{"a":1}}"#).unwrap(), "[object Object]");
        assert_eq!(id_of(r#"{"id":[1,null,"x"]}"#).unwrap(), "1,,x");
        assert_eq!(id_of(r#"{"id":"a","id":"b"}"#).unwrap(), "b");
        assert_eq!(id_of(r#"{"id":{"toString":1}}"#), Err(JsError::ToPrimitive));
    }

    #[test]
    fn stable_prediction_id_hashes_json_stringify_without_a_truthy_id() {
        for (text, id) in [
            (r#"{"id":"","x":1}"#, "d079b6b6231358f5"),
            (r#"{"id":0,"x":1}"#, "1f31fbafcbef9df3"),
            (r#"{"id":false}"#, "c08cdac2bfd0231a"),
            (r#"{"id":null}"#, "185486091df0b98c"),
            ("{}", "44136fa355b3678a"),
            ("null", "44136fa355b3678a"),
            ("0", "44136fa355b3678a"),
            (r#""str""#, "72495b0e1f3c6c96"),
            ("5", "ef2d127de37b942b"),
            ("[1,2]", "49a64717d5d4cb19"),
            ("true", "b5bea41b6c623f7c"),
            (r#"{"b":1,"2":3,"1":4,"b":5}"#, "c1b7e783e2664f30"),
            (r#"{"s":"\ud800\u2028é"}"#, "a7a2cd60305b4b47"),
        ] {
            assert_eq!(id_of(text).unwrap(), id, "{text}");
        }
    }

    #[test]
    fn resolve_prediction_pid_prefers_bh_strings_in_order() {
        let pred = parse(
            r#"{"predicted_target":"bh.x","supervisor_pid":5,"target_pid":"BH.T","pid":"BH.P"}"#,
        )
        .unwrap();
        assert_eq!(resolve_prediction_pid(&pred, &js("z")), js("BH.T"));
        let bare = parse(r#"{"predicted_target":"BH."}"#).unwrap();
        assert_eq!(resolve_prediction_pid(&bare, &js("z")), js("BH."));
        let lone = parse(r#"{"pid":"BH.\ud800"}"#).unwrap();
        assert_eq!(
            resolve_prediction_pid(&lone, &js("z")),
            alloc::vec![0x42, 0x48, 0x2e, 0xd800]
        );
    }

    #[test]
    fn resolve_prediction_pid_falls_back_to_the_sanitized_id() {
        let empty = Json::Object(Vec::new());
        assert_eq!(
            resolve_prediction_pid(&empty, &js("ab--c d.e_f\u{20ac}g\u{1f600}h")),
            js("BH.GNN.PRED.AB_C_D_E_F_G_H")
        );
        assert_eq!(
            resolve_prediction_pid(&empty, &js("-x-")),
            js("BH.GNN.PRED._X_")
        );
        assert_eq!(
            resolve_prediction_pid(&empty, &[0xdc00, 0x61]),
            js("BH.GNN.PRED._A")
        );
        assert_eq!(
            resolve_prediction_pid(&Json::Null, &js("1e+21")),
            js("BH.GNN.PRED.1E_21")
        );
    }

    #[test]
    fn classify_tier_matches_the_bridge() {
        for (text, tier) in [
            (r#"{"verb":"PUSH"}"#, Tier::T3),
            (r#"{"verb":"reset","target":"HARD"}"#, Tier::T3),
            (r#"{"verb":"reset\n","target":"hard"}"#, Tier::T2),
            (r#"{"verb":"reset\u2028x","target":"hard"}"#, Tier::T2),
            (r#"{"verb":"reset\u00a0x","target":"hard"}"#, Tier::T3),
            (r#"{"verb":"daemon","tier_hint":"T1"}"#, Tier::T1),
            (r#"{"verb":"wipe","tier_hint":"T1"}"#, Tier::T3),
            (r#"{"verb":"daemon","tier_hint":"t1"}"#, Tier::T2),
            (r#"{"verb":"x","tier_hint":"T3"}"#, Tier::T3),
            (r#"{"verb":"design"}"#, Tier::T2),
            (r#"{"verb":"thread"}"#, Tier::T1),
            (r#"{"verb":"zzz"}"#, Tier::T2),
            (r#"{"predicted_verb":"","verb":"Audit"}"#, Tier::T1),
            (r#"{"predicted_verb":0,"verb":"report"}"#, Tier::T1),
            (r#"{"predicted_verb":"x","verb":"report"}"#, Tier::T2),
            (r#"{"verb":"\u212aernel"}"#, Tier::T3),
            (r#"{"verb":"\u0130"}"#, Tier::T2),
            (r#"{"verb":"x","target":"Sovereignty"}"#, Tier::T3),
            (r#"{"predicted_target":"","target":"scan"}"#, Tier::T1),
            (r#"{"verb":0}"#, Tier::T2),
            (r#"{"verb":false,"target":null}"#, Tier::T2),
            (r#"{"verb":"\u212a"}"#, Tier::T2),
            (r#"{"verb":"LOG"}"#, Tier::T1),
            (r#"{"predicted_verb":"re","verb":"set hard"}"#, Tier::T2),
            ("[]", Tier::T2),
            ("null", Tier::T2),
        ] {
            assert_eq!(tier_of(text), Ok(tier), "{text}");
        }
    }

    #[test]
    fn classify_tier_errs_where_node_throws() {
        for text in [
            r#"{"verb":5}"#,
            r#"{"predicted_target":["a"]}"#,
            r#"{"verb":{}}"#,
            r#"{"target":true}"#,
        ] {
            assert_eq!(tier_of(text), Err(JsError::NotAString), "{text}");
        }
    }

    #[test]
    fn only_u0130_and_u212a_lowercase_into_ascii() {
        // Measured in node 22.22.0 over every code point; the tier patterns are ASCII, so these
        // two are the only non-ASCII letters that can change a tier.
        let hits: Vec<u32> = (0x80..=0x10ffff)
            .filter_map(char::from_u32)
            .filter(|c| c.to_lowercase().any(|l| l.is_ascii()))
            .map(u32::from)
            .collect();
        assert_eq!(hits, [0x130, 0x212a]);
        assert_eq!(to_lower(&js("\u{130}\u{212a}A")), js("i\u{307}ka"));
    }

    #[test]
    fn js_trim_set_matches_node() {
        let trimmed: Vec<u32> = (0..=0xffff)
            .filter_map(char::from_u32)
            .filter(|&c| js_trimmed(c))
            .map(u32::from)
            .collect();
        assert_eq!(
            trimmed,
            [
                0x9, 0xa, 0xb, 0xc, 0xd, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003,
                0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f,
                0x205f, 0x3000, 0xfeff
            ]
        );
    }

    #[test]
    fn utf8_decoding_matches_node_buffer_to_string() {
        let raw = [
            0xef, 0xbb, 0xbf, 0x61, 0xff, 0x62, 0xe2, 0x82, 0x63, 0xf0, 0x9f, 0x98, 0xed, 0xa0,
            0x80, 0xc0, 0xaf, 0xf4, 0x90, 0x80, 0x80,
        ];
        let mut expected = String::from("\u{feff}a\u{fffd}b\u{fffd}c");
        expected.extend(core::iter::repeat('\u{fffd}').take(10));
        assert_eq!(String::from_utf8_lossy(&raw), expected);
    }

    #[test]
    fn clean_replaces_separators_and_cuts_at_160_units() {
        assert_eq!(clean(&js("a|b\tc\rd\ne")), "a_b_c_d_e");
        let mut long = js(&"x".repeat(159));
        long.extend(js("\u{1f600}tail"));
        let out = clean(&long);
        assert_eq!(out.chars().count(), 160);
        assert!(out.ends_with('\u{fffd}'));
        assert_eq!(clean_value(None), Ok(String::new()));
        assert_eq!(clean_value(Some(&Json::Null)), Ok(String::new()));
        assert_eq!(
            clean_value(Some(&Json::Bool(false))),
            Ok(String::from("false"))
        );
        assert_eq!(
            clean_value(Some(&Json::Number(1 << 63))),
            Ok(String::from("0"))
        );
    }

    #[test]
    fn empty_ledger_gives_header_and_footer_only() {
        // node bridge_golden.mjs with a missing ledger reads zero bytes.
        let out = golden_rows(b"", b"", GOLDEN_BRIDGE_LABEL, GOLDEN_PREDICTIONS_LABEL).unwrap();
        let empty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let header = format!("BRIDGEGOLDHDR|bridge=tools/behcs/gnn-dispatch-bridge.mjs|bridge_sha256={empty}|predictions=C:/Users/acer/Asolaria/data/behcs/gnn-predictions.ndjson|pred_sha256={empty}|rows=0|unparseable=0|T1=0|T2=0|T3=0|fns=stablePredictionId+classifyTier+resolvePredictionPid|bus_posts=0|fire=0|json=0");
        assert_eq!(
            out.text,
            format!(
                "{header}\nBRIDGEGOLDFTR|rows_sha256={}|parity_rule=host8_port_must_emit_identical_pred_id+tier+prediction_pid_per_row_before_node_retire|json=0\n",
                sha256hex(&header)
            )
        );
        assert_eq!((out.rows, out.unparseable, out.tiers), (0, 0, [0; 3]));
    }

    #[test]
    fn emitter_counts_blank_falsy_and_bad_lines_like_node() {
        // Expected: node bridge_golden.mjs on these bytes with the predictions label `p|q`.
        let bridge = include_bytes!("../../acer/Asolaria/tools/behcs/gnn-dispatch-bridge.mjs");
        let ledger =
            "\n  \r\n\u{3000}\nnull\n0\n\"\"\n1e-400\n{bad}\n\u{feff}{}\n{\"verb\":\"read\"}\r\n";
        let out = golden_rows(bridge, ledger.as_bytes(), GOLDEN_BRIDGE_LABEL, "p|q").unwrap();
        assert_eq!((out.rows, out.unparseable, out.tiers), (7, 6, [1, 0, 0]));
        assert_eq!(
            out.text,
            "BRIDGEGOLDHDR|bridge=tools/behcs/gnn-dispatch-bridge.mjs|bridge_sha256=21e063994b6f812ea0e43d158261fd76e6cdc446fa4db2da0d52a9bf12b13c65|predictions=p_q|pred_sha256=d224d32950cc9a2f8f99b23af8f1269c331a1503adb20a25212d49d3db84cb60|rows=7|unparseable=6|T1=1|T2=0|T3=0|fns=stablePredictionId+classifyTier+resolvePredictionPid|bus_posts=0|fire=0|json=0\n\
             BRIDGEGOLD|i=6|pred_id=d25376ad071f5fe3|tier=T1|prediction_pid=BH.GNN.PRED.D25376AD071F5FE3|verb=read|target=|json=0\n\
             BRIDGEGOLDFTR|rows_sha256=042a860561078a35dd9c03cfe04c9d12fa0f9465bcbe68f50cafdc885fc80ffd|parity_rule=host8_port_must_emit_identical_pred_id+tier+prediction_pid_per_row_before_node_retire|json=0\n"
        );
    }

    #[test]
    fn emitter_stops_where_node_throws() {
        let ledger = "{\"id\":\"a\"}\n{\"id\":\"b\",\"verb\":7}\n";
        assert_eq!(
            golden_rows(b"", ledger.as_bytes(), "", ""),
            Err(EmitError::Row {
                i: 1,
                error: JsError::NotAString
            })
        );
        let deep = alloc::format!(
            "{}{}\n",
            "[".repeat(MAX_DEPTH + 1),
            "]".repeat(MAX_DEPTH + 1)
        );
        assert_eq!(
            golden_rows(b"", deep.as_bytes(), "", ""),
            Err(EmitError::TooDeep { i: 0 })
        );
    }
}
