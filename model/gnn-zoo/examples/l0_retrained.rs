//! model/l0-edge's forward, unchanged, with the weights of baseline_model_retrained.pt.
//! Usage: cargo run --release --example l0_retrained -- [--check] PARITY_FILE (tools/zoo_torch.py parity OUT, or
//! tests/fixtures/parity-first.hbp).

#![forbid(unsafe_code)]

use std::process::ExitCode;

/// `model/l0-edge/src/model.rs` reads `crate::features::FRAC_BITS`.
mod features {
    pub const FRAC_BITS: u32 = 24;
}

#[allow(dead_code)]
#[path = "../weights/l0_retrained.rs"]
mod weights;

#[allow(dead_code)]
#[path = "../../l0-edge/src/model.rs"]
mod model;

fn main() -> ExitCode {
    gnn_zoo::run(
        "l0-edge",
        "weights/l0_retrained.rs",
        &[
            "baseline_model_retrained.pt",
            "baseline_model_retrained.pre-L0-rekey-2026-05-26.pt",
        ],
        "pyg",
        |g| model::edge_scores(&g.x, &g.edges).expect("the parity graphs are valid inputs"),
    )
}
