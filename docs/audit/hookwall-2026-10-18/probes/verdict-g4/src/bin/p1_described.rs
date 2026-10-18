//! [FABRIC/output] + [L5/hookwall_decision]: feed the G4 producer's own state strings
//! (g_planes::Latent::as_str(), including the GLSM start state DESCRIBED, and the trio's
//! default-closed "") into gate/verdict::compose and into fischer-eval directly.

use asolaria_server_fischer_eval::evaluate;
use asolaria_verdict::{compose, input_guard, Severity, KNOWN_G4_STATES};
use g_planes::Latent;
use probe_verdict_g4::{show, with};

fn main() {
    println!("KNOWN_G4_STATES = {:?}", KNOWN_G4_STATES);
    let producer_states = [
        Latent::Described,
        Latent::EdgeMined,
        Latent::PathFound,
        Latent::MistakeFlagged,
        Latent::Converged,
    ];
    println!("== every g_planes::Latent string through compose() on the clean envelope ==");
    let mut described_block = false;
    for latent in producer_states {
        let s = latent.as_str();
        let env = with(|e| e.fischer_score.g4_state = s.to_string());
        let guard = input_guard(&env);
        let raw = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict);
        println!(
            "  Latent::{latent:?} -> {s:?}: in KNOWN_G4_STATES={} input_guard={} fired={:?} | fischer raw verdict={} cpl={} flags={:?}",
            KNOWN_G4_STATES.contains(&s),
            guard.severity.as_str(),
            guard.fired,
            raw.verdict.as_str(),
            raw.cpl,
            raw.flags
        );
        let c = show(s, &env);
        if latent == Latent::Described {
            described_block = c.verdict == Severity::Block && guard.fired.contains(&"g4_state_unknown");
        }
    }

    println!("== the same clean envelope with UNKNOWN, \"\" and DESCRIBED ==");
    for s in ["UNKNOWN", "", "DESCRIBED"] {
        let env = with(|e| e.fischer_score.g4_state = s.to_string());
        let raw = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict);
        let c = compose(&env);
        println!(
            "  g4_state={s:?}: fischer-eval alone verdict={} cpl={} g4_state(echo)={:?} pass={} | composed={} input_guard={:?}",
            raw.verdict.as_str(),
            raw.cpl,
            raw.g4_state,
            raw.pass,
            c.verdict.as_str(),
            input_guard(&env).fired
        );
    }

    // Does DESCRIBED BLOCK regardless of the envelope? Sweep a few otherwise-PROCEED/HOLD envelopes.
    println!("== DESCRIBED vs UNKNOWN across verbs/strict/l0 (composed verdicts) ==");
    let mut all_block = true;
    for verb in ["tick", "evaluate", "read", "compact", "write"] {
        for strict in [false, true] {
            for l0 in [false, true] {
                let base = with(|e| {
                    e.fischer_envelope.verb = verb.to_string();
                    e.fischer_strict = strict;
                    e.fischer_score.l0_real = l0;
                });
                let unk = compose(&base).verdict;
                let mut d = base.clone();
                d.fischer_score.g4_state = "DESCRIBED".to_string();
                let des = compose(&d).verdict;
                all_block &= des == Severity::Block;
                println!(
                    "  verb={verb:<8} strict={strict:<5} l0_real={l0:<5} UNKNOWN->{:<7} DESCRIBED->{}",
                    unk.as_str(),
                    des.as_str()
                );
            }
        }
    }
    println!("RESULT described_blocks_clean_envelope_via_g4_state_unknown={described_block} described_blocks_every_swept_envelope={all_block}");
}
