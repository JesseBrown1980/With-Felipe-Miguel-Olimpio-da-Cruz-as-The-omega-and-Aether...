//! [FABRIC/hookwall_decision] Any single gate flipped to BLOCK -> composed BLOCK; empty set -> BLOCK.
//! Each injection is applied alone to the clean (all-PROCEED) envelope.

use asolaria_hookwall::syscall::AccessTier;
use asolaria_verdict::{strictest, Severity, GATE_NAMES};
use probe_verdict_g4::{show, with};

fn main() {
    println!("strictest(&[]) = {}", strictest(&[]).as_str());
    let base = show("clean baseline", &with(|_| {}));
    assert_eq!(base.verdict, Severity::Proceed);

    let cases: Vec<(&str, probe_verdict_g4_env::Env)> = vec![
        ("deny tag 'drift-detected'", with(|e| e.event_tags.push("drift-detected".into()))),
        ("deny tag only in upper case 'HD-VIRUS'", with(|e| e.event_tags.push("HD-VIRUS".into()))),
        ("tier Deny (public -> secret)", with(|e| e.target_tier = AccessTier::Secret)),
        ("slot=64", with(|e| e.slot = 64)),
        ("slot=255", with(|e| e.slot = 255)),
        ("Fischer REFUTE (verb self_authorize)", with(|e| e.fischer_envelope.verb = "self_authorize".into())),
        ("Fischer REFUTE (payload_json_true)", with(|e| e.fischer_envelope.payload_json_true = true)),
        ("Fischer BLOCK (MISTAKE_FLAGGED)", with(|e| e.fischer_score.g4_state = "MISTAKE_FLAGGED".into())),
    ];
    let mut all_block = true;
    for (label, env) in cases {
        let c = show(label, &env);
        let blocking: Vec<&str> = c
            .per_gate
            .iter()
            .filter(|(_, s)| *s == Severity::Block)
            .map(|(n, _)| *n)
            .collect();
        println!("      blocking gates: {blocking:?}");
        all_block &= c.verdict == Severity::Block;
    }

    // Exhaustive: for every 5-gate severity tuple with at least one Block, strictest() is Block.
    let mut tuples = 0u32;
    let mut ok = true;
    for code in 0..3u32.pow(GATE_NAMES.len() as u32) {
        let mut v = Vec::new();
        let mut r = code;
        for _ in 0..GATE_NAMES.len() {
            v.push(Severity::ALL[(r % 3) as usize]);
            r /= 3;
        }
        if v.contains(&Severity::Block) {
            tuples += 1;
            ok &= strictest(&v) == Severity::Block;
        }
    }
    println!("RESULT every_single_injection_composed_block={all_block} tuples_with_a_block={tuples} all_strictest_block={ok} empty_is_block={}", strictest(&[]) == Severity::Block);
}

mod probe_verdict_g4_env {
    pub type Env = asolaria_verdict::VerifiedEnvelope;
}
