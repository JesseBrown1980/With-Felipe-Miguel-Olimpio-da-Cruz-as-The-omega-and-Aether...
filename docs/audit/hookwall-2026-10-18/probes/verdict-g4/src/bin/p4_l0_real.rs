//! [FABRIC/input] forged l0_real: same envelope with l0_real=true vs false. Prints Fischer cpl,
//! center_gain_q, verdict and the composed verdict, plus a forged forward=1000/risk=0 spawn gate.

use asolaria_server_fischer_eval::evaluate;
use asolaria_verdict::{compose, VerifiedEnvelope};
use probe_verdict_g4::{no_replay_path, with};

fn row(label: &str, env: &VerifiedEnvelope) -> (i32, i32) {
    let mut out = (0, 0);
    print!("  {label:<52}");
    for l0 in [false, true] {
        let mut e = env.clone();
        e.fischer_score.l0_real = l0;
        let r = evaluate(&e.fischer_envelope, &e.fischer_score, e.fischer_strict);
        let c = compose(&e);
        print!(
            " | l0_real={l0:<5} cpl={:<3} center_gain_q={:<4} fischer={:<7} composed={:<7}",
            r.cpl,
            r.axes.center_gain_q,
            r.verdict.as_str(),
            c.verdict.as_str()
        );
        if l0 {
            out.0 -= r.cpl;
            out.1 += i32::from(r.axes.center_gain_q);
        } else {
            out.0 += r.cpl;
            out.1 -= i32::from(r.axes.center_gain_q);
        }
    }
    println!(" || cpl_drop={} center_gain_rise={}", out.0, out.1);
    out
}

fn main() {
    let cases: Vec<(&str, VerifiedEnvelope)> = vec![
        ("A clean example envelope (cli/examples/envelope.hbp)", with(|_| {})),
        ("B tick, no replay path, pid X1", with(|e| {
            no_replay_path(&mut e.fischer_envelope);
            e.fischer_envelope.pid = Some("X1".into());
        })),
        ("C tick, no replay path, pid X1, target empty", with(|e| {
            no_replay_path(&mut e.fischer_envelope);
            e.fischer_envelope.pid = Some("X1".into());
            e.fischer_envelope.target = String::new();
        })),
        ("D authority_jump+cosign, no replay path, pid X1", with(|e| {
            no_replay_path(&mut e.fischer_envelope);
            e.fischer_envelope.pid = Some("X1".into());
            e.fischer_envelope.authority_jump = true;
            e.fischer_envelope.cosign = Some("c".into());
        })),
        ("E promote, no cosign (floor 150)", with(|e| {
            e.fischer_envelope.verb = "promote".into();
        })),
        ("F hard_eval path: MISTAKE_FLAGGED", with(|e| {
            e.fischer_score.g4_state = "MISTAKE_FLAGGED".into();
        })),
        ("G hard_eval path: refute self_authorize", with(|e| {
            e.fischer_envelope.verb = "self_authorize".into();
        })),
        ("H tick, pid X1, entropy 950, recursive_consent", with(|e| {
            e.fischer_envelope.pid = Some("X1".into());
            e.fischer_score.shannon_q = 950;
            e.fischer_envelope.recursive_consent = true;
        })),
    ];
    for (label, env) in &cases {
        row(label, env);
    }

    println!("== forged spawn-gate scores: forward_score_q=1000 reverse_risk_q=0 vs honest 100/900 ==");
    for (fwd, risk) in [(1000u32, 0u32), (100, 900)] {
        let e = with(|e| {
            e.forward_score_q = fwd;
            e.reverse_risk_q = risk;
        });
        let c = compose(&e);
        println!("  forward={fwd} risk={risk}: composed={} spawn_gate={}", c.verdict.as_str(), c.per_gate[1].1.as_str());
    }
}
