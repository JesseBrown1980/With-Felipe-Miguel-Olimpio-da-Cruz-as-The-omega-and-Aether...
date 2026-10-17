//! Golden parity tests for the ADDRESS/ROUTE/LOOP ports.
//!
//! Golden hashes were computed independently (hashlib, mirroring the upstream lines) and match the
//! upstream Node modules; `referee_hbp.py` re-derives the full row set. These tests pin the leaf
//! vectors and the structural invariants.

use aether_loop::dispatcher::{hookwall_gate, run_free_agent_mock};
use aether_loop::district_fabric::{hilbert_xy, room_pid, total_default_rooms, DISTRICTS};
use aether_loop::gc_runtime::{CapStatus, GcRuntime};
use aether_loop::github_pid_register::{mint_pid, Kind, Role};
use aether_loop::hookwall::{
    decide_verdict, pass, pass_chain, stamp_pid, Envelope, FischerOutcome, FischerVerdict,
    GateLanes, PassOpts, ScoreFields, Verdict,
};
use aether_loop::js::{is_js_whitespace, js_trim, json_quote, utf16_prefix};
use aether_loop::kernel::run_primitive_loop;
use aether_loop::loop_cycle::{loop_cycle, CycleOpts, LoopCtx};
use aether_loop::omni_engine_loop::{
    gulp_cycle, omni_engine_loop_cycle, omni_flywheel_verdict, omni_quant_score,
};
use aether_loop::pid_minter::{mint_from_index, mint_from_tuple, MintError};
use aether_loop::revolver::PidChainRevolver;
use aether_loop::room_router::{room_id_from_pid, ProjectRoomRouter};
use aether_loop::sha::{sha16, sha8};

const TS: &str = "2026-06-01T00:00:00.000Z";

fn sc_fixture(promoted: bool) -> ScoreFields {
    ScoreFields {
        composite: "0.5".to_string(),
        l0_real: false,
        mark: "M".to_string(),
        reverse_risk: "0.5".to_string(),
        promoted,
        provenance: "baseline:always".to_string(),
    }
}

/// Fixture lanes: a fixed score and Fischer verdict; records the SCORE content and Fischer prev_hash.
struct Lanes {
    verdict: FischerVerdict,
    contents: Vec<String>,
    prev_hashes: Vec<String>,
}

impl Lanes {
    fn new(verdict: FischerVerdict) -> Self {
        Self {
            verdict,
            contents: Vec::new(),
            prev_hashes: Vec::new(),
        }
    }
}

impl GateLanes for Lanes {
    fn score(&mut self, _pid: &str, content: &str) -> ScoreFields {
        self.contents.push(content.to_string());
        sc_fixture(true)
    }

    fn fischer(
        &mut self,
        pid: &str,
        _env: &Envelope,
        _sc: &ScoreFields,
        prev_hash: &str,
    ) -> FischerOutcome {
        self.prev_hashes.push(prev_hash.to_string());
        FischerOutcome {
            verdict: self.verdict,
            row: format!("FISCHER|pid={pid}"),
        }
    }
}

fn env<'a>(pid: Option<&'a str>, actor: &'a str, payload: Option<&'a str>) -> Envelope<'a> {
    Envelope {
        pid,
        actor,
        verb: "answer",
        target: "prism",
        payload,
        payload_sha16: "",
    }
}

fn opts(observe_only: bool, prev_hash: &str) -> PassOpts<'_> {
    PassOpts {
        observe_only,
        prev_hash,
        ts: TS,
        ledger_path: None,
        fischer_ledger_path: None,
    }
}

fn cycle_opts(question: Option<&str>, observe_only: bool) -> CycleOpts<'_> {
    CycleOpts {
        question,
        observe_only,
        ts: TS,
        ledger_path: None,
        fischer_ledger_path: None,
    }
}

#[test]
fn golden_mint_vectors() {
    assert_eq!(
        mint_from_tuple(0, "dev-anchor", "nervous", 2, 256).unwrap(),
        "d1c3b447ffb67e00"
    );
    assert_eq!(mint_from_index(0, 256).unwrap(), "b02c20c49f6ff176");
}

#[test]
fn golden_room_pid() {
    assert_eq!(
        room_pid("engineering", 0),
        "BH.DISTRICT.ENGINEERING.R00000.5972063094B61968"
    );
}

#[test]
fn golden_stamp_pid() {
    let ps = sha16("deterministic-answer-payload");
    let e = Envelope {
        pid: None,
        actor: "engineering",
        verb: "answer",
        target: "prism",
        payload: None,
        payload_sha16: &ps,
    };
    assert_eq!(stamp_pid(&e), "BH.HOOKWALL.7DE1C47492B9028B");
}

#[test]
fn stamp_pid_upstream_unit_test_vector() {
    // tests/unit/asolaria-hookwall.test.mjs:16 envelope; upstream stampPid gives this PID.
    let e = Envelope {
        pid: None,
        actor: "helm",
        verb: "review",
        target: "fabric",
        payload: Some("x"),
        payload_sha16: "",
    };
    assert_eq!(stamp_pid(&e), "BH.HOOKWALL.D9F7EBA9EEA59CB4");
    let explicit = sha16(&json_quote("x"));
    let e2 = Envelope {
        payload_sha16: &explicit,
        ..e
    };
    assert_eq!(stamp_pid(&e2), "BH.HOOKWALL.D9F7EBA9EEA59CB4");
}

#[test]
fn stamp_pid_defaults_and_empty_digest() {
    let none = Envelope {
        pid: None,
        actor: "",
        verb: "",
        target: "",
        payload: None,
        payload_sha16: "",
    };
    let basis = format!("anon|event|fabric|{}", sha16("\"\""));
    assert_eq!(
        stamp_pid(&none),
        format!("BH.HOOKWALL.{}", sha16(&basis).to_uppercase())
    );
}

#[test]
fn js_string_operations() {
    assert_eq!(
        json_quote("q\"b\\\n\u{1}\u{7f}\u{2028}"),
        "\"q\\\"b\\\\\\n\\u0001\u{7f}\u{2028}\""
    );
    assert_eq!(utf16_prefix("ab", 60), "ab");
    let cut = utf16_prefix(&format!("a{}", "\u{1F600}".repeat(30)), 60);
    assert!(cut.ends_with('\u{FFFD}'));
    assert_eq!(cut.encode_utf16().count(), 60);
    assert_eq!(js_trim("\u{FEFF}\u{3000} x \u{2029}"), "x");
    assert_eq!(js_trim("\u{85}x\u{1C}"), "\u{85}x\u{1C}");
    // Node 22: exactly 25 code points satisfy String.fromCodePoint(cp).trim() === ''
    let ws: Vec<u32> = (0..=0x10FFFFu32)
        .filter_map(char::from_u32)
        .filter(|&c| is_js_whitespace(c))
        .map(u32::from)
        .collect();
    assert_eq!(ws.len(), 25);
    assert_eq!((ws[0], ws[24]), (0x9, 0xFEFF));
}

#[test]
fn golden_sha_and_quant() {
    assert_eq!(sha8("asolaria-loop"), "def1f28f");
    assert_eq!(omni_quant_score("x"), 622);
}

#[test]
fn hilbert_known_points() {
    let a = hilbert_xy(128, 0);
    assert_eq!((a.x, a.y), (0, 0));
    let b = hilbert_xy(128, 1000);
    assert_eq!((b.x, b.y), (30, 6));
}

#[test]
fn districts_sum_to_ten_thousand() {
    assert_eq!(DISTRICTS.len(), 6);
    assert_eq!(total_default_rooms(), 10_000);
}

#[test]
fn never_explode_at_one_million() {
    // omni-engine-loop.mjs:97-98 never-explode proof: resident bounded, release = n - cap.
    let g = gulp_cycle(1_000_000, 2000);
    assert_eq!(g.resident, 2000);
    assert_eq!(g.gc_released, 998_000);
    assert!(g.bounded);
}

#[test]
fn flywheel_verdicts() {
    assert_eq!(omni_flywheel_verdict(800).as_str(), "EXTRACT");
    assert_eq!(omni_flywheel_verdict(500).as_str(), "HOLD");
    assert_eq!(omni_flywheel_verdict(100).as_str(), "GC");
}

#[test]
fn revolver_is_deterministic_and_resets() {
    let mut a = PidChainRevolver::new("ANCHOR-X").unwrap();
    let mut b = PidChainRevolver::new("ANCHOR-X").unwrap();
    let seq_a: Vec<String> = (0..5).map(|_| a.next_pid()).collect();
    let seq_b: Vec<String> = (0..5).map(|_| b.next_pid()).collect();
    assert_eq!(seq_a, seq_b);
    a.reset();
    assert_eq!(a.counter, 0);
    assert_eq!(a.next_pid(), seq_a[0]);
}

#[test]
fn revolver_rejects_what_upstream_throws_on() {
    assert!(matches!(
        PidChainRevolver::new(""),
        Err(MintError::BadDevice)
    ));
    assert!(matches!(
        PidChainRevolver::with_alphabet("a", 512),
        Err(MintError::BadAlphabet)
    ));
    assert!(matches!(
        PidChainRevolver::with_alphabet("a", 0),
        Err(MintError::BadAlphabet)
    ));
    assert!(PidChainRevolver::with_alphabet("a", 1024).is_ok());
}

#[test]
fn room_id_counts_utf16_units() {
    assert_eq!(room_id_from_pid(""), None);
    assert_eq!(room_id_from_pid("\u{1F600}abc"), Some(2911));
}

#[test]
fn mint_rejects_bad_inputs() {
    assert_eq!(
        mint_from_tuple(0, "d", "nervous", 2, 512),
        Err(MintError::BadAlphabet)
    );
    assert_eq!(
        mint_from_tuple(300, "d", "nervous", 2, 256),
        Err(MintError::BadActor)
    );
    assert_eq!(
        mint_from_tuple(0, "", "nervous", 2, 256),
        Err(MintError::BadDevice)
    );
    assert_eq!(
        mint_from_tuple(0, "d", "spleen", 2, 256),
        Err(MintError::BadLane)
    );
    assert_eq!(
        mint_from_tuple(0, "d", "nervous", 1, 256),
        Err(MintError::BadPrime)
    );
    assert_eq!(
        mint_from_index(100_000_000_000, 256),
        Err(MintError::IndexOutOfRange)
    );
}

#[test]
fn hookwall_three_outcomes() {
    assert_eq!(
        decide_verdict(true, FischerVerdict::Proceed, true),
        Verdict::ObserveOnly
    );
    assert_eq!(
        decide_verdict(false, FischerVerdict::Block, true),
        Verdict::BlockPreserve
    );
    assert_eq!(
        decide_verdict(false, FischerVerdict::Refute, true),
        Verdict::BlockPreserve
    );
    assert_eq!(
        decide_verdict(false, FischerVerdict::Proceed, true),
        Verdict::FarmGem
    );
    // disagreement (proceed but not promoted) is conservatively preserved
    assert_eq!(
        decide_verdict(false, FischerVerdict::Proceed, false),
        Verdict::BlockPreserve
    );
}

#[test]
fn hookwall_gate_threshold() {
    assert!(!hookwall_gate(7199).pass);
    assert!(hookwall_gate(7200).pass);
    assert_eq!(hookwall_gate(7200).status, "FARM_GEM_WITH_GATES");
    assert_eq!(hookwall_gate(7199).status, "BLOCK_AND_PRESERVE");
}

#[test]
fn pass_chain_links_prev_hash() {
    let envs = [
        env(Some("PID-A"), "d", Some("a")),
        env(None, "d", Some("b")),
        env(Some(""), "", None),
    ];
    let mut lanes = Lanes::new(FischerVerdict::Proceed);
    let results = pass_chain(&envs, &mut lanes, &opts(false, ""));
    assert_eq!(results.len(), 3);
    // each row's prev_hash is the previous row's row_hash; Fischer sees the same chain value
    for i in 1..3 {
        let link = format!("prev_hash={}", results[i - 1].row_hash);
        assert!(results[i].observation.contains(&link));
        assert_eq!(lanes.prev_hashes[i], results[i - 1].row_hash);
    }
    assert_eq!(lanes.prev_hashes[0], "0000000000000000");
    // pid-less and empty-pid envelopes are stamped from the payload's JSON string literal
    assert_eq!(results[1].pid, stamp_pid(&envs[1]));
    assert_eq!(results[2].pid, stamp_pid(&envs[2]));
    // SCORE content: the string payload, or JSON.stringify(verb) without one
    assert_eq!(lanes.contents, ["a", "b", "\"answer\""]);
    assert!(results[2].observation.contains("|actor=anon|"));
    assert!(results.iter().all(|r| r.dual_emit));
}

#[test]
fn pass_appends_fischer_row_before_observation() {
    let dir = std::path::Path::new(env!("CARGO_TARGET_TMPDIR")).join("aether-loop-pass");
    let _ = std::fs::remove_dir_all(&dir);
    let fischer_path = dir.join("fischer").join("ledger.hbp");
    let obs_path = dir.join("obs").join("ledger.hbp");
    let mut lanes = Lanes::new(FischerVerdict::Proceed);
    let o = PassOpts {
        fischer_ledger_path: Some(&fischer_path),
        ledger_path: Some(&obs_path),
        ..opts(false, "")
    };
    let r = pass(&env(Some("PID-F"), "d", Some("x")), &mut lanes, &o);
    assert!(r.observed);
    assert_eq!(
        std::fs::read_to_string(&fischer_path).unwrap(),
        "FISCHER|pid=PID-F\n"
    );
    assert_eq!(
        std::fs::read_to_string(&obs_path).unwrap(),
        format!("{}\n", r.observation)
    );
    // a ledger that cannot be written leaves the gate result unchanged and `observed` false
    let blocked = dir.join("fischer").join("ledger.hbp").join("child.hbp");
    let o = PassOpts {
        fischer_ledger_path: Some(&blocked),
        ledger_path: Some(&blocked),
        ..opts(false, "")
    };
    let r2 = pass(&env(Some("PID-F"), "d", Some("x")), &mut lanes, &o);
    assert!(!r2.observed);
    assert_eq!(r2.observation, r.observation);
    assert_eq!(r2.verdict, Verdict::FarmGem);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn loop_cycle_observe_only_and_question_default() {
    let mut lanes = Lanes::new(FischerVerdict::Proceed);
    let mut ctx = LoopCtx::for_district("engineering", None, 1, None);
    let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(None, true));
    assert_eq!(out.verdict, Verdict::ObserveOnly);
    assert!(out.observation_row.contains("|verdict=OBSERVE_ONLY|"));
    // SCORE is handed the agent answer computed inside the cycle
    assert!(lanes.contents[0].starts_with("[opencode-coder] "));
    // Some("") takes the default probe, as upstream's `opts.question || default`
    let mut a = LoopCtx::for_district("engineering", None, 1, None);
    let mut b = LoopCtx::for_district("engineering", None, 1, None);
    let ra = loop_cycle(&mut a, &mut lanes, &cycle_opts(Some(""), false));
    let rb = loop_cycle(&mut b, &mut lanes, &cycle_opts(None, false));
    assert_eq!(ra.prism_in_row, rb.prism_in_row);
    assert_eq!(ra.verdict, Verdict::FarmGem);
}

#[test]
fn loop_ctx_for_district_matches_run_loop() {
    let ctx = LoopCtx::for_district("council", Some(""), 2, Some(9));
    assert_eq!(ctx.revolver.anchor(), "ASOLARIA-LOOP-COUNCIL");
    assert_eq!(
        ctx.prism_revolver.as_ref().unwrap().anchor(),
        "ASOLARIA-PRISM-ROTATOR-COUNCIL"
    );
    assert_eq!(ctx.room_count, 2000);
    assert_eq!(ctx.prism_room_count, 4000);
    assert_eq!(ctx.gc.gc_every_messages, 9);
    let unknown = LoopCtx::for_district("zzz", Some("A"), 1, None);
    assert_eq!(unknown.revolver.anchor(), "A");
    assert_eq!(unknown.room_count, 2000);
}

#[test]
fn router_counts_swaps_not_noops() {
    let mut r = ProjectRoomRouter::new();
    for next in [0u32, 5, 5, 7, 7, 0] {
        r.plan_swap_to(next);
    }
    assert_eq!(r.swap_count, 3);
    assert_eq!(r.active_room_id, 0);
}

#[test]
fn primitive_loop_scores_answer_sha16() {
    let mut seen = Vec::new();
    let r = run_primitive_loop("engineering", 0, &mut |pid: &str, content: &str| {
        seen.push((pid.to_string(), content.to_string()));
        sc_fixture(false)
    });
    let agent = run_free_agent_mock(
        "opencode-coder",
        "[engineering] default lane probe",
        &r.address,
    );
    assert_eq!(seen, [(r.address.clone(), sha16(&agent.answer))]);
    assert_eq!(r.provenance, "baseline:always");
}

#[test]
fn gc_window_sequence() {
    let mut gc = GcRuntime::with_gc_every(4);
    let mut last = gc.status();
    for _ in 0..10 {
        last = gc.emit();
    }
    assert_eq!(last.total_received, 10);
    assert_eq!(last.runs, 2);
    assert_eq!(last.file_count, 2);
    assert_eq!(last.cap_status, CapStatus::Pass);
}

#[test]
fn gc_cap_thresholds() {
    let mut gc = GcRuntime::with_gc_every(5000);
    let mut caps = Vec::new();
    for n in 1..=2000u64 {
        let s = gc.emit();
        if [1799, 1800, 1999, 2000].contains(&n) {
            caps.push(s.cap_status);
        }
    }
    assert_eq!(
        caps,
        [
            CapStatus::Pass,
            CapStatus::Warn,
            CapStatus::Warn,
            CapStatus::Fail
        ]
    );
    gc.gulp("cli_manual");
    let s = gc.status();
    assert_eq!((s.file_count, s.runs), (0, 1));
    assert_eq!(s.last_gulp_reason.as_deref(), Some("cli_manual"));
}

#[test]
fn flywheel_boundaries() {
    let v: Vec<&str> = [299u32, 300, 699, 700]
        .iter()
        .map(|&s| omni_flywheel_verdict(s).as_str())
        .collect();
    assert_eq!(v, ["GC", "HOLD", "HOLD", "EXTRACT"]);
}

#[test]
fn mint_pid_live_format() {
    // github-pid-register.mjs selfTest shape checks (:126-137)
    let a = mint_pid(Role::Agt, "shannon", 4, 1, Kind::Logical, 1);
    assert_eq!(a.pid, "AGT-SHANNON-PID-HE2EC-A04-W1024-P01-N00001");
    assert!(a.hex.ends_with('C') && a.sector < 113 && a.lane < 3 && a.quad < 4);
    let sup = mint_pid(Role::Sup, "LAW-STUB-AND-RUN", 4, 1, Kind::Logical, 0);
    let prof = mint_pid(Role::Prof, "LAW-STUB-AND-RUN", 4, 1, Kind::Logical, 0);
    assert_eq!(sup.hex[..4], prof.hex[..4]);
    assert!(sup.hex.ends_with('A') && prof.hex.ends_with('B'));
}

#[test]
fn omni_engine_cycle_is_bounded() {
    // omni-engine-loop.mjs selfTest (:101-104)
    let rows: Vec<String> = (0..5000).map(|i| format!("row-{i}")).collect();
    let refs: Vec<&str> = rows.iter().map(String::as_str).collect();
    let c = omni_engine_loop_cycle(&refs, 2000);
    assert_eq!((c.cycle_resident, c.gulp_gc_released), (2000, 3000));
    assert_eq!(c.extracted + c.held + c.gc, 2000);
    assert!(!c.placements.is_empty() && c.placements.len() <= 3);
    assert!(c
        .placements
        .iter()
        .all(|p| p.supervisor_pid.starts_with("SUP-") && p.room.len() == 11));
}

#[test]
fn mock_agent_is_deterministic() {
    let a = run_free_agent_mock("opencode-coder", "q", "PID-1");
    let b = run_free_agent_mock("opencode-coder", "q", "PID-1");
    assert_eq!(a.answer, b.answer);
    assert_eq!(a.self_score_milli, b.self_score_milli);
    assert!(a.self_score_milli < 1000);
    assert!(a.mock);
}
