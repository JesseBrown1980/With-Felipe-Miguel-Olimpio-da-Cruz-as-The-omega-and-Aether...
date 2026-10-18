// Probes for area l0-chain. Scratch only. Each part prints the observed values so the
// result is evidence, not inference. Deterministic; no floats in the search arithmetic.

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_observed::score::{
    composite_e4, forward_score_q, reverse_gain, reverse_risk_q, sha_baseline_e4, shannon_e4,
    Signals,
};
use asolaria_observed::{observe, observe_and_compose, PolicyInputs};
use asolaria_server_fischer_eval::{evaluate, FischerEnvelope, FischerScore};
use asolaria_verdict::{compose, Severity, VerifiedEnvelope};
use l0_edge::event::{parse_events, Event};

const EVENTS_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../../../model/l0-edge/tests/fixtures/events.hbp");

fn policy(pid: &str, actor: &str, target: &str, payload: &str) -> PolicyInputs {
    PolicyInputs {
        slot: 0,
        syscall_no: 1,
        caller_pid: 0xABCD,
        hook_tier: HookTier::Micro,
        caller_tier: AccessTier::Public,
        target_tier: AccessTier::Public,
        event_tags: vec!["safe-tag".to_string()],
        fischer_envelope: FischerEnvelope {
            pid: Some(pid.to_string()),
            actor: actor.to_string(),
            verb: "tick".to_string(),
            target: target.to_string(),
            payload: payload.to_string(),
            hbp_path: Some("ledger/probe.hbp".to_string()),
            halt_path: Some("/halt".to_string()),
            ..FischerEnvelope::default()
        },
        fischer_strict: false,
    }
}

fn js_num(e4: u32) -> String {
    let (w, f) = (e4 / 10_000, e4 % 10_000);
    if f == 0 {
        w.to_string()
    } else {
        format!("{w}.{}", format!("{f:04}").trim_end_matches('0'))
    }
}

// Part (a): UNOBSERVED actor/target (no L0, no GNN input at all). Search pid/payload for the
// highest composite and show whether the whole request PROCEEDs.
fn part_a() {
    println!("===== PART (a): UNOBSERVED actor, no GNN input, can composite>=7200 and PROCEED? =====");
    // 12 distinct bytes 48..=59 ('0'..';'): byte%12 hits each bin once -> entropy efficiency 1.0.
    let uniform = "0123456789:;";
    let sh = shannon_e4(uniform);
    println!("payload={uniform:?} -> shannon_e4={sh} (max is 10000)");

    let no_events: [Event; 0] = [];
    // Search pids to maximise the sha baseline (hence the composite). Deterministic loop.
    let (mut best_c, mut best_pid, mut best_base) = (0u32, String::new(), 0u32);
    for i in 0..400_000u32 {
        let pid = format!("BH.PROBE.{i}");
        let base = sha_baseline_e4(&pid, uniform);
        let signals = Signals {
            l0: None,
            l4: None,
            g1: None,
            g2: None,
            g3: None,
            shannon: sh,
            baseline: base,
        };
        let c = composite_e4(&signals);
        if c > best_c {
            best_c = c;
            best_pid = pid;
            best_base = base;
        }
        if best_base >= 9990 {
            break;
        }
    }
    println!("best: pid={best_pid:?} baseline={best_base} composite_e4={best_c} (={})", js_num(best_c));

    // Confirm end to end with empty events (zero graph events -> l0 absent).
    let (obs, composed) = observe_and_compose(&no_events, policy(&best_pid, "agent:ghost", "svc:ghost", uniform));
    println!(
        "observe_and_compose(no events): l0={:?} l0_real={} composite_e4={} forward_q={} reverse_q={}",
        obs.l0, obs.envelope.fischer_score.l0_real, obs.composite_e4,
        obs.envelope.forward_score_q, obs.envelope.reverse_risk_q
    );
    println!("  per_gate={:?}", composed.per_gate.map(|(n, s)| (n, s.as_str())));
    println!("  VERDICT={} (PROCEED reachable with NO GNN input = {})",
        composed.verdict.as_str(), composed.verdict == Severity::Proceed);
    assert!(obs.l0.is_none(), "actor must be unobserved");

    // Threshold check: the smallest composite that still PROCEEDs through the spawn-gate score rule.
    // composite 7200 -> forward 720 >= 720, reverse_risk ceil(2800/10)=280 <= 280 -> PROCEED.
    for c in [7199u32, 7200] {
        let rg = reverse_gain(c);
        println!("  composite={c}: forward_q={} reverse_q={} promoted={}",
            forward_score_q(c), reverse_risk_q(rg.reverse_risk_e4), rg.promoted);
    }
    println!();
}

// Part (b): a constant L0 = 10000 for every pair. Show benign vs rogue honest verdicts, then the
// verdicts when L0 is pinned to 10000 for both (score functions called with a fixed l0).
fn part_b(events: &[Event]) {
    println!("===== PART (b): constant L0 = 10000 for every pair =====");
    for (label, actor, target) in [
        ("benign", "agent:benign", "svc:ledger"),
        ("rogue ", "agent:rogue", "svc:vault"),
    ] {
        let pol = e2e_request(actor, target);
        let (obs, composed) = observe_and_compose(events, pol);
        println!(
            "HONEST {label}: l0={:?} composite={} verdict={}",
            obs.l0, obs.composite_e4, composed.verdict.as_str()
        );
    }
    println!("--- now pin L0=10000 for BOTH histories ---");
    for (label, actor, target) in [
        ("benign", "agent:benign", "svc:ledger"),
        ("rogue ", "agent:rogue", "svc:vault"),
    ] {
        let obs = observe(events, e2e_request(actor, target));
        let pinned = Signals { l0: Some(10_000), ..obs.signals };
        let comp = composite_e4(&pinned);
        let rg = reverse_gain(comp);
        let mut env: VerifiedEnvelope = obs.envelope.clone();
        env.forward_score_q = forward_score_q(comp);
        env.reverse_risk_q = reverse_risk_q(rg.reverse_risk_e4);
        env.fischer_score = FischerScore {
            composite: js_num(comp),
            l0_real: true,
            shannon_q: u16::try_from(obs.signals.shannon / 10).unwrap_or(u16::MAX),
            shannon_above: obs.signals.shannon % 10 != 0,
            g4_state: "UNKNOWN".to_string(),
        };
        let c = compose(&env);
        println!(
            "PINNED L0=10000 {label}: shannon={} baseline={} composite={} forward_q={} reverse_q={} promoted={} VERDICT={}",
            obs.signals.shannon, obs.signals.baseline, comp,
            env.forward_score_q, env.reverse_risk_q, rg.promoted, c.verdict.as_str()
        );
    }
    println!();
}

// Part (d): asolaria gate with forged forward_score_q / reverse_risk_q / l0_real. The Fischer
// cpl/center-gain shift is shown directly from evaluate() with l0_real true vs false.
fn part_d() {
    println!("===== PART (d): forged l0_real shifts Fischer cpl(-100) and center_gain(+200) =====");
    let env = FischerEnvelope {
        pid: Some("BH.VERDICT.FORGED0000000001".to_string()),
        actor: "helm".to_string(),
        verb: "tick".to_string(),
        target: "fabric".to_string(),
        payload: "heartbeat".to_string(),
        hbp_path: Some("ledger/example.hbp".to_string()),
        halt_path: Some("/halt".to_string()),
        ..FischerEnvelope::default()
    };
    for l0_real in [false, true] {
        let score = FischerScore {
            composite: "0.99".to_string(),
            l0_real,
            shannon_q: 550,
            shannon_above: false,
            g4_state: "UNKNOWN".to_string(),
        };
        let r = evaluate(&env, &score, false);
        println!(
            "clean env  l0_real={l0_real}: cpl={} center_gain_q={} verdict={} flags={:?}",
            r.cpl, r.axes.center_gain_q, r.verdict.as_str(), r.flags
        );
    }
    // In-range envelope (no replay path + operator witness required) so the -100 cpl is NOT floored.
    let mut env2 = env.clone();
    env2.hbp_path = None;
    env2.sidecar_plan = None;
    env2.ledger_path = None;
    env2.operator_witness_required = true;
    for l0_real in [false, true] {
        let score = FischerScore {
            composite: "0.5".to_string(),
            l0_real,
            shannon_q: 550,
            shannon_above: false,
            g4_state: "UNKNOWN".to_string(),
        };
        let r = evaluate(&env2, &score, false);
        println!(
            "in-range   l0_real={l0_real}: cpl={} center_gain_q={} verdict={} flags={:?}",
            r.cpl, r.axes.center_gain_q, r.verdict.as_str(), r.flags
        );
    }
    println!();
}

fn e2e_request(actor: &str, target: &str) -> PolicyInputs {
    policy("BH.VERDICT.TEST000000000001", actor, target, "heartbeat")
}

fn main() {
    part_a();
    let text = std::fs::read_to_string(EVENTS_PATH).expect("events fixture");
    let events = parse_events(&text).expect("events parse");
    part_b(&events);
    part_d();
}
