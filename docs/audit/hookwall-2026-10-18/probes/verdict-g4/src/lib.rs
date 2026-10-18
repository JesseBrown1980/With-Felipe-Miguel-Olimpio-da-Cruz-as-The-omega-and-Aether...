//! Shared helpers for the verdict-g4 probes. The clean envelope mirrors gate/verdict's own
//! test fixture (gate/verdict/src/lib.rs:293-323) and cli/examples/envelope.hbp.

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_server_fischer_eval::{FischerEnvelope, FischerScore};
use asolaria_verdict::{compose, Composed, VerifiedEnvelope};

pub fn clean() -> VerifiedEnvelope {
    VerifiedEnvelope {
        slot: 0,
        syscall_no: 1,
        caller_pid: 0xABCD,
        hook_tier: HookTier::Micro,
        caller_tier: AccessTier::Public,
        target_tier: AccessTier::Public,
        event_tags: vec!["safe-tag".to_string()],
        forward_score_q: 800,
        reverse_risk_q: 100,
        fischer_envelope: FischerEnvelope {
            pid: Some("BH.VERDICT.TEST000000000001".to_string()),
            actor: "helm".to_string(),
            verb: "tick".to_string(),
            target: "fabric".to_string(),
            payload: "heartbeat".to_string(),
            hbp_path: Some("ledger/test.hbp".to_string()),
            halt_path: Some("/halt".to_string()),
            ..FischerEnvelope::default()
        },
        fischer_score: FischerScore {
            composite: "0.85".to_string(),
            l0_real: true,
            shannon_q: 550,
            shannon_above: false,
            g4_state: "UNKNOWN".to_string(),
        },
        fischer_strict: false,
    }
}

pub fn with(edit: impl FnOnce(&mut VerifiedEnvelope)) -> VerifiedEnvelope {
    let mut env = clean();
    edit(&mut env);
    env
}

pub fn no_replay_path(f: &mut FischerEnvelope) {
    f.hbp_path = None;
    f.sidecar_plan = None;
    f.ledger_path = None;
}

pub fn per_gate_str(c: &Composed) -> String {
    c.per_gate
        .iter()
        .map(|(n, s)| format!("{n}={}", s.as_str()))
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn show(label: &str, env: &VerifiedEnvelope) -> Composed {
    let c = compose(env);
    println!("  [{label}] composed={} | {}", c.verdict.as_str(), per_gate_str(&c));
    println!("      reason: {}", c.reason);
    c
}
