//! The white-room consumer of Shannon-and-the-gnns-stage@32f9670
//! `pipeline/whiteroom-consumer-index.mjs` (:14-215): which inbox envelopes belong to the white
//! room, the 3x6x6 cube address of a pattern, the `EVT-WHITEROOM-DIGESTED` envelope and the
//! digest loop of `_tick`.
//!
//! Boundary pieces stay with the caller: polling and sending over HTTP (`_pollInbox` :210-220,
//! `_send` :222-234), the JSON state file (`loadState` / `saveState` :117-133), the timer
//! (`start` / `stop` :155-174) and the clock (`new Date().toISOString()`). [`tick`] takes the
//! decoded poll result, a send function and a clock, and reports whether the state is to be saved.
//! `stableStringify` (:104-110) is computed only as the byte pre-image of a SHA-256; it is never
//! parsed or stored. `deriveCubeAddress` over that pre-image (:62-66), `CUBE_LAYERS` and
//! `CUBE_AXIS` are `quant_cubes::consumer` (quants/cubes), which ports them over the pre-image text.

use crate::jsvalue::{js_greater, json_number, quote_json_string, DomainError, JsValue};
pub use quant_cubes::consumer::{CubeAddress, CUBE_AXIS, CUBE_LAYERS};

/// `POLL_INTERVAL_MS` (:16), for the caller's timer.
pub const POLL_INTERVAL_MS: u64 = 10_000;
/// The processed-id window of `_tick` (:191-193).
pub const PROCESSED_WINDOW: usize = 2000;
/// The tags of a digestion envelope (:98).
pub const DIGESTED_TAGS: [&str; 4] = [
    "room:whiteroom",
    "digested",
    "acer-mirror",
    "source:consumer",
];

/// `isWhiteroomEnvelope(env)` (:27-49).
pub fn is_whiteroom_envelope(env: &JsValue) -> bool {
    if !env.truthy() || !env.is_object_like() {
        return false;
    }
    let empty_string = JsValue::str("");
    let empty_object = JsValue::object(vec![]);
    let verb = env.get("verb").or(env.get("v")).or(&empty_string);
    let body = env.get("body").or(env.get("payload")).or(&empty_object);
    if let JsValue::String(verb) = verb {
        if verb == "EVT-WHITEROOM-DIGESTED" || verb.starts_with("EVT-WHITEROOM-DIGESTED-") {
            return false;
        }
        if verb == "EVT-WHITEROOM-CONSUMER-ONLINE" || verb == "EVT-WAVE-MUSCULO-ACER-MIRROR-ONLINE"
        {
            return false;
        }
    }
    let body_is_object = body.truthy() && body.is_object_like();
    if body_is_object
        && (body.get("source").is_str("consumer")
            || body.get("tags").array_includes_str("source:consumer"))
    {
        return false;
    }
    if matches!(verb, JsValue::String(v) if v.starts_with("EVT-WHITEROOM-")) {
        return true;
    }
    body_is_object
        && (body.get("room").is_str("whiteroom")
            || body.get("tags").array_includes_str("room:whiteroom"))
}

/// `stableStringify(v)` (:104-110): JSON text with object keys sorted by UTF-16 code units and
/// `undefined` written as `null`.
pub fn stable_stringify(v: &JsValue) -> String {
    match v {
        JsValue::Undefined | JsValue::Null => "null".to_string(),
        JsValue::Bool(b) => b.to_string(),
        JsValue::Number(n) => json_number(n),
        JsValue::String(s) => quote_json_string(s),
        JsValue::Array(items) => {
            let parts: Vec<String> = items.iter().map(stable_stringify).collect();
            format!("[{}]", parts.join(","))
        }
        JsValue::Object(o) => {
            let mut entries: Vec<&(String, JsValue)> = o.entries().iter().collect();
            entries.sort_by(|a, b| a.0.encode_utf16().cmp(b.0.encode_utf16()));
            let parts: Vec<String> = entries
                .iter()
                .map(|(k, v)| format!("{}:{}", quote_json_string(k), stable_stringify(v)))
                .collect();
            format!("{{{}}}", parts.join(","))
        }
    }
}

/// `deriveCubeAddress(patternPayload)` (:60-67): `stableStringify` here, then
/// `quant_cubes::consumer::derive_cube_address` over the pre-image (:62-66).
pub fn derive_cube_address(pattern_payload: &JsValue) -> CubeAddress {
    quant_cubes::consumer::derive_cube_address(&stable_stringify(pattern_payload))
}

/// `buildDigestionEnvelope(sourceEnv, nowIso)` (:72-102). Constant fields: `actor 'acer'`,
/// `verb 'EVT-WHITEROOM-DIGESTED'`, `target 'liris'`, `state 'digested'`,
/// `intent 'close-section-Q-mirror'`, and in `body` `acer_cosign_append: true`,
/// `room 'whiteroom'`, `source 'consumer'`, `tags` [`DIGESTED_TAGS`].
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DigestionEnvelope {
    /// `proof = pattern_sha.slice(0, 16)`.
    pub proof: String,
    /// `body.pattern_sha` and `body.cube_address`.
    pub cube: CubeAddress,
    /// `body.digested_at` and `ts` (`nowIso`).
    pub now_iso: String,
    /// `body.source_envelope_id`: `id || event_id || envelope_id || _id || null`.
    pub source_envelope_id: JsValue,
    /// `body.source_verb`: `sourceEnv?.verb || null`.
    pub source_verb: JsValue,
}

fn first_truthy(env: &JsValue, keys: &[&str]) -> JsValue {
    keys.iter()
        .map(|k| env.get(k))
        .find(|v| v.truthy())
        .cloned()
        .unwrap_or(JsValue::Null)
}

const ID_KEYS: [&str; 4] = ["id", "event_id", "envelope_id", "_id"];

/// `buildDigestionEnvelope(sourceEnv, nowIso)` (:72-102).
pub fn build_digestion_envelope(source_env: &JsValue, now_iso: &str) -> DigestionEnvelope {
    let empty_object = JsValue::object(vec![]);
    let body = source_env
        .get("body")
        .or(source_env.get("payload"))
        .or(&empty_object);
    let pattern_payload = body
        .get("pattern")
        .nullish_or(body.get("payload"))
        .nullish_or(body);
    let cube = derive_cube_address(pattern_payload);
    DigestionEnvelope {
        proof: cube.pattern_sha[..16].to_string(),
        cube,
        now_iso: now_iso.to_string(),
        source_envelope_id: first_truthy(source_env, &ID_KEYS),
        source_verb: first_truthy(source_env, &["verb"]),
    }
}

impl DigestionEnvelope {
    /// The envelope object as `buildDigestionEnvelope` returns it (:82-101), in its key order.
    pub fn to_js_value(&self) -> JsValue {
        let s = JsValue::str;
        let body = JsValue::object(vec![
            ("pattern_sha", s(&self.cube.pattern_sha)),
            (
                "cube_address",
                JsValue::Array(
                    self.cube
                        .cube_address
                        .iter()
                        .map(|&v| JsValue::int(i64::from(v)))
                        .collect(),
                ),
            ),
            ("digested_at", s(&self.now_iso)),
            ("source_envelope_id", self.source_envelope_id.clone()),
            ("source_verb", self.source_verb.clone()),
            ("acer_cosign_append", JsValue::Bool(true)),
            ("room", s("whiteroom")),
            ("source", s("consumer")),
            ("tags", JsValue::Array(DIGESTED_TAGS.map(s).to_vec())),
        ]);
        JsValue::object(vec![
            ("actor", s("acer")),
            ("verb", s("EVT-WHITEROOM-DIGESTED")),
            ("target", s("liris")),
            ("state", s("digested")),
            ("proof", s(&self.proof)),
            ("intent", s("close-section-Q-mirror")),
            ("body", body),
            ("ts", s(&self.now_iso)),
        ])
    }
}

/// The consumer's persisted state (`loadState` defaults, :119).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConsumerState {
    /// `last_ts` (`null` initially).
    pub last_ts: JsValue,
    /// `processed_ids`.
    pub processed_ids: Vec<JsValue>,
    /// `digested_count`.
    pub digested_count: u64,
}

impl Default for ConsumerState {
    fn default() -> Self {
        ConsumerState {
            last_ts: JsValue::Null,
            processed_ids: Vec::new(),
            digested_count: 0,
        }
    }
}

/// `data.messages || data.envelopes || data.items || []` (:215), over the decoded poll reply.
pub fn inbox_messages(data: &JsValue) -> JsValue {
    let empty = JsValue::Array(Vec::new());
    data.get("messages")
        .or(data.get("envelopes"))
        .or(data.get("items"))
        .or(&empty)
        .clone()
}

/// What one `_tick` did.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TickOutcome {
    /// Envelopes digested and sent ok.
    pub digested: u64,
    /// `digested > 0`: upstream saves the state file (:203-207).
    pub save_state: bool,
}

/// `ts = env.ts || env.received_at` (:198).
fn envelope_ts(env: &JsValue) -> &JsValue {
    env.get("ts").or(env.get("received_at"))
}

fn ts_kind(v: &JsValue) -> Option<u8> {
    match v {
        JsValue::String(_) => Some(0),
        JsValue::Number(_) => Some(1),
        _ => None,
    }
}

/// `_tick()` (:176-208) over the poll result `messages` (`_pollInbox`'s return value), with
/// `send` standing for `_send` (true when the bus answered ok) and `now_iso` for
/// `new Date().toISOString()` at each `buildDigestionEnvelope`.
///
/// The `ts > last_ts` comparison is ported for two strings or two numbers. When the white-room
/// envelopes' truthy timestamps and the current `last_ts` are not all strings or all numbers,
/// the tick is refused before anything is sent or changed.
pub fn tick(
    state: &mut ConsumerState,
    messages: &JsValue,
    send: &mut dyn FnMut(&DigestionEnvelope) -> bool,
    now_iso: &mut dyn FnMut() -> String,
) -> Result<TickOutcome, DomainError> {
    let none = TickOutcome {
        digested: 0,
        save_state: false,
    };
    let JsValue::Array(messages) = messages else {
        return Ok(none);
    };
    if messages.is_empty() {
        return Ok(none);
    }
    let stamps: Vec<&JsValue> = messages
        .iter()
        .filter(|env| is_whiteroom_envelope(env))
        .map(envelope_ts)
        .filter(|ts| ts.truthy())
        .collect();
    if let Some(first) = stamps.first() {
        let kind = ts_kind(first);
        let last = Some(&state.last_ts).filter(|ts| ts.truthy());
        if kind.is_none()
            || stamps
                .iter()
                .copied()
                .chain(last)
                .any(|ts| ts_kind(ts) != kind)
        {
            return Err(DomainError::MixedComparison);
        }
    }
    let mut processed: Vec<JsValue> = Vec::new();
    for id in &state.processed_ids {
        if !processed.iter().any(|p| p.same_value_zero(id)) {
            processed.push(id.clone());
        }
    }
    let mut digested = 0u64;
    for env in messages {
        if !is_whiteroom_envelope(env) {
            continue;
        }
        let id = first_truthy(env, &ID_KEYS);
        if id.truthy() && processed.iter().any(|p| p.same_value_zero(&id)) {
            continue;
        }
        let digestion = build_digestion_envelope(env, &now_iso());
        if !send(&digestion) {
            continue;
        }
        digested += 1;
        if id.truthy() {
            processed.push(id);
            if processed.len() > PROCESSED_WINDOW {
                let excess = processed.len() - PROCESSED_WINDOW;
                processed.drain(..excess);
            }
        }
        let ts = envelope_ts(env);
        if ts.truthy() && (!state.last_ts.truthy() || js_greater(ts, &state.last_ts)?) {
            state.last_ts = ts.clone();
        }
        state.digested_count += 1;
    }
    if digested > 0 {
        state.processed_ids = processed;
    }
    Ok(TickOutcome {
        digested,
        save_state: digested > 0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_consumer_never_reingests_its_own_output() {
        let source = JsValue::object(vec![
            ("id", JsValue::str("e1")),
            ("verb", JsValue::str("EVT-WHITEROOM-PATTERN")),
            (
                "body",
                JsValue::object(vec![("pattern", JsValue::str("x"))]),
            ),
        ]);
        assert!(is_whiteroom_envelope(&source));
        let digestion = build_digestion_envelope(&source, "2026-10-17T00:00:00.000Z");
        assert!(!is_whiteroom_envelope(&digestion.to_js_value()));
        assert_eq!(digestion.cube.pattern_sha, crate::sha::sha256hex("\"x\""));
    }

    #[test]
    fn stable_stringify_sorts_keys_by_utf16() {
        let v = JsValue::object(vec![
            ("b", JsValue::int(1)),
            ("\u{1f600}", JsValue::Null),
            ("\u{ff61}", JsValue::Undefined),
            (
                "a",
                JsValue::Array(vec![JsValue::Undefined, JsValue::Bool(true)]),
            ),
        ]);
        assert_eq!(
            stable_stringify(&v),
            "{\"a\":[null,true],\"b\":1,\"\u{1f600}\":null,\"\u{ff61}\":null}"
        );
    }

    #[test]
    fn a_failed_send_changes_nothing() {
        let env = JsValue::object(vec![
            ("id", JsValue::str("e1")),
            ("ts", JsValue::str("2026")),
            (
                "body",
                JsValue::object(vec![("room", JsValue::str("whiteroom"))]),
            ),
        ]);
        let mut state = ConsumerState::default();
        let out = tick(
            &mut state,
            &JsValue::Array(vec![env]),
            &mut |_| false,
            &mut || "t".to_string(),
        )
        .expect("strings");
        assert_eq!(out.digested, 0);
        assert_eq!(state, ConsumerState::default());
    }
}
