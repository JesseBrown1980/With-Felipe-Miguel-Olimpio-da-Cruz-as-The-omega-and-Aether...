//! model/l4-gslgnn's forward, unchanged, with the weights of gsl_model.pt.
//! Usage: cargo run --release --example l4_gsl_model -- [--check] PARITY_FILE (tools/zoo_torch.py parity OUT, or
//! tests/fixtures/parity-first.hbp).

#![forbid(unsafe_code)]

use std::process::ExitCode;

#[allow(dead_code)]
#[path = "../weights/l4_gsl_model.rs"]
mod weights;

#[allow(dead_code)]
#[path = "../../l4-gslgnn/src/model.rs"]
mod model;

fn main() -> ExitCode {
    gnn_zoo::run(
        "l4-gslgnn",
        "weights/l4_gsl_model.rs",
        &["gsl_model.pt", "gsl_model.pt.bak"],
        "pyg",
        |g| model::edge_scores(&g.x, &g.edges).expect("the parity graphs are valid inputs"),
    )
}
