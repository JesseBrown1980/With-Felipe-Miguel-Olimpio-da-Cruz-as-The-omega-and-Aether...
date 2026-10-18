//! council-serve (asolaria-federation-1024 @ dc1da1a9, servers/council-serve) as an in-process library.
//!
//! `routes.rs`, `lane_event.rs`, `lane_health.rs`, `mcp_health.rs`, `policy.rs`, `ptc_dispatch.rs`,
//! `recovery.rs` and `stale_branch.rs` are upstream's files, byte-identical and compiled whole.
//! `schedule.rs` is the aether copy at proposals/verify-schedule (same blob). `main.rs`, `http.rs` and
//! `engine_drive.rs` are byte-identical too; only `Shared` (main.rs:30-32) is compiled from them.
//! The listener (main.rs:34-64, http.rs) and the gated engine-drive thread (engine_drive.rs, started
//! at main.rs:43) are the process boundary and are not compiled here. The routes read NDJSON ledgers
//! (upstream's format) and answer HBP text rows (`json=0`): this crate is a cold lane (OWNER-RULES 3).
//!
//! This file is glue: the module declarations of main.rs:14-24 for the compiled files, the import of
//! main.rs:9 that `Shared` uses, and `producer`.

#![forbid(unsafe_code)]

use std::path::PathBuf;

pub use asolaria_verify_schedule as schedule;

mod lane_event;
mod lane_health;
mod mcp_health;
mod policy;
mod ptc_dispatch;
mod recovery;
mod routes;
mod stale_branch;

pub use routes::route;

// main.rs:30-32
include!(concat!(env!("OUT_DIR"), "/main_30_32.rs"));

/// The loop-ledger producer of `schedule::Proposal` (routes.rs:168-296 with `hbp_escape` at
/// routes.rs:21-30), callable without the file and environment reads of routes.rs:117-144.
/// The same upstream lines also compile inside `routes`, where `/api/loop/schedule` reaches them.
pub mod producer {
    use crate::schedule;

    // routes.rs:21-30
    include!(concat!(env!("OUT_DIR"), "/routes_21_30.rs"));
    // routes.rs:168-296
    include!(concat!(env!("OUT_DIR"), "/routes_168_296.rs"));

    /// routes.rs:169 `render_schedule(body, budget, threshold_q)`: (status, COUNCILSCHEDULE rows).
    pub fn schedule_rows(body: &str, budget: usize, threshold_q: u16) -> (u16, String) {
        render_schedule(body, budget, threshold_q)
    }

    /// routes.rs:207 `parse_proposal(line)`.
    pub fn proposal(line: &str) -> Option<schedule::Proposal> {
        parse_proposal(line)
    }
}
