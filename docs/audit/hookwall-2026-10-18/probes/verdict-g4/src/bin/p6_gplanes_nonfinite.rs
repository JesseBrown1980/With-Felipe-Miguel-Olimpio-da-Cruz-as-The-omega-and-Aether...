//! [L5/input] NaN / +-Infinity / missing (None) G1/G2/G3 antecedent into g_planes::transition.
//! Shows (1) the output equals prev for every state and slot, (2) it is byte-identical to a legit
//! no-transition, (3) the public signature has no error channel, and (4) when the frozen state is
//! wired by hand into compose(), a NaN reverse_gain that hides MISTAKE_FLAGGED flips BLOCK to PROCEED.

use asolaria_verdict::compose;
use g_planes::{transition, JsNumber, Latent};
use l0_edge::jsnum::Dbl;
use probe_verdict_g4::with;

fn n(units: u64, digits: u32) -> Option<JsNumber> {
    Some(JsNumber::from_dbl(Dbl::decimal(units, digits)))
}
fn neg(units: u64, digits: u32) -> Option<JsNumber> {
    Some(JsNumber::from_bits(Dbl::decimal(units, digits).to_bits() | (1 << 63)))
}

const NAN: Option<JsNumber> = Some(JsNumber::from_bits(0x7FF8_0000_0000_0000));
const NAN_PAYLOAD: Option<JsNumber> = Some(JsNumber::from_bits(0xFFF0_0000_0000_0001));
const POS_INF: Option<JsNumber> = Some(JsNumber::from_bits(0x7FF0_0000_0000_0000));
const NEG_INF: Option<JsNumber> = Some(JsNumber::from_bits(0xFFF0_0000_0000_0000));

fn main() {
    // Compile-time evidence: the signature returns a bare Latent, no Result/Option/flag.
    let _sig: fn(Latent, Option<JsNumber>, Option<JsNumber>, Option<JsNumber>) -> Latent = transition;

    let states = [
        Latent::Described,
        Latent::EdgeMined,
        Latent::PathFound,
        Latent::MistakeFlagged,
        Latent::Converged,
    ];
    // Inputs that WOULD advance each state (honest), so a freeze is visible.
    let advancing = |s: Latent| -> [Option<JsNumber>; 3] {
        match s {
            Latent::Described => [n(8, 1), n(1, 1), n(0, 0)],
            Latent::EdgeMined => [n(8, 1), n(7, 1), n(0, 0)],
            Latent::PathFound => [n(8, 1), n(7, 1), neg(3, 1)],
            Latent::MistakeFlagged => [n(9, 1), n(9, 1), n(1, 1)],
            Latent::Converged => [n(9, 1), n(9, 1), n(8, 1)],
        }
    };
    let bad: [(&str, Option<JsNumber>); 5] = [
        ("NaN", NAN),
        ("NaN(neg,payload)", NAN_PAYLOAD),
        ("+Inf", POS_INF),
        ("-Inf", NEG_INF),
        ("missing", None),
    ];
    let mut cells = 0;
    let mut frozen = 0;
    println!("== transition(prev, honest-advancing inputs with ONE slot replaced) ==");
    for s in states {
        let honest = advancing(s);
        let h = transition(s, honest[0], honest[1], honest[2]);
        print!("  prev={:<15} honest->{:<15}", s.as_str(), h.as_str());
        for slot in 0..3 {
            for (bl, bv) in bad {
                let mut inp = honest;
                inp[slot] = bv;
                let out = transition(s, inp[0], inp[1], inp[2]);
                cells += 1;
                if out == s {
                    frozen += 1;
                }
                if slot == 2 || s == Latent::Described && slot == 0 {
                    print!(" slot{slot}:{bl}->{}", out.as_str());
                }
            }
        }
        println!();
    }
    println!("RESULT bad_input_cells={cells} returned_prev={frozen}");

    // A legit no-transition from PathFound (reverse_gain in [0, 0.5)) vs NaN reverse_gain.
    let legit = transition(Latent::PathFound, n(8, 1), n(7, 1), n(1, 1));
    let nan = transition(Latent::PathFound, n(8, 1), n(7, 1), NAN);
    println!("legit no-transition PathFound(rg=0.1) -> {:?}; NaN rg -> {:?}; identical={}", legit, nan, legit == nan);

    // 100 NaN steps never move off DESCRIBED.
    let mut s = Latent::Described;
    for _ in 0..100 {
        s = transition(s, NAN, NAN, NAN);
    }
    println!("after 100 all-NaN steps from DESCRIBED: {}", s.as_str());

    println!("== hand-wired into compose() (no such wiring exists in aether) ==");
    let honest_state = transition(Latent::PathFound, n(8, 1), n(7, 1), neg(3, 1));
    let nan_state = transition(Latent::PathFound, n(8, 1), n(7, 1), NAN);
    for (label, st) in [("honest rg=-0.3", honest_state), ("NaN rg", nan_state)] {
        let env = with(|e| e.fischer_score.g4_state = st.as_str().into());
        let c = compose(&env);
        println!("  {label}: g4_state={} composed={} | {}", st.as_str(), c.verdict.as_str(), c.reason);
    }
}
