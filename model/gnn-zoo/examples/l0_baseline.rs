//! model/l0-edge's forward with its own weights (baseline_model.pt, the same bytes as vendor/gnn-patterns/baseline_model.pt).
//! Usage: cargo run --release --example l0_baseline -- [--check] PARITY_FILE (tools/zoo_torch.py parity OUT, or
//! tests/fixtures/parity-first.hbp).

#![forbid(unsafe_code)]

use std::process::ExitCode;

/// `model/l0-edge/src/model.rs` reads `crate::features::FRAC_BITS`.
mod features {
    pub const FRAC_BITS: u32 = 24;
}

#[allow(dead_code)]
#[path = "../../l0-edge/src/weights.rs"]
mod weights;

#[allow(dead_code)]
#[path = "../../l0-edge/src/model.rs"]
mod model;

fn main() -> ExitCode {
    gnn_zoo::run(
        "l0-edge",
        "l0-edge/src/weights.rs",
        &["baseline_model.pt"],
        "pyg",
        |g| model::edge_scores(&g.x, &g.edges).expect("the parity graphs are valid inputs"),
    )
}
