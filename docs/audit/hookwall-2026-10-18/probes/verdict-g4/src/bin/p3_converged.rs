//! [FABRIC/hookwall_decision] + [L5/hookwall_decision] forged g4_state.
//! (a) The cited converged_cannot_lower_fischers_block envelope, printed.
//! (b) A wider grid than the crate test: for every combination of Fischer-relevant envelope flags,
//!     compose() with each lowering state (EDGE_MINED, PATH_FOUND, CONVERGED) is never looser than
//!     with UNKNOWN; count how often raw Fischer alone WAS loosened (so the guard had work to do).
//! (c) Forged strings: wrong case, trailing space, unknown, MISTAKE_FLAGGED.

use asolaria_server_fischer_eval::evaluate;
use asolaria_verdict::{compose, Severity};
use probe_verdict_g4::{no_replay_path, show, with};

fn main() {
    println!("== (a) cited envelope: spawn, no halt, no replay path, pid X1, l0_real=false ==");
    let base = with(|e| {
        e.fischer_envelope.verb = "spawn".into();
        e.fischer_envelope.halt_path = None;
        no_replay_path(&mut e.fischer_envelope);
        e.fischer_envelope.pid = Some("X1".into());
        e.fischer_score.l0_real = false;
    });
    for g4 in ["UNKNOWN", "CONVERGED"] {
        let mut env = base.clone();
        env.fischer_score.g4_state = g4.into();
        let raw = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict);
        println!("  g4={g4}: raw fischer verdict={} cpl={} flags={:?}", raw.verdict.as_str(), raw.cpl, raw.flags);
        show(g4, &env);
    }

    println!("== (b) grid ==");
    let verbs = [
        "tick", "write", "spawn", "promote", "compact", "mint", "seal", "scale", "export", "launch",
    ];
    let lowering = ["EDGE_MINED", "PATH_FOUND", "CONVERGED"];
    let mut combos = 0u64;
    let mut loosened_composed = 0u64;
    let mut raw_loosened = 0u64;
    let mut guard_fired = 0u64;
    for verb in verbs {
        for bits in 0u32..(1 << 12) {
            let b = |i: u32| bits & (1 << i) != 0;
            let env = with(|e| {
                let f = &mut e.fischer_envelope;
                f.verb = verb.into();
                if b(0) { no_replay_path(f); }
                if b(1) { f.halt_path = None; }
                if b(2) { f.pid = Some("X1".into()); }
                if b(3) { f.cosign = Some("c".into()); }
                if b(4) { f.authority_jump = true; }
                if b(5) { f.recursive_consent = true; }
                if b(6) { f.operator_witness_required = true; }
                if b(7) { f.target = String::new(); }
                if b(8) { f.tuple = Some("t".into()); }
                if b(9) { e.fischer_score.l0_real = false; }
                if b(10) { e.fischer_strict = true; }
                if b(11) { e.fischer_score.shannon_q = 950; }
            });
            let neutral = compose(&env).verdict;
            let neutral_raw = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict).verdict;
            for g4 in lowering {
                combos += 1;
                let mut l = env.clone();
                l.fischer_score.g4_state = g4.into();
                let c = compose(&l);
                if c.verdict < neutral {
                    loosened_composed += 1;
                    println!("  LOOSENED: verb={verb} bits={bits:012b} g4={g4}: {} -> {}", neutral.as_str(), c.verdict.as_str());
                }
                let lr = evaluate(&l.fischer_envelope, &l.fischer_score, l.fischer_strict).verdict;
                if asolaria_verdict::from_fischer(lr) < asolaria_verdict::from_fischer(neutral_raw) {
                    raw_loosened += 1;
                }
                if c.reason.contains("g4_state_cannot_loosen") {
                    guard_fired += 1;
                }
            }
        }
    }
    println!("RESULT grid combos={combos} composed_loosened={loosened_composed} raw_fischer_loosened_by_g4={raw_loosened} g4_state_cannot_loosen_fired={guard_fired}");

    println!("== (c) forged strings on the clean envelope ==");
    for g4 in ["converged", "Converged", "CONVERGED ", " CONVERGED", "CONVERGED\u{0}", "bogus", "mistake_flagged", "MISTAKE_FLAGGED", "DESCRIBED", ""] {
        let env = with(|e| e.fischer_score.g4_state = g4.into());
        let raw = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict);
        let c = compose(&env);
        println!(
            "  g4={g4:?}: composed={} input_guard={} fischer={} cpl={} best_alt={} flags={:?}",
            c.verdict.as_str(),
            c.per_gate[4].1.as_str(),
            raw.verdict.as_str(),
            raw.cpl,
            raw.best_alt,
            raw.flags
        );
        assert_eq!(c.verdict, Severity::Block);
    }
}
