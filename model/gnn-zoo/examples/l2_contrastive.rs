//! model/l2-contrastive's forward, unchanged, with the weights of contrastive_model.pt.
//! Usage: cargo run --release --example l2_contrastive -- [--check] PARITY_FILE (tools/zoo_torch.py parity OUT, or
//! tests/fixtures/parity-first.hbp).

#![forbid(unsafe_code)]

use std::process::ExitCode;

#[allow(dead_code)]
#[path = "../weights/l2_contrastive.rs"]
mod weights;

#[allow(dead_code)]
#[path = "../../l2-contrastive/src/model.rs"]
mod model;

fn main() -> ExitCode {
    gnn_zoo::run(
        "l2-contrastive",
        "weights/l2_contrastive.rs",
        &["contrastive_model.pt", "contrastive_model.pt.bak"],
        "fallback",
        |g| {
            model::anomaly_probabilities(&g.x, &g.edges)
                .expect("the parity graphs are valid inputs")
        },
    )
}
