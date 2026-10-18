// Probes for area "loop-hookwall": exercise each cited injection against the real
// aether-loop::hookwall public API and print/assert the observed values.

use std::path::{Path, PathBuf};

use aether_loop::hookwall::{
    decide_verdict, pass, pass_chain, Envelope, FischerOutcome, FischerVerdict, GateLanes,
    PassOpts, ScoreFields, Verdict,
};
use aether_loop::sha::sha8;

const TS: &str = "2026-06-01T00:00:00.000Z";

// A GateLanes whose SCORE composite/promoted and Fischer verdict are set by the probe.
struct ProbeLanes {
    fischer: FischerVerdict,
    composite: String,
    promoted: bool,
    l0_real: bool,
}

impl GateLanes for ProbeLanes {
    fn score(&mut self, _pid: &str, _content: &str) -> ScoreFields {
        ScoreFields {
            composite: self.composite.clone(),
            l0_real: self.l0_real,
            mark: "M".to_string(),
            reverse_risk: "0.0".to_string(),
            promoted: self.promoted,
            provenance: "probe".to_string(),
        }
    }
    fn fischer(
        &mut self,
        pid: &str,
        _env: &Envelope,
        _sc: &ScoreFields,
        _prev_hash: &str,
    ) -> FischerOutcome {
        FischerOutcome {
            verdict: self.fischer,
            row: format!("FISCHER|pid={pid}"),
        }
    }
}

fn env<'a>(pid: Option<&'a str>, payload: Option<&'a str>) -> Envelope<'a> {
    Envelope {
        pid,
        actor: "engineering",
        verb: "answer",
        target: "prism",
        payload,
        payload_sha16: "",
    }
}

fn opts<'a>(
    observe_only: bool,
    ledger: Option<&'a Path>,
    fischer_ledger: Option<&'a Path>,
) -> PassOpts<'a> {
    PassOpts {
        observe_only,
        prev_hash: "",
        ts: TS,
        ledger_path: ledger,
        fischer_ledger_path: fischer_ledger,
    }
}

// The ~10-line observation-chain verifier that aether does NOT have. Returns the index of the
// first bad row (broken row_hash OR broken prev_hash link), or None if the chain is intact.
fn verify_observation_chain(rows: &[String]) -> Option<usize> {
    let mut prev = "0000000000000000".to_string();
    for (i, row) in rows.iter().enumerate() {
        let Some((base, claimed)) = row.rsplit_once("|row_hash=") else {
            return Some(i);
        };
        if sha8(base) != claimed {
            return Some(i); // row_hash recomputation mismatch
        }
        if !base.contains(&format!("|prev_hash={prev}|")) {
            return Some(i); // chain link broken
        }
        prev = claimed.to_string();
    }
    None
}

fn workdir() -> PathBuf {
    let d = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("work");
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d
}

fn probe_a_promoted_inconsistent_with_composite() {
    println!("\n==== PROBE A  [L0/hookwall_decision] promoted inconsistent w/ composite -> FARM_GEM ====");
    // decide_verdict's signature does not even receive the composite.
    println!("decide_verdict signature = decide_verdict(observe_only, fischer, promoted) -- NO composite arg");
    let v_proceed = decide_verdict(false, FischerVerdict::Proceed, true);
    println!("decide_verdict(false, Proceed, promoted=true) = {:?}", v_proceed);
    assert_eq!(v_proceed, Verdict::FarmGem);

    for comp in ["0.5", "0.0", "-9.9"] {
        let mut lanes = ProbeLanes {
            fischer: FischerVerdict::Proceed,
            composite: comp.to_string(),
            promoted: true,
            l0_real: false,
        };
        let r = pass(&env(Some("PID-A"), Some("x")), &mut lanes, &opts(false, None, None));
        println!(
            "pass(composite={:>5}, promoted=true, Fischer=Proceed) -> verdict={:?} pass={} score_field={} obs_has_score={}",
            comp,
            r.verdict,
            r.pass,
            r.score,
            r.observation.contains(&format!("|score={comp}|"))
        );
        assert_eq!(r.verdict, Verdict::FarmGem, "composite {comp} still promoted to FarmGem");
        assert!(r.pass);
        assert_eq!(r.score, comp);
    }
    println!("=> composite is never consulted; promoted=true + Fischer Proceed always yields FARM_GEM.");
}

fn probe_b_observe_only_with_block_or_refute() {
    println!("\n==== PROBE B  [FABRIC/hookwall_decision] observe_only=true + Fischer BLOCK/REFUTE -> pass=true ====");
    for fv in [FischerVerdict::Block, FischerVerdict::Refute] {
        let mut lanes = ProbeLanes {
            fischer: fv,
            composite: "0.99".to_string(),
            promoted: false,
            l0_real: true,
        };
        let r = pass(&env(Some("PID-B"), Some("x")), &mut lanes, &opts(true, None, None));
        println!(
            "observe_only=true, Fischer={:?} -> verdict={:?} pass={} preserved={} obs_verdict_field={}",
            fv,
            r.verdict,
            r.pass,
            r.preserved,
            r.observation.contains("|verdict=OBSERVE_ONLY|")
        );
        assert_eq!(r.verdict, Verdict::ObserveOnly);
        assert!(r.pass, "Fischer {:?} still passes under observe_only", fv);
        assert!(!r.preserved);
    }
    // Control: without observe_only, the SAME Fischer BLOCK blocks and fails closed.
    let mut lanes = ProbeLanes {
        fischer: FischerVerdict::Block,
        composite: "0.99".to_string(),
        promoted: true,
        l0_real: true,
    };
    let r = pass(&env(Some("PID-B"), Some("x")), &mut lanes, &opts(false, None, None));
    println!(
        "CONTROL observe_only=false, Fischer=Block -> verdict={:?} pass={} preserved={}",
        r.verdict, r.pass, r.preserved
    );
    assert_eq!(r.verdict, Verdict::BlockPreserve);
    assert!(!r.pass);
    println!("=> observe_only short-circuits BEFORE Fischer; a Fischer BLOCK/REFUTE passes with pass=true.");
}

fn probe_c_ledger_unwritable_and_fischer_failure_silent() {
    println!("\n==== PROBE C  [L0/watcher]+[FABRIC/action] ledger unwritable / Fischer append fails -> silent ====");
    let dir = workdir();

    // Baseline: a writable ledger.
    let good_obs = dir.join("obs").join("ledger.hbp");
    let good_fis = dir.join("fis").join("ledger.hbp");
    let mut lanes = ProbeLanes {
        fischer: FischerVerdict::Proceed,
        composite: "0.5".to_string(),
        promoted: true,
        l0_real: false,
    };
    let base = pass(
        &env(Some("PID-C"), Some("x")),
        &mut lanes,
        &opts(false, Some(&good_obs), Some(&good_fis)),
    );
    println!(
        "writable ledger -> verdict={:?} pass={} observed={} obs_written={} fis_written={}",
        base.verdict,
        base.pass,
        base.observed,
        good_obs.exists(),
        good_fis.exists()
    );
    assert!(base.observed && good_obs.exists() && good_fis.exists());

    // Unwritable: parent of the ledger path is a regular file -> create_dir_all + open both fail.
    let blocker = dir.join("afile");
    std::fs::write(&blocker, b"x").unwrap();
    let blocked = blocker.join("child.hbp");
    let r = pass(
        &env(Some("PID-C"), Some("x")),
        &mut lanes,
        &opts(false, Some(&blocked), Some(&blocked)),
    );
    println!(
        "unwritable ledger -> verdict={:?} pass={} observed={} obs_row_unchanged={} blocked_exists={}",
        r.verdict,
        r.pass,
        r.observed,
        r.observation == base.observation,
        blocked.exists()
    );
    assert_eq!(r.verdict, Verdict::FarmGem, "verdict unchanged by failed write");
    assert!(r.pass, "pass unchanged by failed write");
    assert!(!r.observed, "observed=false flags the failed append");
    assert_eq!(r.observation, base.observation, "observation row identical");
    assert!(!blocked.exists());

    // Fischer append fails but observation ledger is fine: observed=true, nothing reflects the
    // Fischer write outcome -> a Fischer append failure is ignored entirely.
    let good_obs2 = dir.join("obs2").join("ledger.hbp");
    let r2 = pass(
        &env(Some("PID-C"), Some("x")),
        &mut lanes,
        &opts(false, Some(&good_obs2), Some(&blocked)),
    );
    let fields: Vec<&str> = [
        "pid", "verdict", "pass", "preserved", "score", "mark", "l0_real", "observation",
        "row_hash", "observed", "dual_emit",
    ]
    .to_vec();
    println!(
        "fischer_append_FAILS, obs_ledger_ok -> verdict={:?} pass={} observed={} obs2_written={} fischer_file_exists={}",
        r2.verdict, r2.pass, r2.observed, good_obs2.exists(), blocked.exists()
    );
    println!(
        "   PassResult fields = {:?}  (none reports the Fischer-write outcome)",
        fields
    );
    assert_eq!(r2.verdict, Verdict::FarmGem);
    assert!(r2.pass && r2.observed && good_obs2.exists());
    assert!(!blocked.exists(), "Fischer row was not written, and the gate did not notice");
    println!("=> failed appends never change verdict/pass; a Fischer-append failure leaves no signal at all.");
}

fn probe_d_altered_row_undetected_but_verifier_would_catch() {
    println!("\n==== PROBE D  [L0/watcher]+[FABRIC/action] observation row altered -> no aether verifier; mine catches it ====");
    let dir = workdir();
    let ledger = dir.join("chain").join("obs.hbp");
    let envs = [
        env(Some("PID-1"), Some("a")),
        env(Some("PID-2"), Some("b")),
        env(Some("PID-3"), Some("c")),
    ];
    let mut lanes = ProbeLanes {
        fischer: FischerVerdict::Proceed,
        composite: "0.5".to_string(),
        promoted: true,
        l0_real: false,
    };
    let results = pass_chain(&envs, &mut lanes, &opts(false, Some(&ledger), None));
    assert_eq!(results.len(), 3);

    let raw = std::fs::read_to_string(&ledger).unwrap();
    let mut rows: Vec<String> = raw.lines().map(str::to_string).collect();
    println!("wrote {} observation rows to {}", rows.len(), ledger.display());
    let clean = verify_observation_chain(&rows);
    println!("verify_observation_chain(clean) = {:?}", clean);
    assert_eq!(clean, None, "freshly written chain verifies");

    // Tamper 1: alter row 1's score field, leave its row_hash as written (naive alteration).
    let orig = rows[1].clone();
    rows[1] = orig.replacen("|score=0.5|", "|score=9.9|", 1);
    assert_ne!(rows[1], orig, "alteration applied");
    let caught = verify_observation_chain(&rows);
    println!("after altering row[1] score 0.5->9.9 (row_hash untouched): verify = {:?}", caught);
    assert_eq!(caught, Some(1), "verifier catches row_hash mismatch");

    // Tamper 2: attacker also recomputes row 1's OWN row_hash over the altered base.
    let (base1, _old) = rows[1].rsplit_once("|row_hash=").unwrap();
    let rehashed = format!("{base1}|row_hash={}", sha8(base1));
    rows[1] = rehashed;
    let caught2 = verify_observation_chain(&rows);
    println!("after re-hashing the altered row[1]: verify = {:?}  (row[2].prev_hash still points at the old hash)", caught2);
    assert_eq!(caught2, Some(2), "chain link to row 2 is broken even after re-hash");

    println!("=> data carries sha8 row_hash + prev_hash chain, so detection IS possible; aether ships no reader/verifier for the hookwall_observation ledger.");
}

fn main() {
    probe_a_promoted_inconsistent_with_composite();
    probe_b_observe_only_with_block_or_refute();
    probe_c_ledger_unwritable_and_fischer_failure_silent();
    probe_d_altered_row_undetected_but_verifier_would_catch();
    println!("\nALL PROBES COMPLETED (asserts held).");
}
