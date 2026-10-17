//! Port of `normalizePolicy` (graphRuntimeStore.js:81-98) and the string entries of
//! `normalizeFlatObject` (graphRuntimeStore.js:53-79) that reach `scoreEdgeRisk`.

use std::collections::HashMap;

use crate::text::{clip_text, js_lower, non_empty, replace_units};

/// The raw policy a caller supplies.
#[derive(Clone, Debug, Default)]
pub struct PolicyInput {
    pub approval_state: String,
    pub mode: String,
    pub rollback_required: bool,
    pub autonomous: bool,
}

/// A normalized policy (graphRuntimeStore.js:87-97).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Policy {
    pub approval_state: Option<String>,
    pub mode: Option<String>,
    pub rollback_required: bool,
    pub autonomous: bool,
}

/// `normalizePolicy(input)` (graphRuntimeStore.js:81-98).
pub fn normalize_policy(input: &PolicyInput) -> Policy {
    Policy {
        approval_state: non_empty(js_lower(&clip_text(&input.approval_state, 24))),
        mode: non_empty(js_lower(&clip_text(&input.mode, 32))),
        rollback_required: input.rollback_required,
        autonomous: input.autonomous,
    }
}

fn is_key_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '_' | ':' | '-')
}

/// The `normalizeFlatObject` key rule `clipText(key,48).replace(/[^a-zA-Z0-9_:-]/g,"_")`
/// with the string-value branch `clipText(value,240)` (graphRuntimeStore.js:56-64). The
/// numeric, boolean, array and `JSON.stringify` branches are not reached by the fields
/// `l0_edge::event` reads and are not ported.
pub fn normalize_flat_string(key: &str, value: &str) -> Option<(String, String)> {
    let safe_key = replace_units(&clip_text(key, 48), is_key_char);
    if safe_key.is_empty() {
        return None;
    }
    Some((safe_key, clip_text(value, 240)))
}

/// `key` as an array index (canonical decimal below 2^32 - 1).
fn array_index(key: &str) -> Option<u32> {
    let canonical = !key.is_empty()
        && key.bytes().all(|b| b.is_ascii_digit())
        && (key == "0" || !key.starts_with('0'));
    if !canonical {
        return None;
    }
    key.parse::<u32>().ok().filter(|&index| index != u32::MAX)
}

/// The entries of an ordinary JavaScript object whose keys were assigned in this order, as
/// `Object.entries` lists them: array-index keys ascending, then the other keys in
/// first-assignment order; a key assigned again keeps its place and takes the later value.
pub fn js_object_entries(assignments: &[(String, String)]) -> Vec<(String, String)> {
    let mut merged: Vec<(String, String)> = Vec::with_capacity(assignments.len());
    let mut position: HashMap<&str, usize> = HashMap::new();
    for (key, value) in assignments {
        match position.get(key.as_str()) {
            Some(&at) => merged[at].1.clone_from(value),
            None => {
                position.insert(key, merged.len());
                merged.push((key.clone(), value.clone()));
            }
        }
    }
    let mut indexed: Vec<(u32, (String, String))> = Vec::new();
    let mut named: Vec<(String, String)> = Vec::new();
    for entry in merged {
        match array_index(&entry.0) {
            Some(index) => indexed.push((index, entry)),
            None => named.push(entry),
        }
    }
    indexed.sort_by_key(|(index, _)| *index);
    indexed
        .into_iter()
        .map(|(_, entry)| entry)
        .chain(named)
        .collect()
}

/// `normalizeFlatObject(source, maxKeys)` over the string-valued keys of `source`, given in
/// assignment order: `Object.entries(source).slice(0, maxKeys)`, then each `out[safeKey] =`
/// (graphRuntimeStore.js:53-79), returned in `Object.entries(out)` order.
pub fn normalize_flat(entries: &[(String, String)], max_keys: usize) -> Vec<(String, String)> {
    let assigned: Vec<(String, String)> = js_object_entries(entries)
        .iter()
        .take(max_keys)
        .filter_map(|(key, value)| normalize_flat_string(key, value))
        .collect();
    js_object_entries(&assigned)
}

/// The value for `key`, or `""` when absent (`context.tool`, `context.mode`, …).
pub fn flat_get<'a>(entries: &'a [(String, String)], key: &str) -> &'a str {
    entries
        .iter()
        .find(|(entry_key, _)| entry_key == key)
        .map_or("", |(_, value)| value.as_str())
}
