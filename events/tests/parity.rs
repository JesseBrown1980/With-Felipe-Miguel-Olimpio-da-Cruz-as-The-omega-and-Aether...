//! Cross-checks the port against tools/events_referee.py (which mirrors edgeRiskEngine.js and
//! graphRuntimeStore.js) and round-trips every graph-event row through `l0_edge::event`.

use asolaria_events::text::escape_hbp;
use asolaria_events::{
    build_action_manifest, build_graph_event, ActionManifest, ActionManifestInput, GraphEvent,
    GraphEventInput, NodeRefInput, PolicyInput,
};
use l0_edge::event::{parse_events, Event};
use std::collections::HashMap;

const INPUT: &str = include_str!("fixtures/events-input.hbp");
const EXPECTED_EVENTS: &str = include_str!("fixtures/expected-events.hbp");
const EXPECTED_MANIFESTS: &str = include_str!("fixtures/expected-manifests.hbp");

fn data_rows(text: &str) -> Vec<&str> {
    text.split('\n')
        .filter(|row| !row.is_empty() && !row.starts_with('#'))
        .collect()
}

fn decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = String::with_capacity(value.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).expect("hex");
            out.push(char::from(u8::from_str_radix(hex, 16).expect("byte")));
            i += 3;
        } else {
            // Re-slice from the original &str to keep multi-byte UTF-8 chars intact.
            let ch = value[i..].chars().next().expect("char");
            out.push(ch);
            i += ch.len_utf8();
        }
    }
    out
}

/// A CASE row: named fields, and the context object's assignments (`ck`/`cv` pairs) in order.
struct Case {
    fields: HashMap<String, String>,
    context: Vec<(String, String)>,
}

fn parse_case(row: &str) -> Case {
    let mut parts = row.split('|');
    assert_eq!(parts.next(), Some("CASE"));
    let mut fields = HashMap::new();
    let mut context = Vec::new();
    let mut pending_key = None;
    for part in parts {
        let (key, raw) = part.split_once('=').expect("key=value");
        let value = decode(raw);
        match key {
            "ck" => pending_key = Some(value),
            "cv" => context.push((pending_key.take().expect("ck before cv"), value)),
            _ => {
                fields.insert(key.to_string(), value);
            }
        }
    }
    Case { fields, context }
}

impl Case {
    fn get(&self, key: &str) -> String {
        self.fields.get(key).cloned().unwrap_or_default()
    }

    fn node(&self, prefix: &str) -> NodeRefInput {
        let get = |suffix: &str| self.get(&format!("{prefix}_{suffix}"));
        NodeRefInput {
            typ: get("type"),
            id: get("id"),
            name: get("name"),
            label: get("label"),
            title: get("title"),
            domain: get("domain"),
            criticality: get("crit"),
            priority: get("prio"),
        }
    }

    fn policy(&self) -> PolicyInput {
        PolicyInput {
            approval_state: self.get("pol_approval"),
            mode: self.get("pol_mode"),
            rollback_required: self.get("pol_rollback") == "1",
            autonomous: self.get("pol_auton") == "1",
        }
    }

    fn graph_event(&self) -> GraphEvent {
        build_graph_event(&GraphEventInput {
            component: self.get("component"),
            category: self.get("category"),
            action: self.get("action"),
            actor: self.node("a"),
            subject: NodeRefInput::default(),
            target: self.node("t"),
            context: self.context.clone(),
            policy: self.policy(),
            status: self.get("status"),
        })
    }

    fn action_manifest(&self) -> ActionManifest {
        build_action_manifest(&ActionManifestInput {
            component: self.get("component"),
            action: self.get("action"),
            status: self.get("status"),
            actor: self.node("a"),
            target: self.node("t"),
            policy: self.policy(),
            context: self.context.clone(),
        })
    }
}

/// The test-only parity record the referee writes for `buildActionManifest`; not an EVENT row.
fn manifest_record(manifest: &ActionManifest) -> String {
    let id = |value: &Option<String>| escape_hbp(value.as_deref().unwrap_or(""));
    format!(
        "MANIFEST|component={}|action={}|status={}|actor={}|actor_type={}|target={}|target_type={}|risk={}|level={}",
        escape_hbp(&manifest.component),
        escape_hbp(&manifest.action),
        escape_hbp(&manifest.status),
        id(&manifest.actor.id),
        escape_hbp(&manifest.actor.node_type),
        id(&manifest.target.id),
        escape_hbp(&manifest.target.node_type),
        manifest.risk.score,
        manifest.risk.level.as_str(),
    )
}

fn non_empty(value: &str) -> Option<String> {
    (!value.is_empty()).then(|| value.to_string())
}

#[test]
fn rows_match_referee_and_parse_back() {
    let cases: Vec<Case> = data_rows(INPUT).into_iter().map(parse_case).collect();
    let expected = data_rows(EXPECTED_EVENTS);
    assert_eq!(expected.len(), cases.len(), "one EVENT row per case");

    let events: Vec<GraphEvent> = cases.iter().map(Case::graph_event).collect();
    for (index, (event, exp)) in events.iter().zip(expected.iter()).enumerate() {
        assert_eq!(
            &event.event_row(),
            exp,
            "row {index} differs from the referee"
        );
    }

    let parsed = parse_events(EXPECTED_EVENTS).expect("every graph-event row parses in l0_edge");
    assert_eq!(parsed.len(), events.len());
    for (index, (got, event)) in parsed.iter().zip(events.iter()).enumerate() {
        let sent = Event {
            actor_id: event.actor.id.clone(),
            actor_type: non_empty(&event.actor.node_type),
            target_id: event.target.id.clone(),
            target_type: non_empty(&event.target.node_type),
            risk_score: u32::try_from(event.risk.score).expect("non-negative"),
            status: event.status.clone(),
        };
        assert_eq!(got, &sent, "row {index}: l0_edge reads other fields");
    }
}

#[test]
fn manifests_match_referee() {
    let cases: Vec<Case> = data_rows(INPUT).into_iter().map(parse_case).collect();
    let expected = data_rows(EXPECTED_MANIFESTS);
    assert_eq!(expected.len(), cases.len(), "one MANIFEST record per case");
    for (index, (case, exp)) in cases.iter().zip(expected.iter()).enumerate() {
        let record = manifest_record(&case.action_manifest());
        assert_eq!(&record, exp, "manifest {index} differs from the referee");
    }
}

#[test]
fn rows_measured_from_the_vendored_js() {
    // Rows the vendored graphRuntimeStore.js/edgeRiskEngine.js produce under Node 22.22.0
    // (written to stdout as UTF-8) for the five inputs written inline below.
    let base = |action: &str, typ: &str, context: Vec<(&str, &str)>, id: &str| {
        build_graph_event(&GraphEventInput {
            action: action.into(),
            actor: NodeRefInput {
                typ: typ.into(),
                id: id.into(),
                ..Default::default()
            },
            target: NodeRefInput {
                id: "t".into(),
                ..Default::default()
            },
            context: context
                .into_iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            status: "ok".into(),
            ..Default::default()
        })
        .event_row()
    };
    let row = |actor: &str, actor_type: &str, risk: u32| {
        format!("EVENT|actor={actor}|actor_type={actor_type}|target=t|target_type=target|risk={risk}|status=ok")
    };
    // A non-BMP char is two code units; the slug regex has no `u` flag.
    assert_eq!(
        base("browser\u{1F600}task", "", vec![], "a"),
        row("a", "system_actor", 0)
    );
    assert_eq!(base("", "\u{1F600}", vec![], "a"), row("a", "__", 0));
    // `out[safeKey] =`: the later of two colliding keys wins.
    assert_eq!(
        base("", "", vec![("tool", "plain"), (" tool", "deploy")], "a"),
        row("a", "system_actor", 6)
    );
    // `Object.entries` lists the array index "9" first, so "tool" falls outside 20 keys.
    let mut keys: Vec<(String, &str)> = (0..19).map(|i| (format!("k{i}"), "v")).collect();
    keys.push(("tool".into(), "deploy"));
    keys.push(("9".into(), "x"));
    let context = keys.iter().map(|(k, v)| (k.as_str(), *v)).collect();
    assert_eq!(base("", "", context, "a"), row("a", "system_actor", 0));
    // The 120-unit clip keeps the pair's high surrogate; Node writes it to UTF-8 as U+FFFD.
    let id = format!("{}\u{1F600}{}", "a".repeat(116), "b".repeat(10));
    let clipped = format!("{}\u{FFFD}...", "a".repeat(116));
    assert_eq!(base("", "", vec![], &id), row(&clipped, "system_actor", 0));
}

#[test]
fn producer_fields_reach_the_consumer() {
    // Each built row, parsed by l0_edge, yields the actor/target/risk/status we put in.
    let graph = build_graph_event(&GraphEventInput {
        component: "gateway".into(),
        category: "runtime".into(),
        action: "tool_invoked".into(),
        actor: NodeRefInput {
            typ: "gateway_actor".into(),
            id: "a|c=t%r".into(),
            ..Default::default()
        },
        subject: NodeRefInput::default(),
        target: NodeRefInput {
            typ: "gateway_tool".into(),
            id: "slack".into(),
            criticality: "high".into(),
            ..Default::default()
        },
        context: vec![("tool".into(), "slack".into())],
        policy: PolicyInput::default(),
        status: "ok".into(),
    });
    let row = graph.event_row();
    let parsed = parse_events(&row).expect("parses");
    let event: &Event = &parsed[0];
    assert_eq!(event.actor_id.as_deref(), Some("a|c=t%r"));
    assert_eq!(event.actor_type.as_deref(), Some("gateway_actor"));
    assert_eq!(event.target_id.as_deref(), Some("slack"));
    assert_eq!(event.target_type.as_deref(), Some("gateway_tool"));
    assert_eq!(
        event.risk_score,
        u32::try_from(graph.risk.score).expect("non-negative")
    );
    assert_eq!(event.status.as_deref(), Some("ok"));
}

#[test]
fn hand_computed_vector() {
    let graph = build_graph_event(&GraphEventInput {
        component: "x".into(),
        category: "runtime".into(),
        action: "deploy".into(),
        actor: NodeRefInput {
            typ: "orchestrator".into(),
            id: "asolaria".into(),
            ..Default::default()
        },
        subject: NodeRefInput::default(),
        target: NodeRefInput {
            typ: "provider".into(),
            id: "openai".into(),
            criticality: "high".into(),
            ..Default::default()
        },
        context: Vec::new(),
        policy: PolicyInput {
            approval_state: "approved".into(),
            autonomous: true,
            ..Default::default()
        },
        status: "failed".into(),
    });
    assert_eq!(graph.risk.score, 11);
    assert_eq!(
        graph.event_row(),
        "EVENT|actor=asolaria|actor_type=orchestrator|target=openai|target_type=provider|risk=11|status=failed"
    );
}
