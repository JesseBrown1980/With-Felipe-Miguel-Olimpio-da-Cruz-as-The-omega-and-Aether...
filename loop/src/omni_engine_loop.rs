//! Omni-engine-loop: the never-explode gulp, the pure-integer quant score, and extract -> register ->
//! place.
//!
//! Port of ASOLARIA-AS-NEURAL-NETWORK@4cc7624 `tools/behcs/omni-engine-loop.mjs:17-78`. The resident
//! set is bounded at `max_resident` regardless of input volume. `extract_register_place` mints through
//! the ported `github_pid_register::mint_pid`; `omni_engine_loop_cycle` takes string rows (the
//! `typeof row === 'string'` key of :62).

use crate::github_pid_register::{mint_pid, Kind, Role};
use crate::sha::sha256_hex;

/// GC resident-set bound, the never-explode guarantee (omni-engine-loop.mjs:17).
pub const DEFAULT_MAX_RESIDENT: u64 = 2000;
/// Verdict thresholds (omni-engine-loop.mjs:18-19).
pub const EXTRACT_THRESHOLD: u32 = 700;
pub const HOLD_THRESHOLD: u32 = 300;
/// Room-rotor size (omni-engine-loop.mjs:22).
pub const ROOM_ROTOR_SIZE: u64 = 10000;
/// Preload catalog id (omni-engine-loop.mjs:21).
pub const CATALOG: &str = "fabric-agent-preload-catalog.v1";
/// Pool-launch gate label (omni-engine-loop.mjs:76).
pub const POOL_LAUNCH_GATE: &str = "RUN_HERMES_SPINDLE-operator-gated";

/// Pure-integer score 0..1000 from a row key (omni-engine-loop.mjs:27-29).
pub fn omni_quant_score(row_key: &str) -> u32 {
    let h = sha256_hex(row_key);
    u32::from_str_radix(&h[..4], 16).expect("4 hex chars") % 1001
}

/// A flywheel verdict (omni-engine-loop.mjs:32-34).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    Extract,
    Hold,
    Gc,
}

impl Verdict {
    /// Upstream string form.
    pub fn as_str(self) -> &'static str {
        match self {
            Verdict::Extract => "EXTRACT",
            Verdict::Hold => "HOLD",
            Verdict::Gc => "GC",
        }
    }
}

/// Aggregate a score into a verdict (omni-engine-loop.mjs:32-34).
pub fn omni_flywheel_verdict(score: u32) -> Verdict {
    if score >= EXTRACT_THRESHOLD {
        Verdict::Extract
    } else if score >= HOLD_THRESHOLD {
        Verdict::Hold
    } else {
        Verdict::Gc
    }
}

/// The result of one bounded gulp (omni-engine-loop.mjs:37-41).
pub struct Gulp {
    pub resident: u64,
    pub gc_released: u64,
    pub bounded: bool,
}

/// Resident set never exceeds `max_resident`, regardless of `input_count` (omni-engine-loop.mjs:37-41).
pub fn gulp_cycle(input_count: u64, max_resident: u64) -> Gulp {
    let resident = input_count.min(max_resident);
    Gulp {
        resident,
        gc_released: input_count.saturating_sub(max_resident),
        bounded: resident <= max_resident,
    }
}

/// One extract -> register -> place result (omni-engine-loop.mjs:44-53).
pub struct Placement {
    pub supervisor_pid: String,
    pub sector: u32,
    pub room: String,
    pub catalog: &'static str,
    pub process_launch: u32,
}

/// Mint a SUP PID, assign a room-rotor slot, attach the preload catalog (omni-engine-loop.mjs:44-53).
pub fn extract_register_place(name: &str, room_index: i64, tier: i64) -> Placement {
    let sup = mint_pid(Role::Sup, name, tier, 1, Kind::Logical, 0);
    let slot = room_index.rem_euclid(ROOM_ROTOR_SIZE as i64);
    Placement {
        supervisor_pid: sup.pid,
        sector: sup.sector,
        room: format!("room-{slot:06}"),
        catalog: CATALOG,
        process_launch: 0,
    }
}

/// One deterministic, GC-bounded loop cycle (omni-engine-loop.mjs:56-78).
pub struct EngineCycle {
    pub cycle_resident: u64,
    pub gulp_gc_released: u64,
    pub never_explode_bound: u64,
    pub extracted: u64,
    pub held: u64,
    pub gc: u64,
    pub placements_count: u64,
    /// The first three placements (`placements.slice(0, 3)`).
    pub placements: Vec<Placement>,
    pub process_launch: u32,
    pub pool_launch_gate: &'static str,
}

/// `String(key).replace(/[^A-Za-z0-9]+/g, '-')` (omni-engine-loop.mjs:64).
fn dash_runs(key: &str) -> String {
    let mut out = String::new();
    let mut in_run = false;
    for c in key.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
            in_run = false;
        } else if !in_run {
            out.push('-');
            in_run = true;
        }
    }
    out
}

/// Run one cycle over string rows (omni-engine-loop.mjs:56-78): gulp, score each resident row,
/// aggregate verdicts, and place each EXTRACT under `SUP-FROM-<key>` cut to 40 characters, tier 4.
pub fn omni_engine_loop_cycle(rows: &[&str], max_resident: u64) -> EngineCycle {
    let g = gulp_cycle(rows.len() as u64, max_resident);
    let (mut extracted, mut held, mut gced) = (0u64, 0u64, 0u64);
    let mut placements = Vec::new();
    for (i, key) in rows.iter().take(g.resident as usize).enumerate() {
        match omni_flywheel_verdict(omni_quant_score(key)) {
            Verdict::Extract => {
                if placements.len() < 3 {
                    let mut name = format!("SUP-FROM-{}", dash_runs(key));
                    name.truncate(40);
                    placements.push(extract_register_place(&name, i as i64, 4));
                }
                extracted += 1;
            }
            Verdict::Hold => held += 1,
            Verdict::Gc => gced += 1,
        }
    }
    EngineCycle {
        cycle_resident: g.resident,
        gulp_gc_released: g.gc_released,
        never_explode_bound: max_resident,
        extracted,
        held,
        gc: gced,
        placements_count: extracted,
        placements,
        process_launch: 0,
        pool_launch_gate: POOL_LAUNCH_GATE,
    }
}
