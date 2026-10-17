//! Port of `normalizeNodeRef` (graphRuntimeStore.js:38-51): the actor and target
//! `id`/`type` the HBP EVENT row carries.

use crate::text::{
    clean_text, clip_text, is_slug_char, js_lower, non_empty, or_str, replace_units, utf16_slice,
};

/// The raw node fields a caller supplies; empty means absent.
#[derive(Clone, Debug, Default)]
pub struct NodeRefInput {
    pub typ: String,
    pub id: String,
    pub name: String,
    pub label: String,
    pub title: String,
    pub domain: String,
    pub criticality: String,
    pub priority: String,
}

/// A normalized node reference (graphRuntimeStore.js:45-50).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct NodeRef {
    pub node_type: String,
    pub id: Option<String>,
    pub label: Option<String>,
    pub domain: Option<String>,
    pub criticality: Option<String>,
}

/// `normalizeNodeRef(input, fallbackType)` (graphRuntimeStore.js:38-51).
pub fn normalize_node_ref(input: &NodeRefInput, fallback_type: &str) -> NodeRef {
    let type_source = clean_text(or_str(&input.typ, fallback_type));
    let type_slug = replace_units(&js_lower(&type_source), is_slug_char);
    let type_sliced = utf16_slice(&type_slug, 0, 48);
    let node_type = if type_sliced.is_empty() {
        fallback_type.to_string()
    } else {
        type_sliced
    };
    NodeRef {
        node_type,
        id: non_empty(clip_text(or_str(&input.id, &input.name), 120)),
        label: non_empty(clip_text(or_str(&input.label, &input.title), 160)),
        domain: non_empty(js_lower(&clip_text(&input.domain, 40))),
        criticality: non_empty(js_lower(&clip_text(
            or_str(&input.criticality, &input.priority),
            24,
        ))),
    }
}
