//! Layer-5 tighten-only verdict: runs the hookwall, spawn, tier and Fischer gates, plus an input
//! guard, over one [`VerifiedEnvelope`] and returns the strictest result. Deterministic policy only.

#![forbid(unsafe_code)]

use asolaria_hookwall::hookwall::{hookwall_pre, HookContext, HookTier};
use asolaria_hookwall::sign_gate::DEFAULT_DENIES;
use asolaria_hookwall::spawn_gate::{spawn_gate_verdict, SpawnGateInput};
use asolaria_hookwall::syscall::{AccessTier, HookwallVerdict};
use asolaria_hookwall::tier_gate::{self, TierGateVerdict};
use asolaria_server_fischer_eval::{evaluate, FischerEnvelope, FischerScore, FischerVerdict};

/// Gate severity, ordered `Proceed < Hold < Block`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Severity {
    /// Every gate allows the request.
    Proceed,
    /// Wait for more authority or evidence.
    Hold,
    /// Refuse.
    Block,
}

impl Severity {
    /// Every severity, ascending.
    pub const ALL: [Severity; 3] = [Severity::Proceed, Severity::Hold, Severity::Block];

    /// Upper-case wire name.
    pub const fn as_str(self) -> &'static str {
        match self {
            Severity::Proceed => "PROCEED",
            Severity::Hold => "HOLD",
            Severity::Block => "BLOCK",
        }
    }
}

/// Strictest severity in `levels`; an empty slice fails closed to `Block`.
pub fn strictest(levels: &[Severity]) -> Severity {
    levels.iter().copied().max().unwrap_or(Severity::Block)
}

/// Hookwall / spawn-gate verdict to severity (exhaustive: a new variant will not compile).
pub const fn from_hookwall(verdict: HookwallVerdict) -> Severity {
    match verdict {
        HookwallVerdict::Proceed => Severity::Proceed,
        HookwallVerdict::Hold => Severity::Hold,
        HookwallVerdict::Block => Severity::Block,
    }
}

/// Tier-gate verdict to severity: Allow, Escalate, Deny map to Proceed, Hold, Block.
pub const fn from_tier_gate(verdict: TierGateVerdict) -> Severity {
    match verdict {
        TierGateVerdict::Allow => Severity::Proceed,
        TierGateVerdict::Escalate => Severity::Hold,
        TierGateVerdict::Deny => Severity::Block,
    }
}

/// Fischer verdict to severity. ANALYZE is Hold whatever Fischer's own `pass` flag says.
pub const fn from_fischer(verdict: FischerVerdict) -> Severity {
    match verdict {
        FischerVerdict::Proceed => Severity::Proceed,
        FischerVerdict::Hold | FischerVerdict::Analyze => Severity::Hold,
        FischerVerdict::Block | FischerVerdict::Refute => Severity::Block,
    }
}

/// Number of composed gates.
pub const GATE_COUNT: usize = 5;

/// Gate names in `Composed::per_gate` order.
pub const GATE_NAMES: [&str; GATE_COUNT] = [
    "hookwall",
    "spawn_gate",
    "tier_gate",
    "fischer",
    "input_guard",
];

/// `g4_state` values fischer-eval recognises; any other string fails closed in [`input_guard`].
pub const KNOWN_G4_STATES: [&str; 5] = [
    "UNKNOWN",
    "EDGE_MINED",
    "PATH_FOUND",
    "CONVERGED",
    "MISTAKE_FLAGGED",
];

/// `g4_state` values that lower Fischer's CPL.
const LOWERING_G4_STATES: [&str; 3] = ["EDGE_MINED", "PATH_FOUND", "CONVERGED"];

/// fischer-eval's (private) write verbs, mirrored here; a test pins the mirror against it.
pub const FISCHER_WRITE_VERBS: [&str; 7] = [
    "write", "delete", "compact", "seal", "upsert", "drop", "migrate",
];

/// fischer-eval's (private) spawn verbs, mirrored here; a test pins the mirror against it.
pub const FISCHER_SPAWN_VERBS: [&str; 6] =
    ["spawn", "scale", "mint", "fork", "launch", "bootstrap"];

/// Result of [`input_guard`]: its severity and the rules that fired, in check order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Guard {
    /// Strictest severity of the fired rules; Proceed when none fired.
    pub severity: Severity,
    /// Names of the fired rules.
    pub fired: Vec<&'static str>,
}

/// Glue checks for inputs the upstream gates do not fail closed on. Only ever tightens.
///
/// Block: malformed Fischer pid or verb, unknown `g4_state`, or a deny tag in any ASCII case.
/// Hold: write/spawn verb with no replay path. A lowering `g4_state` cannot drop Fischer's severity.
pub fn input_guard(env: &VerifiedEnvelope) -> Guard {
    let fe = &env.fischer_envelope;
    let g4 = env.fischer_score.g4_state.as_str();
    let mut rules: Vec<(&'static str, Severity)> = Vec::new();

    let pid_ok = fe.pid.as_deref().is_some_and(|pid| {
        !pid.is_empty()
            && !pid.chars().any(|c| c.is_whitespace() || c.is_control())
            && !pid.eq_ignore_ascii_case("UNKNOWN")
    });
    if !pid_ok {
        rules.push(("pid_malformed", Severity::Block));
    }
    let verb_ok = !fe.verb.is_empty()
        && fe
            .verb
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_');
    if !verb_ok {
        rules.push(("verb_malformed", Severity::Block));
    }
    if !KNOWN_G4_STATES.contains(&g4) {
        rules.push(("g4_state_unknown", Severity::Block));
    }
    let deny_any_case = env.event_tags.iter().any(|tag| {
        let tag = tag.to_ascii_lowercase();
        DEFAULT_DENIES
            .iter()
            .any(|deny| tag.contains(&deny.to_ascii_lowercase()))
    });
    if deny_any_case {
        rules.push(("deny_tag_any_case", Severity::Block));
    }

    let verb = fe.verb.as_str();
    let write_or_spawn = FISCHER_WRITE_VERBS.contains(&verb) || FISCHER_SPAWN_VERBS.contains(&verb);
    let has_replay_path = [&fe.hbp_path, &fe.sidecar_plan, &fe.ledger_path]
        .iter()
        .any(|path| path.as_deref().is_some_and(|p| !p.is_empty()));
    if write_or_spawn && !has_replay_path {
        rules.push(("no_replay_path_write_or_spawn", Severity::Hold));
    }

    if LOWERING_G4_STATES.contains(&g4) {
        let given = from_fischer(evaluate(fe, &env.fischer_score, env.fischer_strict).verdict);
        let neutral_score = FischerScore {
            g4_state: "UNKNOWN".to_string(),
            ..env.fischer_score.clone()
        };
        let neutral = from_fischer(evaluate(fe, &neutral_score, env.fischer_strict).verdict);
        if neutral > given {
            rules.push(("g4_state_cannot_loosen", neutral));
        }
    }

    Guard {
        severity: rules
            .iter()
            .map(|(_, severity)| *severity)
            .max()
            .unwrap_or(Severity::Proceed),
        fired: rules.into_iter().map(|(name, _)| name).collect(),
    }
}

/// The single input every gate reads. "Verified" is the caller's contract: this crate checks
/// no signature or provenance, and the scores are caller-provided inputs, not measurements.
#[derive(Debug, Clone, PartialEq)]
pub struct VerifiedEnvelope {
    /// Hookwall slot (0..64; out of range blocks).
    pub slot: u8,
    /// Syscall number being gated.
    pub syscall_no: u8,
    /// Caller PID (low 64 bits).
    pub caller_pid: u64,
    /// Hook tier-class read by hookwall and spawn gate.
    pub hook_tier: HookTier,
    /// Caller access tier read by the tier gate.
    pub caller_tier: AccessTier,
    /// Target access tier read by hookwall, spawn gate and tier gate.
    pub target_tier: AccessTier,
    /// Event tags the spawn gate screens against `sign_gate::DEFAULT_DENIES`.
    pub event_tags: Vec<String>,
    /// Forward score, 0..1000, read by the spawn gate.
    pub forward_score_q: u32,
    /// Reverse-gain risk, 0..1000, read by the spawn gate.
    pub reverse_risk_q: u32,
    /// Envelope evaluated by Fischer.
    pub fischer_envelope: FischerEnvelope,
    /// Score evaluated by Fischer.
    pub fischer_score: FischerScore,
    /// Fischer strict mode (strict never yields ANALYZE).
    pub fischer_strict: bool,
}

/// Composed result: the strictest severity, each gate's severity, and a readable reason.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Composed {
    /// Strictest severity across `per_gate`.
    pub verdict: Severity,
    /// Each gate's severity, in `GATE_NAMES` order.
    pub per_gate: [(&'static str, Severity); GATE_COUNT],
    /// Deciding gates plus each gate's raw verdict.
    pub reason: String,
}

/// Runs every gate on `env` and returns the strictest severity (tighten-only).
pub fn compose(env: &VerifiedEnvelope) -> Composed {
    let ctx = HookContext {
        slot: env.slot,
        syscall_no: env.syscall_no,
        caller_pid: env.caller_pid,
        tier: env.hook_tier,
        target_tier: env.target_tier,
    };
    let (hookwall, hookwall_note) = match hookwall_pre(&ctx) {
        Ok(verdict) => (from_hookwall(verdict), format!("{verdict:?}")),
        Err(err) => (Severity::Block, format!("Err({err:?})")),
    };

    let tags: Vec<&str> = env.event_tags.iter().map(String::as_str).collect();
    let spawn_verdict = spawn_gate_verdict(&SpawnGateInput {
        slot: env.slot,
        syscall_no: env.syscall_no,
        caller_pid: env.caller_pid,
        tier: env.hook_tier,
        target_tier: env.target_tier,
        event_tags: &tags,
        forward_score_q: env.forward_score_q,
        reverse_risk_q: env.reverse_risk_q,
    });

    let tier_verdict = tier_gate::check(env.caller_tier, env.target_tier);
    let fischer = evaluate(
        &env.fischer_envelope,
        &env.fischer_score,
        env.fischer_strict,
    );
    let guard = input_guard(env);

    let per_gate = [
        (GATE_NAMES[0], hookwall),
        (GATE_NAMES[1], from_hookwall(spawn_verdict)),
        (GATE_NAMES[2], from_tier_gate(tier_verdict)),
        (GATE_NAMES[3], from_fischer(fischer.verdict)),
        (GATE_NAMES[4], guard.severity),
    ];
    let verdict = strictest(&per_gate.map(|(_, severity)| severity));
    let deciding: Vec<&str> = per_gate
        .iter()
        .filter(|(_, severity)| *severity == verdict)
        .map(|(name, _)| *name)
        .collect();
    let reason = format!(
        "{} by {}; hookwall={} spawn_gate={:?} tier_gate={:?} fischer={} cpl={} flags=[{}] \
         input_guard=[{}]",
        verdict.as_str(),
        deciding.join(","),
        hookwall_note,
        spawn_verdict,
        tier_verdict,
        fischer.verdict.as_str(),
        fischer.cpl,
        fischer.flags.join(","),
        guard.fired.join(","),
    );
    Composed {
        verdict,
        per_gate,
        reason,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn clean() -> VerifiedEnvelope {
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

    fn with(edit: impl FnOnce(&mut VerifiedEnvelope)) -> VerifiedEnvelope {
        let mut env = clean();
        edit(&mut env);
        env
    }

    fn no_replay_path(f: &mut FischerEnvelope) {
        f.hbp_path = None;
        f.sidecar_plan = None;
        f.ledger_path = None;
    }

    fn gate(composed: &Composed, name: &str) -> Severity {
        composed
            .per_gate
            .iter()
            .find(|(gate_name, _)| *gate_name == name)
            .map(|(_, severity)| *severity)
            .expect("gate present")
    }

    fn others_proceed(composed: &Composed, except: &[&str]) {
        for (name, severity) in composed.per_gate {
            if !except.contains(&name) {
                assert_eq!(severity, Severity::Proceed, "{name}: {}", composed.reason);
            }
        }
    }

    fn raw_fischer(env: &VerifiedEnvelope) -> FischerVerdict {
        evaluate(
            &env.fischer_envelope,
            &env.fischer_score,
            env.fischer_strict,
        )
        .verdict
    }

    fn rank(severity: Severity) -> u8 {
        match severity {
            Severity::Proceed => 0,
            Severity::Hold => 1,
            Severity::Block => 2,
        }
    }

    /// Mutations that make exactly one non-Fischer gate Hold or Block.
    fn non_fischer_tightenings() -> Vec<(&'static str, Severity, VerifiedEnvelope)> {
        vec![
            (
                "hook tier Cosign",
                Severity::Hold,
                with(|e| e.hook_tier = HookTier::Cosign),
            ),
            (
                "weak forward score",
                Severity::Hold,
                with(|e| e.forward_score_q = 100),
            ),
            (
                "high reverse risk",
                Severity::Hold,
                with(|e| e.reverse_risk_q = 900),
            ),
            (
                "tier Escalate",
                Severity::Hold,
                with(|e| {
                    e.caller_tier = AccessTier::Restricted;
                    e.target_tier = AccessTier::Hidden;
                }),
            ),
            (
                "hook tier Firmware",
                Severity::Block,
                with(|e| e.hook_tier = HookTier::Firmware),
            ),
            ("slot out of range", Severity::Block, with(|e| e.slot = 64)),
            (
                "deny tag",
                Severity::Block,
                with(|e| e.event_tags.push("drift-detected".to_string())),
            ),
            (
                "tier Deny",
                Severity::Block,
                with(|e| e.target_tier = AccessTier::Secret),
            ),
            (
                "Sovereignty target",
                Severity::Block,
                with(|e| {
                    e.caller_tier = AccessTier::Secret;
                    e.target_tier = AccessTier::Sovereignty;
                }),
            ),
        ]
    }

    /// Each gate's severity computed by calling the gate directly, not through `compose`.
    fn expected_per_gate(env: &VerifiedEnvelope) -> [Severity; GATE_COUNT] {
        let hookwall = match hookwall_pre(&HookContext {
            slot: env.slot,
            syscall_no: env.syscall_no,
            caller_pid: env.caller_pid,
            tier: env.hook_tier,
            target_tier: env.target_tier,
        }) {
            Ok(HookwallVerdict::Proceed) => Severity::Proceed,
            Ok(HookwallVerdict::Hold) => Severity::Hold,
            Ok(HookwallVerdict::Block) | Err(_) => Severity::Block,
        };
        let tags: Vec<&str> = env.event_tags.iter().map(String::as_str).collect();
        let spawn = match spawn_gate_verdict(&SpawnGateInput {
            slot: env.slot,
            syscall_no: env.syscall_no,
            caller_pid: env.caller_pid,
            tier: env.hook_tier,
            target_tier: env.target_tier,
            event_tags: &tags,
            forward_score_q: env.forward_score_q,
            reverse_risk_q: env.reverse_risk_q,
        }) {
            HookwallVerdict::Proceed => Severity::Proceed,
            HookwallVerdict::Hold => Severity::Hold,
            HookwallVerdict::Block => Severity::Block,
        };
        let tier = match tier_gate::check(env.caller_tier, env.target_tier) {
            TierGateVerdict::Allow => Severity::Proceed,
            TierGateVerdict::Escalate => Severity::Hold,
            TierGateVerdict::Deny => Severity::Block,
        };
        let fischer = match raw_fischer(env) {
            FischerVerdict::Proceed => Severity::Proceed,
            FischerVerdict::Hold | FischerVerdict::Analyze => Severity::Hold,
            FischerVerdict::Block | FischerVerdict::Refute => Severity::Block,
        };
        [hookwall, spawn, tier, fischer, input_guard(env).severity]
    }

    #[test]
    fn strictest_is_max_for_every_combination_up_to_five_gates() {
        assert_eq!(strictest(&[]), Severity::Block);
        for len in 1..=5u32 {
            for code in 0..3u32.pow(len) {
                let mut levels = Vec::new();
                let mut rest = code;
                for _ in 0..len {
                    levels.push(Severity::ALL[(rest % 3) as usize]);
                    rest /= 3;
                }
                let max_rank = levels.iter().map(|s| rank(*s)).max().unwrap();
                let got = strictest(&levels);
                assert_eq!(rank(got), max_rank, "{levels:?}");
                assert!(levels.contains(&got));
            }
        }
    }

    #[test]
    fn compose_matches_independently_computed_gates_across_a_grid() {
        let hook_tiers = [HookTier::Micro, HookTier::Cosign, HookTier::Firmware];
        let tiers = [
            AccessTier::Public,
            AccessTier::Restricted,
            AccessTier::Stealth,
            AccessTier::Hidden,
            AccessTier::Shadow,
            AccessTier::Secret,
            AccessTier::Sovereignty,
        ];
        let fischer_cases: [fn(&mut VerifiedEnvelope); 6] = [
            |_| {},
            |e| {
                e.fischer_envelope.verb = "write".to_string();
                no_replay_path(&mut e.fischer_envelope);
            },
            |e| e.fischer_envelope.verb = "promote".to_string(),
            |e| e.fischer_envelope.pid = None,
            |e| e.fischer_envelope.verb = "self_authorize".to_string(),
            |e| e.fischer_score.g4_state = "CONVERGED".to_string(),
        ];
        let mut seen_final = [false; 3];
        let mut seen_tuples = std::collections::BTreeSet::new();
        for slot in [0u8, 64] {
            for hook_tier in hook_tiers {
                for caller_tier in tiers {
                    for target_tier in tiers {
                        for denied in [false, true] {
                            for (forward, risk) in [(800, 100), (100, 900)] {
                                for fischer_case in fischer_cases {
                                    let env = with(|e| {
                                        e.slot = slot;
                                        e.hook_tier = hook_tier;
                                        e.caller_tier = caller_tier;
                                        e.target_tier = target_tier;
                                        if denied {
                                            e.event_tags.push("off-fabric".to_string());
                                        }
                                        e.forward_score_q = forward;
                                        e.reverse_risk_q = risk;
                                        fischer_case(e);
                                    });
                                    let c = compose(&env);
                                    let expected = expected_per_gate(&env);
                                    assert_eq!(
                                        c.per_gate.map(|(_, s)| s),
                                        expected,
                                        "{}",
                                        c.reason
                                    );
                                    assert_eq!(c.per_gate.map(|(name, _)| name), GATE_NAMES);
                                    let max = expected.iter().copied().max().unwrap();
                                    assert_eq!(c.verdict, max, "{}", c.reason);
                                    seen_final[rank(c.verdict) as usize] = true;
                                    seen_tuples.insert(expected);
                                }
                            }
                        }
                    }
                }
            }
        }
        assert_eq!(seen_final, [true; 3]);
        assert!(
            seen_tuples.len() > 20,
            "grid reached {} tuples",
            seen_tuples.len()
        );
    }

    #[test]
    fn verdict_mappings_are_fail_closed() {
        assert_eq!(from_hookwall(HookwallVerdict::Proceed), Severity::Proceed);
        assert_eq!(from_hookwall(HookwallVerdict::Hold), Severity::Hold);
        assert_eq!(from_hookwall(HookwallVerdict::Block), Severity::Block);
        assert_eq!(from_tier_gate(TierGateVerdict::Allow), Severity::Proceed);
        assert_eq!(from_tier_gate(TierGateVerdict::Escalate), Severity::Hold);
        assert_eq!(from_tier_gate(TierGateVerdict::Deny), Severity::Block);
        assert_eq!(from_fischer(FischerVerdict::Proceed), Severity::Proceed);
        assert_eq!(from_fischer(FischerVerdict::Hold), Severity::Hold);
        assert_eq!(from_fischer(FischerVerdict::Analyze), Severity::Hold);
        assert_eq!(from_fischer(FischerVerdict::Block), Severity::Block);
        assert_eq!(from_fischer(FischerVerdict::Refute), Severity::Block);
    }

    #[test]
    fn fischer_proceed_never_loosens_another_gates_hold_or_block() {
        for (label, expected, env) in non_fischer_tightenings() {
            let c = compose(&env);
            assert_eq!(
                gate(&c, "fischer"),
                Severity::Proceed,
                "{label}: {}",
                c.reason
            );
            assert_eq!(c.verdict, expected, "{label}: {}", c.reason);
        }
    }

    #[test]
    fn fischer_converged_cannot_drop_another_gates_block() {
        for (label, expected, env) in non_fischer_tightenings() {
            let mut env = env;
            env.fischer_score.g4_state = "CONVERGED".to_string();
            let c = compose(&env);
            assert_eq!(gate(&c, "fischer"), Severity::Proceed, "{label}");
            assert_eq!(c.verdict, expected, "{label}: {}", c.reason);
        }
    }

    #[test]
    fn converged_keeps_fischers_cosign_halt_and_witness_floors() {
        type FischerEdit = fn(&mut FischerEnvelope);
        let floored: [(&str, FischerEdit); 3] = [
            ("missing cosign", |f| {
                f.verb = "promote".to_string();
                f.cosign = None;
            }),
            ("spawn without halt path", |f| {
                f.verb = "spawn".to_string();
                f.halt_path = None;
            }),
            ("missing operator witness", |f| {
                f.operator_witness_required = true;
                f.operator_witness = false;
            }),
        ];
        for (label, edit) in floored {
            let env = with(|e| {
                e.fischer_score.g4_state = "CONVERGED".to_string();
                edit(&mut e.fischer_envelope);
            });
            let c = compose(&env);
            assert_eq!(gate(&c, "fischer"), Severity::Hold, "{label}: {}", c.reason);
            assert_eq!(c.verdict, Severity::Hold, "{label}: {}", c.reason);
            others_proceed(&c, &["fischer"]);
        }
    }

    #[test]
    fn write_or_spawn_without_replay_path_holds_even_when_fischer_proceeds() {
        // l0_real, a tuple and a BH. pid lift Fischer to PROCEED; its no_replay_path floor is 100.
        for verb in ["write", "spawn", "migrate", "launch"] {
            for strict in [false, true] {
                for g4 in ["UNKNOWN", "CONVERGED"] {
                    let env = with(|e| {
                        e.fischer_envelope.verb = verb.to_string();
                        no_replay_path(&mut e.fischer_envelope);
                        e.fischer_envelope.tuple = Some("t".to_string());
                        e.fischer_strict = strict;
                        e.fischer_score.g4_state = g4.to_string();
                    });
                    let label = format!("{verb} strict={strict} g4={g4}");
                    assert_eq!(raw_fischer(&env), FischerVerdict::Proceed, "{label}");
                    let c = compose(&env);
                    assert_eq!(
                        gate(&c, "input_guard"),
                        Severity::Hold,
                        "{label}: {}",
                        c.reason
                    );
                    assert_eq!(c.verdict, Severity::Hold, "{label}: {}", c.reason);
                    assert!(
                        c.reason.contains("no_replay_path_write_or_spawn"),
                        "{}",
                        c.reason
                    );
                    others_proceed(&c, &["fischer", "input_guard"]);
                }
            }
        }
    }

    #[test]
    fn converged_cannot_lower_fischers_block() {
        let base = with(|e| {
            e.fischer_envelope.verb = "spawn".to_string();
            e.fischer_envelope.halt_path = None;
            no_replay_path(&mut e.fischer_envelope);
            e.fischer_envelope.pid = Some("X1".to_string());
            e.fischer_score.l0_real = false;
        });
        assert_eq!(raw_fischer(&base), FischerVerdict::Block);
        assert_eq!(compose(&base).verdict, Severity::Block);
        let converged = with(|e| {
            *e = base.clone();
            e.fischer_score.g4_state = "CONVERGED".to_string();
        });
        assert_eq!(raw_fischer(&converged), FischerVerdict::Analyze);
        let c = compose(&converged);
        assert_eq!(c.verdict, Severity::Block, "{}", c.reason);
        assert_eq!(gate(&c, "input_guard"), Severity::Block, "{}", c.reason);
        assert!(c.reason.contains("g4_state_cannot_loosen"), "{}", c.reason);
    }

    #[test]
    fn lowering_g4_states_never_loosen_the_composed_verdict() {
        let verbs = ["tick", "write", "spawn", "promote", "compact", "mint"];
        for verb in verbs {
            for strip_proof in [false, true] {
                for strip_halt in [false, true] {
                    for (pid, l0) in [("BH.X", true), ("X1", false)] {
                        for strict in [false, true] {
                            let base = with(|e| {
                                e.fischer_envelope.verb = verb.to_string();
                                if strip_proof {
                                    no_replay_path(&mut e.fischer_envelope);
                                }
                                if strip_halt {
                                    e.fischer_envelope.halt_path = None;
                                }
                                e.fischer_envelope.pid = Some(pid.to_string());
                                e.fischer_score.l0_real = l0;
                                e.fischer_strict = strict;
                            });
                            let neutral = compose(&base).verdict;
                            for g4 in LOWERING_G4_STATES {
                                let mut env = base.clone();
                                env.fischer_score.g4_state = g4.to_string();
                                let c = compose(&env);
                                assert!(c.verdict >= neutral, "{verb} {g4}: {}", c.reason);
                            }
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn fischer_analyze_composes_to_hold_when_every_other_gate_proceeds() {
        let env = with(|e| {
            e.fischer_envelope.verb = "write".to_string();
            no_replay_path(&mut e.fischer_envelope);
        });
        let raw = evaluate(
            &env.fischer_envelope,
            &env.fischer_score,
            env.fischer_strict,
        );
        assert_eq!(raw.verdict, FischerVerdict::Analyze);
        assert!(raw.pass, "Fischer itself marks ANALYZE as pass");
        let c = compose(&env);
        assert_eq!(gate(&c, "fischer"), Severity::Hold);
        assert_eq!(gate(&c, "input_guard"), Severity::Hold);
        assert_eq!(c.verdict, Severity::Hold, "{}", c.reason);
        others_proceed(&c, &["fischer", "input_guard"]);
    }

    #[test]
    fn all_clean_envelope_proceeds() {
        let c = compose(&clean());
        assert_eq!(c.verdict, Severity::Proceed, "{}", c.reason);
        assert!(c.per_gate.iter().all(|(_, s)| *s == Severity::Proceed));
        assert_eq!(c.per_gate.map(|(name, _)| name), GATE_NAMES);
        assert!(c
            .reason
            .starts_with("PROCEED by hookwall,spawn_gate,tier_gate,fischer,input_guard;"));
    }

    #[test]
    fn tier_gate_deny_alone_blocks() {
        let c = compose(&with(|e| e.target_tier = AccessTier::Stealth));
        assert_eq!(gate(&c, "tier_gate"), Severity::Block);
        others_proceed(&c, &["tier_gate"]);
        assert_eq!(c.verdict, Severity::Block);
        assert!(c.reason.starts_with("BLOCK by tier_gate;"), "{}", c.reason);
    }

    #[test]
    fn missing_fischer_pid_blocks() {
        for pid in [None, Some(String::new())] {
            let c = compose(&with(|e| e.fischer_envelope.pid = pid));
            assert_eq!(gate(&c, "fischer"), Severity::Block, "{}", c.reason);
            others_proceed(&c, &["fischer", "input_guard"]);
            assert_eq!(c.verdict, Severity::Block);
            assert!(c.reason.contains("missing_pid"), "{}", c.reason);
        }
    }

    #[test]
    fn blank_or_sentinel_fischer_pid_blocks() {
        for pid in [" ", "\t", "UNKNOWN", "unknown", " BH.X", "BH.X\n", "BH. X"] {
            let env = with(|e| e.fischer_envelope.pid = Some(pid.to_string()));
            let c = compose(&env);
            assert_eq!(
                gate(&c, "input_guard"),
                Severity::Block,
                "{pid:?}: {}",
                c.reason
            );
            assert_eq!(c.verdict, Severity::Block, "{pid:?}");
            assert!(c.reason.contains("pid_malformed"), "{}", c.reason);
        }
        let upstream = with(|e| e.fischer_envelope.pid = Some("UNKNOWN".to_string()));
        assert_eq!(
            raw_fischer(&upstream),
            FischerVerdict::Proceed,
            "upstream gap pinned"
        );
    }

    #[test]
    fn verb_case_and_whitespace_variants_block() {
        let variants = [
            "SELF_AUTHORIZE",
            "Self_Authorize",
            "self_authorize ",
            " self_authorize",
            "self-authorize",
            "BYPASS_HOOKWALL",
            "Delete_Evidence",
            "Write",
            "spawn\t",
        ];
        for verb in variants {
            let c = compose(&with(|e| e.fischer_envelope.verb = verb.to_string()));
            assert_eq!(
                gate(&c, "input_guard"),
                Severity::Block,
                "{verb:?}: {}",
                c.reason
            );
            assert_eq!(c.verdict, Severity::Block, "{verb:?}");
            assert!(c.reason.contains("verb_malformed"), "{}", c.reason);
        }
        let upstream = with(|e| e.fischer_envelope.verb = "SELF_AUTHORIZE".to_string());
        assert_eq!(
            raw_fischer(&upstream),
            FischerVerdict::Proceed,
            "upstream gap pinned"
        );
        let refuted = compose(&with(|e| {
            e.fischer_envelope.verb = "self_authorize".to_string()
        }));
        assert_eq!(gate(&refuted, "fischer"), Severity::Block);
        assert_eq!(gate(&refuted, "input_guard"), Severity::Proceed);
    }

    #[test]
    fn unknown_g4_states_block() {
        for g4 in ["mistake_flagged", "converged", "CONVERGED ", "", "bogus"] {
            let c = compose(&with(|e| e.fischer_score.g4_state = g4.to_string()));
            assert_eq!(
                gate(&c, "input_guard"),
                Severity::Block,
                "{g4:?}: {}",
                c.reason
            );
            assert_eq!(c.verdict, Severity::Block, "{g4:?}");
            assert!(c.reason.contains("g4_state_unknown"), "{}", c.reason);
        }
        for g4 in KNOWN_G4_STATES {
            let c = compose(&with(|e| e.fischer_score.g4_state = g4.to_string()));
            assert!(!c.reason.contains("g4_state_unknown"), "{g4}: {}", c.reason);
        }
    }

    #[test]
    fn deny_tags_match_in_any_ascii_case() {
        for tag in [
            "DRIFT",
            "Drift-detected",
            "hd-virus",
            "Off-Fabric",
            "UNKNOWN-CUBE",
        ] {
            let env = with(|e| e.event_tags.push(tag.to_string()));
            let c = compose(&env);
            assert_eq!(
                gate(&c, "spawn_gate"),
                Severity::Proceed,
                "{tag}: upstream is case-sensitive"
            );
            assert_eq!(
                gate(&c, "input_guard"),
                Severity::Block,
                "{tag}: {}",
                c.reason
            );
            assert_eq!(c.verdict, Severity::Block, "{tag}");
            assert!(c.reason.contains("deny_tag_any_case"), "{}", c.reason);
        }
    }

    /// Analyze is only reachable for fischer-eval's write and spawn verbs, so it pins the mirror.
    #[test]
    fn mirrored_verb_lists_match_fischer_eval() {
        let candidates = [
            "write",
            "delete",
            "compact",
            "seal",
            "upsert",
            "drop",
            "migrate",
            "spawn",
            "scale",
            "mint",
            "fork",
            "launch",
            "bootstrap",
            "gc",
            "drain",
            "prune",
            "archive",
            "promote",
            "authorize",
            "cosign",
            "tick",
            "evaluate",
            "read",
            "export",
            "generate",
            "create",
            "update",
            "remove",
            "start",
            "run",
            "exec",
            "kill",
            "copy",
            "move",
        ];
        for verb in candidates {
            let mut analyze_reachable = false;
            for l0 in [false, true] {
                for empty_target in [false, true] {
                    for bloat in [false, true] {
                        let mut env = FischerEnvelope {
                            pid: Some("X1".to_string()),
                            actor: "helm".to_string(),
                            verb: verb.to_string(),
                            target: if empty_target {
                                String::new()
                            } else {
                                "fabric".to_string()
                            },
                            payload: if bloat {
                                "a".repeat(70_000)
                            } else {
                                "hb".to_string()
                            },
                            cosign: Some("c".to_string()),
                            ..FischerEnvelope::default()
                        };
                        no_replay_path(&mut env);
                        let score = FischerScore {
                            l0_real: l0,
                            ..FischerScore::default()
                        };
                        analyze_reachable |=
                            evaluate(&env, &score, false).verdict == FischerVerdict::Analyze;
                    }
                }
            }
            let mirrored =
                FISCHER_WRITE_VERBS.contains(&verb) || FISCHER_SPAWN_VERBS.contains(&verb);
            assert_eq!(analyze_reachable, mirrored, "{verb}");
        }
    }
}
