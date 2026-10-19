//! End to end: model/l0-edge fixture events -> node features -> L0 forward -> asolaria-score
//! signals -> composite -> spawn, Fischer and tighten-only gates.

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_observed::score::{
    composite_e4, forward_score_q, reverse_gain, reverse_risk_q, ReverseGain, Signals,
};
use asolaria_observed::{observe, observe_and_compose, L0Reading, Observed, PolicyInputs};
use asolaria_server_fischer_eval::{
    evaluate, FischerEnvelope, FischerEval, FischerScore, FischerVerdict,
};
use asolaria_verdict::{Composed, Severity, GATE_COUNT, GATE_NAMES};
use l0_edge::event::{parse_events, Event};
use l0_edge::features::{extract_node_features, model_input_q24};
use l0_edge::jsnum::Dbl;
use l0_edge::model::{q24_to_e4, score_pair};

const EVENTS: &str = include_str!("../../../model/l0-edge/tests/fixtures/events.hbp");
const EXPECTED_MODEL: &str =
    include_str!("../../../model/l0-edge/tests/fixtures/expected-model.hbp");

const BENIGN: (&str, &str) = ("agent:benign", "svc:ledger");
const SUSPICIOUS: (&str, &str) = ("agent:rogue", "svc:vault");
const UNOBSERVED: (&str, &str) = ("agent:ghost", "svc:ledger");

const P: Severity = Severity::Proceed;
const H: Severity = Severity::Hold;

fn events() -> Vec<Event> {
    parse_events(EVENTS).expect("fixture events parse")
}

/// gate/verdict's `clean()` request, with `actor -> target` as the L0 request edge.
fn request((actor, target): (&str, &str)) -> PolicyInputs {
    PolicyInputs {
        slot: 0,
        syscall_no: 1,
        caller_pid: 0xABCD,
        hook_tier: HookTier::Micro,
        caller_tier: AccessTier::Public,
        target_tier: AccessTier::Public,
        event_tags: vec!["safe-tag".to_string()],
        fischer_envelope: FischerEnvelope {
            pid: Some("BH.VERDICT.TEST000000000001".to_string()),
            actor: actor.to_string(),
            verb: "tick".to_string(),
            target: target.to_string(),
            payload: "heartbeat".to_string(),
            hbp_path: Some("ledger/test.hbp".to_string()),
            halt_path: Some("/halt".to_string()),
            ..FischerEnvelope::default()
        },
        fischer_strict: false,
    }
}

fn fischer(observed: &Observed) -> FischerEval {
    let env = &observed.envelope;
    evaluate(
        &env.fischer_envelope,
        &env.fischer_score,
        env.fischer_strict,
    )
}

fn severities(composed: &Composed) -> [Severity; GATE_COUNT] {
    assert_eq!(composed.per_gate.map(|(name, _)| name), GATE_NAMES);
    composed.per_gate.map(|(_, severity)| severity)
}

fn fischer_score(composite: &str, l0_real: bool) -> FischerScore {
    FischerScore {
        composite: composite.to_string(),
        l0_real,
        shannon_q: 612,
        shannon_above: true,
        g4_state: "UNKNOWN".to_string(),
    }
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|f| f.strip_prefix(key).and_then(|rest| rest.strip_prefix('=')))
        .unwrap_or_else(|| panic!("{key} in {row}"))
}

fn unescape(value: &str) -> String {
    let mut bytes = Vec::new();
    let mut rest = value;
    while let Some(index) = rest.find('%') {
        bytes.extend_from_slice(&rest.as_bytes()[..index]);
        bytes.push(u8::from_str_radix(&rest[index + 1..index + 3], 16).expect("escape"));
        rest = &rest[index + 3..];
    }
    bytes.extend_from_slice(rest.as_bytes());
    String::from_utf8(bytes).expect("UTF-8")
}

struct PairRow {
    actor: String,
    target: String,
    x: [[i64; 6]; 2],
    out_bits: u32,
    upstream_bits: u32,
    q24: i64,
}

fn pair_rows() -> Vec<PairRow> {
    EXPECTED_MODEL
        .lines()
        .filter_map(|line| line.strip_prefix("PAIR|"))
        .map(|row| {
            let node = |text: &str| -> [i64; 6] {
                let values: Vec<i64> = text.split(',').map(|v| v.parse().expect("q24")).collect();
                values.try_into().expect("6 inputs")
            };
            let (actor_x, target_x) = field(row, "x").split_once(';').expect("two nodes");
            assert_eq!(field(row, "edges"), "0>1");
            PairRow {
                actor: unescape(field(row, "actor")),
                target: unescape(field(row, "target")),
                x: [node(actor_x), node(target_x)],
                out_bits: u32::from_str_radix(field(row, "out_bits"), 16).expect("bits"),
                upstream_bits: u32::from_str_radix(field(row, "upstream_bits"), 16).expect("bits"),
                q24: field(row, "q24").parse().expect("q24"),
            }
        })
        .collect()
}

/// `+score.toFixed(4)` (asolaria-score.mjs:122) of the float32 score inference_server.py:25 returns.
fn to_fixed4_of_float32(bits: u32) -> u32 {
    let exponent = (bits >> 23) & 0xFF;
    assert!(
        bits >> 31 == 0 && exponent <= 127,
        "score in 0..=1: {bits:08x}"
    );
    let fraction = u128::from(bits & 0x7F_FFFF);
    let (mantissa, shift) = if exponent == 0 {
        (fraction, 149)
    } else {
        (fraction | 1 << 23, 150 - exponent)
    };
    if shift >= 64 {
        return 0;
    }
    u32::try_from((mantissa * 20_000 + (1 << shift)) >> (shift + 1)).expect("e4")
}

#[test]
fn same_request_benign_and_suspicious_histories() {
    let listed: Vec<(&str, &str)> = EVENTS
        .lines()
        .filter_map(|line| line.strip_prefix("# REQUEST|"))
        .map(|row| (field(row, "actor"), field(row, "target")))
        .collect();
    assert_eq!(listed, [BENIGN, SUSPICIOUS, UNOBSERVED]);

    let events = events();
    let (benign, benign_composed) = observe_and_compose(&events, request(BENIGN));
    let (suspicious, suspicious_composed) = observe_and_compose(&events, request(SUSPICIOUS));

    assert_eq!(
        benign.l0,
        Some(L0Reading {
            score_q24: 0,
            score_e4: 0
        })
    );
    assert_eq!(
        suspicious.l0,
        Some(L0Reading {
            score_q24: 16_777_206,
            score_e4: 10_000
        })
    );
    for observed in [&benign, &suspicious] {
        let s = &observed.signals;
        // L4 reads the request (pid, payload), the same for both histories; reported, not weighted.
        assert_eq!((s.l4, s.g1, s.g2, s.g3), (Some(5292), None, None, None));
        assert_eq!((s.shannon, s.baseline), (6129, 6350));
    }

    assert_eq!(benign.composite_e4, 2826);
    assert_eq!(
        benign.reverse_gain,
        ReverseGain {
            reverse_risk_e4: 7174,
            promoted: false
        }
    );
    assert_eq!(
        (
            benign.envelope.forward_score_q,
            benign.envelope.reverse_risk_q
        ),
        (282, 718)
    );
    assert_eq!(benign.envelope.fischer_score, fischer_score("0.2826", true));

    assert_eq!(suspicious.composite_e4, 8281);
    assert_eq!(
        suspicious.reverse_gain,
        ReverseGain {
            reverse_risk_e4: 1719,
            promoted: true
        }
    );
    assert_eq!(
        (
            suspicious.envelope.forward_score_q,
            suspicious.envelope.reverse_risk_q
        ),
        (828, 172)
    );
    assert_eq!(
        suspicious.envelope.fischer_score,
        fischer_score("0.8281", true)
    );

    for observed in [&benign, &suspicious] {
        let eval = fischer(observed);
        assert_eq!((eval.verdict, eval.cpl), (FischerVerdict::Proceed, 0));
        assert_eq!(
            eval.flags,
            ["proof_gain_q", "gnn_observable", "reproducible"]
        );
        assert_eq!(eval.axes.center_gain_q, 900);
    }

    assert_eq!(severities(&benign_composed), [P, H, P, P, P]);
    assert_eq!(benign_composed.verdict, Severity::Hold);
    assert!(
        benign_composed.reason.starts_with("HOLD by spawn_gate;"),
        "{}",
        benign_composed.reason
    );
    assert_eq!(severities(&suspicious_composed), [P; GATE_COUNT]);
    assert_eq!(suspicious_composed.verdict, Severity::Proceed);
}

#[test]
fn unobserved_endpoint_gives_no_l0_reading_and_no_gnn_observable() {
    let events = events();
    for pair in [UNOBSERVED, (BENIGN.0, UNOBSERVED.0)] {
        let observed = observe(&events, request(pair));
        assert_eq!((observed.l0, observed.signals.l0), (None, None), "{pair:?}");
        assert!(!observed.envelope.fischer_score.l0_real, "{pair:?}");
    }

    let (ghost, ghost_composed) = observe_and_compose(&events, request(UNOBSERVED));
    assert_eq!(ghost.composite_e4, 6217);
    assert_eq!(
        ghost.reverse_gain,
        ReverseGain {
            reverse_risk_e4: 3783,
            promoted: false
        }
    );
    assert_eq!(
        (
            ghost.envelope.forward_score_q,
            ghost.envelope.reverse_risk_q
        ),
        (621, 379)
    );
    assert_eq!(ghost.envelope.fischer_score, fischer_score("0.6217", false));
    let ghost_eval = fischer(&ghost);
    assert_eq!(
        (ghost_eval.verdict, ghost_eval.cpl),
        (FischerVerdict::Proceed, 0)
    );
    assert_eq!(ghost_eval.flags, ["proof_gain_q", "reproducible"]);
    assert_eq!(ghost_eval.axes.center_gain_q, 700);
    assert_eq!(severities(&ghost_composed), [P, H, P, P, P]);
    assert_eq!(ghost_composed.verdict, Severity::Hold);

    let no_replay_path_witness_pending = |pair| {
        let mut policy = request(pair);
        let envelope = &mut policy.fischer_envelope;
        (
            envelope.hbp_path,
            envelope.sidecar_plan,
            envelope.ledger_path,
        ) = (None, None, None);
        envelope.operator_witness_required = true;
        policy
    };
    let ghost_eval = fischer(&observe(
        &events,
        no_replay_path_witness_pending(UNOBSERVED),
    ));
    let observed_eval = fischer(&observe(&events, no_replay_path_witness_pending(BENIGN)));
    assert_eq!((ghost_eval.cpl, observed_eval.cpl), (340, 240));
    assert_eq!(ghost_eval.cpl, observed_eval.cpl + 100);
    assert_eq!(
        ghost_eval.flags,
        ["missing_operator_witness", "no_replay_path", "reproducible"]
    );
    assert_eq!(
        observed_eval.flags,
        [
            "missing_operator_witness",
            "no_replay_path",
            "gnn_observable",
            "reproducible"
        ]
    );
    assert_eq!(
        (ghost_eval.verdict, observed_eval.verdict),
        (FischerVerdict::Hold, FischerVerdict::Hold)
    );
}

#[test]
fn composite_with_l0_is_the_upstream_weighted_mean_of_l0_shannon_and_baseline() {
    let events = events();
    let weight = |e2| Dbl::decimal(e2, 2);
    let total_weight = Dbl::ZERO + weight(30) + weight(15) + weight(10);
    assert_eq!(total_weight.to_bits(), 0x3FE1_9999_9999_9999);
    let upstream = |l0: u32, shannon: u32, baseline: u32| {
        let signal = |e4: u32| Dbl::decimal(u64::from(e4), 4);
        let sum = Dbl::ZERO
            + signal(l0) * weight(30)
            + signal(shannon) * weight(15)
            + signal(baseline) * weight(10);
        u32::try_from((sum / total_weight).to_fixed_units(4)).expect("e4")
    };
    assert_eq!(upstream(0, 6129, 6350), 2826);
    assert_eq!(upstream(10_000, 6129, 6350), 8281);

    let mut checked = 0;
    for row in pair_rows() {
        let observed = observe(&events, request((row.actor.as_str(), row.target.as_str())));
        let s = &observed.signals;
        let l0 = s.l0.expect("fixture pair is observed");
        assert_eq!(
            observed.composite_e4,
            upstream(l0, s.shannon, s.baseline),
            "{}->{}",
            row.actor,
            row.target
        );
        checked += 1;
    }
    assert_eq!(checked, 174);
}

#[test]
fn policy_inputs_carry_no_score() {
    let events = events();
    let policy = PolicyInputs {
        slot: 0,
        syscall_no: 1,
        caller_pid: 0xABCD,
        hook_tier: HookTier::Micro,
        caller_tier: AccessTier::Public,
        target_tier: AccessTier::Public,
        event_tags: vec!["safe-tag".to_string()],
        fischer_envelope: FischerEnvelope {
            pid: Some("BH.VERDICT.TEST000000000001".to_string()),
            actor: SUSPICIOUS.0.to_string(),
            verb: "tick".to_string(),
            target: SUSPICIOUS.1.to_string(),
            payload: "heartbeat".to_string(),
            payload_json_true: false,
            hbp_path: Some("ledger/test.hbp".to_string()),
            sidecar_plan: Some("fischer-eval-host8".to_string()),
            ledger_path: Some("fischer-eval-host8-ledger.hbp".to_string()),
            tuple: None,
            cube_47d: None,
            cosign: None,
            halt_path: Some("/halt".to_string()),
            authority_jump: false,
            recursive_consent: false,
            operator_witness_required: false,
            operator_witness: false,
        },
        fischer_strict: false,
    };
    assert_eq!(policy, request(SUSPICIOUS));

    let observed = observe(&events, policy.clone());
    let env = &observed.envelope;
    assert_eq!(
        (env.slot, env.syscall_no, env.caller_pid),
        (policy.slot, policy.syscall_no, policy.caller_pid)
    );
    assert_eq!(
        (env.hook_tier, env.caller_tier, env.target_tier),
        (policy.hook_tier, policy.caller_tier, policy.target_tier)
    );
    assert_eq!(env.event_tags, policy.event_tags);
    assert_eq!(env.fischer_envelope, policy.fischer_envelope);
    assert_eq!(env.fischer_strict, policy.fischer_strict);
    assert_eq!(observed.composite_e4, composite_e4(&observed.signals));
    assert_eq!(observed.reverse_gain, reverse_gain(observed.composite_e4));
    assert_eq!(env.forward_score_q, forward_score_q(observed.composite_e4));
    assert_eq!(
        env.reverse_risk_q,
        reverse_risk_q(observed.reverse_gain.reverse_risk_e4)
    );
    assert_eq!(env.fischer_score, fischer_score("0.8281", true));

    let mut other = policy;
    other.slot = 63;
    other.syscall_no = 200;
    other.caller_pid = 7;
    other.hook_tier = HookTier::Firmware;
    other.caller_tier = AccessTier::Secret;
    other.target_tier = AccessTier::Sovereignty;
    other.event_tags = vec!["drift-detected".to_string()];
    other.fischer_strict = true;
    let fe = &mut other.fischer_envelope;
    fe.verb = "spawn".to_string();
    fe.payload_json_true = true;
    (fe.hbp_path, fe.sidecar_plan, fe.ledger_path) = (None, None, None);
    (fe.tuple, fe.cube_47d) = (Some("t".to_string()), Some("c".to_string()));
    (fe.cosign, fe.halt_path) = (Some("cosign".to_string()), None);
    (fe.authority_jump, fe.recursive_consent) = (true, true);
    (fe.operator_witness_required, fe.operator_witness) = (true, true);
    let other_observed = observe(&events, other);
    let other_env = &other_observed.envelope;
    assert_eq!(other_observed.l0, observed.l0);
    assert_eq!(other_observed.signals, observed.signals);
    assert_eq!(other_observed.composite_e4, observed.composite_e4);
    assert_eq!(other_observed.reverse_gain, observed.reverse_gain);
    assert_eq!(
        (other_env.forward_score_q, other_env.reverse_risk_q),
        (env.forward_score_q, env.reverse_risk_q)
    );
    assert_eq!(other_env.fischer_score, env.fischer_score);
}

#[test]
fn same_inputs_give_identical_observed_and_composed() {
    for pair in [BENIGN, SUSPICIOUS, UNOBSERVED] {
        let first = observe_and_compose(&events(), request(pair));
        let second = observe_and_compose(&events(), request(pair));
        assert_eq!(first, second, "{pair:?}");
        assert_eq!(first.0, observe(&events(), request(pair)), "{pair:?}");
    }
}

#[test]
fn observed_l0_reading_chains_features_model_and_torch_score_for_every_fixture_pair() {
    let events = events();
    let nodes = extract_node_features(&events);
    let rows = pair_rows();
    let (mut max_q24_diff, mut equal_q24) = (0u64, 0u32);
    for row in &rows {
        let label = format!("{}->{}", row.actor, row.target);
        let inputs = [&row.actor, &row.target].map(|id| {
            let node = nodes.iter().find(|node| &node.id == id).expect(&label);
            model_input_q24(node)
        });
        assert_eq!(inputs, row.x, "{label}");

        let score_q24 = score_pair(&row.x[0], &row.x[1]);
        let observed = observe(&events, request((row.actor.as_str(), row.target.as_str())));
        assert_eq!(
            observed.l0,
            Some(L0Reading {
                score_q24,
                score_e4: q24_to_e4(score_q24)
            }),
            "{label}"
        );
        assert_eq!(observed.signals.l0, Some(q24_to_e4(score_q24)), "{label}");
        assert_eq!(
            q24_to_e4(score_q24),
            to_fixed4_of_float32(row.out_bits),
            "{label}"
        );
        assert_eq!(
            q24_to_e4(score_q24),
            to_fixed4_of_float32(row.upstream_bits),
            "{label}"
        );
        max_q24_diff = max_q24_diff.max(score_q24.abs_diff(row.q24));
        equal_q24 += u32::from(score_q24 == row.q24);
    }
    println!(
        "CHAIN|pairs={}|equal_q24={equal_q24}|max_q24_diff={max_q24_diff}",
        rows.len()
    );
    assert_eq!((rows.len(), equal_q24, max_q24_diff), (174, 86, 1));
}

/// Events that give the request pair `agent:x -> svc:y` the features of the REQUEST row
/// `e4_midpoint` of expected-model.hbp: (88, 803, 9, 989, 3) and (53, 383, 4, 943, 3).
fn e4_midpoint_events() -> Vec<Event> {
    let event =
        |actor: &str, actor_type: &str, target: &str, target_type: &str, risk, failed| Event {
            actor_id: Some(actor.to_string()),
            actor_type: Some(actor_type.to_string()),
            target_id: Some(target.to_string()),
            target_type: Some(target_type.to_string()),
            risk_score: risk,
            status: Some(if failed { "failed" } else { "ok" }.to_string()),
        };
    let actor_risks = [9; 78].into_iter().chain([1; 5]).chain([0; 5]);
    let target_risks = [4; 50].into_iter().chain([1; 3]);
    let mut events: Vec<Event> = (0..)
        .zip(actor_risks)
        .map(|(i, risk)| event("agent:x", "runtime", "sink:a", "other", risk, i < 87))
        .collect();
    events.extend(
        (0..)
            .zip(target_risks)
            .map(|(i, risk)| event("src:b", "other", "svc:y", "runtime", risk, i < 50)),
    );
    events
}

#[test]
fn l0_e4_one_unit_from_torch_at_a_rounding_midpoint_moves_the_composite_one_unit() {
    let events = e4_midpoint_events();
    let row = EXPECTED_MODEL
        .lines()
        .find_map(|line| line.strip_prefix("REQUEST|case=e4_midpoint|"))
        .expect("REQUEST e4_midpoint row");
    assert_eq!(field(row, "features"), "88,803,9,989,3;53,383,4,943,3");
    let nodes = extract_node_features(&events);
    for (id, features) in [
        ("agent:x", (88, 803, 9, 989, 3)),
        ("svc:y", (53, 383, 4, 943, 3)),
    ] {
        let node = nodes.iter().find(|node| node.id == id).expect(id);
        let got = (
            node.edge_volume,
            node.avg_risk_centi,
            node.max_risk,
            node.failure_rate_milli,
            node.trust_tier,
        );
        assert_eq!(got, features, "{id}");
    }

    let mut policy = request(("agent:x", "svc:y"));
    policy.fischer_envelope.pid = Some("BH.VERDICT.FLIP0000000001882".to_string());
    let (observed, composed) = observe_and_compose(&events, policy);
    assert_eq!(
        observed.l0,
        Some(L0Reading {
            score_q24: 16_773_022,
            score_e4: 9998
        })
    );
    assert_eq!(
        (observed.signals.shannon, observed.signals.baseline),
        (6129, 410)
    );
    assert_eq!(observed.composite_e4, 7200);
    assert_eq!(
        observed.reverse_gain,
        ReverseGain {
            reverse_risk_e4: 2800,
            promoted: true
        }
    );
    assert_eq!(composed.verdict, Severity::Proceed);

    // torch's float32 score of the same request is 16773021 / 2^24: toFixed(4) gives 0.9997.
    let torch_bits = u32::from_str_radix(field(row, "out_bits"), 16).expect("bits");
    assert_eq!(to_fixed4_of_float32(torch_bits), 9997);
    let torch_signals = Signals {
        l0: Some(9997),
        ..observed.signals
    };
    assert_eq!(composite_e4(&torch_signals), 7199);
    assert_eq!(
        reverse_gain(7199),
        ReverseGain {
            reverse_risk_e4: 2801,
            promoted: false
        }
    );
}
