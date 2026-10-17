//! Deterministic HBP-row emitter for the stdlib referee.
//!
//! Every value is computed from fixed inputs (timestamps and SCORE/Fischer outputs are fixtures so the
//! rows are reproducible) and printed as `label<TAB>value`. `referee/referee_hbp.py` recomputes each
//! value independently (hashlib, mirroring the upstream lines) and checks byte equality.

use aether_loop::dispatcher::{
    hookwall_gate, prism_forward_row, revolver_for, rotate_row, run_free_agent_mock,
};
use aether_loop::district_fabric::{
    hilbert_xy, room_coords, room_descriptor_row, room_pid, supervisor_pid, total_default_rooms,
    DISTRICTS,
};
use aether_loop::gc_runtime::{GcRuntime, GcStatus};
use aether_loop::github_pid_register::{mint_pid, Kind, MintedPid, Role};
use aether_loop::glyph::glyph_at;
use aether_loop::hookwall::{
    observation_row, pass, pass_chain, stamp_pid, Envelope, FischerOutcome, FischerVerdict,
    GateLanes, ObsHeader, PassOpts, PassResult, ScoreFields, Verdict,
};
use aether_loop::kernel::run_primitive_loop;
use aether_loop::loop_cycle::{district_room_count, loop_cycle, CycleOpts, CycleOutcome, LoopCtx};
use aether_loop::omni_engine_loop::{
    extract_register_place, gulp_cycle, omni_engine_loop_cycle, omni_flywheel_verdict,
    omni_quant_score, Placement,
};
use aether_loop::pid_minter::{mint_from_index, mint_from_tuple};
use aether_loop::primes::prime_at;
use aether_loop::revolver::PidChainRevolver;
use aether_loop::room_router::{
    room_folder_name, room_id_from_pid, ProjectRoomRouter, RoomSwapPlan,
};
use aether_loop::sha::{sha16, sha8};

const TS: &str = "2026-06-01T00:00:00.000Z";

fn emit(label: &str, value: &str) {
    println!("{label}\t{value}");
}

fn score_fixture() -> ScoreFields {
    // SCORE/Fischer lane outputs are injected; fixed here as referee fixtures.
    ScoreFields {
        composite: "0.667".to_string(),
        l0_real: false,
        mark: "GENIUS".to_string(),
        reverse_risk: "0.333".to_string(),
        promoted: true,
        provenance: "shannon:always+baseline:always".to_string(),
    }
}

/// Fixture lanes: the SCORE fixture and a Fischer verdict per call (cycling `verdicts`), recording
/// what the gate hands each lane so the referee can check the seam inputs.
struct FixtureLanes {
    verdicts: Vec<FischerVerdict>,
    calls: Vec<String>,
}

impl FixtureLanes {
    fn new(verdicts: &[FischerVerdict]) -> Self {
        Self {
            verdicts: verdicts.to_vec(),
            calls: Vec::new(),
        }
    }

    fn take_calls(&mut self) -> String {
        std::mem::take(&mut self.calls).join(";")
    }
}

impl GateLanes for FixtureLanes {
    fn score(&mut self, pid: &str, content: &str) -> ScoreFields {
        self.calls.push(format!("score:{pid}:{}", sha16(content)));
        score_fixture()
    }

    fn fischer(
        &mut self,
        pid: &str,
        env: &Envelope,
        sc: &ScoreFields,
        prev_hash: &str,
    ) -> FischerOutcome {
        let n = self.calls.len();
        self.calls.push(format!(
            "fischer:{pid}:{}:{prev_hash}:{}",
            env.verb, sc.composite
        ));
        FischerOutcome {
            verdict: self.verdicts[n % self.verdicts.len()],
            row: format!("HBPv1|row=fischer_fixture|pid={pid}|prev_hash={prev_hash}|json=0"),
        }
    }
}

fn gc_line(s: &GcStatus) -> String {
    format!(
        "{}/{}/{}/{}/{}/{}",
        s.total_received,
        s.since_last_gulp,
        s.runs,
        s.file_count,
        s.cap_status.as_str(),
        s.last_gulp_reason.as_deref().unwrap_or("null")
    )
}

fn pass_line(r: &PassResult) -> String {
    format!(
        "{}|{}|{}|{}|{}",
        r.pid,
        r.verdict.as_str(),
        r.pass,
        r.preserved,
        r.observation
    )
}

fn cycle_line(o: &CycleOutcome) -> String {
    format!(
        "{}|{}|{}|{}|{}|{}|{}",
        o.agent_pid,
        o.room_id,
        o.rotation,
        o.would_rename,
        o.verdict.as_str(),
        o.gc_runs,
        o.cap_status.as_str()
    )
}

fn minted_line(m: &MintedPid) -> String {
    format!(
        "{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
        m.pid,
        m.name,
        m.hex,
        m.tier,
        m.width,
        m.prime,
        m.nest,
        m.yin_yang.as_str(),
        m.yin_yang_bit,
        m.lane,
        m.quad,
        m.glyph_5,
        m.glyph_1024,
        m.sector,
        m.hilbert,
        m.cube_bh
    ) + &format!("|{}", m.sha16)
}

fn placement_line(p: &Placement) -> String {
    format!(
        "{}|{}|{}|{}|{}",
        p.supervisor_pid, p.sector, p.room, p.catalog, p.process_launch
    )
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

fn main() {
    // pid minter — tuple and index forms
    emit(
        "mint.tuple.a",
        &mint_from_tuple(0, "dev-anchor", "nervous", 2, 256).unwrap(),
    );
    emit(
        "mint.tuple.b",
        &mint_from_tuple(42, "ASOLARIA-DISTRICT-ENGINEERING", "memory", 7919, 1024).unwrap(),
    );
    emit(
        "mint.tuple.c",
        &mint_from_tuple(255, "x", "lymphatic", 31, 256).unwrap(),
    );
    emit("mint.index.a", &mint_from_index(0, 256).unwrap());
    emit("mint.index.b", &mint_from_index(12345, 256).unwrap());
    emit(
        "mint.index.c",
        &mint_from_index(99_999_999_999, 1024).unwrap(),
    );

    // primes + glyph
    emit("prime.0", &prime_at(0).to_string());
    emit("prime.10", &prime_at(10).to_string());
    emit("prime.999", &prime_at(999).to_string());
    emit("glyph.0", &glyph_at(0));
    emit("glyph.255", &glyph_at(255));
    emit("glyph.1023", &glyph_at(1023));

    // hilbert
    let h0 = hilbert_xy(128, 0);
    emit("hilbert.128.0", &format!("{},{}", h0.x, h0.y));
    let h1 = hilbert_xy(128, 1000);
    emit("hilbert.128.1000", &format!("{},{}", h1.x, h1.y));
    let h2 = hilbert_xy(256, 65535);
    emit("hilbert.256.65535", &format!("{},{}", h2.x, h2.y));

    // room pid + coords + descriptor + supervisor
    let pid0 = room_pid("engineering", 0);
    emit("roompid.eng.0", &pid0);
    emit("roompid.eng.1999", &room_pid("engineering", 1999));
    emit("roompid.prism.42", &room_pid("prism", 42));
    for idx in [1u64, 255, 256, 1999, 65537] {
        let pid = room_pid("engineering", idx);
        emit(
            &format!("roomdesc.eng.{idx}"),
            &room_descriptor_row("engineering", idx, &pid, 704, TS),
        );
    }
    let c = room_coords(&pid0);
    emit(
        "roomcoords.eng.0",
        &format!("{}|{}|{}|{}|{}", c.coord64, c.dims, c.cp, c.glyph, c.tuple),
    );
    emit(
        "roomdesc.eng.0",
        &room_descriptor_row("engineering", 0, &pid0, 704, TS),
    );
    emit("supervisor.eng", &supervisor_pid("engineering"));
    emit("districts.total_rooms", &total_default_rooms().to_string());
    emit("districts.count", &DISTRICTS.len().to_string());

    // router
    let rid = |pid: &str| room_id_from_pid(pid).map_or("none".to_string(), |r| r.to_string());
    emit("roomid.pid0", &rid(&pid0));
    emit(
        "roomid.sample",
        &rid("BH.DISTRICT.PRISM.R00042.DEADBEEFDEADBEEF"),
    );
    emit("roomid.nonbmp", &rid("\u{1F600}abc"));
    emit("roomid.empty", &rid(""));
    emit("folder.42", &room_folder_name(42, "omni-room", "behcs-256"));
    let mut router = ProjectRoomRouter::new();
    let kinds: Vec<&str> = [0u32, 5, 5, 7]
        .iter()
        .map(|&next| match router.plan_swap_to(next) {
            RoomSwapPlan::Noop { .. } => "noop",
            RoomSwapPlan::Swap { .. } => "swap",
        })
        .collect();
    emit(
        "router.swaps",
        &format!(
            "{}|swap_count={}|active={}",
            kinds.join(","),
            router.swap_count,
            router.active_room_id
        ),
    );

    // rotation rows (rotor from revolver_for, anchor ASOLARIA-DISTRICT-ENGINEERING)
    let mut rev = revolver_for("engineering");
    emit("revolver_for.anchor", rev.anchor());
    for n in 0..3 {
        let r = rotate_row(&mut rev, "engineering", 2000, TS);
        emit(&format!("rotation.{n}"), &r.stamp_row);
    }
    let err = |r: Result<PidChainRevolver, _>| match r {
        Ok(_) => "ok".to_string(),
        Err(e) => format!("{e:?}"),
    };
    emit("revolver.empty_anchor", &err(PidChainRevolver::new("")));
    emit(
        "revolver.alphabet512",
        &err(PidChainRevolver::with_alphabet("a", 512)),
    );
    let mut rev1024 = PidChainRevolver::with_alphabet("ANCHOR-1024", 1024).unwrap();
    let pids: Vec<String> = (0..3).map(|_| rev1024.next_pid()).collect();
    emit("revolver.1024", &pids.join(","));

    // prism_forward from a known answer row
    let answer_row = "HBPv1|row=room_answer|pid=BH.DISTRICT.ENGINEERING.R00000.ABC123ABC123ABC1|district=engineering|gnn_score=0.8100|gnn_status=FORWARD_GNN_MARK_GENIUS|shannon_H=3.1200|answer_sha16=0123456789abcdef";
    emit("prism_forward.7", &prism_forward_row(answer_row, 7, TS));
    emit(
        "prism_forward.missing",
        &prism_forward_row("HBPv1|row=room_answer|district=x", 3, TS),
    );
    emit(
        "prism_forward.emptypid",
        &prism_forward_row("HBPv1|row=room_answer|pid=|district=x", 3, TS),
    );
    emit(
        "prism_forward.trim_feff",
        &prism_forward_row(
            "\u{FEFF} HBPv1|row=room_answer|pid=P1|district=d|answer_sha16=ab\u{FEFF}\u{3000}",
            4,
            TS,
        ),
    );
    emit(
        "prism_forward.trim_nel",
        &prism_forward_row("HBPv1|row=room_answer|pid=P2\u{85}|district=d\u{1C}", 5, TS),
    );

    // gate thresholds (e4)
    emit("gate.7199", hookwall_gate(7199).status);
    emit("gate.7200", hookwall_gate(7200).status);

    // mock agent: UTF-16 slice of the question
    let mock_q = format!("a{}", "\u{1F600}".repeat(30));
    let m = run_free_agent_mock("opencode-coder", &mock_q, "PID-1");
    emit(
        "mock.cut_pair",
        &format!("{}|{}", m.answer, sha8(&m.answer)),
    );
    let m = run_free_agent_mock("mint-critic", &"\u{E9}".repeat(70), "PID-2");
    emit(
        "mock.bmp70",
        &format!("{}|{}|{}", m.answer, sha8(&m.answer), m.self_score_milli),
    );

    // stamp_pid + observation_row (direct)
    let payload_sha16 = sha16("deterministic-answer-payload");
    let stamp = |actor, verb, target, payload, payload_sha16| {
        stamp_pid(&Envelope {
            pid: None,
            actor,
            verb,
            target,
            payload,
            payload_sha16,
        })
    };
    emit(
        "stamp_pid.a",
        &stamp("engineering", "answer", "prism", None, &payload_sha16),
    );
    emit(
        "stamp_pid.unit_test",
        &stamp("helm", "review", "fabric", Some("x"), ""),
    );
    emit("stamp_pid.defaults", &stamp("", "", "", None, ""));
    emit(
        "stamp_pid.escapes",
        &stamp(
            "a",
            "b",
            "c",
            Some("q\"b\\s\nn\r\t\u{8}\u{c}\u{1}\u{1f}\u{7f}\u{2028}\u{1F600}"),
            "",
        ),
    );
    let sc = score_fixture();
    let header = ObsHeader {
        pid: "BH.HOOKWALL.ABCDEF0123456789",
        actor: "engineering",
        verb: "answer",
        target: "prism",
    };
    let obs = observation_row(&header, Verdict::FarmGem, &sc, "0000000000000000", TS);
    emit("observation.a", &obs.row);
    let header = ObsHeader {
        pid: "P",
        actor: "",
        verb: "",
        target: "",
    };
    let obs = observation_row(&header, Verdict::ObserveOnly, &sc, "", TS);
    emit("observation.defaults", &obs.row);

    // pass / pass_chain through the lanes seam
    let envs = [
        Envelope {
            pid: None,
            actor: "helm",
            verb: "review",
            target: "fabric",
            payload: Some("x"),
            payload_sha16: "",
        },
        Envelope {
            pid: Some("PID-B"),
            actor: "",
            verb: "",
            target: "",
            payload: None,
            payload_sha16: "",
        },
        Envelope {
            pid: Some(""),
            actor: "a",
            verb: "tick",
            target: "t",
            payload: None,
            payload_sha16: "",
        },
    ];
    let mut lanes = FixtureLanes::new(&[
        FischerVerdict::Proceed,
        FischerVerdict::Block,
        FischerVerdict::Refute,
    ]);
    let opts = PassOpts {
        observe_only: false,
        prev_hash: "",
        ts: TS,
        ledger_path: None,
        fischer_ledger_path: None,
    };
    for (n, r) in pass_chain(&envs, &mut lanes, &opts).iter().enumerate() {
        emit(&format!("pass_chain.{n}"), &pass_line(r));
    }
    emit("pass_chain.lanes", &lanes.take_calls());
    let mut lanes = FixtureLanes::new(&[FischerVerdict::Other]);
    let r = pass(&envs[0], &mut lanes, &opts);
    emit("pass.direct", &pass_line(&r));
    emit("pass.direct.lanes", &lanes.take_calls());

    // loop cycle — project_swap + prism_in + observation rows, 2 cycles (runLoop's context)
    let mut ctx = LoopCtx::for_district("engineering", None, 1, None);
    let mut lanes = FixtureLanes::new(&[FischerVerdict::Proceed]);
    for n in 0..2 {
        let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(None, false));
        emit(&format!("loop.{n}.project_swap"), &out.project_swap_row);
        emit(&format!("loop.{n}.prism_in"), &out.prism_in_row);
        emit(&format!("loop.{n}.observation"), &out.observation_row);
        emit(&format!("loop.{n}.outcome"), &cycle_line(&out));
        emit(&format!("loop.{n}.lanes"), &lanes.take_calls());
    }
    // observe-only, empty question, astral question, one prism room
    let mut ctx = LoopCtx::for_district("engineering", Some("ANCHOR-OBS"), 1, None);
    for n in 0..2 {
        let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(None, true));
        emit(&format!("loop_obs.{n}.observation"), &out.observation_row);
        emit(&format!("loop_obs.{n}.outcome"), &cycle_line(&out));
    }
    lanes.take_calls();
    let mut ctx = LoopCtx::for_district("engineering", None, 1, None);
    let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(Some(""), false));
    emit("loop_emptyq.prism_in", &out.prism_in_row);
    let astral = "\u{1F600}".repeat(40);
    let mut ctx = LoopCtx::for_district("engineering", None, 1, None);
    let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(Some(&astral), false));
    emit("loop_astral.prism_in", &out.prism_in_row);
    emit("loop_astral.lanes", &lanes.take_calls());
    let mut ctx = LoopCtx::for_district("council", Some(""), 1, Some(1));
    ctx.prism_room_count = 1;
    for n in 0..2 {
        let out = loop_cycle(&mut ctx, &mut lanes, &cycle_opts(Some("q"), false));
        emit(&format!("loop_prism1.{n}.prism_in"), &out.prism_in_row);
        emit(&format!("loop_prism1.{n}.outcome"), &cycle_line(&out));
    }
    lanes.take_calls();
    let ctx = LoopCtx::for_district("white-room", None, 3, Some(7));
    emit(
        "loop_ctx.white-room",
        &format!(
            "{}|{}|{}|{}|{}",
            ctx.revolver.anchor(),
            ctx.prism_revolver.as_ref().map_or("none", |r| r.anchor()),
            ctx.room_count,
            ctx.prism_room_count,
            ctx.gc.gc_every_messages
        ),
    );
    for (name, scale) in [
        ("prism", 1u64),
        ("white-room", 1),
        ("council", 3),
        ("unknown", 1),
    ] {
        emit(
            &format!("district_room_count.{name}.{scale}"),
            &district_room_count(name, scale).to_string(),
        );
    }

    // Path A primitive loop, SCORE called on (pid, answer_sha16)
    for (district, idx) in [("engineering", 0u64), ("zzz", 7)] {
        let mut seen = String::new();
        let r = run_primitive_loop(district, idx, &mut |pid: &str, content: &str| {
            seen = format!("{pid}:{content}");
            score_fixture()
        });
        emit(
            &format!("kernel.{district}.{idx}"),
            &format!(
                "{}|{}|{}|{}|{}|{}|{}|{}",
                r.address,
                r.agent_type,
                r.hookwall_status,
                r.score,
                r.provenance,
                r.mark,
                r.l0_real,
                seen
            ),
        );
    }

    // gc sequence: window 4, 10 emits
    let mut gc = GcRuntime::with_gc_every(4);
    let mut last = gc.status();
    for _ in 0..10 {
        last = gc.emit();
    }
    emit(
        "gc.after10",
        &format!(
            "total={}|runs={}|file_count={}|since={}|cap={}",
            last.total_received,
            last.runs,
            last.file_count,
            last.since_last_gulp,
            last.cap_status.as_str()
        ),
    );
    // gc cap sequence: default caps (warn 1800, fail 2000), window 5000, then a manual gulp
    let mut gc = GcRuntime::with_gc_every(5000);
    let mut marks = Vec::new();
    for n in 1..=2000u64 {
        let s = gc.emit();
        if [1799, 1800, 1999, 2000].contains(&n) {
            marks.push(gc_line(&s));
        }
    }
    gc.gulp("cli_manual");
    marks.push(gc_line(&gc.status()));
    emit("gc.caps", &marks.join(","));

    // omni-engine-loop
    emit("omniquant.row-0", &omni_quant_score("row-0").to_string());
    emit("omniquant.x", &omni_quant_score("x").to_string());
    let g = gulp_cycle(1_000_000, 2000);
    emit(
        "gulp.1M",
        &format!("{}|{}|{}", g.resident, g.gc_released, g.bounded),
    );
    emit("flywheel.800", omni_flywheel_verdict(800).as_str());
    emit("flywheel.500", omni_flywheel_verdict(500).as_str());
    emit("flywheel.100", omni_flywheel_verdict(100).as_str());
    for score in [299u32, 300, 699, 700] {
        emit(
            &format!("flywheel.{score}"),
            omni_flywheel_verdict(score).as_str(),
        );
    }

    // github-pid-register mintPid + omni-engine extract/register/place + cycle
    emit(
        "mintpid.sup.shannon",
        &minted_line(&mint_pid(Role::Sup, "shannon", 4, 1, Kind::Logical, 0)),
    );
    emit(
        "mintpid.agt.shannon",
        &minted_line(&mint_pid(Role::Agt, "shannon", 4, 1, Kind::Logical, 1)),
    );
    emit(
        "mintpid.prof.mixed",
        &minted_line(&mint_pid(
            Role::Prof,
            "  h\u{E9}llo w\u{F6}rld--\u{DF} ",
            20,
            12,
            Kind::Real,
            3,
        )),
    );
    emit(
        "mintpid.sup.tier_neg",
        &minted_line(&mint_pid(Role::Sup, "-", -3, 0, Kind::Logical, 0)),
    );
    emit(
        "extract.10003",
        &placement_line(&extract_register_place("SUP-FROM-row-1", 10003, 4)),
    );
    emit(
        "extract.neg1",
        &placement_line(&extract_register_place("x", -1, 4)),
    );
    let rows: Vec<String> = (0..5000).map(|i| format!("row-{i}")).collect();
    let row_refs: Vec<&str> = rows.iter().map(String::as_str).collect();
    let cyc = omni_engine_loop_cycle(&row_refs, 2000);
    let placements: Vec<String> = cyc.placements.iter().map(placement_line).collect();
    emit(
        "omni_cycle.5000",
        &format!(
            "{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
            cyc.cycle_resident,
            cyc.gulp_gc_released,
            cyc.never_explode_bound,
            cyc.extracted,
            cyc.held,
            cyc.gc,
            cyc.placements_count,
            cyc.process_launch,
            cyc.pool_launch_gate,
            placements.join(";")
        ),
    );
    let odd = [
        "\u{1F600} key!! with\tspace and a long tails that runs past forty #3",
        "",
        "-lead-1-",
    ];
    let cyc = omni_engine_loop_cycle(&odd, 2000);
    let placements: Vec<String> = cyc.placements.iter().map(placement_line).collect();
    emit(
        "omni_cycle.odd",
        &format!(
            "{}|{}|{}|{}|{}",
            cyc.extracted,
            cyc.held,
            cyc.gc,
            cyc.placements_count,
            placements.join(";")
        ),
    );

    // a sha8 sample so the referee pins the digest helper
    emit("sha8.sample", &sha8("asolaria-loop"));
}
