//! Deterministic fixture over the vendored upstream Fischer library.
//!
//! Reads one HBP field line per case (same field syntax the host8 `--eval` route
//! parses, `vendor/.../fischer-eval/src/main.rs:189-230,232-248`) and emits, per
//! case, the `evaluate` result and the fixed-timestamp `render_row` so a referee
//! can compare byte-for-byte without a live clock. This file is new to aether; it
//! calls only the vendored upstream surface and sets no new behaviour.
//!
//! Stream: `<idx>\tROW\t<row>` and `<idx>\tEVAL\t<key=value>\t...`, where `%`, TAB, LF
//! and CR inside a value are framed as %25 %09 %0A %0D (`referee/prove_upstream.py`
//! reverses it). Lines are skipped when blank after `trim` or starting with `#`; the
//! referee applies the same rule (`fischer_referee.is_skipped`).

#![forbid(unsafe_code)]

use std::collections::BTreeMap;
use std::io::{self, BufRead, Write};

use asolaria_server_fischer_eval::{
    evaluate, parse_bool, parse_decimal_q_exact, parse_q_strict, render_row, FischerEnvelope,
    FischerScore,
};

const FIXED_TS: &str = "2026-06-24T00:00:00Z";

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    for (idx, line) in stdin.lock().lines().enumerate() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if line.trim().is_empty() || line.starts_with('#') {
            continue;
        }
        let (envelope, score, strict, prev_hash) = fields_to_eval(&parse_input_fields(&line));
        let eval = evaluate(&envelope, &score, strict);
        let row = render_row(&eval, &prev_hash, FIXED_TS);
        let dump: [(&str, String); 18] = [
            ("verdict", eval.verdict.as_str().to_string()),
            ("cpl", eval.cpl.to_string()),
            ("flags", eval.flags.join(",")),
            ("king_safety_q", eval.axes.king_safety_q.to_string()),
            ("center_gain_q", eval.axes.center_gain_q.to_string()),
            ("proof_gain_q", eval.axes.proof_gain_q.to_string()),
            ("authority_debt", eval.axes.authority_debt.to_string()),
            ("best_alt", eval.best_alt.to_string()),
            ("candidate_count", eval.candidate_count.to_string()),
            ("glyph", eval.glyph.to_string()),
            ("voxel_coord", eval.voxel_coord.clone()),
            ("g4_state", eval.g4_state.clone()),
            ("pid", eval.pid.clone()),
            ("move", eval.move_name.clone()),
            ("pass", eval.pass.to_string()),
            ("promoted", eval.promoted.to_string()),
            ("l0_real", eval.l0_real.to_string()),
            ("composite", eval.composite.clone()),
        ];
        let dump: Vec<String> = dump
            .iter()
            .map(|(key, value)| format!("{}={}", key, frame(value)))
            .collect();
        let _ = writeln!(out, "{}\tROW\t{}", idx, frame(row.trim_end_matches('\n')));
        let _ = writeln!(out, "{}\tEVAL\t{}", idx, dump.join("\t"));
    }
}

fn frame(s: &str) -> String {
    s.replace('%', "%25")
        .replace('\t', "%09")
        .replace('\n', "%0A")
        .replace('\r', "%0D")
}

// Mirrors vendor/.../fischer-eval/src/main.rs:232-248 (parse_input_fields).
fn parse_input_fields(input: &str) -> BTreeMap<String, String> {
    let mut fields = BTreeMap::new();
    let cleaned = input.trim();
    let sep = if cleaned.contains('|') { '|' } else { '&' };
    for (idx, part) in cleaned.split(sep).enumerate() {
        if idx == 0 && sep == '|' && !part.contains('=') {
            fields.insert("kind".to_string(), part.to_string());
            continue;
        }
        let (key, value) = part.split_once('=').unwrap_or((part, ""));
        if key.is_empty() {
            continue;
        }
        fields.insert(key.to_string(), percent_decode(value));
    }
    fields
}

// Mirrors vendor/.../fischer-eval/src/main.rs:189-230 (fields_to_eval), including the
// `pid -> bh -> default` fallback at :193-195 and the integer/decimal shannon path at :216-219.
fn fields_to_eval(
    fields: &BTreeMap<String, String>,
) -> (FischerEnvelope, FischerScore, bool, String) {
    let mut env = FischerEnvelope::default();
    env.pid = opt_nonempty(fields, "pid")
        .or_else(|| opt_nonempty(fields, "bh"))
        .or(env.pid);
    env.actor = val(fields, "actor", &env.actor);
    env.verb = val_alias(fields, &["verb", "move"], &env.verb);
    env.target = val(fields, "target", &env.target);
    env.payload = val_alias(fields, &["payload", "content"], &env.payload);
    env.payload_json_true = parse_bool(opt_str_alias(fields, &["payload_json", "json"]).as_deref());
    env.hbp_path = opt_nonempty(fields, "hbp_path");
    env.sidecar_plan = opt_nonempty(fields, "sidecar_plan");
    env.ledger_path = opt_nonempty(fields, "ledger_path");
    env.tuple = opt_nonempty(fields, "tuple");
    env.cube_47d = opt_nonempty(fields, "cube_47d");
    env.cosign = opt_nonempty(fields, "cosign");
    env.halt_path = opt_nonempty(fields, "halt_path");
    env.authority_jump = parse_bool(opt_str(fields, "authority_jump").as_deref());
    env.recursive_consent = parse_bool(opt_str(fields, "recursive_consent").as_deref());
    env.operator_witness_required =
        parse_bool(opt_str(fields, "operator_witness_required").as_deref());
    env.operator_witness = parse_bool(opt_str(fields, "operator_witness").as_deref());

    let (shannon_q, shannon_above) = parse_q_strict(opt_str(fields, "shannon_q").as_deref())
        .map(|q| (q, false))
        .or_else(|| parse_decimal_q_exact(opt_str(fields, "shannon").as_deref()))
        .unwrap_or((0, false));
    let score = FischerScore {
        composite: val(fields, "composite", "0"),
        l0_real: parse_bool(opt_str(fields, "l0_real").as_deref()),
        shannon_q,
        shannon_above,
        g4_state: val(fields, "g4_state", "UNKNOWN"),
    };
    let strict = parse_bool(opt_str(fields, "strict").as_deref());
    let prev_hash = val(fields, "prev_hash", "0000000000000000");
    (env, score, strict, prev_hash)
}

fn val(fields: &BTreeMap<String, String>, key: &str, default: &str) -> String {
    fields
        .get(key)
        .filter(|v| !v.is_empty())
        .cloned()
        .unwrap_or_else(|| default.to_string())
}

fn val_alias(fields: &BTreeMap<String, String>, keys: &[&str], default: &str) -> String {
    for key in keys {
        if let Some(v) = fields.get(*key).filter(|v| !v.is_empty()) {
            return v.clone();
        }
    }
    default.to_string()
}

fn opt_str(fields: &BTreeMap<String, String>, key: &str) -> Option<String> {
    fields.get(key).cloned()
}

fn opt_str_alias(fields: &BTreeMap<String, String>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(v) = fields.get(*key) {
            return Some(v.clone());
        }
    }
    None
}

fn opt_nonempty(fields: &BTreeMap<String, String>, key: &str) -> Option<String> {
    fields.get(key).filter(|v| !v.is_empty()).cloned()
}

fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(a), Some(b)) = (hex(bytes[i + 1]), hex(bytes[i + 2])) {
                out.push((a * 16 + b) as char);
                i += 3;
                continue;
            }
        }
        out.push(if bytes[i] == b'+' {
            ' '
        } else {
            bytes[i] as char
        });
        i += 1;
    }
    out
}

fn hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}
