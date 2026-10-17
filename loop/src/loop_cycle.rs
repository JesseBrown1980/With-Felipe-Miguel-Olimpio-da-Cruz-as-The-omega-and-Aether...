//! The free-agent loop cycle, composed from the proven parts (bigpickle asolaria-loop.mjs:26-103).
//!
//! One cycle: revolver -> room select + rename-before-load (`row=project_swap`) -> mock free agent ->
//! hookwall pass (the SCORE/Fischer lanes called through [`GateLanes`]) -> second prism PID +
//! `row=prism_in` -> GC emit. The live opencode spawn and the filesystem writes (the `ROOM.hbp` marker,
//! :43-46, and the prism append, :69-78) are the integrator's lanes; the rows they write are returned,
//! built with a supplied timestamp. `runLoop`'s per-verdict tally (:104-118) is kept by the caller from
//! each [`CycleOutcome`].

use std::path::Path;

use crate::dispatcher::run_free_agent_mock;
use crate::district_fabric::DISTRICTS;
use crate::gc_runtime::{CapStatus, GcRuntime, DEFAULT_GC_EVERY_MESSAGES};
use crate::hookwall::{pass, Envelope, GateLanes, PassOpts, Verdict};
use crate::revolver::PidChainRevolver;
use crate::room_router::{ProjectRoomRouter, RoomSwapPlan};
use crate::sha::sha8;

/// Rooms of the named district at `scale`, 2000 for a name outside the catalog (asolaria-loop.mjs:26-29).
pub fn district_room_count(name: &str, scale: u64) -> u64 {
    DISTRICTS
        .iter()
        .find(|d| d.name == name)
        .map_or(2000, |d| d.rooms)
        * scale
}

/// Loop context: the proven modules plus the rolling observation hash and the optional prism rotor.
pub struct LoopCtx {
    pub revolver: PidChainRevolver,
    pub router: ProjectRoomRouter,
    pub gc: GcRuntime,
    pub district: String,
    pub room_count: u64,
    pub prev_hash: String,
    pub prism_revolver: Option<PidChainRevolver>,
    pub prism_room_count: u64,
}

impl LoopCtx {
    /// The context `runLoop` builds (asolaria-loop.mjs:90-103): anchor `anchor` or
    /// `ASOLARIA-LOOP-<UPPER>`, prism rotor `ASOLARIA-PRISM-ROTATOR-<UPPER>`, room counts from
    /// [`district_room_count`] (prism rooms from `prism`), GC window `gc_every` or 2000, active room 0.
    /// `scale` is upstream's `opts.scale` (default `ASOLARIA_ROOM_SCALE` or 1, read by the caller).
    pub fn for_district(
        district: &str,
        anchor: Option<&str>,
        scale: u64,
        gc_every: Option<u64>,
    ) -> Self {
        let upper = district.to_uppercase();
        let anchor = match anchor {
            Some(a) if !a.is_empty() => a.to_string(),
            _ => format!("ASOLARIA-LOOP-{upper}"),
        };
        let prism_anchor = format!("ASOLARIA-PRISM-ROTATOR-{upper}");
        LoopCtx {
            revolver: PidChainRevolver::new(&anchor).expect("the anchor is non-empty"),
            router: ProjectRoomRouter::new(),
            gc: GcRuntime::with_gc_every(gc_every.unwrap_or(DEFAULT_GC_EVERY_MESSAGES)),
            district: district.to_string(),
            room_count: district_room_count(district, scale),
            prev_hash: "0000000000000000".to_string(),
            prism_revolver: Some(
                PidChainRevolver::new(&prism_anchor).expect("the anchor is non-empty"),
            ),
            prism_room_count: district_room_count("prism", scale),
        }
    }
}

/// Per-cycle options (asolaria-loop.mjs:32 `opts`). Under upstream `dryRun` both ledger paths are `None`.
pub struct CycleOpts<'a> {
    /// `opts.question`; `None` or `""` takes the default probe (:48 `||`).
    pub question: Option<&'a str>,
    /// `opts.observeOnly`, spread into the hookwall pass (:51-54, asolaria-hookwall.mjs:84).
    pub observe_only: bool,
    /// Row timestamp (upstream `new Date().toISOString()`).
    pub ts: &'a str,
    /// `ctx.ledgerPath`, the observation append (:53).
    pub ledger_path: Option<&'a Path>,
    /// `opts.fischerLedgerPath`, the Fischer row append (asolaria-hookwall.mjs:75-80).
    pub fischer_ledger_path: Option<&'a Path>,
}

/// The outcome of one cycle, including the two emitted rows and the observation row.
pub struct CycleOutcome {
    pub agent_pid: String,
    pub room_id: u32,
    pub rotation: u64,
    /// `!swap.noop`. Upstream's `renamed` (:42-46) is this when the `project_swap_row` append to an
    /// existing room's `ROOM.hbp` succeeds, and `false` under `dryRun`; that append is the caller's.
    pub would_rename: bool,
    pub mock: bool,
    pub verdict: Verdict,
    pub mark: String,
    pub score: String,
    pub l0_real: bool,
    pub gc_runs: u64,
    pub cap_status: CapStatus,
    pub project_swap_row: String,
    pub prism_in_row: String,
    pub observation_row: String,
}

/// Run one full loop cycle (asolaria-loop.mjs:32-86). The gate calls `lanes` for SCORE (pid, answer)
/// and Fischer (pid, envelope, score, `ctx.prev_hash`) as upstream's hookwall pass does.
pub fn loop_cycle(ctx: &mut LoopCtx, lanes: &mut dyn GateLanes, opts: &CycleOpts) -> CycleOutcome {
    // 1. PID emitter
    let agent_pid = ctx.revolver.next_pid();
    let rotation = ctx.revolver.counter - 1;
    // 2. room selection + rename-before-load marker
    let room_id = ctx
        .router
        .room_for_pid(&agent_pid)
        .expect("revolver PIDs are 16 hex digits")
        % (ctx.room_count as u32);
    let swap = ctx.router.plan_swap_to(room_id);
    let would_rename = !matches!(swap, RoomSwapPlan::Noop { .. });
    let ts = opts.ts;
    let project_swap_row = format!(
        "HBPv1|row=project_swap|agent_pid={agent_pid}|room={room_id}|rotation={rotation}|invariant=rename-before-load|ts={ts}|json=0"
    );
    // 3. free agent in the unique project (mock)
    let default_question = format!(
        "[{}] cycle {rotation}: produce one genius/mistake mark for this lane",
        ctx.district
    );
    let question = match opts.question {
        Some(q) if !q.is_empty() => q,
        _ => &default_question,
    };
    let agent = run_free_agent_mock("opencode-coder", question, &agent_pid);
    // 4. hookwall gate (SCORE/Fischer lanes)
    let env = Envelope {
        pid: Some(&agent_pid),
        actor: &ctx.district,
        verb: "answer",
        target: "prism",
        payload: Some(&agent.answer),
        payload_sha16: "",
    };
    let pass_opts = PassOpts {
        observe_only: opts.observe_only,
        prev_hash: &ctx.prev_hash,
        ts,
        ledger_path: opts.ledger_path,
        fischer_ledger_path: opts.fischer_ledger_path,
    };
    let gate = pass(&env, lanes, &pass_opts);
    ctx.prev_hash = gate.row_hash.clone();
    // 5. second prism PID + prism_in row
    let mut prism_segment = String::new();
    if let Some(prism_rev) = ctx.prism_revolver.as_mut() {
        if ctx.prism_room_count > 0 {
            let prism_rotation = prism_rev.counter;
            let prism_pid = prism_rev.next_pid();
            let prism_room_id = ctx
                .router
                .room_for_pid(&prism_pid)
                .expect("revolver PIDs are 16 hex digits")
                % (ctx.prism_room_count as u32);
            prism_segment = format!(
                "|prism_room={prism_room_id}|prism_pid={prism_pid}|prism_rotation={prism_rotation}"
            );
        }
    }
    let prism_in_row = format!(
        "HBPv1|row=prism_in|from_pid={agent_pid}|from_room={room_id}{prism_segment}|mark={}|score={}|gnn_lane=reverse_gain_gnn|answer_sha16={}|ts={ts}|json=0",
        gate.mark,
        gate.score,
        sha8(&agent.answer)
    );
    // 6. GC emit
    let gc_status = ctx.gc.emit();

    CycleOutcome {
        agent_pid,
        room_id,
        rotation,
        would_rename,
        mock: agent.mock,
        verdict: gate.verdict,
        mark: gate.mark,
        score: gate.score,
        l0_real: gate.l0_real,
        gc_runs: gc_status.runs,
        cap_status: gc_status.cap_status,
        project_swap_row,
        prism_in_row,
        observation_row: gate.observation,
    }
}
