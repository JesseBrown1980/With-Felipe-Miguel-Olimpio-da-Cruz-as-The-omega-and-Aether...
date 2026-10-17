//! Port of `buildGraphEvent` (graphRuntimeStore.js:100-144), rendered as the HBP EVENT row
//! `l0_edge::event` parses, and `buildActionManifest` (graphRuntimeStore.js:146-185). Only
//! graph events become EVENT rows: gnnDataExport.js:12 reads graph-runtime-events.ndjson,
//! and manifests go to graph-runtime-manifests.ndjson (graphRuntimeStore.js:8,206).

use crate::flat::{flat_get, normalize_flat, normalize_policy, Policy, PolicyInput};
use crate::node::{normalize_node_ref, NodeRef, NodeRefInput};
use crate::risk::{score_edge_risk, RiskInput, RiskResult};
use crate::text::{clip_text, escape_hbp, js_lower, non_empty, or_str, slug};

/// The raw fields a caller passes to `buildGraphEvent`; `context` holds the context object's
/// string-valued keys in assignment order (graphRuntimeStore.js:100-121).
#[derive(Clone, Debug, Default)]
pub struct GraphEventInput {
    pub component: String,
    pub category: String,
    pub action: String,
    pub actor: NodeRefInput,
    pub subject: NodeRefInput,
    pub target: NodeRefInput,
    pub context: Vec<(String, String)>,
    pub policy: PolicyInput,
    pub status: String,
}

/// The `buildGraphEvent` fields the HBP EVENT row and `scoreEdgeRisk` use.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GraphEvent {
    pub component: String,
    pub category: String,
    pub action: String,
    pub actor: NodeRef,
    pub subject: NodeRef,
    pub target: NodeRef,
    pub context: Vec<(String, String)>,
    pub policy: Policy,
    pub status: Option<String>,
    pub risk: RiskResult,
}

impl GraphEvent {
    /// The row `l0_edge::event::parse_events` reads back.
    pub fn event_row(&self) -> String {
        render_event_row(
            &self.actor,
            &self.target,
            self.risk.score,
            self.status.as_deref(),
        )
    }
}

/// `buildGraphEvent(input)` (graphRuntimeStore.js:100-144).
pub fn build_graph_event(input: &GraphEventInput) -> GraphEvent {
    let component = slug(&input.component, 64, "unknown");
    let category = slug(&input.category, 48, "runtime");
    let action = slug(&input.action, 64, "event");
    let actor = normalize_node_ref(&input.actor, "system_actor");
    let subject = normalize_node_ref(&input.subject, "subject");
    let target = normalize_node_ref(&input.target, "target");
    let context = normalize_flat(&input.context, 20);
    let policy = normalize_policy(&input.policy);
    let status = js_lower(&clip_text(&input.status, 24));

    let context_tool = flat_get(&context, "tool").to_string();
    let risk = score_edge_risk(&RiskInput {
        action: action.clone(),
        category: category.clone(),
        tool: or_str(&context_tool, flat_get(&context, "routeAction")).to_string(),
        context_tool,
        context_mode: flat_get(&context, "mode").to_string(),
        policy_mode: policy.mode.clone().unwrap_or_default(),
        policy_approval_state: policy.approval_state.clone().unwrap_or_default(),
        status: status.clone(),
        actor_domain: actor.domain.clone().unwrap_or_default(),
        target_domain: target.domain.clone().unwrap_or_default(),
        target_criticality: target.criticality.clone().unwrap_or_default(),
        policy_autonomous: policy.autonomous,
        ..RiskInput::default()
    });

    GraphEvent {
        component,
        category,
        action,
        actor,
        subject,
        target,
        context,
        policy,
        status: non_empty(status),
        risk,
    }
}

/// The raw fields a caller passes to `buildActionManifest` (graphRuntimeStore.js:146-167).
#[derive(Clone, Debug, Default)]
pub struct ActionManifestInput {
    pub component: String,
    pub action: String,
    pub status: String,
    pub actor: NodeRefInput,
    pub target: NodeRefInput,
    pub policy: PolicyInput,
    pub context: Vec<(String, String)>,
}

/// The `buildActionManifest` fields `scoreEdgeRisk` uses, and its score. Upstream appends
/// manifests to graph-runtime-manifests.ndjson, which gnnDataExport.js does not read, so a
/// manifest has no EVENT row.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActionManifest {
    pub component: String,
    pub action: String,
    pub status: String,
    pub actor: NodeRef,
    pub target: NodeRef,
    pub context: Vec<(String, String)>,
    pub policy: Policy,
    pub risk: RiskResult,
}

/// `buildActionManifest(input)` (graphRuntimeStore.js:146-185).
pub fn build_action_manifest(input: &ActionManifestInput) -> ActionManifest {
    let component = slug(&input.component, 64, "unknown");
    let action = slug(&input.action, 72, "unknown_action");
    let status = js_lower(&clip_text(
        if input.status.is_empty() {
            "proposed"
        } else {
            &input.status
        },
        24,
    ));
    let actor = normalize_node_ref(&input.actor, "system_actor");
    let target = normalize_node_ref(&input.target, "target");
    let policy = normalize_policy(&input.policy);
    let context = normalize_flat(&input.context, 20);

    let context_tool = flat_get(&context, "tool").to_string();
    let risk = score_edge_risk(&RiskInput {
        action: action.clone(),
        category: String::from("action_manifest"),
        tool: or_str(&context_tool, &action).to_string(),
        context_tool,
        context_mode: flat_get(&context, "mode").to_string(),
        policy_mode: policy.mode.clone().unwrap_or_default(),
        policy_approval_state: policy.approval_state.clone().unwrap_or_default(),
        status: status.clone(),
        actor_domain: actor.domain.clone().unwrap_or_default(),
        target_domain: target.domain.clone().unwrap_or_default(),
        target_criticality: target.criticality.clone().unwrap_or_default(),
        policy_autonomous: policy.autonomous,
        ..RiskInput::default()
    });

    ActionManifest {
        component,
        action,
        status,
        actor,
        target,
        context,
        policy,
        risk,
    }
}

/// Builds `EVENT|actor=|actor_type=|target=|target_type=|risk=|status=`, each optional
/// field omitted when empty, in the key order `l0_edge::event` expects.
pub fn render_event_row(
    actor: &NodeRef,
    target: &NodeRef,
    risk_score: i64,
    status: Option<&str>,
) -> String {
    let mut row = String::from("EVENT");
    if let Some(id) = &actor.id {
        row.push_str(&format!("|actor={}", escape_hbp(id)));
    }
    if !actor.node_type.is_empty() {
        row.push_str(&format!("|actor_type={}", escape_hbp(&actor.node_type)));
    }
    if let Some(id) = &target.id {
        row.push_str(&format!("|target={}", escape_hbp(id)));
    }
    if !target.node_type.is_empty() {
        row.push_str(&format!("|target_type={}", escape_hbp(&target.node_type)));
    }
    row.push_str(&format!("|risk={}", risk_score.max(0)));
    if let Some(status) = status {
        if !status.is_empty() {
            row.push_str(&format!("|status={}", escape_hbp(status)));
        }
    }
    row
}
