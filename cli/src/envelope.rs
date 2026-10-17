//! HBP envelope text -> `VerifiedEnvelope`. One `key=value` per line; fails closed on anything odd.

use std::collections::BTreeMap;

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_server_fischer_eval::{FischerEnvelope, FischerScore};
use asolaria_verdict::VerifiedEnvelope;

/// Every accepted key, in README order.
pub const KEYS: [&str; 32] = [
    "slot",
    "syscall_no",
    "caller_pid",
    "hook_tier",
    "caller_tier",
    "target_tier",
    "event_tags",
    "forward_score_q",
    "reverse_risk_q",
    "pid",
    "actor",
    "verb",
    "target",
    "payload",
    "payload_json_true",
    "hbp_path",
    "sidecar_plan",
    "ledger_path",
    "tuple",
    "cube_47d",
    "cosign",
    "halt_path",
    "authority_jump",
    "recursive_consent",
    "operator_witness_required",
    "operator_witness",
    "composite",
    "l0_real",
    "shannon_q",
    "shannon_above",
    "g4_state",
    "fischer_strict",
];

fn known_key(key: &str) -> Option<&'static str> {
    KEYS.iter().copied().find(|known| *known == key)
}

struct Fields<'a> {
    values: BTreeMap<&'static str, &'a str>,
}

impl<'a> Fields<'a> {
    fn raw(&self, key: &str) -> Option<&'a str> {
        self.values.get(key).copied()
    }

    fn required(&self, key: &str) -> Result<&'a str, String> {
        self.raw(key)
            .ok_or_else(|| format!("missing required key {key}"))
    }

    fn uint<T: std::str::FromStr>(&self, key: &str, value: &str, max: Option<u64>) -> Result<T, String> {
        if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
            return Err(format!("{key}: expected a decimal integer, got {value:?}"));
        }
        let out_of_range = || format!("{key}: {value} is out of range");
        if let Some(max) = max {
            let wide: u64 = value.parse().map_err(|_| out_of_range())?;
            if wide > max {
                return Err(format!("{key}: {value} is above the maximum {max}"));
            }
        }
        value.parse::<T>().map_err(|_| out_of_range())
    }

    fn required_uint<T: std::str::FromStr>(&self, key: &str, max: Option<u64>) -> Result<T, String> {
        let value = self.required(key)?;
        self.uint(key, value, max)
    }

    fn uint_or<T: std::str::FromStr>(&self, key: &str, max: Option<u64>, default: T) -> Result<T, String> {
        match self.raw(key) {
            Some(value) => self.uint(key, value, max),
            None => Ok(default),
        }
    }

    fn flag(&self, key: &str) -> Result<bool, String> {
        match self.raw(key) {
            None | Some("0") | Some("false") => Ok(false),
            Some("1") | Some("true") => Ok(true),
            Some(other) => Err(format!("{key}: expected 0, 1, true or false, got {other:?}")),
        }
    }

    fn text_or(&self, key: &str, default: &str) -> String {
        self.raw(key).unwrap_or(default).to_string()
    }

    fn optional(&self, key: &str) -> Option<String> {
        self.raw(key).map(str::to_string)
    }
}

fn hook_tier(value: &str) -> Result<HookTier, String> {
    match value {
        "micro" => Ok(HookTier::Micro),
        "cosign" => Ok(HookTier::Cosign),
        "firmware" => Ok(HookTier::Firmware),
        other => Err(format!(
            "hook_tier: expected micro, cosign or firmware, got {other:?}"
        )),
    }
}

fn access_tier(key: &str, value: &str) -> Result<AccessTier, String> {
    match value {
        "public" => Ok(AccessTier::Public),
        "restricted" => Ok(AccessTier::Restricted),
        "stealth" => Ok(AccessTier::Stealth),
        "hidden" => Ok(AccessTier::Hidden),
        "shadow" => Ok(AccessTier::Shadow),
        "secret" => Ok(AccessTier::Secret),
        "sovereignty" => Ok(AccessTier::Sovereignty),
        other => Err(format!(
            "{key}: expected public, restricted, stealth, hidden, shadow, secret or sovereignty, got {other:?}"
        )),
    }
}

fn event_tags(value: &str) -> Result<Vec<String>, String> {
    if value.is_empty() {
        return Ok(Vec::new());
    }
    let tags: Vec<String> = value.split(',').map(str::to_string).collect();
    if tags.iter().any(String::is_empty) {
        return Err(format!("event_tags: empty tag in {value:?}"));
    }
    Ok(tags)
}

/// True for characters that can make a line display differently from how it parses:
/// control characters (CR, ESC, NUL, tab, ...), bidi overrides/isolates/marks and the BOM.
fn is_display_spoofing(c: char) -> bool {
    c.is_control()
        || matches!(
            c,
            '\u{061C}' | '\u{200E}' | '\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' | '\u{FEFF}'
        )
}

/// Parses envelope text. Unknown, duplicate, missing-required or malformed keys are errors.
/// So are control and bidi characters on any line, comments included (a trailing CR is allowed).
pub fn parse(text: &str) -> Result<VerifiedEnvelope, String> {
    if text.starts_with('\u{FEFF}') {
        return Err("envelope starts with a UTF-8 byte order mark; save it without a BOM".into());
    }
    let mut values: BTreeMap<&'static str, &str> = BTreeMap::new();
    for (index, line) in text.split('\n').enumerate() {
        let line_no = index + 1;
        let line = line.strip_suffix('\r').unwrap_or(line);
        if let Some(c) = line.chars().find(|c| is_display_spoofing(*c)) {
            return Err(format!(
                "line {line_no}: control or bidi character U+{:04X} is not allowed",
                u32::from(c)
            ));
        }
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let (key, value) = line
            .split_once('=')
            .ok_or_else(|| format!("line {line_no}: expected key=value"))?;
        let key = known_key(key).ok_or_else(|| format!("line {line_no}: unknown key {key:?}"))?;
        if values.insert(key, value).is_some() {
            return Err(format!("line {line_no}: duplicate key {key}"));
        }
    }
    let f = Fields { values };

    let fischer_envelope = FischerEnvelope {
        pid: f.optional("pid"),
        actor: f.text_or("actor", ""),
        verb: f.text_or("verb", ""),
        target: f.text_or("target", ""),
        payload: f.text_or("payload", ""),
        payload_json_true: f.flag("payload_json_true")?,
        hbp_path: f.optional("hbp_path"),
        sidecar_plan: f.optional("sidecar_plan"),
        ledger_path: f.optional("ledger_path"),
        tuple: f.optional("tuple"),
        cube_47d: f.optional("cube_47d"),
        cosign: f.optional("cosign"),
        halt_path: f.optional("halt_path"),
        authority_jump: f.flag("authority_jump")?,
        recursive_consent: f.flag("recursive_consent")?,
        operator_witness_required: f.flag("operator_witness_required")?,
        operator_witness: f.flag("operator_witness")?,
    };
    let fischer_score = FischerScore {
        composite: f.text_or("composite", "0"),
        l0_real: f.flag("l0_real")?,
        shannon_q: f.uint_or("shannon_q", Some(1000), 0u16)?,
        shannon_above: f.flag("shannon_above")?,
        g4_state: f.text_or("g4_state", "UNKNOWN"),
    };
    Ok(VerifiedEnvelope {
        slot: f.required_uint("slot", Some(255))?,
        syscall_no: f.required_uint("syscall_no", Some(255))?,
        caller_pid: f.required_uint("caller_pid", None)?,
        hook_tier: hook_tier(f.required("hook_tier")?)?,
        caller_tier: access_tier("caller_tier", f.required("caller_tier")?)?,
        target_tier: access_tier("target_tier", f.required("target_tier")?)?,
        event_tags: event_tags(f.raw("event_tags").unwrap_or(""))?,
        forward_score_q: f.required_uint("forward_score_q", Some(1000))?,
        reverse_risk_q: f.required_uint("reverse_risk_q", Some(1000))?,
        fischer_envelope,
        fischer_score,
        fischer_strict: f.flag("fischer_strict")?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXAMPLE: &str = include_str!("../examples/envelope.hbp");

    fn rejection(text: &str) -> String {
        match parse(text) {
            Ok(_) => panic!("accepted {text:?}"),
            Err(err) => err,
        }
    }

    #[test]
    fn example_parses_with_strict_defaults() {
        let env = parse(EXAMPLE).expect("example parses");
        assert_eq!(env.caller_pid, 43981);
        assert_eq!(env.fischer_envelope.sidecar_plan, None);
        assert_eq!(env.fischer_envelope.cosign, None);
        assert_eq!(env.fischer_score.g4_state, "UNKNOWN");
    }

    #[test]
    fn every_key_is_known_once() {
        let mut all: Vec<&str> = KEYS.to_vec();
        let len = all.len();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), len);
    }

    #[test]
    fn rejects_signed_or_spaced_integers_and_bad_flags() {
        for (from, to) in [
            ("slot=0", "slot=+0"),
            ("slot=0", "slot= 0"),
            ("slot=0", "slot=256"),
            ("forward_score_q=800", "forward_score_q=1001"),
            ("l0_real=1", "l0_real=yes"),
            ("hook_tier=micro", "hook_tier=Micro"),
            ("event_tags=safe-tag", "event_tags=a,,b"),
            ("slot=0", "slot"),
            ("slot=0", " slot=0"),
        ] {
            let text = EXAMPLE.replace(from, to);
            assert!(parse(&text).is_err(), "{to:?} must be rejected");
        }
    }

    #[test]
    fn rejects_control_bidi_and_bom_anywhere() {
        for (from, to) in [
            ("target=fabric", "target=prod\u{1b}[2K\rtarget=fabric"),
            ("payload=heartbeat", "payload=rm -rf /\rpayload=heartbeat"),
            ("actor=helm", "actor=he\0lm"),
            ("actor=helm", "actor=he\tlm"),
            ("actor=helm", "actor=\u{202E}mleh"),
            ("# Fischer envelope", "# note\rpid=spoofed"),
        ] {
            let err = rejection(&EXAMPLE.replacen(from, to, 1));
            assert!(err.contains("control or bidi character"), "{err}");
        }
        let err = rejection(&format!("\u{FEFF}{EXAMPLE}"));
        assert!(err.contains("byte order mark"), "{err}");
        assert!(parse(&EXAMPLE.replace('\n', "\r\n")).is_ok(), "CRLF line endings stay accepted");
    }

    #[test]
    fn out_of_range_integers_say_so() {
        let err = rejection(&EXAMPLE.replacen("slot=0", "slot=256", 1));
        assert_eq!(err, "slot: 256 is above the maximum 255");
        let err = rejection(&EXAMPLE.replacen("caller_pid=43981", "caller_pid=99999999999999999999", 1));
        assert_eq!(err, "caller_pid: 99999999999999999999 is out of range");
    }

    #[test]
    fn values_are_kept_verbatim() {
        let env = parse(&EXAMPLE.replace("verb=tick", "verb=a=b ")).unwrap();
        assert_eq!(env.fischer_envelope.verb, "a=b ");
    }
}
