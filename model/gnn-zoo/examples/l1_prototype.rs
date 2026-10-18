//! model/l1-prototype's forward, unchanged, with the weights of prototype_model.pt.
//! Usage: cargo run --release --example l1_prototype -- [--check] PARITY_FILE (tools/zoo_torch.py parity OUT, or
//! tests/fixtures/parity-first.hbp).

#![forbid(unsafe_code)]

use std::process::ExitCode;

#[allow(dead_code)]
#[path = "../weights/l1_prototype.rs"]
mod weights;

#[allow(dead_code)]
#[path = "../../l1-prototype/src/model.rs"]
mod model;

fn main() -> ExitCode {
    gnn_zoo::run(
        "l1-prototype",
        "weights/l1_prototype.rs",
        &["prototype_model.pt", "prototype_model.pt.bak"],
        "fallback",
        |g| model::forward(&g.x, &g.edges).expect("the parity graphs are valid inputs"),
    )
}
