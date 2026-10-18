//! Hot lane: gate inputs computed from observed graph events, as the asolaria-score pipeline
//! computes them, handed to the tighten-only verdict.

#![forbid(unsafe_code)]

pub mod score;

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_server_fischer_eval::{FischerEnvelope, FischerScore};
use asolaria_verdict::{compose, Composed, VerifiedEnvelope};
use l0_edge::event::Event;
use l0_edge::model::q24_to_e4;
use score::{
    composite_e4, forward_score_q, reverse_gain, reverse_risk_q, sha_baseline_e4, shannon_e4,
    ReverseGain, Signals,
};

/// Every non-GNN policy input. Holds no score, l0, shannon, composite, g4 or forward/reverse field.
#[derive(Debug, Clone, PartialEq)]
pub struct PolicyInputs {
    /// Hookwall slot.
    pub slot: u8,
    /// Syscall number being gated.
    pub syscall_no: u8,
    /// Caller PID (low 64 bits).
    pub caller_pid: u64,
    /// Hook tier-class.
    pub hook_tier: HookTier,
    /// Caller access tier.
    pub caller_tier: AccessTier,
    /// Target access tier.
    pub target_tier: AccessTier,
    /// Event tags screened by the spawn gate.
    pub event_tags: Vec<String>,
    /// Request envelope: pid and payload are scored, actor and target name the L0 request edge.
    pub fischer_envelope: FischerEnvelope,
    /// Fischer strict mode.
    pub fischer_strict: bool,
}

/// L0 EdgeLevelGNN score of the request edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct L0Reading {
    /// Sigmoid output, Q24 in 0..=2^24.
    pub score_q24: i64,
    /// `+l0.toFixed(4)` (asolaria-score.mjs:122) in e4 units.
    pub score_e4: u32,
}

/// Everything [`observe`] computed, and the envelope it hands to the gates.
#[derive(Debug, Clone, PartialEq)]
pub struct Observed {
    /// Gate input: policy fields plus the computed forward/reverse scores and Fischer score.
    pub envelope: VerifiedEnvelope,
    /// L0 reading; `None` when the actor or target was never observed.
    pub l0: Option<L0Reading>,
    /// asolaria-score.mjs signals.
    pub signals: Signals,
    /// `+composite.toFixed(4)` (asolaria-score.mjs:164) in e4 units.
    pub composite_e4: u32,
    /// `reverseGain(composite)` (asolaria-score.mjs:167).
    pub reverse_gain: ReverseGain,
}

/// Computes every GNN-derived gate input from the observed events; nothing score-like comes
/// from the caller.
pub fn observe(events: &[Event], policy: PolicyInputs) -> Observed {
    let request = &policy.fischer_envelope;
    let pid = request.pid.as_deref().unwrap_or("");
    let content = request.payload.as_str();
    let l0 =
        l0_edge::observe_pair(events, &request.actor, &request.target).map(|score_q24| L0Reading {
            score_q24,
            score_e4: q24_to_e4(score_q24),
        });
    let signals = Signals {
        l0: l0.map(|reading| reading.score_e4),
        l4: None,
        g1: None,
        g2: None,
        g3: None,
        shannon: shannon_e4(content),
        baseline: sha_baseline_e4(pid, content),
    };
    let composite_e4 = composite_e4(&signals);
    let reverse_gain = reverse_gain(composite_e4);
    let fischer_score = FischerScore {
        composite: js_number_string(composite_e4),
        l0_real: l0.is_some(),
        shannon_q: u16::try_from(signals.shannon / 10).unwrap_or(u16::MAX),
        shannon_above: signals.shannon % 10 != 0,
        g4_state: "UNKNOWN".to_string(),
    };
    let envelope = VerifiedEnvelope {
        slot: policy.slot,
        syscall_no: policy.syscall_no,
        caller_pid: policy.caller_pid,
        hook_tier: policy.hook_tier,
        caller_tier: policy.caller_tier,
        target_tier: policy.target_tier,
        event_tags: policy.event_tags,
        forward_score_q: forward_score_q(composite_e4),
        reverse_risk_q: reverse_risk_q(reverse_gain.reverse_risk_e4),
        fischer_envelope: policy.fischer_envelope,
        fischer_score,
        fischer_strict: policy.fischer_strict,
    };
    Observed {
        envelope,
        l0,
        signals,
        composite_e4,
        reverse_gain,
    }
}

/// [`observe`], then the tighten-only verdict over its envelope.
pub fn observe_and_compose(events: &[Event], policy: PolicyInputs) -> (Observed, Composed) {
    let observed = observe(events, policy);
    let composed = compose(&observed.envelope);
    (observed, composed)
}

fn js_number_string(e4: u32) -> String {
    let (whole, fraction) = (e4 / 10_000, e4 % 10_000);
    if fraction == 0 {
        return whole.to_string();
    }
    let digits = format!("{fraction:04}");
    format!("{whole}.{}", digits.trim_end_matches('0'))
}

#[cfg(test)]
mod tests {
    use super::js_number_string;

    #[test]
    fn js_number_string_is_the_shortest_decimal_of_every_e4_value() {
        assert_eq!(js_number_string(8500), "0.85");
        assert_eq!(js_number_string(10_000), "1");
        assert_eq!(js_number_string(0), "0");
        assert_eq!(js_number_string(1), "0.0001");
        assert_eq!(js_number_string(1010), "0.101");
        for e4 in 0..=10_000u32 {
            let text = js_number_string(e4);
            let (whole, fraction) = text.split_once('.').unwrap_or((&text, ""));
            assert!(!fraction.ends_with('0') && fraction.len() <= 4, "{text}");
            let units = whole.parse::<u32>().expect("whole") * 10_000
                + format!("{fraction:0<4}").parse::<u32>().expect("fraction");
            assert_eq!(units, e4, "{text}");
        }
    }
}
