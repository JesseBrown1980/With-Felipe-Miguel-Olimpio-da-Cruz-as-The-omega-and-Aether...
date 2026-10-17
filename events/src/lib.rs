//! Rust port of the Asolaria graph-event producer: `scoreEdgeRisk` (edgeRiskEngine.js)
//! and `buildGraphEvent`/`buildActionManifest` (graphRuntimeStore.js); graph events become
//! the HBP EVENT rows `l0_edge::event` parses. Upstream behcs-256@818cc235; see PROVENANCE.md.
#![forbid(unsafe_code)]

pub mod event;
pub mod flat;
pub mod node;
pub mod risk;
pub mod text;

pub use event::{
    build_action_manifest, build_graph_event, render_event_row, ActionManifest,
    ActionManifestInput, GraphEvent, GraphEventInput,
};
pub use flat::{normalize_policy, Policy, PolicyInput};
pub use node::{normalize_node_ref, NodeRef, NodeRefInput};
pub use risk::{
    map_score_to_level, normalize_criticality, normalize_domain, score_edge_risk, Level, RiskInput,
    RiskResult,
};
