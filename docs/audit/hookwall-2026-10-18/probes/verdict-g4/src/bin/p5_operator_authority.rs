//! [FABRIC/action] forged operator authority, tier + Fischer parts only:
//! operator_witness=true (a bare bool) and caller_tier=Sovereignty (a bare label).

use asolaria_hookwall::syscall::AccessTier;
use asolaria_hookwall::tier_gate::{check, TierGateVerdict};
use asolaria_server_fischer_eval::evaluate;
use asolaria_verdict::Severity;
use probe_verdict_g4::{show, with};

const TIERS: [AccessTier; 7] = [
    AccessTier::Public,
    AccessTier::Restricted,
    AccessTier::Stealth,
    AccessTier::Hidden,
    AccessTier::Shadow,
    AccessTier::Secret,
    AccessTier::Sovereignty,
];

fn main() {
    println!("== tier_gate::check(caller, target) for caller=Sovereignty and caller=Secret ==");
    let mut sov_all_allow = true;
    for caller in [AccessTier::Sovereignty, AccessTier::Secret] {
        for target in TIERS {
            let v = check(caller, target);
            if caller == AccessTier::Sovereignty {
                sov_all_allow &= v == TierGateVerdict::Allow;
            }
            println!("  {caller:?} -> {target:?}: {v:?}");
        }
    }

    println!("== compose(): target_tier=Sovereignty with caller Public vs forged caller Sovereignty ==");
    let honest = show("caller=Public target=Sovereignty", &with(|e| e.target_tier = AccessTier::Sovereignty));
    let forged = show("caller=Sovereignty target=Sovereignty", &with(|e| {
        e.caller_tier = AccessTier::Sovereignty;
        e.target_tier = AccessTier::Sovereignty;
    }));
    let forged_secret = show("caller=Sovereignty target=Secret", &with(|e| {
        e.caller_tier = AccessTier::Sovereignty;
        e.target_tier = AccessTier::Secret;
    }));

    println!("== Fischer: operator_witness_required=1 with operator_witness=0 vs forged 1 ==");
    let mut witness = Vec::new();
    for w in [false, true] {
        let env = with(|e| {
            e.fischer_envelope.operator_witness_required = true;
            e.fischer_envelope.operator_witness = w;
        });
        let r = evaluate(&env.fischer_envelope, &env.fischer_score, env.fischer_strict);
        println!("  operator_witness={w}: fischer={} cpl={} flags={:?} best_alt={}", r.verdict.as_str(), r.cpl, r.flags, r.best_alt);
        witness.push(show(&format!("operator_witness={w}"), &env).verdict);
    }
    println!(
        "RESULT sovereignty_caller_allows_all_7_targets={sov_all_allow} public->sov composed={} sov->sov composed={} sov->secret composed={} witness0={} witness1={}",
        honest.verdict.as_str(),
        forged.verdict.as_str(),
        forged_secret.verdict.as_str(),
        witness[0].as_str(),
        witness[1].as_str()
    );
    assert_eq!(forged.verdict, Severity::Proceed);
}
